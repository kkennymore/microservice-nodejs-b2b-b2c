'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for each user'
      },
      username: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        comment: 'Unique username chosen by user'
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true
        },
        comment: 'User email address, must be unique and valid'
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'User first name'
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'User last name'
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'User phone number with country code'
      },
      role: {
        type: Sequelize.ENUM('buyer', 'seller', 'admin', 'delivery_partner'),
        defaultValue: 'buyer'
      },
      platformType: {
        type: Sequelize.ENUM('local', 'facebook', 'google'),
        defaultValue: 'local',
        comment: 'Platform type indicating how user registered (local, facebook, google)'
      },
      socialId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Social media platform user ID (Facebook/Google ID)'
      },
      socialProvider: {
        type: Sequelize.ENUM('facebook', 'google'),
        allowNull: true,
        comment: 'Social media provider name'
      },
      socialProfileData: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Complete social profile data from OAuth provider'
      },
      isEmailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether user has verified their email address'
      },
      isPhoneVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether user has verified their phone number'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether user account is active (not suspended)'
      },
      subscriptionPlan: {
        type: Sequelize.ENUM('free', 'silver', 'gold', 'platinum'),
        defaultValue: 'free',
        comment: 'User subscription plan'
      },
      subscriptionStartDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the current subscription started'
      },
      subscriptionEndDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the current subscription expires'
      },
      subscriptionStatus: {
        type: Sequelize.ENUM('active', 'expired', 'cancelled', 'trial'),
        defaultValue: 'trial',
        comment: 'Current subscription status'
      },
      twoFactorEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether 2FA is enabled for this user'
      },
      twoFactorSecret: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'TOTP secret for 2FA'
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of user last successful login'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'Account creation timestamp'
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'Last account update timestamp'
      }
    });

    // Add indexes
    await queryInterface.addIndex('users', ['email'], { comment: 'Index for fast email lookups during login' });
    await queryInterface.addIndex('users', ['username'], { comment: 'Index for username uniqueness checks' });
    await queryInterface.addIndex('users', ['role'], { comment: 'Index for filtering users by role' });
    await queryInterface.addIndex('users', ['isActive'], { comment: 'Index for active user queries' });
    await queryInterface.addIndex('users', ['phone'], { comment: 'Index for phone number searches' });
    await queryInterface.addIndex('users', ['subscriptionPlan'], { comment: 'Index for subscription plan queries' });
    await queryInterface.addIndex('users', ['subscriptionStatus'], { comment: 'Index for subscription status queries' });
    await queryInterface.addIndex('users', ['subscriptionEndDate'], { comment: 'Index for subscription expiry queries' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};