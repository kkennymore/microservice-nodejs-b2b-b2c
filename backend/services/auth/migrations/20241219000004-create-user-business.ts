'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_business', {
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
      businessName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      businessType: {
        type: Sequelize.STRING,
        allowNull: true
      },
      businessRegistrationNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      businessAddress: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      taxId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      businessLicenseImage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      industry: {
        type: Sequelize.STRING,
        allowNull: true
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true
      },
      employeeCount: {
        type: Sequelize.ENUM('1-10', '11-50', '51-200', '201-500', '500+'),
        allowNull: true
      },
      annualRevenue: {
        type: Sequelize.ENUM('<$100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M+'),
        allowNull: true
      },
      businessPhone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      businessEmail: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
      taxCertificateImage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      incorporationDocumentImage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      enableWatermark: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      watermarkText: {
        type: Sequelize.STRING,
        allowNull: true
      },
      watermarkOpacity: {
        type: Sequelize.DECIMAL(3,2),
        defaultValue: 0.5
      },
      watermarkPosition: {
        type: Sequelize.ENUM('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'),
        defaultValue: 'bottom-right'
      },
      watermarkFontSize: {
        type: Sequelize.INTEGER,
        defaultValue: 12
      },
      watermarkColor: {
        type: Sequelize.STRING,
        defaultValue: '#ffffff'
      },
      watermarkBackgroundColor: {
        type: Sequelize.STRING,
        allowNull: true
      },
      watermarkBackgroundOpacity: {
        type: Sequelize.DECIMAL(3,2),
        defaultValue: 0.0
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

    await queryInterface.addIndex('user_business', ['userId']);
    await queryInterface.addIndex('user_business', ['businessName']);
    await queryInterface.addIndex('user_business', ['businessRegistrationNumber']);
    await queryInterface.addIndex('user_business', ['taxId']);
    await queryInterface.addIndex('user_business', ['isVerified']);
    await queryInterface.addIndex('user_business', ['industry']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_business');
  }
};