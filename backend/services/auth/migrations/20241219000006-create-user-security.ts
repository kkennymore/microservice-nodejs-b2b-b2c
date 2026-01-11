'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_security', {
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
      twoFactorEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      twoFactorSecret: {
        type: Sequelize.STRING,
        allowNull: true
      },
      twoFactorBackupCodes: {
        type: Sequelize.JSON,
        allowNull: true
      },
      twoFactorMethod: {
        type: Sequelize.ENUM('app', 'sms', 'email'),
        defaultValue: 'app'
      },
      loginAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lockedUntil: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastFailedLoginAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastPasswordChangeAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      securityQuestion1: {
        type: Sequelize.STRING,
        allowNull: true
      },
      securityAnswer1: {
        type: Sequelize.STRING,
        allowNull: true
      },
      securityQuestion2: {
        type: Sequelize.STRING,
        allowNull: true
      },
      securityAnswer2: {
        type: Sequelize.STRING,
        allowNull: true
      },
      maxSessions: {
        type: Sequelize.INTEGER,
        defaultValue: 5
      },
      sessionTimeout: {
        type: Sequelize.INTEGER,
        defaultValue: 3600
      },
      passwordExpiryDays: {
        type: Sequelize.INTEGER,
        defaultValue: 90
      },
      requireStrongPassword: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      ipWhitelistEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      ipWhitelist: {
        type: Sequelize.JSON,
        allowNull: true
      },
      suspiciousActivityCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lastSuspiciousActivityAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      trustedDevices: {
        type: Sequelize.JSON,
        defaultValue: '[]'
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

    await queryInterface.addIndex('user_security', ['userId']);
    await queryInterface.addIndex('user_security', ['twoFactorEnabled']);
    await queryInterface.addIndex('user_security', ['loginAttempts']);
    await queryInterface.addIndex('user_security', ['lockedUntil']);
    await queryInterface.addIndex('user_security', ['lastLoginAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_security');
  }
};