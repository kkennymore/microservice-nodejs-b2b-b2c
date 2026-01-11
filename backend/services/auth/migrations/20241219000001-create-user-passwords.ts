'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_passwords', {
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
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      passwordResetToken: {
        type: Sequelize.STRING,
        allowNull: true
      },
      passwordResetExpires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      passwordHistory: {
        type: Sequelize.JSON,
        defaultValue: '[]'
      },
      lastPasswordChange: {
        type: Sequelize.DATE,
        allowNull: true
      },
      passwordStrength: {
        type: Sequelize.ENUM('weak', 'medium', 'strong'),
        allowNull: true
      },
      failedLoginAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lockedUntil: {
        type: Sequelize.DATE,
        allowNull: true
      },
      requirePasswordChange: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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

    await queryInterface.addIndex('user_passwords', ['userId']);
    await queryInterface.addIndex('user_passwords', ['passwordResetToken']);
    await queryInterface.addIndex('user_passwords', ['passwordResetExpires']);
    await queryInterface.addIndex('user_passwords', ['failedLoginAttempts']);
    await queryInterface.addIndex('user_passwords', ['lockedUntil']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_passwords');
  }
};