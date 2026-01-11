// backend/services/auth/migrations/add_watermark_feature.js
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

async function addWatermarkFeature() {
  try {
    // Add watermark settings to user_business table (idempotent)
    await sequelize.query(`
      ALTER TABLE user_business
      ADD COLUMN IF NOT EXISTS enableWatermark BOOLEAN DEFAULT TRUE COMMENT 'Enable watermark on product images',
      ADD COLUMN IF NOT EXISTS watermarkText VARCHAR(255) DEFAULT NULL COMMENT 'Custom watermark text (defaults to business name)',
      ADD COLUMN IF NOT EXISTS watermarkOpacity DECIMAL(3,2) DEFAULT 0.3 COMMENT 'Watermark opacity (0.1 to 1.0)',
      ADD COLUMN IF NOT EXISTS watermarkPosition ENUM('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center') DEFAULT 'bottom-right' COMMENT 'Watermark position on image',
      ADD COLUMN IF NOT EXISTS watermarkFontSize INT DEFAULT 24 COMMENT 'Watermark font size in pixels',
      ADD COLUMN IF NOT EXISTS watermarkColor VARCHAR(7) DEFAULT '#FFFFFF' COMMENT 'Watermark text color (hex)',
      ADD COLUMN IF NOT EXISTS watermarkBackgroundColor VARCHAR(7) DEFAULT '#000000' COMMENT 'Watermark background color (hex)',
      ADD COLUMN IF NOT EXISTS watermarkBackgroundOpacity DECIMAL(3,2) DEFAULT 0.5 COMMENT 'Watermark background opacity'
    `);

    // Update existing records to have default values
    await sequelize.query(`
      UPDATE user_business
      SET watermarkText = businessName
      WHERE watermarkText IS NULL AND businessName IS NOT NULL
    `);

    console.log('✅ Watermark feature added to user_business table');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

addWatermarkFeature();