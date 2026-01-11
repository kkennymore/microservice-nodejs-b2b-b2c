// backend/services/auth/migrations/down.js
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

async function pligsRollbackMigrations() {
  try {
    // Drop tables in reverse order due to foreign key constraints
    await sequelize.query('DROP TABLE IF EXISTS user_preferences;');
    await sequelize.query('DROP TABLE IF EXISTS user_security;');
    await sequelize.query('DROP TABLE IF EXISTS user_banks;');
    await sequelize.query('DROP TABLE IF EXISTS user_business;');
    await sequelize.query('DROP TABLE IF EXISTS user_kyc;');
    await sequelize.query('DROP TABLE IF EXISTS user_profiles;');
    await sequelize.query('DROP TABLE IF EXISTS user_passwords;');
    await sequelize.query('DROP TABLE IF EXISTS users;');

    console.log('Auth service migrations rolled back successfully - all tables dropped');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

pligsRollbackMigrations();