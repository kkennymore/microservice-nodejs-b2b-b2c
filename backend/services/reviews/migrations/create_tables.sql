-- Reviews Service Database Schema

-- Product Reviews Table
CREATE TABLE IF NOT EXISTS product_reviews (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36),
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_votes INT DEFAULT 0,
    total_votes INT DEFAULT 0,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    moderated_by VARCHAR(36),
    moderated_at TIMESTAMP NULL,
    moderation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id),
    INDEX idx_rating (rating),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Review Images Table
CREATE TABLE IF NOT EXISTS review_images (
    id VARCHAR(36) PRIMARY KEY,
    review_id VARCHAR(36) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(200),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_review_id (review_id),
    FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE
);

-- Review Votes Table (helpful/not helpful)
CREATE TABLE IF NOT EXISTS review_votes (
    id VARCHAR(36) PRIMARY KEY,
    review_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    vote_type ENUM('helpful', 'not_helpful') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_vote (review_id, user_id),
    INDEX idx_review_id (review_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seller Reviews Table
CREATE TABLE IF NOT EXISTS seller_reviews (
    id VARCHAR(36) PRIMARY KEY,
    seller_id VARCHAR(36) NOT NULL,
    buyer_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36),
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_votes INT DEFAULT 0,
    total_votes INT DEFAULT 0,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    moderated_by VARCHAR(36),
    moderated_at TIMESTAMP NULL,
    moderation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_seller_id (seller_id),
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_order_id (order_id),
    INDEX idx_rating (rating),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Seller Review Images Table
CREATE TABLE IF NOT EXISTS seller_review_images (
    id VARCHAR(36) PRIMARY KEY,
    review_id VARCHAR(36) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(200),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_review_id (review_id),
    FOREIGN KEY (review_id) REFERENCES seller_reviews(id) ON DELETE CASCADE
);

-- Seller Review Votes Table
CREATE TABLE IF NOT EXISTS seller_review_votes (
    id VARCHAR(36) PRIMARY KEY,
    review_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    vote_type ENUM('helpful', 'not_helpful') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_vote (review_id, user_id),
    INDEX idx_review_id (review_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (review_id) REFERENCES seller_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Review Reports Table (for moderation)
CREATE TABLE IF NOT EXISTS review_reports (
    id VARCHAR(36) PRIMARY KEY,
    review_id VARCHAR(36) NOT NULL,
    review_type ENUM('product', 'seller') NOT NULL,
    reported_by VARCHAR(36) NOT NULL,
    reason ENUM('spam', 'inappropriate', 'offensive', 'fake', 'irrelevant', 'other') NOT NULL,
    description TEXT,
    status ENUM('pending', 'investigating', 'resolved', 'dismissed') DEFAULT 'pending',
    resolved_by VARCHAR(36),
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_review_id (review_id),
    INDEX idx_reported_by (reported_by),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Review Analytics Cache Table
CREATE TABLE IF NOT EXISTS review_analytics (
    id VARCHAR(36) PRIMARY KEY,
    entity_id VARCHAR(36) NOT NULL, -- product_id or seller_id
    entity_type ENUM('product', 'seller') NOT NULL,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    rating_distribution JSON, -- Store count for each star rating
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_entity (entity_id, entity_type),
    INDEX idx_entity_type (entity_type),
    INDEX idx_last_updated (last_updated)
);

-- Review Keywords/Analysis Table (for future ML features)
CREATE TABLE IF NOT EXISTS review_keywords (
    id VARCHAR(36) PRIMARY KEY,
    review_id VARCHAR(36) NOT NULL,
    review_type ENUM('product', 'seller') NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    sentiment ENUM('positive', 'negative', 'neutral') DEFAULT 'neutral',
    confidence DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_review_id (review_id),
    INDEX idx_keyword (keyword),
    INDEX idx_sentiment (sentiment),
    FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE
);