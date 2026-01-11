// backend/services/auth/models/UserSecurity.js
import { DataTypes } from 'sequelize';

/**
 * UserSecurity Model
 * Handles user security settings and authentication tracking
 * Manages login attempts, two-factor authentication, and security preferences
 */
class PligsUserSecurity {
  constructor(sequelize) {
    this.model = sequelize.define('UserSecurity', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for security record'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'Foreign key reference to users table',
        unique: true // One security record per user
      },
      // Two-Factor Authentication
      twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether 2FA is enabled for this user'
      },
      twoFactorSecret: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'TOTP secret key for 2FA (encrypted)'
      },
      twoFactorBackupCodes: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Backup recovery codes for 2FA (encrypted)'
      },
      twoFactorMethod: {
        type: DataTypes.ENUM('app', 'sms', 'email'),
        defaultValue: 'app',
        comment: 'Preferred 2FA method'
      },
      // Login Security
      loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of failed login attempts'
      },
      lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Account lock expiration timestamp'
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last successful login'
      },
      lastFailedLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last failed login attempt'
      },
      lastPasswordChangeAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last password change'
      },
      // Security Questions (for password recovery)
      securityQuestion1: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'First security question'
      },
      securityAnswer1: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Hashed answer to first security question'
      },
      securityQuestion2: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Second security question'
      },
      securityAnswer2: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Hashed answer to second security question'
      },
      // Session Management
      maxSessions: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        comment: 'Maximum concurrent sessions allowed'
      },
      sessionTimeout: {
        type: DataTypes.INTEGER,
        defaultValue: 3600,
        comment: 'Session timeout in seconds (default 1 hour)'
      },
      // Security Settings
      passwordExpiryDays: {
        type: DataTypes.INTEGER,
        defaultValue: 90,
        comment: 'Days until password expires'
      },
      requireStrongPassword: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether strong password is required'
      },
      ipWhitelistEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether IP whitelisting is enabled'
      },
      ipWhitelist: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of whitelisted IP addresses'
      },
      // Audit Trail
      suspiciousActivityCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Count of suspicious activities detected'
      },
      lastSuspiciousActivityAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last suspicious activity'
      },
      trustedDevices: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of trusted device fingerprints'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Security record creation timestamp'
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Security record last update timestamp'
      }
    }, {
      tableName: 'user_security',
      comment: 'User security settings, 2FA, login tracking, and security preferences',
      indexes: [
        { fields: ['userId'], unique: true, comment: 'Ensure one security record per user' },
        { fields: ['twoFactorEnabled'], comment: 'Index for 2FA enabled users' },
        { fields: ['loginAttempts'], comment: 'Index for failed login tracking' },
        { fields: ['lockedUntil'], comment: 'Index for account lock status' },
        { fields: ['lastLoginAt'], comment: 'Index for login activity queries' }
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
   * Find security record by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Security object or null
   */
  async pligsFindByUserId(userId) {
    return await this.model.findOne({
      where: { userId }
    });
  }

  /**
   * Create or update security settings
   * @param {string} userId - User ID
   * @param {Object} securityData - Security data to save
   * @returns {Object} Created/updated security record
   */
  async pligsUpsertSecurity(userId, securityData) {
    const [security, created] = await this.model.upsert({
      userId,
      ...securityData
    }, {
      returning: true
    });
    return security;
  }

  /**
   * Update security settings
   * @param {string} userId - User ID
   * @param {Object} updateData - Fields to update
   * @returns {Object} Updated security record
   */
  async pligsUpdateSecurity(userId, updateData) {
    const security = await this.pligsFindByUserId(userId);
    if (!security) {
      return await this.pligsUpsertSecurity(userId, updateData);
    }
    return await security.update(updateData);
  }

  /**
   * Enable two-factor authentication
   * @param {string} userId - User ID
   * @param {string} secret - TOTP secret
   * @param {string} method - 2FA method
   * @returns {Object} Updated security record
   */
  async pligsEnableTwoFactor(userId, secret, method = 'app') {
    const backupCodes = this.pligsGenerateBackupCodes();

    return await this.pligsUpsertSecurity(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorMethod: method,
      twoFactorBackupCodes: backupCodes
    });
  }

  /**
   * Disable two-factor authentication
   * @param {string} userId - User ID
   * @returns {Object} Updated security record
   */
  async pligsDisableTwoFactor(userId) {
    const security = await this.pligsFindByUserId(userId);
    if (!security) throw new Error('Security record not found');

    return await security.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null
    });
  }

  /**
   * Generate backup recovery codes for 2FA
   * @returns {Array} Array of backup codes
   */
  pligsGenerateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  /**
   * Use a backup code for 2FA
   * @param {string} userId - User ID
   * @param {string} code - Backup code to use
   * @returns {boolean} Whether code was valid and used
   */
  async pligsUseBackupCode(userId, code) {
    const security = await this.pligsFindByUserId(userId);
    if (!security || !security.twoFactorBackupCodes) return false;

    const codes = security.twoFactorBackupCodes;
    const index = codes.indexOf(code);

    if (index === -1) return false;

    // Remove used code
    codes.splice(index, 1);

    await security.update({
      twoFactorBackupCodes: codes.length > 0 ? codes : null
    });

    return true;
  }

  /**
   * Record login attempt (success or failure)
   * @param {string} userId - User ID
   * @param {boolean} success - Whether login was successful
   * @returns {Object} Updated security record
   */
  async pligsRecordLoginAttempt(userId, success) {
    const updateData = {};

    if (success) {
      updateData.lastLoginAt = new Date();
      updateData.loginAttempts = 0; // Reset on successful login
      updateData.lockedUntil = null; // Unlock account
    } else {
      // Increment failed attempts
      const security = await this.pligsFindByUserId(userId);
      const newAttempts = (security?.loginAttempts || 0) + 1;

      updateData.loginAttempts = newAttempts;
      updateData.lastFailedLoginAt = new Date();

      // Lock account after 5 failed attempts
      if (newAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      }
    }

    return await this.pligsUpdateSecurity(userId, updateData);
  }

  /**
   * Check if account is locked
   * @param {string} userId - User ID
   * @returns {boolean} True if account is locked
   */
  async pligsIsAccountLocked(userId) {
    const security = await this.pligsFindByUserId(userId);
    if (!security) return false;

    if (security.lockedUntil && security.lockedUntil > new Date()) {
      return true;
    }

    // Reset if lock period has passed
    if (security.lockedUntil && security.lockedUntil <= new Date()) {
      await this.pligsUpdateSecurity(userId, {
        loginAttempts: 0,
        lockedUntil: null
      });
    }

    return false;
  }

  /**
   * Add trusted device
   * @param {string} userId - User ID
   * @param {string} deviceFingerprint - Device fingerprint
   * @param {string} deviceName - Human-readable device name
   */
  async pligsAddTrustedDevice(userId, deviceFingerprint, deviceName) {
    const security = await this.pligsFindByUserId(userId);
    const trustedDevices = security?.trustedDevices || [];

    // Remove existing device with same fingerprint
    const filtered = trustedDevices.filter(device => device.fingerprint !== deviceFingerprint);

    // Add new device
    filtered.push({
      fingerprint: deviceFingerprint,
      name: deviceName,
      addedAt: new Date(),
      lastUsedAt: new Date()
    });

    await this.pligsUpdateSecurity(userId, { trustedDevices: filtered });
  }

  /**
   * Check if device is trusted
   * @param {string} userId - User ID
   * @param {string} deviceFingerprint - Device fingerprint
   * @returns {boolean} True if device is trusted
   */
  async pligsIsTrustedDevice(userId, deviceFingerprint) {
    const security = await this.pligsFindByUserId(userId);
    if (!security?.trustedDevices) return false;

    return security.trustedDevices.some(device => device.fingerprint === deviceFingerprint);
  }

  /**
   * Get security statistics for admin dashboard
   * @returns {Object} Security statistics
   */
  async pligsGetSecurityStats() {
    const [totalUsers, twoFactorUsers, lockedUsers] = await Promise.all([
      this.model.count(),
      this.model.count({ where: { twoFactorEnabled: true } }),
      this.model.count({
        where: {
          lockedUntil: { [this.model.sequelize.Op.gt]: new Date() }
        }
      })
    ]);

    return {
      totalUsers,
      twoFactorEnabled: twoFactorUsers,
      twoFactorRate: totalUsers > 0 ? (twoFactorUsers / totalUsers * 100).toFixed(2) : 0,
      lockedAccounts: lockedUsers
    };
  }
}

export default PligsUserSecurity;