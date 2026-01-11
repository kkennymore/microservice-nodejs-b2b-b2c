// backend/services/auth/controllers/AdminController.ts
import * as Joi from 'joi';
import { Op, Model, ModelStatic } from 'sequelize';
import config from '../../../shared/config';
import EVENTS from '../../../shared/events';
import pligsLogger from '../utils/logger';

import { AuthenticatedRequest, PaginationQuery, AsyncRequestHandler } from '../../../shared/interfaces/common';
import { Response, Request } from 'express';
import { createSuccessResponse, createErrorResponse, createBusinessErrorResponse } from '../../../shared/responseHelper';
import { HTTP_STATUS, BUSINESS_STATUS } from '../../../shared/statusCodes';
import { IUserAttributes } from '../interfaces/IUser';

// Sequelize model types
type UserModel = Model<IUserAttributes> & {
  profile?: Model<any, any>;
  kyc?: Model<any, any>;
  business?: Model<any, any>;
  password?: Model<any, any>;
  bank?: Model<any, any>;
  security?: Model<any, any>;
  preferences?: Model<any, any>;
};

interface IModels {
  user: ModelStatic<UserModel> & {
    findAll: Function;
    findAndCountAll: Function;
    findByPk: Function;
    count: Function;
    sequelize: {
      fn: Function;
      col: Function;
      Op: typeof Op;
      models: Record<string, any>;
    };
  };
  userProfile: ModelStatic<Model<any, any>>;
  userKyc: ModelStatic<Model<any, any>>;
  userBusiness: ModelStatic<Model<any, any>>;
}

interface IRedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode?: string, duration?: number) => Promise<void>;
  del: (key: string) => Promise<void>;
}

interface IRabbitChannel {
  publish: (exchange: string, routingKey: string, content: Buffer) => Promise<void>;
}

interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  role?: 'buyer' | 'seller' | 'admin';
  isActive?: boolean;
  subscriptionPlan?: 'free' | 'silver' | 'gold' | 'platinum';
  subscriptionStatus?: 'active' | 'expired' | 'cancelled' | 'trial';
}

interface UserQuery {
  search?: string | string[];
  role?: string | string[];
  status?: string | string[];
  subscriptionPlan?: string | string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  inactiveUsers: number;
  unverifiedUsers: number;
  roleStats: UserModel[];
  subscriptionStats: UserModel[];
}

class PligsAdminController {
  private models: IModels;
  private redisClient: IRedisClient;
  private rabbitChannel: IRabbitChannel;

  constructor(sequelize: any, redisClient: IRedisClient, rabbitChannel: IRabbitChannel) {
    this.models = {
      user: sequelize.models.User,
      userProfile: sequelize.models.UserProfile,
      userKyc: sequelize.models.UserKyc,
      userBusiness: sequelize.models.UserBusiness
    };
    this.redisClient = redisClient;
    this.rabbitChannel = rabbitChannel;
  }

