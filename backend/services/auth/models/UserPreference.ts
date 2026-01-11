// backend/services/auth/models/UserPreference.js
import { DataTypes } from 'sequelize';

/**
 * UserPreference Model
 * Handles user preferences and settings
 * Manages UI preferences, notifications, and personalization
 */
class PligsUserPreference {
  constructor(sequelize) {
    this.model = sequelize.define('UserPreference', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for preference record'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'Foreign key reference to users table',
        unique: true // One preference record per user
      },
      // Language and Localization
      language: {
        type: DataTypes.STRING,
        defaultValue: 'en',
        comment: 'User preferred language (ISO 639-1 code)'
      },
      timezone: {
        type: DataTypes.STRING,
        defaultValue: 'UTC',
        comment: 'User timezone (IANA timezone identifier)'
      },
      dateFormat: {
        type: DataTypes.ENUM('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'),
        defaultValue: 'MM/DD/YYYY',
        comment: 'Preferred date format'
      },
      timeFormat: {
        type: DataTypes.ENUM('12h', '24h'),
        defaultValue: '12h',
        comment: 'Preferred time format (12-hour or 24-hour)'
      },
      // Currency and Financial
      currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD',
        comment: 'Preferred currency (ISO 4217 code)'
      },
      currencyDisplay: {
        type: DataTypes.ENUM('symbol', 'code', 'name'),
        defaultValue: 'symbol',
        comment: 'How to display currency (symbol, code, or name)'
      },
      // UI and Theme Preferences
      theme: {
        type: DataTypes.ENUM('light', 'dark', 'auto'),
        defaultValue: 'light',
        comment: 'UI theme preference'
      },
      sidebarCollapsed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether sidebar should be collapsed by default'
      },
      itemsPerPage: {
        type: DataTypes.ENUM('10', '25', '50', '100'),
        defaultValue: '25',
        comment: 'Default number of items to display per page'
      },
      // Notification Preferences
      emailNotifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether to receive email notifications'
      },
      smsNotifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether to receive SMS notifications'
      },
      pushNotifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether to receive push notifications'
      },
      // Specific Notification Types
      notificationPreferences: {
        type: DataTypes.JSON,
        defaultValue: {
          orderUpdates: true,
          paymentNotifications: true,
          securityAlerts: true,
          marketingEmails: false,
          productUpdates: true,
          systemMaintenance: true
        },
        comment: 'Granular notification preferences as JSON object'
      },
      // Privacy Settings
      profileVisibility: {
        type: DataTypes.ENUM('public', 'private', 'friends'),
        defaultValue: 'public',
        comment: 'Profile visibility setting'
      },
      showOnlineStatus: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether to show online status to other users'
      },
      allowDirectMessages: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether to allow direct messages from other users'
      },
      // Communication Preferences
      marketingEmails: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether to receive marketing emails'
      },
      weeklyDigest: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether to receive weekly activity digest'
      },
      // Dashboard and Layout
      defaultDashboard: {
        type: DataTypes.ENUM('overview', 'sales', 'analytics', 'products'),
        defaultValue: 'overview',
        comment: 'Default dashboard to show on login'
      },
      dashboardWidgets: {
        type: DataTypes.JSON,
        defaultValue: ['sales_chart', 'recent_orders', 'notifications'],
        comment: 'Array of dashboard widgets to display'
      },
      // Accessibility
      fontSize: {
        type: DataTypes.ENUM('small', 'medium', 'large'),
        defaultValue: 'medium',
        comment: 'Preferred font size for accessibility'
      },
      highContrast: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether to use high contrast mode'
      },
      reduceMotion: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether to reduce motion/animations'
      },
      // Business Preferences (for sellers)
      autoApproveOrders: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether to auto-approve new orders'
      },
      lowStockAlerts: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether to receive low stock alerts'
      },
      orderConfirmationEmail: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether to send order confirmation emails'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Preference record creation timestamp'
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Preference record last update timestamp'
      }
    }, {
      tableName: 'user_preferences',
      comment: 'User preferences and settings for personalization',
      indexes: [
        { fields: ['userId'], unique: true, comment: 'Ensure one preference record per user' },
        { fields: ['language'], comment: 'Index for language-based queries' },
        { fields: ['theme'], comment: 'Index for theme-based queries' },
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
   * Find user preferences by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Preferences object or null
   */
  async pligsFindByUserId(userId) {
    return await this.model.findOne({
      where: { userId }
    });
  }

  /**
   * Create or update user preferences
   * @param {string} userId - User ID
   * @param {Object} preferenceData - Preference data to save
   * @returns {Object} Created/updated preferences record
   */
  async pligsUpsertPreferences(userId, preferenceData) {
    const [preferences, created] = await this.model.upsert({
      userId,
      ...preferenceData
    }, {
      returning: true
    });
    return preferences;
  }

  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {Object} updateData - Fields to update
   * @returns {Object} Updated preferences record
   */
  async pligsUpdatePreferences(userId, updateData) {
    const preferences = await this.pligsFindByUserId(userId);
    if (!preferences) {
      return await this.pligsUpsertPreferences(userId, updateData);
    }
    return await preferences.update(updateData);
  }

  /**
   * Get user notification preferences
   * @param {string} userId - User ID
   * @returns {Object} Notification preferences
   */
  async pligsGetNotificationPreferences(userId) {
    const preferences = await this.pligsFindByUserId(userId);
    if (!preferences) {
      return this.model.build().notificationPreferences; // Return defaults
    }

    return {
      ...preferences.notificationPreferences,
      emailEnabled: preferences.emailNotifications,
      smsEnabled: preferences.smsNotifications,
      pushEnabled: preferences.pushNotifications
    };
  }

  /**
   * Update notification preferences
   * @param {string} userId - User ID
   * @param {Object} notificationPrefs - Notification preferences
   * @returns {Object} Updated preferences
   */
  async pligsUpdateNotificationPreferences(userId, notificationPrefs) {
    const updateData = {};

    if (notificationPrefs.emailEnabled !== undefined) {
      updateData.emailNotifications = notificationPrefs.emailEnabled;
    }
    if (notificationPrefs.smsEnabled !== undefined) {
      updateData.smsNotifications = notificationPrefs.smsEnabled;
    }
    if (notificationPrefs.pushEnabled !== undefined) {
      updateData.pushNotifications = notificationPrefs.pushEnabled;
    }
    if (notificationPrefs.types) {
      updateData.notificationPreferences = notificationPrefs.types;
    }

    return await this.pligsUpdatePreferences(userId, updateData);
  }

  /**
   * Get user localization settings
   * @param {string} userId - User ID
   * @returns {Object} Localization settings
   */
  async pligsGetLocalizationSettings(userId) {
    const preferences = await this.pligsFindByUserId(userId);
    if (!preferences) return null;

    return {
      language: preferences.language,
      timezone: preferences.timezone,
      currency: preferences.currency,
      dateFormat: preferences.dateFormat,
      timeFormat: preferences.timeFormat,
      currencyDisplay: preferences.currencyDisplay
    };
  }

  /**
   * Get user UI preferences
   * @param {string} userId - User ID
   * @returns {Object} UI preferences
   */
  async pligsGetUIPreferences(userId) {
    const preferences = await this.pligsFindByUserId(userId);
    if (!preferences) return null;

    return {
      theme: preferences.theme,
      sidebarCollapsed: preferences.sidebarCollapsed,
      itemsPerPage: preferences.itemsPerPage,
      fontSize: preferences.fontSize,
      highContrast: preferences.highContrast,
      reduceMotion: preferences.reduceMotion
    };
  }

  /**
   * Get seller-specific preferences
   * @param {string} userId - User ID
   * @returns {Object} Seller preferences
   */
  async pligsGetSellerPreferences(userId) {
    const preferences = await this.pligsFindByUserId(userId);
    if (!preferences) return null;

    return {
      autoApproveOrders: preferences.autoApproveOrders,
      lowStockAlerts: preferences.lowStockAlerts,
      orderConfirmationEmail: preferences.orderConfirmationEmail
    };
  }

  /**
   * Reset user preferences to defaults
   * @param {string} userId - User ID
   * @returns {Object} Reset preferences
   */
  async pligsResetToDefaults(userId) {
    const defaultPreferences = {
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      theme: 'light',
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      profileVisibility: 'public',
      showOnlineStatus: true,
      allowDirectMessages: true,
      marketingEmails: false,
      weeklyDigest: true,
      defaultDashboard: 'overview',
      dashboardWidgets: ['sales_chart', 'recent_orders', 'notifications'],
      fontSize: 'medium',
      highContrast: false,
      reduceMotion: false,
      autoApproveOrders: false,
      lowStockAlerts: true,
      orderConfirmationEmail: true,
      notificationPreferences: {
        orderUpdates: true,
        paymentNotifications: true,
        securityAlerts: true,
        marketingEmails: false,
        productUpdates: true,
        systemMaintenance: true
      }
    };

    return await this.pligsUpsertPreferences(userId, defaultPreferences);
  }

  /**
   * Get preferences statistics for admin dashboard
   * @returns {Object} Preferences statistics
   */
  async pligsGetPreferencesStats() {
    const [totalUsers, themeStats, languageStats] = await Promise.all([
      this.model.count(),
      this.model.findAll({
        attributes: [
          'theme',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('theme')), 'count']
        ],
        group: ['theme']
      }),
      this.model.findAll({
        attributes: [
          'language',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('language')), 'count']
        ],
        group: ['language'],
        order: [[this.model.sequelize.literal('count'), 'DESC']],
        limit: 5
      })
    ]);

    return {
      totalUsers,
      themePreferences: themeStats.map(stat => ({
        theme: stat.dataValues.theme,
        count: parseInt(stat.dataValues.count)
      })),
      languagePreferences: languageStats.map(stat => ({
        language: stat.dataValues.language,
        count: parseInt(stat.dataValues.count)
      }))
    };
  }
}

export default PligsUserPreference;