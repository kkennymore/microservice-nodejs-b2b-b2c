// backend/services/auth/models/UserBusiness.js
import { DataTypes } from 'sequelize';

/**
 * UserBusiness Model
 * Handles business information for sellers and service providers
 * Stores company details, registration, and business documents
 */
class PligsUserBusiness {
  constructor(sequelize) {
    this.model = sequelize.define('UserBusiness', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for business record'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'Foreign key reference to users table',
        unique: true // One business record per user
      },
      businessName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Legal business name or company name'
      },
      businessType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Type of business (e.g., LLC, Corporation, Sole Proprietorship)'
      },
      businessRegistrationNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Official business registration number'
      },
      businessAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Complete business address including street, city, state, zip'
      },
      taxId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Business tax identification number'
      },
      businessLicenseImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL/path to business license document image'
      },
      // Additional business information
      industry: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Business industry or sector'
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Business website URL'
      },
      employeeCount: {
        type: DataTypes.ENUM('1-10', '11-50', '51-200', '201-500', '500+'),
        allowNull: true,
        comment: 'Approximate number of employees'
      },
      annualRevenue: {
        type: DataTypes.ENUM('<$100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M+'),
        allowNull: true,
        comment: 'Annual revenue range'
      },
      // Contact information for business
      businessPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Business phone number (different from personal)'
      },
      businessEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        },
        comment: 'Business email address'
      },
      // Verification fields
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether business information has been verified'
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when business was verified'
      },
      verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Admin user ID who verified business info'
      },
      // Additional documents
      taxCertificateImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL/path to tax certificate document'
      },
      incorporationDocumentImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL/path to incorporation documents'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Business record creation timestamp'
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Business record last update timestamp'
      }
    }, {
      tableName: 'user_business',
      comment: 'Business information for sellers and service providers',
      indexes: [
        { fields: ['userId'], unique: true, comment: 'Ensure one business record per user' },
        { fields: ['businessName'], comment: 'Index for business name searches' },
        { fields: ['businessRegistrationNumber'], comment: 'Index for registration number lookups' },
        { fields: ['taxId'], comment: 'Index for tax ID searches' },
        { fields: ['isVerified'], comment: 'Index for verified business filtering' },
        { fields: ['industry'], comment: 'Index for industry-based queries' }
      ]
    });
  }

  /**
   * Get the Sequelize model instance
   * @returns {Object} Sequelize model
   */
  pligsGetModel() {
    return this.model;
  }

  /**
   * Find business record by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Business object or null
   */
  async pligsFindByUserId(userId) {
    return await this.model.findOne({
      where: { userId }
    });
  }

  /**
   * Create or update business information
   * @param {string} userId - User ID
   * @param {Object} businessData - Business data to save
   * @returns {Object} Created/updated business record
   */
  async pligsUpsertBusiness(userId, businessData) {
    const [business, created] = await this.model.upsert({
      userId,
      ...businessData
    }, {
      returning: true
    });
    return business;
  }

  /**
   * Update business information
   * @param {string} userId - User ID
   * @param {Object} updateData - Fields to update
   * @returns {Object} Updated business record
   */
  async pligsUpdateBusiness(userId, updateData) {
    const business = await this.pligsFindByUserId(userId);
    if (!business) {
      return await this.pligsUpsertBusiness(userId, updateData);
    }
    return await business.update(updateData);
  }

  /**
   * Verify business information
   * @param {string} userId - User ID
   * @param {string} adminId - Admin user ID performing verification
   * @returns {Object} Updated business record
   */
  async pligsVerifyBusiness(userId, adminId) {
    const business = await this.pligsFindByUserId(userId);
    if (!business) throw new Error('Business record not found');

    return await business.update({
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: adminId
    });
  }

  /**
   * Get businesses by verification status
   * @param {boolean} isVerified - Verification status
   * @param {Object} options - Pagination options
   * @returns {Object} Paginated business records
   */
  async pligsGetBusinessesByVerificationStatus(isVerified, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return await this.model.findAndCountAll({
      where: { isVerified },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: this.model.sequelize.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });
  }

  /**
   * Search businesses by name or industry
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async pligsSearchBusinesses(query, options = {}) {
    const { page = 1, limit = 20, industry } = options;
    const offset = (page - 1) * limit;

    const where = {
      [this.model.sequelize.Op.or]: [
        { businessName: { [this.model.sequelize.Op.like]: `%${query}%` } },
        { industry: { [this.model.sequelize.Op.like]: `%${query}%` } }
      ]
    };

    if (industry) where.industry = industry;

    return await this.model.findAndCountAll({
      where,
      limit,
      offset,
      order: [['businessName', 'ASC']],
      include: [{
        model: this.model.sequelize.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });
  }

  /**
   * Get business statistics
   * @returns {Object} Business statistics
   */
  async pligsGetBusinessStats() {
    const [totalBusinesses, verifiedBusinesses, industryStats] = await Promise.all([
      this.model.count(),
      this.model.count({ where: { isVerified: true } }),
      this.model.findAll({
        attributes: [
          'industry',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('industry')), 'count']
        ],
        where: {
          industry: { [this.model.sequelize.Op.ne]: null }
        },
        group: ['industry'],
        order: [[this.model.sequelize.literal('count'), 'DESC']],
        limit: 10
      })
    ]);

    return {
      totalBusinesses,
      verifiedBusinesses,
      unverifiedBusinesses: totalBusinesses - verifiedBusinesses,
      topIndustries: industryStats.map(stat => ({
        industry: stat.dataValues.industry,
        count: parseInt(stat.dataValues.count)
      }))
    };
  }
}

export default PligsUserBusiness;