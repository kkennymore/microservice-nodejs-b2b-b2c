'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_preferences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      language: {
        type: Sequelize.STRING,
        defaultValue: 'en'
      },
      timezone: {
        type: Sequelize.STRING,
        defaultValue: 'UTC'
      },
      dateFormat: {
        type: Sequelize.ENUM('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'),
        defaultValue: 'MM/DD/YYYY'
      },
      timeFormat: {
        type: Sequelize.ENUM('12h', '24h'),
        defaultValue: '12h'
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      currencyDisplay: {
        type: Sequelize.ENUM('symbol', 'code', 'name'),
        defaultValue: 'symbol'
      },
      theme: {
        type: Sequelize.ENUM('light', 'dark', 'auto'),
        defaultValue: 'light'
      },
      sidebarCollapsed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      itemsPerPage: {
        type: Sequelize.ENUM('10', '25', '50', '100'),
        defaultValue: '25'
      },
      emailNotifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      smsNotifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      pushNotifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      notificationPreferences: {
        type: Sequelize.JSON,
        defaultValue: '{"orderUpdates":true,"paymentNotifications":true,"securityAlerts":true,"marketingEmails":false,"productUpdates":true,"systemMaintenance":true}'
      },
      profileVisibility: {
        type: Sequelize.ENUM('public', 'private', 'friends'),
        defaultValue: 'public'
      },
      showOnlineStatus: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      allowDirectMessages: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      marketingEmails: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      weeklyDigest: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      defaultDashboard: {
        type: Sequelize.ENUM('overview', 'sales', 'analytics', 'products'),
        defaultValue: 'overview'
      },
      dashboardWidgets: {
        type: Sequelize.JSON,
        defaultValue: '["sales_chart","recent_orders","notifications"]'
      },
      fontSize: {
        type: Sequelize.ENUM('small', 'medium', 'large'),
        defaultValue: 'medium'
      },
      highContrast: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      reduceMotion: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      autoApproveOrders: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      lowStockAlerts: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      orderConfirmationEmail: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('user_preferences', ['userId']);
    await queryInterface.addIndex('user_preferences', ['language']);
    await queryInterface.addIndex('user_preferences', ['theme']);
    await queryInterface.addIndex('user_preferences', ['currency']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_preferences');
  }
};