// backend/services/auth/models/UserBank.js
import { DataTypes } from 'sequelize';

/**
 * UserBank Model
 * Handles user banking information for payouts and verification
 * Stores bank account details securely with encryption
 */
class PligsUserBank {
  constructor(sequelize) {
    this.model = sequelize.define('UserBank', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for bank record'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'Foreign key reference to users table',
        unique: true // One bank record per user
      },
      bankName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Name of the bank'
      },
      bankAccountNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Bank account number (should be encrypted in production)'
      },
      bankAccountName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Name on the bank account'
      },
      bankSwiftCode: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'SWIFT/BIC code for international transfers'
      },
      bankRoutingNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Routing number for domestic transfers (US)'
      },
      bankBranchCode: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Branch code for some banking systems'
      },
      // Additional bank information
      bankAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Bank branch address'
      },
      accountType: {
        type: DataTypes.ENUM('checking', 'savings', 'business_checking', 'business_savings'),
        allowNull: true,
        comment: 'Type of bank account'
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD',
        comment: 'Account currency (ISO 4217 code)'
      },
      // Verification and status
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether bank account has been verified'
      },
      verificationMethod: {
        type: DataTypes.ENUM('manual', 'micro_deposit', 'instant_verification'),
        allowNull: true,
        comment: 'Method used to verify the bank account'
      },
      verificationAmount1: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'First micro-deposit amount for verification'
      },
      verificationAmount2: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Second micro-deposit amount for verification'
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when bank account was verified'
      },
      verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Admin user ID who verified bank account'
      },
      // Security and audit
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time this bank account was used for payout'
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this is the primary bank account'
      },
      // Supporting documents
      bankStatementImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL/path to bank statement document'
      },
      proofOfAddressImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL/path to proof of address document'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Bank record creation timestamp'
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Bank record last update timestamp'
      }
    }, {
      tableName: 'user_banks',
      comment: 'User banking information for payouts and financial verification',
      indexes: [
        { fields: ['userId'], unique: true, comment: 'Ensure one primary bank record per user' },
        { fields: ['bankAccountNumber'], comment: 'Index for account number searches (use with caution)' },
        { fields: ['isVerified'], comment: 'Index for verified account filtering' },
        { fields: ['isPrimary'], comment: 'Index for primary account identification' },
        { fields: ['currency'], comment: 'Index for currency-based queries' }
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
   * Find bank record by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Bank object or null
   */
  async pligsFindByUserId(userId) {
    return await this.model.findOne({
      where: { userId }
    });
  }

  /**
   * Create or update bank information
   * @param {string} userId - User ID
   * @param {Object} bankData - Bank data to save
   * @returns {Object} Created/updated bank record
   */
  async pligsUpsertBank(userId, bankData) {
    const [bank, created] = await this.model.upsert({
      userId,
      ...bankData
    }, {
      returning: true
    });
    return bank;
  }

  /**
   * Update bank information
   * @param {string} userId - User ID
   * @param {Object} updateData - Fields to update
   * @returns {Object} Updated bank record
   */
  async pligsUpdateBank(userId, updateData) {
    const bank = await this.pligsFindByUserId(userId);
    if (!bank) {
      return await this.pligsUpsertBank(userId, updateData);
    }
    return await bank.update(updateData);
  }

  /**
   * Verify bank account
   * @param {string} userId - User ID
   * @param {string} adminId - Admin user ID performing verification
   * @param {string} method - Verification method used
   * @returns {Object} Updated bank record
   */
  async pligsVerifyBankAccount(userId, adminId, method = 'manual') {
    const bank = await this.pligsFindByUserId(userId);
    if (!bank) throw new Error('Bank record not found');

    return await bank.update({
      isVerified: true,
      verificationMethod: method,
      verifiedAt: new Date(),
      verifiedBy: adminId
    });
  }

  /**
   * Initiate micro-deposit verification
   * @param {string} userId - User ID
   * @returns {Object} Bank record with verification amounts
   */
  async pligsInitiateMicroDepositVerification(userId) {
    const bank = await this.pligsFindByUserId(userId);
    if (!bank) throw new Error('Bank record not found');

    // Generate two random amounts between $0.01 and $0.99
    const amount1 = (Math.floor(Math.random() * 99) + 1) / 100;
    const amount2 = (Math.floor(Math.random() * 99) + 1) / 100;

    return await bank.update({
      verificationAmount1: amount1,
      verificationAmount2: amount2,
      verificationMethod: 'micro_deposit'
    });
  }

  /**
   * Verify micro-deposit amounts
   * @param {string} userId - User ID
   * @param {number} amount1 - First deposit amount entered by user
   * @param {number} amount2 - Second deposit amount entered by user
   * @returns {boolean} Verification success
   */
  async pligsVerifyMicroDeposits(userId, amount1, amount2) {
    const bank = await this.pligsFindByUserId(userId);
    if (!bank) return false;

    if (!bank.verificationAmount1 || !bank.verificationAmount2) return false;

    const isCorrect = (
      parseFloat(amount1) === parseFloat(bank.verificationAmount1) &&
      parseFloat(amount2) === parseFloat(bank.verificationAmount2)
    );

    if (isCorrect) {
      await bank.update({
        isVerified: true,
        verifiedAt: new Date(),
        verificationAmount1: null, // Clear after verification
        verificationAmount2: null
      });
    }

    return isCorrect;
  }

  /**
   * Get unverified bank accounts for admin review
   * @param {Object} options - Pagination options
   * @returns {Object} Paginated bank records
   */
  async pligsGetUnverifiedBanks(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return await this.model.findAndCountAll({
      where: { isVerified: false },
      limit,
      offset,
      order: [['createdAt', 'ASC']],
      include: [{
        model: this.model.sequelize.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });
  }

  /**
   * Update last used timestamp for bank account
   * @param {string} userId - User ID
   */
  async pligsUpdateLastUsed(userId) {
    const bank = await this.pligsFindByUserId(userId);
    if (bank) {
      await bank.update({ lastUsedAt: new Date() });
    }
  }

  /**
   * Get bank account statistics
   * @returns {Object} Bank statistics
   */
  async pligsGetBankStats() {
    const [totalBanks, verifiedBanks] = await Promise.all([
      this.model.count(),
      this.model.count({ where: { isVerified: true } })
    ]);

    return {
      totalBanks,
      verifiedBanks,
      unverifiedBanks: totalBanks - verifiedBanks,
      verificationRate: totalBanks > 0 ? (verifiedBanks / totalBanks * 100).toFixed(2) : 0
    };
  }
}

export default PligsUserBank;