// backend/services/auth/models/User.ts
import { DataTypes, Sequelize, Model, ModelStatic } from 'sequelize';
import { IUserAttributes, IUserCreationAttributes } from '../interfaces/IUser';
import { IUserRepository } from '../interfaces/IUserRepository';

class PligsUser implements IUserRepository {
  model: ModelStatic<Model<IUserAttributes, IUserCreationAttributes>>;

  constructor(sequelize: Sequelize) {
    // Define the main users table with core authentication fields
    this.model = sequelize.define<Model<IUserAttributes, IUserCreationAttributes>>('User', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for each user'
      },
      username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        comment: 'Unique username chosen by user'
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true
        },
        comment: 'User email address, must be unique and valid'
      },

      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'User first name'
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'User last name'
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'User phone number with country code'
      },
      role: {
        type: DataTypes.ENUM('buyer', 'seller', 'admin', 'delivery_partner'),
        defaultValue: 'buyer'
      },
      platformType: {
        type: DataTypes.ENUM('local', 'facebook', 'google'),
        defaultValue: 'local',
        comment: 'Platform type indicating how user registered (local, facebook, google)'
      },
      // Social media fields
      socialId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Social media platform user ID (Facebook/Google ID)'
      },
      socialProvider: {
        type: DataTypes.ENUM('facebook', 'google'),
        allowNull: true,
        comment: 'Social media provider name'
      },
      socialProfileData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Complete social profile data from OAuth provider'
      },
      isEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether user has verified their email address'
      },
      isPhoneVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether user has verified their phone number'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether user account is active (not suspended)'
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of user last successful login'
      },
      subscriptionPlan: {
        type: DataTypes.ENUM('free', 'silver', 'gold', 'platinum'),
        defaultValue: 'free',
        comment: 'User subscription plan'
      },
      subscriptionStartDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the current subscription started'
      },
      subscriptionEndDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the current subscription expires'
      },
      subscriptionStatus: {
        type: DataTypes.ENUM('active', 'expired', 'cancelled', 'trial'),
        defaultValue: 'trial',
        comment: 'Current subscription status'
      },
      twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether 2FA is enabled for this user'
      },
      twoFactorSecret: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'TOTP secret for 2FA'
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of user last successful login'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Account creation timestamp'
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Last account update timestamp'
      }
    }, {
      tableName: 'users',
      comment: 'Main users table containing core authentication and basic user information',
      indexes: [
        { fields: ['email'], comment: 'Index for fast email lookups during login' },
        { fields: ['username'], comment: 'Index for username uniqueness checks' },
        { fields: ['role'], comment: 'Index for filtering users by role' },
        { fields: ['isActive'], comment: 'Index for active user queries' },
        { fields: ['phone'], comment: 'Index for phone number searches' },
        { fields: ['subscriptionPlan'], comment: 'Index for subscription plan queries' },
        { fields: ['subscriptionStatus'], comment: 'Index for subscription status queries' },
        { fields: ['subscriptionEndDate'], comment: 'Index for subscription expiry queries' }
      ]
    });

    // Define associations with related tables
    this.associateModels(sequelize);
  }

  // Method to define relationships with other models
  associateModels(sequelize) {
    // Import related models
    const UserPassword = sequelize.models.UserPassword;
    const UserProfile = sequelize.models.UserProfile;
    const UserKyc = sequelize.models.UserKyc;
    const UserBusiness = sequelize.models.UserBusiness;
    const UserBank = sequelize.models.UserBank;
    const UserSecurity = sequelize.models.UserSecurity;
    const UserPreference = sequelize.models.UserPreference;

    // Define one-to-one relationships
    if (UserPassword) {
      this.model.hasOne(UserPassword, {
        foreignKey: 'userId',
        as: 'password',
        onDelete: 'CASCADE'
      });
    }

    if (UserProfile) {
      this.model.hasOne(UserProfile, {
        foreignKey: 'userId',
        as: 'profile',
        onDelete: 'CASCADE'
      });
    }

    if (UserKyc) {
      this.model.hasOne(UserKyc, {
        foreignKey: 'userId',
        as: 'kyc',
        onDelete: 'CASCADE'
      });
    }

    if (UserBusiness) {
      this.model.hasOne(UserBusiness, {
        foreignKey: 'userId',
        as: 'business',
        onDelete: 'CASCADE'
      });
    }

    if (UserBank) {
      this.model.hasOne(UserBank, {
        foreignKey: 'userId',
        as: 'bank',
        onDelete: 'CASCADE'
      });
    }

    if (UserSecurity) {
      this.model.hasOne(UserSecurity, {
        foreignKey: 'userId',
        as: 'security',
        onDelete: 'CASCADE'
      });
    }

    if (UserPreference) {
      this.model.hasOne(UserPreference, {
        foreignKey: 'userId',
        as: 'preferences',
        onDelete: 'CASCADE'
      });
    }
  }

  // Get the Sequelize model instance
  pligsGetModel() {
    return this.model;
  }

  // Business logic methods with detailed comments

  /**
    * Find user by email address
    * @param email - User's email address
    * @returns User object or null if not found
    */
  async pligsFindByEmail(email: string): Promise<any> {
    return await this.model.findOne({
      where: { email },
      include: this.getAllAssociations()
    });
  }

  /**
   * Find user by username
   * @param {string} username - User's username
   * @returns {Object|null} User object or null if not found
   */
  async pligsFindByUsername(username) {
    return await this.model.findOne({
      where: { username },
      include: this.getAllAssociations()
    });
  }

  /**
   * Find user by phone number
   * @param {string} phone - User's phone number
   * @returns {Object|null} User object or null if not found
   */
  /**
   * Find user by social ID and provider
   * @param {string} socialId - Social media user ID
   * @param {string} provider - Social provider (facebook/google)
   * @returns {Object|null} User object or null if not found
   */
  async pligsFindBySocialId(socialId, provider) {
    return await this.model.findOne({
      where: { socialId, platformType: provider },
      include: this.getAllAssociations()
    });
  }

  /**
   * Update user with social login data
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  async pligsUpdateUser(userId, updateData) {
    const user = await this.model.findByPk(userId);
    if (!user) throw new Error('User not found');
    return await user.update(updateData);
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  async pligsCreateUser(userData) {
    return await this.model.create(userData);
  }

  /**
   * Update user by ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  async pligsUpdate(id, updateData) {
    const user = await this.model.findByPk(id);
    if (!user) throw new Error('User not found');
    return await user.update(updateData);
  }

  /**
   * Find user by ID with associations
   * @param {string} id - User ID
   * @returns {Object|null} User object or null if not found
   */
  async pligsFindById(id) {
    return await this.model.findByPk(id, {
      include: this.getAllAssociations()
    });
  }

  async pligsFindByPhone(phone) {
    return await this.model.findOne({
      where: { phone },
      include: this.getAllAssociations()
    });
  }

  /**
   * Find user by social media ID and provider
   * @param {string} socialId - Social media user ID
   * @param {string} provider - Social media provider (facebook/google)
   * @returns {Object|null} User object or null if not found
   */
  async pligsFindBySocialId(socialId, provider) {
    return await this.model.findOne({
      where: {
        socialId,
        socialProvider: provider
      },
      include: this.getAllAssociations()
    });
  }

  /**
   * Find user by unique ID
   * @param {string} id - User's UUID
   * @returns {Object|null} User object or null if not found
   */
  async pligsFindById(id) {
    return await this.model.findByPk(id, {
      include: this.getAllAssociations()
    });
  }

  /**
   * Create a new user with basic information
   * @param {Object} userData - User data object
   * @returns {Object} Created user object
   */
  async pligsCreateUser(userData) {
    return await this.model.create(userData);
  }

  /**
   * Create a new social media user
   * @param {Object} socialUserData - Social user data
   * @returns {Object} Created user object
   */
  async pligsCreateSocialUser(socialUserData) {
    const { socialId, socialProvider, socialProfileData, ...userData } = socialUserData;

    return await this.model.create({
      ...userData,
      platformType: socialProvider.toLowerCase(),
      socialId,
      socialProvider,
      socialProfileData,
      isEmailVerified: true // Social logins are pre-verified
    });
  }

  /**
   * Update user information
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user object
   */
  async pligsUpdateUser(id, updateData) {
    const user = await this.model.findByPk(id);
    if (!user) throw new Error('User not found');
    return await user.update(updateData);
  }

  /**
   * Soft delete user (mark as inactive)
   * @param {string} id - User ID
   */
  async pligsSoftDeleteUser(id) {
    const user = await this.model.findByPk(id);
    if (!user) throw new Error('User not found');
    return await user.update({ isActive: false });
  }

  /**
   * Get active users with pagination
   * @param {Object} options - Query options
   * @returns {Object} Paginated user results
   */
  async pligsGetActiveUsers(options = {}) {
    const { page = 1, limit = 20, role } = options;
    const offset = (page - 1) * limit;
    const where = { isActive: true };

    if (role) where.role = role;

    return await this.model.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: this.getAllAssociations()
    });
  }

  /**
   * Get users by role
   * @param {string} role - User role to filter by
   * @param {Object} options - Pagination options
   * @returns {Object} Paginated user results
   */
  async pligsGetUsersByRole(role, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return await this.model.findAndCountAll({
      where: { role, isActive: true },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: this.getAllAssociations()
    });
  }

  /**
   * Get users by KYC status
   * @param {string} status - KYC status to filter by
   * @param {Object} options - Pagination options
   * @returns {Object} Paginated user results
   */
  async pligsGetUsersByKycStatus(status, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return await this.model.findAndCountAll({
      where: { isActive: true },
      include: [{
        model: this.model.sequelize.models.UserKyc,
        as: 'kyc',
        where: { status },
        required: true
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Submit KYC information for user
   * @param {string} id - User ID
   * @param {Object} kycData - KYC data to submit
   * @returns {Object} Updated user with KYC info
   */
  async pligsSubmitKyc(id, kycData) {
    const user = await this.model.findByPk(id, {
      include: [{ model: this.model.sequelize.models.UserKyc, as: 'kyc' }]
    });
    if (!user) throw new Error('User not found');

    // Update or create KYC record
    if (user.kyc) {
      await user.kyc.update({
        ...kycData,
        status: 'pending',
        submittedAt: new Date()
      });
    } else {
      await this.model.sequelize.models.UserKyc.create({
        userId: id,
        ...kycData,
        status: 'pending',
        submittedAt: new Date()
      });
    }

    return await this.pligsFindById(id);
  }

  /**
   * Approve user's KYC application
   * @param {string} id - User ID
   * @returns {Object} Updated user with approved KYC
   */
  async pligsApproveKyc(id) {
    const user = await this.model.findByPk(id, {
      include: [{ model: this.model.sequelize.models.UserKyc, as: 'kyc' }]
    });
    if (!user || !user.kyc) throw new Error('User or KYC not found');

    await user.kyc.update({
      status: 'approved',
      approvedAt: new Date(),
      rejectedReason: null
    });

    return await this.pligsFindById(id);
  }

  /**
   * Reject user's KYC application
   * @param {string} id - User ID
   * @param {string} reason - Rejection reason
   * @returns {Object} Updated user with rejected KYC
   */
  async pligsRejectKyc(id, reason) {
    const user = await this.model.findByPk(id, {
      include: [{ model: this.model.sequelize.models.UserKyc, as: 'kyc' }]
    });
    if (!user || !user.kyc) throw new Error('User or KYC not found');

    await user.kyc.update({
      status: 'rejected',
      rejectedReason: reason
    });

    return await this.pligsFindById(id);
  }

  /**
   * Increment failed login attempts for user
   * @param {string} id - User ID
   */
  async pligsIncrementLoginAttempts(id) {
    const user = await this.model.findByPk(id, {
      include: [{ model: this.model.sequelize.models.UserSecurity, as: 'security' }]
    });
    if (!user) throw new Error('User not found');

    // Update or create security record
    if (user.security) {
      const newAttempts = user.security.loginAttempts + 1;
      const updateData = { loginAttempts: newAttempts };

      // Lock account after 5 failed attempts
      if (newAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      }

      await user.security.update(updateData);
    } else {
      await this.model.sequelize.models.UserSecurity.create({
        userId: id,
        loginAttempts: 1,
        lockedUntil: null
      });
    }
  }

  /**
   * Reset login attempts and unlock account
   * @param {string} id - User ID
   */
  async pligsResetLoginAttempts(id) {
    const user = await this.model.findByPk(id, {
      include: [{ model: this.model.sequelize.models.UserSecurity, as: 'security' }]
    });
    if (!user) throw new Error('User not found');

    if (user.security) {
      await user.security.update({
        loginAttempts: 0,
        lockedUntil: null
      });
    }
  }

  /**
   * Check if user account is locked
   * @param {string} id - User ID
   * @returns {boolean} True if account is locked
   */
  async pligsIsAccountLocked(id) {
    const user = await this.model.findByPk(id, {
      include: [{ model: this.model.sequelize.models.UserSecurity, as: 'security' }]
    });
    if (!user || !user.security) return false;

    if (user.security.lockedUntil && user.security.lockedUntil > new Date()) {
      return true;
    }

    // Reset if lock period has passed
    if (user.security.lockedUntil && user.security.lockedUntil <= new Date()) {
      await this.pligsResetLoginAttempts(id);
    }

    return false;
  }

  /**
   * Update user profile information
   * @param {string} id - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Object} Updated user with profile info
   */
  async pligsUpdateProfile(id, profileData) {
    const user = await this.model.findByPk(id, {
      include: [{ model: this.model.sequelize.models.UserProfile, as: 'profile' }]
    });
    if (!user) throw new Error('User not found');

    // Update or create profile record
    if (user.profile) {
      await user.profile.update(profileData);
    } else {
      await this.model.sequelize.models.UserProfile.create({
        userId: id,
        ...profileData
      });
    }

    return await this.pligsFindById(id);
  }

  /**
   * Update user KYC information
   * @param {string} id - User ID
   * @param {Object} kycData - KYC data to update
   * @returns {Object} Updated user with KYC info
   */
  async pligsUpdateKyc(id, kycData) {
    return await this.pligsSubmitKyc(id, kycData);
  }

  /**
   * Get sanitized user profile for API responses
   * @param {string} id - User ID
   * @returns {Object} Sanitized user object
   */
  async pligsGetProfile(id) {
    const user = await this.model.findByPk(id, {
      attributes: {
        exclude: ['password']
      },
      include: this.getAllAssociations()
    });

    if (!user) throw new Error('User not found');
    return user;
  }

  /**
   * Search users by various criteria
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async pligsSearchUsers(query, options = {}) {
    const { page = 1, limit = 20, role } = options;
    const offset = (page - 1) * limit;

    const where = {
      isActive: true,
      [this.model.sequelize.Op.or]: [
        { firstName: { [this.model.sequelize.Op.like]: `%${query}%` } },
        { lastName: { [this.model.sequelize.Op.like]: `%${query}%` } },
        { email: { [this.model.sequelize.Op.like]: `%${query}%` } },
        { username: { [this.model.sequelize.Op.like]: `%${query}%` } }
      ]
    };

    if (role) where.role = role;

    return await this.model.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: {
        exclude: ['password']
      },
      include: this.getAllAssociations()
    });
  }

  /**
   * Get all model associations for eager loading
   * @returns {Array} Array of association objects
   */
  getAllAssociations() {
    return [
      {
        model: this.model.sequelize.models.UserProfile,
        as: 'profile',
        required: false
      },
      {
        model: this.model.sequelize.models.UserKyc,
        as: 'kyc',
        required: false
      },
      {
        model: this.model.sequelize.models.UserBusiness,
        as: 'business',
        required: false
      },
      {
        model: this.model.sequelize.models.UserBank,
        as: 'bank',
        required: false
      },
      {
        model: this.model.sequelize.models.UserSecurity,
        as: 'security',
        required: false
      },
      {
        model: this.model.sequelize.models.UserPreference,
        as: 'preferences',
        required: false
      }
    ];
  }

  /**
   * Get subscription features for a user
   * @param {string} userId - User ID
   * @returns {Object} Subscription features
   */
  async pligsGetSubscriptionFeatures(userId) {
    const user = await this.model.findByPk(userId);
    if (!user) return null;

    const plans = {
      free: {
        productsPerDay: 1,
        videoUploads: false,
        directContact: false,
        prioritySupport: false,
        analytics: false,
        customBranding: false
      },
      silver: {
        productsPerDay: 10,
        videoUploads: true,
        directContact: false,
        prioritySupport: false,
        analytics: true,
        customBranding: false
      },
      gold: {
        productsPerDay: 50,
        videoUploads: true,
        directContact: true,
        prioritySupport: true,
        analytics: true,
        customBranding: false
      },
      platinum: {
        productsPerDay: -1, // unlimited
        videoUploads: true,
        directContact: true,
        prioritySupport: true,
        analytics: true,
        customBranding: true
      }
    };

    return plans[user.subscriptionPlan] || plans.free;
  }

  /**
   * Upgrade user subscription
   * @param {string} userId - User ID
   * @param {string} plan - New subscription plan
   * @param {number} durationMonths - Subscription duration in months
   * @returns {Object} Updated user
   */
  async pligsUpgradeSubscription(userId, plan, durationMonths = 1) {
    const user = await this.model.findByPk(userId);
    if (!user) throw new Error('User not found');

    const validPlans = ['free', 'silver', 'gold', 'platinum'];
    if (!validPlans.includes(plan)) {
      throw new Error('Invalid subscription plan');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    return await user.update({
      subscriptionPlan: plan,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      subscriptionStatus: 'active'
    });
  }

  /**
   * Check if user subscription is active
   * @param {string} userId - User ID
   * @returns {boolean} Whether subscription is active
   */
  async pligsIsSubscriptionActive(userId) {
    const user = await this.model.findByPk(userId);
    if (!user) return false;

    if (user.subscriptionPlan === 'free') return true;

    const now = new Date();
    return user.subscriptionStatus === 'active' &&
           user.subscriptionEndDate &&
           user.subscriptionEndDate > now;
  }

  /**
   * Get users by subscription plan
   * @param {string} plan - Subscription plan
   * @param {Object} options - Query options
   * @returns {Array} Users with the specified plan
   */
  async pligsGetUsersBySubscription(plan, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return await this.model.findAndCountAll({
      where: {
        subscriptionPlan: plan,
        subscriptionStatus: 'active'
      },
      limit,
      offset,
      order: [['subscriptionEndDate', 'ASC']]
    });
  }
}

export default PligsUser;