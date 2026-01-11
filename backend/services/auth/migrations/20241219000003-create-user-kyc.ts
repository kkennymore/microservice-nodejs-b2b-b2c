'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_kyc', {
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
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'not_submitted'),
        defaultValue: 'not_submitted'
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rejectedReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      idType: {
        type: Sequelize.ENUM('passport', 'drivers_license', 'national_id', 'other'),
        allowNull: true
      },
      idNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      idExpiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      idFrontImage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      idBackImage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      selfieImage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      verificationCode: {
        type: Sequelize.STRING,
        allowNull: true
      },
      verificationCodeExpiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      verifiedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex('user_kyc', ['userId']);
    await queryInterface.addIndex('user_kyc', ['status']);
    await queryInterface.addIndex('user_kyc', ['submittedAt']);
    await queryInterface.addIndex('user_kyc', ['approvedAt']);
    await queryInterface.addIndex('user_kyc', ['idNumber']);
    await queryInterface.addIndex('user_kyc', ['verifiedBy']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_kyc');
  }
};