  // Get users with pagination and filters
  pligsGetUsers: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const query = req.query as any;
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 20;
      const {
        search,
        role,
        status,
        subscriptionPlan,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = query;

      const offset = (page - 1) * limit;
      const where: Record<string, any> = {};

      // Build filters
      if (search) {
        const searchTerm = Array.isArray(search) ? search[0] : search;
        where[Op.or as any] = [
          { username: { [Op.like]: `%${searchTerm}%` } },
          { email: { [Op.like]: `%${searchTerm}%` } },
          { firstName: { [Op.like]: `%${searchTerm}%` } },
          { lastName: { [Op.like]: `%${searchTerm}%` } }
        ];
      }

      if (role) where.role = Array.isArray(role) ? role[0] : role;
      if (status) where.isActive = (Array.isArray(status) ? status[0] : status) === 'active';
      if (subscriptionPlan) where.subscriptionPlan = Array.isArray(subscriptionPlan) ? subscriptionPlan[0] : subscriptionPlan;

      const { count, rows: users } = await this.models.user.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortBy as string, sortOrder.toUpperCase() as 'ASC' | 'DESC']],
        include: [
          { model: this.models.userProfile, as: 'profile' },
          { model: this.models.userKyc, as: 'kyc' }
        ]
      });

      return createSuccessResponse(res, {
        items: users,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      pligsLogger.error('Get users error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch users');
    }
  };

  // Update user
  pligsUpdateUser: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const updateData = req.body as UserUpdateData;

      // Validate update data
      const schema = Joi.object({
        firstName: Joi.string().optional(),
        lastName: Joi.string().optional(),
        role: Joi.string().valid('buyer', 'seller', 'admin').optional(),
        isActive: Joi.boolean().optional(),
        subscriptionPlan: Joi.string().valid('free', 'silver', 'gold', 'platinum').optional(),
        subscriptionStatus: Joi.string().valid('active', 'expired', 'cancelled', 'trial').optional()
      });

      const { error } = schema.validate(updateData);
      if (error) {
        return createErrorResponse(res, HTTP_STATUS.BAD_REQUEST, error.details[0].message);
      }

      const user = await this.models.user.findByPk(id) as UserModel | null;
      if (!user) {
        return createErrorResponse(res, HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      await user.update(updateData);

      // Publish event
      await this.pligsPublishEvent(EVENTS.USER_PROFILE_UPDATED, { userId: id });

      return createSuccessResponse(res, user, 'User updated successfully');

    } catch (error) {
      pligsLogger.error('Update user error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update user');
    }
  };

  // Delete/Deactivate user
  pligsDeactivateUser: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };

      const user = await this.models.user.findByPk(id) as UserModel | null;
      if (!user) {
        return createErrorResponse(res, HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      await user.update({ isActive: false });

      // Publish event
      await this.pligsPublishEvent(EVENTS.USER_DELETED, { userId: id });

      return createSuccessResponse(res, null, 'User deactivated successfully');

    } catch (error) {
      pligsLogger.error('Deactivate user error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to deactivate user');
    }
  };

  // Get user details
  pligsGetUserDetails: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };

      const user = await this.models.user.findByPk(id, {
        include: [
          { model: this.models.userProfile, as: 'profile' },
          { model: this.models.userKyc, as: 'kyc' },
          { model: this.models.userBusiness, as: 'business' }
        ]
      }) as UserModel | null;

      if (!user) {
        return createErrorResponse(res, HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      return createSuccessResponse(res, user);

    } catch (error) {
      pligsLogger.error('Get user details error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch user details');
    }
  };

  // Get user statistics
  pligsGetUserStats: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const totalUsers = await this.models.user.count();
      const activeUsers = await this.models.user.count({ where: { isActive: true } });
      const verifiedUsers = await this.models.user.count({ where: { isEmailVerified: true } });

      const roleStats = await this.models.user.findAll({
        attributes: [
          'role',
          [this.models.user.sequelize.fn('COUNT', this.models.user.sequelize.col('role')), 'count']
        ],
        group: ['role']
      });

      const subscriptionStats = await this.models.user.findAll({
        attributes: [
          'subscriptionPlan',
          [this.models.user.sequelize.fn('COUNT', this.models.user.sequelize.col('subscriptionPlan')), 'count']
        ],
        group: ['subscriptionPlan']
      });

      const statsData: UserStatsResponse = {
        totalUsers,
        activeUsers,
        verifiedUsers,
        inactiveUsers: totalUsers - activeUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        roleStats,
        subscriptionStats
      };

      return createSuccessResponse(res, statsData);

    } catch (error) {
      pligsLogger.error('Get user stats error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to fetch user statistics');
    }
  };

  async pligsPublishEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.rabbitChannel.publish(config.rabbitmq.exchange, eventType, Buffer.from(JSON.stringify(data)));
    } catch (error) {
      pligsLogger.error('Failed to publish event:', error);
    }
  }
}

export default PligsAdminController;