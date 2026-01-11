-- Promotions Service Database Schema

-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type ENUM('percentage', 'fixed', 'free_shipping') NOT NULL,
    value DECIMAL(10,2),
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    usage_limit INT DEFAULT NULL,
    usage_count INT DEFAULT 0,
    per_user_limit INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    applicable_products JSON, -- Array of product IDs
    applicable_categories JSON, -- Array of category IDs
    applicable_sellers JSON, -- Array of seller IDs
    excluded_products JSON, -- Array of product IDs to exclude
    first_time_customers_only BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_code (code),
    INDEX idx_active (is_active),
    INDEX idx_start_end (start_date, end_date),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Coupon Usage Table
CREATE TABLE IF NOT EXISTS coupon_usage (
    id VARCHAR(36) PRIMARY KEY,
    coupon_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_coupon_id (coupon_id),
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id),
    UNIQUE KEY unique_coupon_order (coupon_id, order_id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Flash Sales Table
CREATE TABLE IF NOT EXISTS flash_sales (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5,2) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    max_quantity_per_user INT DEFAULT NULL,
    total_quantity_limit INT DEFAULT NULL,
    sold_quantity INT DEFAULT 0,
    applicable_products JSON, -- Array of product IDs
    applicable_categories JSON, -- Array of category IDs
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_active_time (is_active, start_time, end_time),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Flash Sale Products Table (for many-to-many relationship)
CREATE TABLE IF NOT EXISTS flash_sale_products (
    id VARCHAR(36) PRIMARY KEY,
    flash_sale_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    sold_quantity INT DEFAULT 0,
    max_quantity INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_flash_sale (flash_sale_id),
    INDEX idx_product (product_id),
    UNIQUE KEY unique_flash_sale_product (flash_sale_id, product_id),
    FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Promotional Banners Table
CREATE TABLE IF NOT EXISTS promotional_banners (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(300),
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500),
    link_type ENUM('product', 'category', 'external', 'none') DEFAULT 'none',
    link_target VARCHAR(36), -- product_id, category_id, or external URL
    position ENUM('hero', 'sidebar', 'footer', 'category') NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    click_count INT DEFAULT 0,
    impression_count INT DEFAULT 0,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_position_active (position, is_active, sort_order),
    INDEX idx_active_dates (is_active, start_date, end_date),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Newsletter Campaigns Table
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    template_type ENUM('welcome', 'promotional', 'newsletter', 'custom') DEFAULT 'newsletter',
    target_audience JSON, -- Filter criteria for recipients
    scheduled_date TIMESTAMP NULL,
    sent_date TIMESTAMP NULL,
    status ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled') DEFAULT 'draft',
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    open_count INT DEFAULT 0,
    click_count INT DEFAULT 0,
    bounce_count INT DEFAULT 0,
    unsubscribe_count INT DEFAULT 0,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status_scheduled (status, scheduled_date),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Abandoned Cart Promotions Table
CREATE TABLE IF NOT EXISTS abandoned_cart_promotions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    trigger_hours INT DEFAULT 24, -- Hours after cart abandonment
    max_sends INT DEFAULT 1,
    email_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_active (is_active),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- User Segments Table (for targeted promotions)
CREATE TABLE IF NOT EXISTS user_segments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    criteria JSON NOT NULL, -- Filter criteria (e.g., {"totalSpent": {"min": 100}, "registrationDate": {"after": "2023-01-01"}})
    estimated_users INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_active (is_active),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Promotion Analytics Cache Table
CREATE TABLE IF NOT EXISTS promotion_analytics (
    id VARCHAR(36) PRIMARY KEY,
    promotion_id VARCHAR(36) NOT NULL,
    promotion_type ENUM('coupon', 'flash_sale', 'banner', 'campaign') NOT NULL,
    metrics JSON NOT NULL, -- Cached metrics like impressions, clicks, conversions
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_promotion (promotion_id, promotion_type),
    INDEX idx_type_updated (promotion_type, last_updated)
);