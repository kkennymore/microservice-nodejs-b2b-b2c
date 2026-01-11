// backend/services/auth/migrations/add_subscription_fields.js
import { Sequelize } from 'sequelize';
import config from '/app/shared/config.js';

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect
  }
);

async function addSubscriptionFields() {
  try {
    // Add subscription fields to users table
    await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN subscriptionPlan ENUM('free', 'silver', 'gold', 'platinum') DEFAULT 'free' AFTER isActive,
      ADD COLUMN subscriptionStartDate DATETIME NULL AFTER subscriptionPlan,
      ADD COLUMN subscriptionEndDate DATETIME NULL AFTER subscriptionStartDate,
      ADD COLUMN subscriptionStatus ENUM('active', 'expired', 'cancelled', 'trial') DEFAULT 'trial' AFTER subscriptionEndDate,
      ADD INDEX idx_subscription_plan (subscriptionPlan),
      ADD INDEX idx_subscription_status (subscriptionStatus),
      ADD INDEX idx_subscription_end_date (subscriptionEndDate);
    `);

    // Set default subscription dates for existing users (trial period)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days trial

    await sequelize.query(`
      UPDATE users
      SET subscriptionStartDate = NOW(),
          subscriptionEndDate = ?
      WHERE subscriptionStartDate IS NULL;
    `, {
      replacements: [trialEndDate]
    });

    console.log('Subscription fields migration completed successfully');
  } catch (error) {
    console.error('Subscription fields migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

addSubscriptionFields();