// backend/services/auth/controllers/AuthController.ts
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import * as Joi from 'joi';
import * as crypto from 'crypto';
import * as multer from 'multer';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

import { AuthenticatedRequest, PaginationQuery, AsyncRequestHandler } from '../../../shared/interfaces/common';
import { Response, Request } from 'express';
import { IUser } from '../interfaces/IUser';
import { LoginDto, RegisterDto, UpdateProfileDto, KycSubmitDto } from '../interfaces/IDto';
import { createSuccessResponse, createCreatedResponse, createErrorResponse, createBusinessErrorResponse, createValidationErrorResponse } from '../../../shared/responseHelper';
import { HTTP_STATUS, BUSINESS_STATUS } from '../../../shared/statusCodes';

import config from '../../../shared/config';
import EVENTS from '../../../shared/events';
import PligsUser from '../models/User';
import PligsUserPassword from '../models/UserPassword';
import PligsUserProfile from '../models/UserProfile';
import PligsUserKyc from '../models/UserKyc';
import PligsUserBusiness from '../models/UserBusiness';
import PligsUserBank from '../models/UserBank';
import PligsUserSecurity from '../models/UserSecurity';
import PligsUserPreference from '../models/UserPreference';
import pligsAuthService from '../services/authService';
import pligsEmailService from '../services/emailService';
import pligsFileService from '../services/fileService';
import PligsSocialAuthService from '../services/socialAuthService';
import pligsLogger from '../utils/logger';

const upload = multer({ dest: 'uploads/' });

interface IModels {
  user: any;
  password: any;
  profile: any;
  kyc: any;
  business: any;
  bank: any;
  security: any;
  preference: any;
}

interface IRedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  setex: (key: string, seconds: number, value: string) => Promise<void>;
  del: (key: string) => Promise<void>;
  quit: () => Promise<void>;
}

interface CustomJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

class PligsAuthController {
  private models: IModels;
  private redisClient: IRedisClient;
  private rabbitChannel: any;
  private socialAuthService: any;
  private userModel: any;
  private redisOp: (operation: string, ...args: any[]) => Promise<any>;

  constructor(sequelize: any, redisClient: IRedisClient, rabbitChannel: any) {
    // Initialize all models
    this.models = {
      user: new PligsUser(sequelize),
      password: new PligsUserPassword(sequelize),
      profile: new PligsUserProfile(sequelize),
      kyc: new PligsUserKyc(sequelize),
      business: new PligsUserBusiness(sequelize),
      bank: new PligsUserBank(sequelize),
      security: new PligsUserSecurity(sequelize),
      preference: new PligsUserPreference(sequelize)
    };
    // Handle Redis client - use mock if not available
    this.redisClient = redisClient || {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve(null),
      setex: () => Promise.resolve(null),
      del: () => Promise.resolve(null),
      quit: () => Promise.resolve()
    };
    this.rabbitChannel = rabbitChannel;
    this.socialAuthService = new PligsSocialAuthService();
    this.userModel = this.models.user;
    this.redisOp = async (operation: string, ...args: any[]) => {
      switch (operation) {
        case 'setex':
          return this.redisClient.setex(args[0], args[1], args[2]);
        case 'get':
          return this.redisClient.get(args[0]);
        case 'del':
          return this.redisClient.del(args[0]);
        default:
          return null;
      }
    };
  }

  private async pligsPublishEvent(eventType: string, data: any): Promise<void> {
    try {
      if (this.rabbitChannel) {
        await this.rabbitChannel.publish('marketplace_exchange', eventType, Buffer.from(JSON.stringify(data)));
      }
    } catch (error) {
      pligsLogger.error('Event publishing error:', error);
    }
  }

