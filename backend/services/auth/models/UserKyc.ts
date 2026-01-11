// backend/services/auth/models/UserKyc.js
import { DataTypes } from 'sequelize';

/**
 * UserKyc Model
 * Handles Know Your Customer (KYC) verification information
 * Stores personal identification documents and verification status
 */
class PligsUserKyc {
  constructor(sequelize) {
    this.model = sequelize.define('UserKyc', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for KYC record'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'Foreign key reference to users table',
        unique: true // One KYC record per user
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'not_submitted'),
        defaultValue: 'not_submitted',
        comment: 'Current KYC verification status'
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when KYC was submitted'
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when KYC was approved'
      },
      rejectedReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason for KYC rejection if applicable'
      },
      // Personal Identification Information
      idType: {
        type: DataTypes.ENUM('passport', 'drivers_license', 'national_id', 'other'),
        allowNull: true,
        comment: 'Type of identification document'
      },
      idNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Identification document number'
      },
      idExpiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expiration date of identification document'
      },
      idFrontImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL/path to front image of ID document'
      },
      idBackImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL/path to back image of ID document'
      },
      selfieImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL/path to user selfie for verification'
      },
      // Additional verification fields
      verificationCode: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'OTP code sent for verification'
      },
      verificationCodeExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expiration time for verification code'
      },
      verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Admin user ID who verified this KYC'
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when verification was completed'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'KYC record creation timestamp'
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'KYC record last update timestamp'
      }
    }, {
      tableName: 'user_kyc',
      comment: 'KYC verification information and document storage',
      indexes: [
        { fields: ['userId'], unique: true, comment: 'Ensure one KYC record per user' },
        { fields: ['status'], comment: 'Index for filtering by verification status' },
        { fields: ['submittedAt'], comment: 'Index for submission date queries' },
        { fields: ['approvedAt'], comment: 'Index for approval date queries' },
        { fields: ['idNumber'], comment: 'Index for ID number searches' },
        { fields: ['verifiedBy'], comment: 'Index for admin verification tracking' }
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
   * Find KYC record by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} KYC object or null
   */
  async pligsFindByUserId(userId) {
    return await this.model.findOne({
      where: { userId }
    });
  }

  /**
   * Get all pending KYC applications
   * @param {Object} options - Pagination options
   * @returns {Object} Paginated KYC records
   */
  async pligsGetPendingKyc(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return await this.model.findAndCountAll({
      where: { status: 'pending' },
      limit,
      offset,
      order: [['submittedAt', 'ASC']],
      include: [{
        model: this.model.sequelize.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });
  }

  /**
   * Submit or update KYC information
   * @param {string} userId - User ID
   * @param {Object} kycData - KYC data to submit
   * @returns {Object} Created/updated KYC record
   */
  async pligsSubmitKyc(userId, kycData) {
    const [kyc, created] = await this.model.upsert({
      userId,
      ...kycData,
      status: 'pending',
      submittedAt: new Date()
    }, {
      returning: true
    });
    return kyc;
  }

  /**
   * Approve KYC application
   * @param {string} userId - User ID
   * @param {string} adminId - Admin user ID performing approval
   * @returns {Object} Updated KYC record
   */
  async pligsApproveKyc(userId, adminId) {
    const kyc = await this.pligsFindByUserId(userId);
    if (!kyc) throw new Error('KYC record not found');

    return await kyc.update({
      status: 'approved',
      approvedAt: new Date(),
      verifiedBy: adminId,
      verifiedAt: new Date(),
      rejectedReason: null
    });
  }

  /**
   * Reject KYC application
   * @param {string} userId - User ID
   * @param {string} adminId - Admin user ID performing rejection
   * @param {string} reason - Rejection reason
   * @returns {Object} Updated KYC record
   */
  async pligsRejectKyc(userId, adminId, reason) {
    const kyc = await this.pligsFindByUserId(userId);
    if (!kyc) throw new Error('KYC record not found');

    return await kyc.update({
      status: 'rejected',
      rejectedReason: reason,
      verifiedBy: adminId,
      verifiedAt: new Date()
    });
  }

  /**
   * Generate and store verification code
   * @param {string} userId - User ID
   * @returns {string} Generated verification code
   */
  async pligsGenerateVerificationCode(userId) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.model.upsert({
      userId,
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt
    });

    return code;
  }

  /**
   * Verify KYC code
   * @param {string} userId - User ID
   * @param {string} code - Verification code
   * @returns {boolean} Verification success
   */
  async pligsVerifyCode(userId, code) {
    const kyc = await this.pligsFindByUserId(userId);
    if (!kyc || !kyc.verificationCode) return false;

    if (kyc.verificationCode !== code) return false;
    if (kyc.verificationCodeExpiresAt < new Date()) return false;

    // Clear the verification code after successful verification
    await kyc.update({
      verificationCode: null,
      verificationCodeExpiresAt: null
    });

    return true;
  }

  /**
   * Get KYC statistics for admin dashboard
   * @returns {Object} KYC status counts
   */
  async pligsGetKycStats() {
    const stats = await this.model.findAll({
      attributes: [
        'status',
        [this.model.sequelize.fn('COUNT', this.model.sequelize.col('status')), 'count']
      ],
      group: ['status']
    });

    const result = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      not_submitted: 0
    };

    stats.forEach(stat => {
      result[stat.dataValues.status] = parseInt(stat.dataValues.count);
      result.total += parseInt(stat.dataValues.count);
    });

    return result;
  }
}

export default PligsUserKyc;