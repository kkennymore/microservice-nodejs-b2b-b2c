// backend/services/auth/controllers/SellerController.ts
import * as Joi from 'joi';
import { Op } from 'sequelize';
import config from '@/shared/config';
import EVENTS from '@/shared/events';
import pligsLogger from '@/utils/logger';

import { AuthenticatedRequest, AsyncRequestHandler } from '@/shared/interfaces/common';
import { Response, Request } from 'express';
import { createSuccessResponse, createErrorResponse } from '@/shared/responseHelper';
import { HTTP_STATUS } from '@/shared/statusCodes';

class PligsSellerController {
  private models: any;
  private redisClient: any;
  private rabbitChannel: any;

  constructor(sequelize: any, redisClient: any, rabbitChannel: any) {
    this.models = {
      user: sequelize.models.User,
      product: sequelize.models.Product,
      order: sequelize.models.Order,
      orderItem: sequelize.models.OrderItem,
      review: sequelize.models.Review
    };
    this.redisClient = redisClient;
    this.rabbitChannel = rabbitChannel;
  }

  // Get seller dashboard overview
  pligsGetDashboardOverview = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const sellerId = req.user?.id;

      // Get seller stats
      const totalProducts = await this.models.product.count({
        where: { sellerId, isActive: true }
      });

      const totalOrders = await this.models.order.count({
        include: [{
          model: this.models.orderItem,
          include: [{
            model: this.models.product,
            where: { sellerId }
          }]
        }]
      });

      const totalRevenue = await this.models.orderItem.sum('totalPrice', {
        include: [{
          model: this.models.product,
          where: { sellerId }
        }]
      }) || 0;

      const averageRating = await this.models.product.findAll({
        where: { sellerId, isActive: true },
        attributes: [[this.models.product.sequelize.fn('AVG', this.models.product.sequelize.col('rating')), 'avgRating']]
      });

      return createSuccessResponse(res, {
        totalProducts,
        totalOrders,
        totalRevenue,
        averageRating: averageRating[0]?.dataValues?.avgRating || 0
      });

    } catch (error) {
      pligsLogger.error('Get dashboard overview error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get dashboard overview');
    }
  };

  // Get seller products
  pligsGetProducts: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const sellerId = req.user.id;
      const query = req.query as any;
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 20;
      const { search, status, category, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

      const offset = (page - 1) * limit;
      const where: any = { sellerId };

      // Build filters
      if (search) {
        where[Op.or as any] = [
          { name: { [Op.like]: `%${search}%` } },
          { sku: { [Op.like]: `%${search}%` } }
        ];
      }

      if (status) where.isActive = status === 'active';
      if (category) where.categoryId = category;

      const { count, rows: products } = await this.models.product.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase() as 'ASC' | 'DESC']]
      });

      return createSuccessResponse(res, {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      pligsLogger.error('Get seller products error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get products');
    }
  };

  // Get seller orders
  pligsGetOrders: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const sellerId = req.user.id;
      const query = req.query as any;
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 20;
      const { status, dateFrom, dateTo } = query;

      const offset = (page - 1) * limit;

      // Build complex query for orders containing seller's products
      const where: any = {};
      if (status) where.status = status;
      if (dateFrom && dateTo) {
        where.createdAt = {
          [Op.between as any]: [new Date(dateFrom), new Date(dateTo)]
        };
      }

      const orders = await this.models.order.findAndCountAll({
        where,
        include: [{
          model: this.models.orderItem,
          include: [{
            model: this.models.product,
            where: { sellerId }
          }]
        }],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return createSuccessResponse(res, {
        orders: orders.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: orders.count,
          totalPages: Math.ceil(orders.count / limit)
        }
      });

    } catch (error) {
      pligsLogger.error('Get seller orders error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get orders');
    }
  };

  // Update order status
  pligsUpdateOrderStatus: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const sellerId = req.user.id;

      // Verify order belongs to seller
      const orderItem = await this.models.orderItem.findOne({
        where: { orderId },
        include: [{
          model: this.models.product,
          where: { sellerId }
        }]
      });

      if (!orderItem) {
        return createErrorResponse(res, HTTP_STATUS.NOT_FOUND, 'Order not found or not authorized');
      }

      // Update order status
      await this.models.order.update(
        { status },
        { where: { id: orderId } }
      );

      // Publish event
      await this.pligsPublishEvent(EVENTS.ORDER_STATUS_UPDATED, {
        orderId,
        sellerId,
        newStatus: status
      });

      return createSuccessResponse(res, null, 'Order status updated successfully');

    } catch (error) {
      pligsLogger.error('Update order status error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update order status');
    }
  };

  // Get seller analytics
  pligsGetAnalytics: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const sellerId = req.user.id;
      const { period = '30d' } = req.query;

      // Calculate date range
      const now = new Date();
      const startDate = new Date();

      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Get analytics data
      const salesData = await this.models.orderItem.findAll({
        attributes: [
          [this.models.orderItem.sequelize.fn('DATE', this.models.orderItem.sequelize.col('createdAt')), 'date'],
          [this.models.orderItem.sequelize.fn('SUM', this.models.orderItem.sequelize.col('totalPrice')), 'revenue'],
          [this.models.orderItem.sequelize.fn('COUNT', this.models.orderItem.sequelize.col('id')), 'orders']
        ],
        include: [{
          model: this.models.product,
          where: { sellerId }
        }],
        where: {
          createdAt: {
            [Op.between as any]: [startDate, now]
          }
        },
        group: [this.models.orderItem.sequelize.fn('DATE', this.models.orderItem.sequelize.col('createdAt'))],
        order: [[this.models.orderItem.sequelize.fn('DATE', this.models.orderItem.sequelize.col('createdAt')), 'ASC']]
      });

      const topProducts = await this.models.product.findAll({
        where: { sellerId, isActive: true },
        attributes: ['id', 'name', 'sales'],
        order: [['sales', 'DESC']],
        limit: 5
      });

      return createSuccessResponse(res, {
        salesData,
        topProducts,
        period
      });

    } catch (error) {
      pligsLogger.error('Get analytics error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get analytics');
    }
  };

  // Get seller customers
  pligsGetCustomers: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const sellerId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const offset = (page - 1) * limit;

      // Get customers who bought from this seller
      const customers = await this.models.order.findAll({
        attributes: ['userId'],
        include: [{
          model: this.models.orderItem,
          include: [{
            model: this.models.product,
            where: { sellerId }
          }]
        }],
        group: ['userId'],
        limit: parseInt(limit),
        offset
      });

      const customerIds = customers.map(c => c.userId);

      if (customerIds.length === 0) {
        return createSuccessResponse(res, {
          customers: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        });
      }

      const customerDetails = await this.models.user.findAll({
        where: { id: customerIds },
        attributes: ['id', 'firstName', 'lastName', 'email', 'createdAt']
      });

      return createSuccessResponse(res, {
        customers: customerDetails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: customerIds.length,
          totalPages: Math.ceil(customerIds.length / limit)
        }
      });

    } catch (error) {
      pligsLogger.error('Get customers error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get customers');
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

export default PligsSellerController;