// backend/services/products/migrations/enhance_products_001.js
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

async function pligsEnhanceProducts() {
  try {
    // Add new columns to products table (idempotent)
    await sequelize.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS colors JSON DEFAULT ('[]') AFTER tags,
      ADD COLUMN IF NOT EXISTS sizes JSON DEFAULT ('[]') AFTER colors,
      ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0 AFTER reviewCount,
      ADD COLUMN IF NOT EXISTS contactEnabled BOOLEAN DEFAULT TRUE AFTER likes,
      ADD COLUMN IF NOT EXISTS discountType ENUM('percentage', 'fixed') AFTER contactEnabled,
      ADD COLUMN IF NOT EXISTS discountValue DECIMAL(10,2) AFTER discountType,
      ADD COLUMN IF NOT EXISTS discountValidUntil DATETIME AFTER discountValue,
      ADD COLUMN IF NOT EXISTS maxVideos INT DEFAULT 0 AFTER discountValidUntil,
      ADD INDEX IF NOT EXISTS idx_likes (likes),
      ADD INDEX IF NOT EXISTS idx_discount (discountType, discountValidUntil);
    `);

    // Update existing products to have contactEnabled based on subscription (simplified)
    await sequelize.query(`
      UPDATE products SET contactEnabled = TRUE WHERE 1=1;
    `);

    console.log('Product enhancements migration completed successfully');
  } catch (error) {
    console.error('Product enhancements migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

pligsEnhanceProducts();