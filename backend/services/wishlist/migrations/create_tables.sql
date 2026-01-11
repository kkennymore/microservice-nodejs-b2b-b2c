-- Wishlist Service Database Schema

-- User Wishlists Table
CREATE TABLE IF NOT EXISTS wishlists (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) DEFAULT 'My Wishlist',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT TRUE,
    item_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_is_public (is_public),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Wishlist Items Table
CREATE TABLE IF NOT EXISTS wishlist_items (
    id VARCHAR(36) PRIMARY KEY,
    wishlist_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    notes TEXT,
    quantity INT DEFAULT 1,
    price_alert BOOLEAN DEFAULT FALSE,
    alert_price DECIMAL(10,2),
    alert_triggered BOOLEAN DEFAULT FALSE,

    INDEX idx_wishlist_id (wishlist_id),
    INDEX idx_product_id (product_id),
    INDEX idx_added_at (added_at),
    UNIQUE KEY unique_wishlist_product (wishlist_id, product_id),
    FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Wishlist Shares Table (for sharing wishlists)
CREATE TABLE IF NOT EXISTS wishlist_shares (
    id VARCHAR(36) PRIMARY KEY,
    wishlist_id VARCHAR(36) NOT NULL,
    shared_by VARCHAR(36) NOT NULL,
    shared_with VARCHAR(36),
    share_token VARCHAR(100) UNIQUE,
    share_type ENUM('private', 'public_link', 'friends') DEFAULT 'private',
    expires_at TIMESTAMP NULL,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_wishlist_id (wishlist_id),
    INDEX idx_shared_by (shared_by),
    INDEX idx_share_token (share_token),
    FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE SET NULL
);

-- Wishlist Followers Table (for following public wishlists)
CREATE TABLE IF NOT EXISTS wishlist_followers (
    id VARCHAR(36) PRIMARY KEY,
    wishlist_id VARCHAR(36) NOT NULL,
    follower_id VARCHAR(36) NOT NULL,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_follow (wishlist_id, follower_id),
    INDEX idx_wishlist_id (wishlist_id),
    INDEX idx_follower_id (follower_id),
    FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Price Alert History Table
CREATE TABLE IF NOT EXISTS price_alerts (
    id VARCHAR(36) PRIMARY KEY,
    wishlist_item_id VARCHAR(36) NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    alert_price DECIMAL(10,2) NOT NULL,
    triggered_price DECIMAL(10,2),
    triggered_at TIMESTAMP NULL,
    status ENUM('active', 'triggered', 'expired') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_wishlist_item (wishlist_item_id),
    INDEX idx_status (status),
    FOREIGN KEY (wishlist_item_id) REFERENCES wishlist_items(id) ON DELETE CASCADE
);

-- Wishlist Analytics Cache Table
CREATE TABLE IF NOT EXISTS wishlist_analytics (
    id VARCHAR(36) PRIMARY KEY,
    wishlist_id VARCHAR(36) NOT NULL,
    total_views INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    total_followers INT DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_wishlist (wishlist_id),
    INDEX idx_last_updated (last_updated)
);

-- Product Availability Alerts Table
CREATE TABLE IF NOT EXISTS availability_alerts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    alert_type ENUM('back_in_stock', 'price_drop', 'new_variant') NOT NULL,
    threshold_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_is_active (is_active),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);