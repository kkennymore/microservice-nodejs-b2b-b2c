// Test Data Population Script
import { Sequelize } from 'sequelize';
import config from '/app/shared/config.js';
import bcrypt from 'bcryptjs';

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

async function populateTestData() {
  try {
    console.log('🌱 Starting test data population...');
    
    // 1. Create Categories (25+ categories)
    console.log('📂 Creating categories...');
    await sequelize.query(`
      INSERT IGNORE INTO categories (id, name, description, level, sortOrder, isActive) VALUES
      ('cat-electronics', 'Electronics', 'Electronic devices and gadgets', 1, 1, 1),
      ('cat-smartphones', 'Smartphones', 'Mobile phones and accessories', 2, 1, 1),
      ('cat-laptops', 'Laptops', 'Laptops and notebooks', 2, 2, 1),
      ('cat-tablets', 'Tablets', 'Tablets and e-readers', 2, 3, 1),
      ('cat-audio', 'Audio', 'Headphones and speakers', 2, 4, 1),
      ('cat-fashion', 'Fashion', 'Clothing and accessories', 1, 2, 1),
       ('cat-womens', 'Women''s Clothing', 'Women''s fashion', 2, 1, 1),
       ('cat-mens', 'Men''s Clothing', 'Men''s fashion', 2, 2, 1),
      ('cat-shoes', 'Shoes', 'Footwear for all', 2, 3, 1),
      ('cat-jewelry', 'Jewelry', 'Jewelry and accessories', 2, 4, 1),
      ('cat-home', 'Home & Garden', 'Home improvement and garden', 1, 3, 1),
      ('cat-furniture', 'Furniture', 'Home furniture', 2, 1, 1),
      ('cat-kitchen', 'Kitchen', 'Kitchen appliances', 2, 2, 1),
      ('cat-garden', 'Garden', 'Garden tools and supplies', 2, 3, 1),
      ('cat-sports', 'Sports', 'Sports equipment', 1, 4, 1),
      ('cat-fitness', 'Fitness', 'Fitness and gym equipment', 2, 1, 1),
      ('cat-outdoor', 'Outdoor Sports', 'Outdoor activities', 2, 2, 1),
      ('cat-books', 'Books', 'Books and publications', 1, 5, 1),
      ('cat-fiction', 'Fiction', 'Fiction books', 2, 1, 1),
      ('cat-nonfiction', 'Non-Fiction', 'Educational books', 2, 2, 1),
      ('cat-beauty', 'Beauty', 'Beauty and personal care', 1, 6, 1),
      ('cat-skincare', 'Skincare', 'Skincare products', 2, 1, 1),
      ('cat-makeup', 'Makeup', 'Cosmetics', 2, 2, 1),
      ('cat-toys', 'Toys', 'Toys and games', 1, 7, 1),
      ('cat-kids', 'Kids Toys', 'Toys for children', 2, 1, 1);
    `);

    // 2. Create Users (10 users: buyers, sellers, admins)
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('Password123!', 12);

    await sequelize.query(`
      INSERT IGNORE INTO users (id, username, email, firstName, lastName, phone, role, platformType, isEmailVerified, isPhoneVerified, isActive) VALUES
      ('user-buyer-1', 'johnbuyer', 'john.doe@email.com', 'John', 'Doe', '+1234567891', 'buyer', 'local', TRUE, TRUE, TRUE),
      ('user-buyer-2', 'janesmith', 'jane.smith@email.com', 'Jane', 'Smith', '+1234567892', 'buyer', 'local', TRUE, TRUE, TRUE),
      ('user-buyer-3', 'mikejohnson', 'mike.johnson@email.com', 'Mike', 'Johnson', '+1234567893', 'buyer', 'local', TRUE, TRUE, TRUE),
      ('user-seller-1', 'sarahseller', 'sarah.wilson@email.com', 'Sarah', 'Wilson', '+1234567894', 'seller', 'local', TRUE, TRUE, TRUE),
      ('user-seller-2', 'davidseller', 'david.brown@email.com', 'David', 'Brown', '+1234567895', 'seller', 'local', TRUE, TRUE, TRUE),
      ('user-seller-3', 'emilydavis', 'emily.davis@email.com', 'Emily', 'Davis', '+1234567896', 'seller', 'local', TRUE, TRUE, TRUE),
      ('user-seller-4', 'chrismiller', 'chris.miller@email.com', 'Chris', 'Miller', '+1234567897', 'seller', 'local', TRUE, TRUE, TRUE),
      ('user-admin-2', 'lisaadmin', 'lisa.anderson@email.com', 'Lisa', 'Anderson', '+1234567898', 'admin', 'local', TRUE, TRUE, TRUE),
      ('user-delivery-1', 'markdelivery', 'mark.taylor@email.com', 'Mark', 'Taylor', '+1234567899', 'delivery_partner', 'local', TRUE, TRUE, TRUE),
      ('user-delivery-2', 'annadelivery', 'anna.garcia@email.com', 'Anna', 'Garcia', '+1234567800', 'delivery_partner', 'local', TRUE, TRUE, TRUE);
    `);

    // Insert user passwords
    await sequelize.query(`
      INSERT IGNORE INTO user_passwords (id, userId, password, lastPasswordChange) VALUES
      ('pass-buyer-1', 'user-buyer-1', '${hashedPassword}', NOW()),
      ('pass-buyer-2', 'user-buyer-2', '${hashedPassword}', NOW()),
      ('pass-buyer-3', 'user-buyer-3', '${hashedPassword}', NOW()),
      ('pass-seller-1', 'user-seller-1', '${hashedPassword}', NOW()),
      ('pass-seller-2', 'user-seller-2', '${hashedPassword}', NOW()),
      ('pass-seller-3', 'user-seller-3', '${hashedPassword}', NOW()),
      ('pass-seller-4', 'user-seller-4', '${hashedPassword}', NOW()),
      ('pass-admin-2', 'user-admin-2', '${hashedPassword}', NOW()),
      ('pass-delivery-1', 'user-delivery-1', '${hashedPassword}', NOW()),
      ('pass-delivery-2', 'user-delivery-2', '${hashedPassword}', NOW());
    `);

    // Insert user profiles
    await sequelize.query(`
      INSERT IGNORE INTO user_profiles (userId, bio, city, country) VALUES
      ('user-buyer-1', 'Avid shopper and tech enthusiast', 'New York', 'USA'),
      ('user-buyer-2', 'Fashion lover and home decor expert', 'Los Angeles', 'USA'),
      ('user-buyer-3', 'Sports fan and outdoor adventurer', 'Chicago', 'USA'),
      ('user-seller-1', 'Professional seller specializing in electronics', 'San Francisco', 'USA'),
      ('user-seller-2', 'Experienced seller with quality products', 'Seattle', 'USA'),
      ('user-seller-3', 'Trusted seller for fashion and lifestyle', 'Miami', 'USA'),
      ('user-seller-4', 'Reliable seller for home and garden items', 'Austin', 'USA'),
      ('user-admin-2', 'System administrator and support specialist', 'Denver', 'USA'),
      ('user-delivery-1', 'Fast and reliable delivery partner', 'Phoenix', 'USA'),
      ('user-delivery-2', 'Professional logistics and delivery expert', 'Boston', 'USA');
    `);

    // 3. Create Products (25+ products)
    console.log('📦 Creating products...');
    await sequelize.query(`
      INSERT IGNORE INTO products (id, sellerId, name, description, price, categoryId, subcategoryId, brand, stock, isApproved, isActive, rating, reviewCount) VALUES
      -- Electronics
      ('prod-laptop-1', 'user-seller-1', 'MacBook Pro 16-inch', 'Powerful laptop for professionals with M2 chip, 16GB RAM, 512GB SSD', 2499.99, 'cat-electronics', 'cat-laptops', 'Apple', 10, TRUE, TRUE, 4.8, 124),
      ('prod-laptop-2', 'user-seller-1', 'Dell XPS 13', 'Ultra-portable laptop with Intel i7, 16GB RAM, 512GB SSD', 1299.99, 'cat-electronics', 'cat-laptops', 'Dell', 15, TRUE, TRUE, 4.6, 89),
      ('prod-phone-1', 'user-seller-1', 'iPhone 15 Pro', 'Latest iPhone with advanced camera system and A17 Pro chip', 1199.99, 'cat-electronics', 'cat-smartphones', 'Apple', 20, TRUE, TRUE, 4.9, 256),
      ('prod-phone-2', 'user-seller-1', 'Samsung Galaxy S24', 'Flagship Android phone with incredible camera and performance', 899.99, 'cat-electronics', 'cat-smartphones', 'Samsung', 25, TRUE, TRUE, 4.7, 189),
      ('prod-tablet-1', 'user-seller-1', 'iPad Pro 12.9-inch', 'Professional tablet with M2 chip and Apple Pencil support', 1099.99, 'cat-electronics', 'cat-tablets', 'Apple', 12, TRUE, TRUE, 4.8, 67),
      ('prod-headphones-1', 'user-seller-1', 'Sony WH-1000XM5', 'Industry-leading noise canceling wireless headphones', 349.99, 'cat-electronics', 'cat-audio', 'Sony', 30, TRUE, TRUE, 4.7, 145),

      -- Fashion
      ('prod-shirt-1', 'user-seller-3', 'Premium Cotton T-Shirt', 'Comfortable and stylish cotton t-shirt in multiple colors', 29.99, 'cat-fashion', 'cat-mens', 'Nike', 50, TRUE, TRUE, 4.3, 78),
      ('prod-dress-1', 'user-seller-3', 'Elegant Evening Dress', 'Beautiful evening dress perfect for special occasions', 149.99, 'cat-fashion', 'cat-womens', 'Zara', 8, TRUE, TRUE, 4.6, 34),
      ('prod-jeans-1', 'user-seller-3', 'Slim Fit Jeans', 'High-quality slim fit jeans with perfect comfort', 79.99, 'cat-fashion', 'cat-mens', 'Levi''s', 25, TRUE, TRUE, 4.4, 92),
      ('prod-shoes-1', 'user-seller-3', 'Running Sneakers', 'Lightweight running shoes with advanced cushioning', 129.99, 'cat-fashion', 'cat-shoes', 'Adidas', 18, TRUE, TRUE, 4.5, 156),

      -- Home & Garden
      ('prod-sofa-1', 'user-seller-4', 'Modern Sectional Sofa', 'Comfortable modern sectional sofa for living rooms', 899.99, 'cat-home', 'cat-furniture', 'IKEA', 3, TRUE, TRUE, 4.2, 23),
      ('prod-blender-1', 'user-seller-4', 'High-Speed Blender', 'Powerful blender for smoothies and food preparation', 199.99, 'cat-home', 'cat-kitchen', 'KitchenAid', 15, TRUE, TRUE, 4.6, 87),
      ('prod-grill-1', 'user-seller-4', 'Gas BBQ Grill', 'Professional gas grill with multiple burners', 499.99, 'cat-home', 'cat-garden', 'Weber', 7, TRUE, TRUE, 4.8, 45),
      ('prod-lamp-1', 'user-seller-4', 'Modern Floor Lamp', 'Contemporary floor lamp with adjustable brightness', 149.99, 'cat-home', 'cat-furniture', 'Philips', 12, TRUE, TRUE, 4.1, 29),

      -- Sports
      ('prod-bike-1', 'user-seller-2', 'Mountain Bike Pro', 'High-performance mountain bike for serious riders', 1299.99, 'cat-sports', 'cat-fitness', 'Trek', 5, TRUE, TRUE, 4.7, 67),
      ('prod-treadmill-1', 'user-seller-2', 'Electric Treadmill', 'Advanced electric treadmill with multiple programs', 799.99, 'cat-sports', 'cat-fitness', 'NordicTrack', 4, TRUE, TRUE, 4.5, 38),
      ('prod-dumbbells-1', 'user-seller-2', 'Adjustable Dumbbells', 'Versatile adjustable dumbbells for home workouts', 249.99, 'cat-sports', 'cat-fitness', 'Bowflex', 20, TRUE, TRUE, 4.4, 112),
      ('prod-yoga-mat-1', 'user-seller-2', 'Premium Yoga Mat', 'Non-slip yoga mat with excellent cushioning', 49.99, 'cat-sports', 'cat-fitness', 'Manduka', 35, TRUE, TRUE, 4.6, 203),

      -- Books
      ('prod-book-1', 'user-seller-2', 'The Art of Programming', 'Comprehensive guide to modern programming techniques', 39.99, 'cat-books', 'cat-nonfiction', 'TechPress', 22, TRUE, TRUE, 4.3, 145),
      ('prod-book-2', 'user-seller-2', 'Mystery Novel Collection', 'Three bestselling mystery novels in one collection', 24.99, 'cat-books', 'cat-fiction', 'Penguin', 18, TRUE, TRUE, 4.5, 89),
      ('prod-book-3', 'user-seller-2', 'Cooking Masterclass', 'Professional cooking techniques and recipes', 34.99, 'cat-books', 'cat-nonfiction', 'Culinary Arts', 14, TRUE, TRUE, 4.7, 156),

      -- Beauty
      ('prod-skincare-1', 'user-seller-3', 'Hydrating Face Cream', 'Premium hydrating cream for all skin types', 49.99, 'cat-beauty', 'cat-skincare', 'Cetaphil', 28, TRUE, TRUE, 4.4, 234),
      ('prod-makeup-1', 'user-seller-3', 'Professional Makeup Kit', 'Complete makeup kit with brushes and products', 89.99, 'cat-beauty', 'cat-makeup', 'MAC', 9, TRUE, TRUE, 4.6, 78),
      ('prod-skincare-2', 'user-seller-3', 'Vitamin C Serum', 'Brightening serum with vitamin C and hyaluronic acid', 39.99, 'cat-beauty', 'cat-skincare', 'The Ordinary', 16, TRUE, TRUE, 4.5, 167),

      -- Toys
      ('prod-toy-1', 'user-seller-4', 'Building Block Set', 'Creative building blocks for imaginative play', 29.99, 'cat-toys', 'cat-kids', 'LEGO', 40, TRUE, TRUE, 4.8, 312),
      ('prod-toy-2', 'user-seller-4', 'Educational Robot', 'Interactive robot that teaches coding basics', 79.99, 'cat-toys', 'cat-kids', 'Sphero', 12, TRUE, TRUE, 4.6, 98),
      ('prod-toy-3', 'user-seller-4', 'Puzzle Game Set', 'Collection of challenging puzzles for all ages', 19.99, 'cat-toys', 'cat-kids', 'Ravensburger', 25, TRUE, TRUE, 4.3, 145),

      -- Additional Electronics
      ('prod-monitor-1', 'user-seller-1', '4K Gaming Monitor', '27-inch 4K monitor with 144Hz refresh rate', 499.99, 'cat-electronics', 'cat-laptops', 'ASUS', 8, TRUE, TRUE, 4.7, 76),
      ('prod-keyboard-1', 'user-seller-1', 'Mechanical Gaming Keyboard', 'RGB mechanical keyboard with blue switches', 149.99, 'cat-electronics', 'cat-laptops', 'Corsair', 22, TRUE, TRUE, 4.5, 134),
      ('prod-mouse-1', 'user-seller-1', 'Wireless Gaming Mouse', 'High-precision wireless gaming mouse', 79.99, 'cat-electronics', 'cat-laptops', 'Logitech', 30, TRUE, TRUE, 4.4, 198);
    `);

    console.log('✅ Test data population completed successfully!');
    console.log('📊 Created 25+ categories, 10 users, and 25+ products');

  } catch (error) {
    console.error('❌ Test data population failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

populateTestData();
