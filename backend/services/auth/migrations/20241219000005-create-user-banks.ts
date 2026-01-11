'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_banks', {
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
      bankName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bankAccountNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bankAccountName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bankSwiftCode: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bankRoutingNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bankBranchCode: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bankAddress: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      accountType: {
        type: Sequelize.ENUM('checking', 'savings', 'business_checking', 'business_savings'),
        allowNull: true
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      verificationMethod: {
        type: Sequelize.ENUM('manual', 'micro_deposit', 'instant_verification'),
        allowNull: true
      },
      verificationAmount1: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: true
      },
      verificationAmount2: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: true
      },
      verifiedAt: {
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
      lastUsedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      bankStatementImage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      proofOfAddressImage: {
        type: Sequelize.STRING,
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

    await queryInterface.addIndex('user_banks', ['userId']);
    await queryInterface.addIndex('user_banks', ['bankAccountNumber']);
    await queryInterface.addIndex('user_banks', ['isVerified']);
    await queryInterface.addIndex('user_banks', ['isPrimary']);
    await queryInterface.addIndex('user_banks', ['currency']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_banks');
  }
};