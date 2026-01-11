// backend/services/products/migrations/down.js
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
    await sequelize.query('DROP TABLE IF EXISTS products;');
    await sequelize.query('DROP TABLE IF EXISTS categories;');

    console.log('Products service migrations rolled back successfully');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

pligsRollbackMigrations();