// backend/services/products/migrations/up.js
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

async function pligsRunMigrations() {
  try {
    // Create categories table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        image VARCHAR(500),
        parentId VARCHAR(36),
        level INT DEFAULT 1,
        isActive BOOLEAN DEFAULT TRUE,
        sortOrder INT DEFAULT 0,
        seoTitle VARCHAR(255),
        seoDescription TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);

    // Create products table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        sellerId VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        wholesalePrice DECIMAL(10,2),
        categoryId VARCHAR(36) NOT NULL,
        subcategoryId VARCHAR(36),
        brand VARCHAR(255),
        images JSON DEFAULT ('[]'),
        videos JSON DEFAULT ('[]'),
        stock INT DEFAULT 0,
        minOrderQuantity INT DEFAULT 1,
        weight DECIMAL(10,2),
        dimensions JSON,
        specifications JSON,
        tags JSON DEFAULT ('[]'),
        type ENUM('tangible', 'intangible', 'service') DEFAULT 'tangible',
        isApproved BOOLEAN DEFAULT FALSE,
        isActive BOOLEAN DEFAULT TRUE,
        isFeatured BOOLEAN DEFAULT FALSE,
        isOnSale BOOLEAN DEFAULT FALSE,
        salePrice DECIMAL(10,2),
        saleStartDate DATETIME,
        saleEndDate DATETIME,
        viewCount INT DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 0.00,
        reviewCount INT DEFAULT 0,
        shippingInfo JSON,
        warranty TEXT,
        returnPolicy TEXT,
        seoTitle VARCHAR(255),
        seoDescription TEXT,
        metaKeywords JSON DEFAULT ('[]'),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_seller (sellerId),
        INDEX idx_category (categoryId),
        INDEX idx_approved (isApproved),
        INDEX idx_active (isActive),
        INDEX idx_featured (isFeatured),
        INDEX idx_type (type),
        INDEX idx_name (name),
        INDEX idx_price (price),
        INDEX idx_rating (rating)
      );
    `);

    // Insert default categories
    await sequelize.query(`
      INSERT IGNORE INTO categories (id, name, description, level, sortOrder) VALUES
      ('bike-cat-1', 'Bikes', 'All types of bicycles', 1, 1),
      ('bike-cat-2', 'Mountain Bikes', 'Bikes for mountain terrain', 2, 1),
      ('bike-cat-3', 'Road Bikes', 'Bikes for road cycling', 2, 2),
      ('bike-cat-4', 'E-Bikes', 'Electric bicycles', 2, 3),
      ('bike-cat-5', 'City Bikes', 'Bikes for urban commuting', 2, 4),
      ('equip-cat-1', 'Equipment', 'Cycling equipment and accessories', 1, 2),
      ('equip-cat-2', 'Helmets', 'Safety helmets', 2, 1),
      ('equip-cat-3', 'Sunglasses', 'Cycling sunglasses', 2, 2);
    `);

    console.log('Products service migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

pligsRunMigrations();