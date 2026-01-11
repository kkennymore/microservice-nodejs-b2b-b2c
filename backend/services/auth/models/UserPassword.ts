// backend/services/auth/models/UserPassword.js
import { DataTypes } from 'sequelize';

/**
 * UserPassword Model
 * Handles password-related data separately from main user table
 * Only applicable for local platform users (not social login)
 */
class PligsUserPassword {
  constructor(sequelize) {
    this.model = sequelize.define('UserPassword', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for password record'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'Foreign key reference to users table',
        unique: true // One password record per user
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Hashed password using bcrypt (only for local users)'
      },
      passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Token for password reset functionality'
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expiration timestamp for password reset token'
      },
      passwordHistory: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of previous hashed passwords to prevent reuse'
      },
      lastPasswordChange: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last password change'
      },
      passwordStrength: {
        type: DataTypes.ENUM('weak', 'medium', 'strong'),
        allowNull: true,
        comment: 'Password strength rating'
      },
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of consecutive failed login attempts'
      },
      lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Account lock expiration timestamp'
      },
      requirePasswordChange: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flag to force password change on next login'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Password record creation timestamp'
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Password record last update timestamp'
      }
    }, {
      tableName: 'user_passwords',
      comment: 'Password-related data for local platform users',
      indexes: [
        { fields: ['userId'], unique: true, comment: 'Ensure one password record per user' },
        { fields: ['passwordResetToken'], comment: 'Index for password reset token lookups' },
        { fields: ['passwordResetExpires'], comment: 'Index for expired reset tokens' },
        { fields: ['failedLoginAttempts'], comment: 'Index for failed login tracking' },
        { fields: ['lockedUntil'], comment: 'Index for account lock status' }
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
   * Find password record by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Password object or null
   */
  async pligsFindByUserId(userId) {
    return await this.model.findOne({
      where: { userId }
    });
  }

  /**
   * Create password record for new local user
   * @param {string} userId - User ID
   * @param {string} hashedPassword - Hashed password
   * @returns {Object} Created password record
   */
  async pligsCreatePassword(userId, hashedPassword) {
    return await this.model.create({
      userId,
      password: hashedPassword,
      lastPasswordChange: new Date()
    });
  }

  /**
   * Update user password with history tracking
   * @param {string} userId - User ID
   * @param {string} newHashedPassword - New hashed password
   * @param {string} oldHashedPassword - Previous hashed password (optional)
   * @returns {Object} Updated password record
   */
  async pligsUpdatePassword(userId, newHashedPassword, oldHashedPassword = null) {
    const passwordRecord = await this.pligsFindByUserId(userId);
    if (!passwordRecord) {
      throw new Error('Password record not found');
    }

    // Track password history (keep last 5 passwords)
    let passwordHistory = passwordRecord.passwordHistory || [];
    if (oldHashedPassword) {
      passwordHistory.unshift(oldHashedPassword);
      passwordHistory = passwordHistory.slice(0, 5); // Keep only last 5
    }

    return await passwordRecord.update({
      password: newHashedPassword,
      passwordHistory,
      lastPasswordChange: new Date(),
      passwordResetToken: null, // Clear any reset tokens
      passwordResetExpires: null,
      requirePasswordChange: false // Reset forced change flag
    });
  }

  /**
   * Generate and store password reset token
   * @param {string} userId - User ID
   * @returns {string} Generated reset token
   */
  async pligsGenerateResetToken(userId) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const passwordRecord = await this.pligsFindByUserId(userId);
    if (!passwordRecord) {
      throw new Error('Password record not found');
    }

    await passwordRecord.update({
      passwordResetToken: resetToken,
      passwordResetExpires: expiresAt
    });

    return resetToken;
  }

  /**
   * Verify password reset token
   * @param {string} userId - User ID
   * @param {string} token - Reset token to verify
   * @returns {boolean} Token validity
   */
  async pligsVerifyResetToken(userId, token) {
    const passwordRecord = await this.pligsFindByUserId(userId);
    if (!passwordRecord) return false;

    if (passwordRecord.passwordResetToken !== token) return false;
    if (passwordRecord.passwordResetExpires < new Date()) return false;

    return true;
  }

  /**
   * Clear password reset token after use
   * @param {string} userId - User ID
   */
  async pligsClearResetToken(userId) {
    const passwordRecord = await this.pligsFindByUserId(userId);
    if (passwordRecord) {
      await passwordRecord.update({
        passwordResetToken: null,
        passwordResetExpires: null
      });
    }
  }

  /**
   * Record failed login attempt and handle account locking
   * @param {string} userId - User ID
   * @returns {Object} Updated password record
   */
  async pligsRecordFailedLogin(userId) {
    const passwordRecord = await this.pligsFindByUserId(userId);
    if (!passwordRecord) {
      throw new Error('Password record not found');
    }

    const newAttempts = passwordRecord.failedLoginAttempts + 1;
    const updateData = { failedLoginAttempts: newAttempts };

    // Lock account after 5 failed attempts for 2 hours
    if (newAttempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }

    return await passwordRecord.update(updateData);
  }

  /**
   * Reset failed login attempts and unlock account
   * @param {string} userId - User ID
   * @returns {Object} Updated password record
   */
  async pligsResetFailedLogins(userId) {
    const passwordRecord = await this.pligsFindByUserId(userId);
    if (!passwordRecord) {
      throw new Error('Password record not found');
    }

    return await passwordRecord.update({
      failedLoginAttempts: 0,
      lockedUntil: null
    });
  }

  /**
   * Check if account is locked
   * @param {string} userId - User ID
   * @returns {boolean} True if account is locked
   */
  async pligsIsAccountLocked(userId) {
    const passwordRecord = await this.pligsFindByUserId(userId);
    if (!passwordRecord) return false;

    if (passwordRecord.lockedUntil && passwordRecord.lockedUntil > new Date()) {
      return true;
    }

    // Reset if lock period has passed
    if (passwordRecord.lockedUntil && passwordRecord.lockedUntil <= new Date()) {
      await this.pligsResetFailedLogins(userId);
    }

    return false;
  }

  /**
   * Check if password has been used before (password history)
   * @param {string} userId - User ID
   * @param {string} hashedPassword - Hashed password to check
   * @returns {boolean} True if password was used before
   */
  async pligsIsPasswordReused(userId, hashedPassword) {
    const passwordRecord = await this.pligsFindByUserId(userId);
    if (!passwordRecord || !passwordRecord.passwordHistory) return false;

    return passwordRecord.passwordHistory.includes(hashedPassword);
  }

  /**
   * Force password change on next login
   * @param {string} userId - User ID
   * @param {string} reason - Reason for forced change
   */
  async pligsForcePasswordChange(userId, reason = 'Security policy') {
    const passwordRecord = await this.pligsFindByUserId(userId);
    if (passwordRecord) {
      await passwordRecord.update({
        requirePasswordChange: true
      });
    }
  }

  /**
   * Clean up expired password reset tokens (maintenance function)
   * @returns {number} Number of tokens cleaned up
   */
  async pligsCleanupExpiredTokens() {
    const [affectedRows] = await this.model.update(
      {
        passwordResetToken: null,
        passwordResetExpires: null
      },
      {
        where: {
          passwordResetExpires: { [this.model.sequelize.Op.lt]: new Date() }
        }
      }
    );
    return affectedRows;
  }
}

export default PligsUserPassword;