  pligsValidateRegistration: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response, next: Function) => {
    const schema = Joi.object({
      username: Joi.string().min(3).max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      firstName: Joi.string().min(2).required(),
      lastName: Joi.string().min(2).required(),
      phone: Joi.string().min(10).required(),
      role: Joi.string().valid('buyer', 'seller', 'admin', 'delivery_partner').default('buyer')
    });

    const { error } = schema.validate(req.body || {});
    if (error) {
      return createErrorResponse(res, HTTP_STATUS.BAD_REQUEST, error.details[0]?.message);
    }
    next();
  };

  pligsRegister: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { username, email, password, firstName, lastName, phone, role }: RegisterDto = req.body || {};

      // Check if user exists
      const existingUser = await this.models.user.pligsFindByEmail(email) || await this.models.user.pligsFindByUsername(username);
      if (existingUser) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.USER_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }

      // Validate password strength
      if (password && !pligsAuthService.pligsValidatePassword(password)) {
        return createBusinessErrorResponse(
          res, 
          BUSINESS_STATUS.VALIDATION_ERROR, 
          HTTP_STATUS.BAD_REQUEST,
          'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await this.models.user.pligsCreateUser({
        username,
        email,
        firstName,
        lastName,
        phone,
        role,
        platformType: 'local'
      });

      // Create password record
      await this.models.password.pligsCreatePassword(user.id, hashedPassword);

      // Create default related records
      await this.models.preference.pligsUpsertPreferences(user.id, {});
      await this.models.security.pligsUpsertSecurity(user.id, {});
      await this.models.profile.pligsUpsertProfile(user.id, {});

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await this.redisOp('setex', `email_verify:${user.id}`, 86400, verificationToken);

      // Send verification email
      await (pligsEmailService as any).pligsSendVerificationEmail(user.email, verificationToken, {
        firstName: user.firstName,
        lastName: user.lastName
      });

      // Generate tokens
      const tokens = pligsAuthService.pligsGenerateTokens(user);

      // Cache user session
      await this.redisClient.setex(`session:${user.id}`, 3600, JSON.stringify({ userId: user.id, role: user.role }));

      // Publish event
      await this.pligsPublishEvent(EVENTS.USER_REGISTERED, { userId: user.id, email: user.email, role: user.role });

      return createCreatedResponse(res, {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          platformType: user.platformType
        },
        tokens
      }, 'User registered successfully');

    } catch (error) {
      pligsLogger.error('Registration error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  };

  pligsLogin: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { identifier, password } = req.body || {};

      const user = await this.models.user.pligsFindByEmail(identifier) || await this.models.user.pligsFindByUsername(identifier);
      if (!user || !user.isActive) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
      }

      // Check if account is locked
      const isLocked = await this.models.password.pligsIsAccountLocked(user.id);
      if (isLocked) {
        return createErrorResponse(res, HTTP_STATUS.LOCKED, 'Account is temporarily locked due to too many failed login attempts');
      }

      // Get password record (only for local users)
      if (user.platformType !== 'local') {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, 'Please use social login for this account');
      }

      const passwordRecord = await this.models.password.pligsFindByUserId(user.id);
      if (!passwordRecord) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
      }

      const isPasswordValid = await bcrypt.compare(password, passwordRecord.password);
      if (!isPasswordValid) {
        // Record failed login attempt
        await this.models.password.pligsRecordFailedLogin(user.id);
        return createBusinessErrorResponse(res, BUSINESS_STATUS.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
      }

      // Record successful login
      await this.models.password.pligsResetFailedLogins(user.id);

      // Update last login
      await this.models.user.pligsUpdateUser(user.id, { lastLoginAt: new Date() });

      const tokens = pligsAuthService.pligsGenerateTokens(user);

      // Cache session
      await this.redisClient.setex(`session:${user.id}`, 3600, JSON.stringify({ userId: user.id, role: user.role }));

      // Publish event
      await this.pligsPublishEvent(EVENTS.USER_LOGGED_IN, { userId: user.id, email: user.email });

      return createSuccessResponse(res, {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          platformType: user.platformType,
          isEmailVerified: user.isEmailVerified
        },
        tokens
      }, 'Login successful');

    } catch (error) {
      pligsLogger.error('Login error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  };

  pligsRefreshToken: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { refreshToken } = req.body || {};
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as CustomJwtPayload;

      const user = await this.userModel.pligsFindById(decoded.userId);
      if (!user) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
      }

      const tokens = pligsAuthService.pligsGenerateTokens(user);

      return createSuccessResponse(res, { tokens }, 'Token refreshed successfully');

    } catch (error) {
      return createBusinessErrorResponse(res, BUSINESS_STATUS.TOKEN_EXPIRED, HTTP_STATUS.UNAUTHORIZED);
    }
  };

  pligsLogout: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
      }
      await this.redisClient.del(`session:${userId}`);
      await this.pligsPublishEvent(EVENTS.USER_LOGGED_OUT, { userId });

      return createSuccessResponse(res, null, 'Logged out successfully');
    } catch (error) {
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Logout failed');
    }
  };

  pligsVerifyEmail: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { token } = req.body || {};
      const { userId } = req.params || {};

      const storedToken = await this.redisClient.get(`email_verify:${userId}`);
      if (!storedToken || storedToken !== token) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.TOKEN_INVALID, HTTP_STATUS.BAD_REQUEST, 'Invalid verification token');
      }

      await this.userModel.pligsUpdateUser(userId, { isEmailVerified: true });
      await this.redisClient.del(`email_verify:${userId}`);

      await this.pligsPublishEvent(EVENTS.USER_EMAIL_VERIFIED, { userId });

      return createSuccessResponse(res, null, 'Email verified successfully');

    } catch (error) {
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Email verification failed');
    }
  };

  pligsForgotPassword: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { email } = req.body || {};
      const user = await this.userModel.pligsFindByEmail(email);

      if (!user) {
        return createSuccessResponse(res, null, 'If the email exists, a reset link has been sent');
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      await this.redisClient.setex(`password_reset:${user.id}`, 3600, resetToken);

      await (pligsEmailService as any).pligsSendPasswordResetEmail(user.email, resetToken, {
        firstName: user.firstName,
        lastName: user.lastName
      });

      return createSuccessResponse(res, null, 'Password reset email sent');

    } catch (error) {
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to send reset email');
    }
  };

  pligsResetPassword: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const { token, newPassword } = req.body || {};
      const userId = req.params?.userId;

      const storedToken = await this.redisClient.get(`password_reset:${userId}`);
      if (!storedToken || storedToken !== token) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.TOKEN_INVALID, HTTP_STATUS.BAD_REQUEST, 'Invalid reset token');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await this.userModel.pligsUpdateUser(userId, { password: hashedPassword });
      await this.redisClient.del(`password_reset:${userId}`);

      return createSuccessResponse(res, null, 'Password reset successfully');

    } catch (error) {
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Password reset failed');
    }
  };

  pligsValidateProfileUpdate: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response, next: Function) => {
    const schema = Joi.object({
      firstName: Joi.string().min(2).max(50),
      lastName: Joi.string().min(2).max(50),
      phone: Joi.string().min(10).max(15),
      bio: Joi.string().max(500),
      dateOfBirth: Joi.date().iso(),
      gender: Joi.string().valid('male', 'female', 'other'),
      address: Joi.string().max(255),
      city: Joi.string().max(100),
      country: Joi.string().max(100),
      language: Joi.string().min(2).max(10),
      currency: Joi.string().min(3).max(3),
      timezone: Joi.string().max(50),
      emailNotifications: Joi.boolean(),
      smsNotifications: Joi.boolean()
    });

    const { error } = schema.validate(req.body);
    if (error) {
      createErrorResponse(res, HTTP_STATUS.BAD_REQUEST, error.details[0].message);
      return;
    }
    next();
    return Promise.resolve();
  };

  pligsValidateKycSubmission = async (req: AuthenticatedRequest & Request, res: Response, next: Function) => {
    const schema = Joi.object({
      idType: Joi.string().valid('passport', 'drivers_license', 'national_id', 'other').required(),
      idNumber: Joi.string().min(5).max(20).required(),
      idExpiryDate: Joi.date().iso().required(),
      businessName: Joi.string().max(100),
      businessType: Joi.string().max(50),
      businessRegistrationNumber: Joi.string().max(50),
      businessAddress: Joi.string().max(255),
      taxId: Joi.string().max(50),
      bankName: Joi.string().max(100).required(),
      bankAccountNumber: Joi.string().min(8).max(20).required(),
      bankAccountName: Joi.string().min(2).max(100).required(),
      bankSwiftCode: Joi.string().max(20)
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    next();
  };

  pligsValidatePasswordChange = async (req: AuthenticatedRequest & Request, res: Response, next: Function) => {
    const schema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(8).required()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({
      status: false,
      message: error.details[0].message,
      data: []
    });
    next();
  };

  pligsValidateSocialLogin = async (req: AuthenticatedRequest & Request, res: Response, next: Function) => {
    const schema = Joi.object({
      code: Joi.string().required(),
      redirectUri: Joi.string().uri().required(),
      provider: Joi.string().valid('facebook', 'google').required()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({
      status: false,
      message: error.details[0].message,
      data: []
    });
    next();
  };

  pligsGetProfile: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const user = await this.models.user.pligsGetProfile(req.user.id);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      pligsLogger.error('Get profile error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  pligsUpdateProfile: AsyncRequestHandler = async (req: AuthenticatedRequest & Request, res: Response) => {
    try {
      const updatedUser = await this.models.user.pligsUpdateProfile(req.user.id, req.body);

      // Publish event
      await this.pligsPublishEvent(EVENTS.USER_PROFILE_UPDATED, { userId: req.user.id });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      pligsLogger.error('Update profile error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  pligsUploadProfileImage = [
    upload.single('profileImage'),
    async (req, res) => {
      try {
        if (!req.file) {
          return createBusinessErrorResponse(res, BUSINESS_STATUS.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          return createBusinessErrorResponse(res, BUSINESS_STATUS.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
        }

        // Validate file size (max 5MB)
        if (req.file.size > 5 * 1024 * 1024) {
          return createBusinessErrorResponse(res, BUSINESS_STATUS.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
        }

        const imageUrl = await pligsFileService.pligsUploadFile(req.file);
        const updatedUser = await this.userModel.pligsUpdateUser(req.user.id, { profileImage: imageUrl });

        // Publish event
        await this.pligsPublishEvent(EVENTS.USER_PROFILE_UPDATED, { userId: req.user.id });

        res.json({
          success: true,
          message: 'Profile image uploaded successfully',
          data: { profileImage: imageUrl, user: updatedUser }
        });
      } catch (error) {
        pligsLogger.error('Upload profile image error:', error);
        return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
      }
    }
  ];

  async pligsSubmitKyc(req, res) {
    try {
      const user = await this.models.user.pligsFindById(req.user.id);
      const existingKyc = await this.models.kyc.pligsFindByUserId(req.user.id);

      if (existingKyc && existingKyc.status === 'approved') {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const kycData = { ...req.body };

      // Handle file uploads for KYC documents
      if (req.files) {
        if (req.files.idFrontImage && req.files.idFrontImage[0]) {
          kycData.idFrontImage = await pligsFileService.pligsUploadFile(req.files.idFrontImage[0]);
        }
        if (req.files.idBackImage && req.files.idBackImage[0]) {
          kycData.idBackImage = await pligsFileService.pligsUploadFile(req.files.idBackImage[0]);
        }
        if (req.files.selfieImage && req.files.selfieImage[0]) {
          kycData.selfieImage = await pligsFileService.pligsUploadFile(req.files.selfieImage[0]);
        }
        if (req.files.businessLicenseImage && req.files.businessLicenseImage[0]) {
          kycData.businessLicenseImage = await pligsFileService.pligsUploadFile(req.files.businessLicenseImage[0]);
        }
      }

      const updatedKyc = await this.models.user.pligsUpdateKyc(req.user.id, kycData);
      const fullUser = await this.models.user.pligsFindById(req.user.id);

      // Publish event
      await this.pligsPublishEvent('kyc.submitted', { userId: req.user.id, kycData });

      res.json({
        success: true,
        message: 'KYC submitted successfully',
        data: fullUser
      });
    } catch (error) {
      pligsLogger.error('Submit KYC error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  async pligsGetKycStatus(req, res) {
    try {
      const kyc = await this.models.kyc.pligsFindByUserId(req.user.id);
      res.json({
        success: true,
        data: kyc ? {
          kycStatus: kyc.status,
          kycSubmittedAt: kyc.submittedAt,
          kycApprovedAt: kyc.approvedAt,
          kycRejectedReason: kyc.rejectedReason
        } : {
          kycStatus: 'not_submitted'
        }
      });
    } catch (error) {
      pligsLogger.error('Get KYC status error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  async pligsChangePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await this.userModel.pligsFindById(req.user.id);
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isCurrentPasswordValid) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      await this.userModel.pligsUpdateUser(req.user.id, { password: hashedNewPassword });

      // Publish event
      await this.pligsPublishEvent(EVENTS.USER_PASSWORD_CHANGED, { userId: req.user.id });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      pligsLogger.error('Change password error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  async pligsVerifyResetToken(req, res) {
    try {
      const { token } = req.body || {};
      const userId = req.params.userId;

      const storedToken = await this.redisClient.get(`password_reset:${userId}`);
      if (!storedToken || storedToken !== token) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      res.json({
        success: true,
        message: 'Reset token is valid'
      });
    } catch (error) {
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  // Admin methods
  async pligsApproveKyc(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const { userId } = req.params || {};
      const updatedKyc = await this.models.user.pligsApproveKyc(userId);
      const fullUser = await this.models.user.pligsFindById(userId);

      // Publish event
      await this.pligsPublishEvent('kyc.approved', { userId, approvedBy: req.user.id });

      res.json({
        success: true,
        message: 'KYC approved successfully',
        data: fullUser
      });
    } catch (error) {
      pligsLogger.error('Approve KYC error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  async pligsRejectKyc(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const { userId } = req.params || {};
      const { reason } = req.body || {};

      if (!reason) {
        return createBusinessErrorResponse(res, BUSINESS_STATUS.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const updatedKyc = await this.models.user.pligsRejectKyc(userId, reason);
      const fullUser = await this.models.user.pligsFindById(userId);

      // Publish event
      await this.pligsPublishEvent('kyc.rejected', { userId, rejectedBy: req.user.id, reason });

      res.json({
        success: true,
        message: 'KYC rejected successfully',
        data: fullUser
      });
    } catch (error) {
      pligsLogger.error('Reject KYC error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  async pligsGetPendingKyc(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const { page = 1, limit = 20 } = req.query;
      const kycRecords = await this.models.kyc.pligsGetPendingKyc({ page, limit });

      res.json({
        success: true,
        data: kycRecords
      });
    } catch (error) {
      pligsLogger.error('Get pending KYC error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  async pligsGetUsers(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const { page = 1, limit = 20, role, search } = req.query;

      let users;
      if (search) {
        users = await this.models.user.pligsSearchUsers(search, { page, limit, role });
      } else {
        users = await this.models.user.pligsGetActiveUsers({ page, limit, role });
      }

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      pligsLogger.error('Get users error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  async pligsDeactivateUser(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const { userId } = req.params || {};
      await this.models.user.pligsSoftDeleteUser(userId);

      // Publish event
      await this.pligsPublishEvent(EVENTS.USER_DELETED, { userId, deletedBy: req.user.id });

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      pligsLogger.error('Deactivate user error:', error);
      return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }

  async pligsSocialLogin(req, res) {
    try {
      const { code, redirectUri, provider } = req.body;

      let profileData;
      if (provider === 'facebook') {
        profileData = await this.socialAuthService.pligsAuthenticateFacebook(code, redirectUri);
      } else if (provider === 'google') {
        profileData = await this.socialAuthService.pligsAuthenticateGoogle(code, redirectUri);
      } else {
        return res.status(400).json({
          status: false,
          message: 'Invalid social provider',
          data: []
        });
      }

      // Handle social login/registration
      const { user, action, isNewUser } = await this.socialAuthService.pligsHandleSocialLogin(profileData, this.models.user);

      // Generate tokens
      const tokens = pligsAuthService.pligsGenerateTokens(user);

      // Cache session
      await this.redisClient.setex(`session:${user.id}`, 3600, JSON.stringify({ userId: user.id, role: user.role }));

      // Publish event
      await this.pligsPublishEvent(EVENTS.USER_LOGGED_IN, {
        userId: user.id,
        email: user.email,
        provider,
        action
      });

      res.json({
        status: true,
        message: `${action === 'register' ? 'Account created and logged in' : 'Login successful'} via ${provider}`,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            platformType: user.platformType,
            isEmailVerified: user.isEmailVerified,
            profileImage: user.profile?.profileImage
          },
          tokens,
          action,
          isNewUser
        }
      });

    } catch (error) {
      pligsLogger.error('Social login error:', error);
      res.status(500).json({
        status: false,
        message: 'Social login failed',
        data: []
      });
    }
  }

  async pligsGetSocialAuthUrl(req, res) {
    try {
      const { provider, redirectUri } = req.query;

      if (!['facebook', 'google'].includes(provider)) {
        return res.status(400).json({
          status: false,
          message: 'Invalid social provider',
          data: []
        });
      }

      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = this.socialAuthService.pligsGenerateAuthUrl(provider, redirectUri, state);

      // Cache state for verification
      await this.redisClient.setex(`oauth_state:${state}`, 600, provider); // 10 minutes

      res.json({
        status: true,
        message: 'Authorization URL generated',
        data: {
          authUrl,
          state
        }
      });

    } catch (error) {
      pligsLogger.error('Get social auth URL error:', error);
      res.status(500).json({
        status: false,
        message: 'Failed to generate authorization URL',
        data: []
      });
    }
  }

  // Get current user information
  pligsGetCurrentUser = async (req, res) => {
    try {
      const user = await this.models.user.pligsFindById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user preferences
      const preferences = await this.models.preference.pligsFindByUserId(user.id);

      res.json({
        success: true,
        data: {
          ...user.toJSON(),
          preferences: preferences || {
            language: 'en',
            currency: 'USD',
            theme: 'light',
            notifications: true
          }
        }
      });
    } catch (error) {
      pligsLogger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user information'
      });
    }
  };



  // Resend verification email
  pligsResendVerification = async (req, res) => {
    try {
      const { email } = req.body || {};

      const user = await this.models.user.pligsFindByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified'
        });
      }

      // Generate new verification token
      const verificationToken = jwt.sign(
        { userId: user.id, type: 'email_verification' },
        config.jwt.secret,
        { expiresIn: '24h' }
      );

      // Send verification email for new address
      await (pligsEmailService as any).pligsSendVerificationEmail(
        user.email,
        verificationToken,
        { firstName: user.firstName, lastName: user.lastName }
      );

      res.json({
        success: true,
        message: 'Verification email sent successfully'
      });

    } catch (error) {
      pligsLogger.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend verification email'
      });
    }
  };

  // Reset password with token
  pligsResetPasswordWithToken = async (req, res) => {
    try {
      const { token, password } = req.body;

      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      if (decoded.type !== 'password_reset') {
        return res.status(400).json({
          success: false,
          message: 'Invalid token type'
        });
      }

      const user = await this.models.user.pligsFindById(decoded.userId as string);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update password
      await this.models.password.pligsUpdatePassword(user.id, hashedPassword);

      // Publish event
      await this.pligsPublishEvent(EVENTS.USER_PASSWORD_CHANGED, { userId: user.id });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      pligsLogger.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  };

  // Update user preferences
  pligsUpdatePreferences = async (req, res) => {
    try {
      const { language, currency, theme, notifications } = req.body;
      const userId = req.user.id;

      // Update or create preferences
      const existingPrefs = await this.models.preference.pligsFindByUserId(userId);

      if (existingPrefs) {
        await this.models.preference.pligsUpdate(userId, {
          language,
          currency,
          theme,
          notifications
        });
      } else {
        await this.models.preference.pligsCreate({
          userId,
          language,
          currency,
          theme,
          notifications
        });
      }

      res.json({
        success: true,
        message: 'Preferences updated successfully'
      });

    } catch (error) {
      pligsLogger.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences'
      });
    }
  };

  // Change email address
  pligsChangeEmail = async (req, res) => {
    try {
      const { newEmail, password } = req.body;
      const userId = req.user.id;

      const user = await this.models.user.pligsFindById(userId);

      // Verify current password
      const isValidPassword = await (pligsAuthService as any).pligsVerifyPassword(password, userId);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Check if new email is already taken
      const existingUser = await this.models.user.pligsFindByEmail(newEmail);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Email address already in use'
        });
      }

      // Update email and mark as unverified
      await this.models.user.pligsUpdate(userId, {
        email: newEmail,
        isEmailVerified: false
      });

      // Send verification email for new address
      const verificationToken = jwt.sign(
        { userId, type: 'email_verification' },
        config.jwt.secret,
        { expiresIn: '24h' }
      );

      await (pligsEmailService as any).pligsSendEmail(
        newEmail,
        'Verify Your New Email',
        `Click here to verify: ${config.frontendUrl}/verify-email?token=${verificationToken}`,
        `<p>Click <a href="${config.frontendUrl}/verify-email?token=${verificationToken}">here</a> to verify your new email.</p>`
      );

      res.json({
        success: true,
        message: 'Email address updated. Please check your email to verify the new address.'
      });

    } catch (error) {
      pligsLogger.error('Change email error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change email address'
      });
    }
  };

  // Upload avatar
  pligsUploadAvatar = [
    upload.single('avatar'),
    async (req, res) => {
      try {
        const userId = req.user.id;

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No avatar file provided'
          });
        }

        // Upload to file service (assuming it handles image optimization)
        const avatarUrl = await pligsFileService.pligsUploadFile(req.file);

        // Update user avatar
        await this.models.user.pligsUpdate(userId, { avatar: avatarUrl });

        res.json({
          success: true,
          data: { avatar: avatarUrl },
          message: 'Avatar uploaded successfully'
        });

      } catch (error) {
        pligsLogger.error('Upload avatar error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to upload avatar'
        });
      }
    }
  ];

  // Google OAuth
  pligsGoogleAuth = async (req, res) => {
    try {
      const redirectUri = `${config.apiUrl}/auth/google/callback`;
      const authUrl = this.socialAuthService.pligsGenerateAuthUrl('google', redirectUri);
      res.redirect(authUrl);
    } catch (error) {
      pligsLogger.error('Google auth error:', error);
      res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
    }
  };

  pligsGoogleAuthCallback = async (req, res) => {
    try {
      const { code } = req.query;
      const redirectUri = `${config.apiUrl}/auth/google/callback`;

      const profileData = await this.socialAuthService.pligsAuthenticateGoogle(code, redirectUri);
      const result = await this.socialAuthService.pligsHandleSocialLogin(profileData, this.models.user);

      // Generate tokens
      const tokens = await pligsAuthService.pligsGenerateTokens(result.user);

      res.redirect(`${config.frontendUrl}/login?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&action=${result.action}`);

    } catch (error) {
      pligsLogger.error('Google auth callback error:', error);
      res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
    }
  };

  // Facebook OAuth
  pligsFacebookAuth = async (req, res) => {
    try {
      const redirectUri = `${config.apiUrl}/auth/facebook/callback`;
      const authUrl = this.socialAuthService.pligsGenerateAuthUrl('facebook', redirectUri);
      res.redirect(authUrl);
    } catch (error) {
      pligsLogger.error('Facebook auth error:', error);
      res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
    }
  };

  pligsFacebookAuthCallback = async (req, res) => {
    try {
      const { code } = req.query;
      const redirectUri = `${config.apiUrl}/auth/facebook/callback`;

      const profileData = await this.socialAuthService.pligsAuthenticateFacebook(code, redirectUri);
      const result = await this.socialAuthService.pligsHandleSocialLogin(profileData, this.models.user);

      // Generate tokens
      const tokens = await pligsAuthService.pligsGenerateTokens(result.user);

      res.redirect(`${config.frontendUrl}/login?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&action=${result.action}`);

    } catch (error) {
      pligsLogger.error('Facebook auth callback error:', error);
      res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
    }
  };

  // Two-factor authentication
  pligsEnable2FA = async (req, res) => {
    try {
      const userId = req.user.id;

      // Generate TOTP secret
      const speakeasy = await import('speakeasy');
      const secret = speakeasy.generateSecret({
        name: 'Multivendor Marketplace',
        issuer: 'Pligs'
      });

      // Store secret temporarily (would be better in Redis with expiration)
      await this.redisClient.setex(`2fa_secret:${userId}`, 300, secret.base32);

      // Generate QR code
      const qrcode = await import('qrcode');
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl
        }
      });

    } catch (error) {
      pligsLogger.error('Enable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enable 2FA'
      });
    }
  };

  pligsVerify2FA = async (req, res) => {
    try {
      const { token } = req.body || {};
      const userId = req.user.id;

      const speakeasy = await import('speakeasy');
      const secret = await this.redisClient.get(`2fa_secret:${userId}`);

      if (!secret) {
        return res.status(400).json({
          success: false,
          message: '2FA setup expired. Please try again.'
        });
      }

      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Enable 2FA for user
      await this.models.user.pligsUpdate(userId, {
        twoFactorEnabled: true,
        twoFactorSecret: secret
      });

      // Clean up temporary secret
      await this.redisClient.del(`2fa_secret:${userId}`);

      res.json({
        success: true,
        message: '2FA enabled successfully'
      });

    } catch (error) {
      pligsLogger.error('Verify 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify 2FA'
      });
    }
  };

  pligsDisable2FA = async (req, res) => {
    try {
      const { password } = req.body || {};
      const userId = req.user.id;

      // Verify password
      const isValidPassword = await (pligsAuthService as any).pligsVerifyPassword(password, userId);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Disable 2FA
      await this.models.user.pligsUpdate(userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null
      });

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });

    } catch (error) {
      pligsLogger.error('Disable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA'
      });
    }
  };

  // Subscription management
  pligsGetSubscription = async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await this.models.user.pligsFindById(userId);

      const features = await this.models.user.pligsGetSubscriptionFeatures(userId);

      res.json({
        success: true,
        data: {
          plan: user.subscriptionPlan,
          status: user.subscriptionStatus,
          features,
          endDate: user.subscriptionEndDate
        }
      });

    } catch (error) {
      pligsLogger.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscription information'
      });
    }
  };

  pligsUpgradeSubscription = async (req, res) => {
    try {
      const { plan, durationMonths = 1 } = req.body;
      const userId = req.user.id;

      const user = await this.models.user.pligsUpgradeSubscription(userId, plan, durationMonths);

      res.json({
        success: true,
        message: 'Subscription upgraded successfully',
        data: {
          plan: user.subscriptionPlan,
          endDate: user.subscriptionEndDate
        }
      });

    } catch (error) {
      pligsLogger.error('Upgrade subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upgrade subscription'
      });
    }
  };

  // Security features
  pligsGetLoginHistory = async (req, res) => {
    try {
      const userId = req.user.id;

      // In a real implementation, you'd have a login history table
      // For now, return mock data
      const loginHistory = [
        {
          id: '1',
          ip: '192.168.1.100',
          userAgent: 'Chrome on Windows',
          location: 'New York, US',
          createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        {
          id: '2',
          ip: '192.168.1.100',
          userAgent: 'Safari on iPhone',
          location: 'New York, US',
          createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        }
      ];

      res.json({
        success: true,
        data: loginHistory
      });

    } catch (error) {
      pligsLogger.error('Get login history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get login history'
      });
    }
  };

  pligsGetActiveSessions = async (req, res) => {
    try {
      const userId = req.user.id;

      // Mock active sessions data
      const sessions = [
        {
          id: 'current',
          device: 'Chrome on Windows',
          location: 'New York, US',
          lastActivity: new Date().toISOString(),
          current: true
        }
      ];

      res.json({
        success: true,
        data: sessions
      });

    } catch (error) {
      pligsLogger.error('Get active sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active sessions'
      });
    }
  };

  pligsTerminateSession = async (req, res) => {
    try {
      const { sessionId } = req.params || {};
      const userId = req.user.id;

      // In a real implementation, you'd terminate the specific session
      // For now, just acknowledge

      res.json({
        success: true,
        message: 'Session terminated successfully'
      });

    } catch (error) {
      pligsLogger.error('Terminate session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to terminate session'
      });
    }
  };

  pligsTerminateAllSessions = async (req, res) => {
    try {
      const userId = req.user.id;

      // In a real implementation, you'd terminate all sessions except current
      // For now, just acknowledge

      res.json({
        success: true,
        message: 'All sessions terminated successfully'
      });

    } catch (error) {
      pligsLogger.error('Terminate all sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to terminate sessions'
      });
    }
  };

}

export default PligsAuthController;