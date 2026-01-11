'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create default admin user
    await queryInterface.bulkInsert('users', [{
      id: 'admin-uuid-12345',
      username: 'admin',
      email: 'admin@marketplace.com',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+1234567890',
      role: 'admin',
      platformType: 'local',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      subscriptionPlan: 'platinum',
      subscriptionStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // Create admin password (password: Admin123!)
    await queryInterface.bulkInsert('user_passwords', [{
      id: 'admin-pass-uuid',
      userId: 'admin-uuid-12345',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj0K2JvqVzJe',
      lastPasswordChange: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // Create default preferences for admin
    await queryInterface.bulkInsert('user_preferences', [{
      userId: 'admin-uuid-12345',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // Create default security settings for admin
    await queryInterface.bulkInsert('user_security', [{
      userId: 'admin-uuid-12345',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // Create default profile for admin
    await queryInterface.bulkInsert('user_profiles', [{
      userId: 'admin-uuid-12345',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('user_profiles', { userId: 'admin-uuid-12345' });
    await queryInterface.bulkDelete('user_security', { userId: 'admin-uuid-12345' });
    await queryInterface.bulkDelete('user_preferences', { userId: 'admin-uuid-12345' });
    await queryInterface.bulkDelete('user_passwords', { userId: 'admin-uuid-12345' });
    await queryInterface.bulkDelete('users', { id: 'admin-uuid-12345' });
  }
};