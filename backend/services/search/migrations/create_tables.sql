-- Search Service Database Schema

-- Search Queries Table (for analytics and caching)
CREATE TABLE IF NOT EXISTS search_queries (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    query_text VARCHAR(500) NOT NULL,
    filters JSON,
    sort_by VARCHAR(50),
    result_count INT DEFAULT 0,
    response_time_ms INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_query_text (query_text(100)),
    INDEX idx_created_at (created_at),
    INDEX idx_session_id (session_id),
    FULLTEXT idx_query_fulltext (query_text)
);

-- Search Suggestions Table (for autocomplete)
CREATE TABLE IF NOT EXISTS search_suggestions (
    id VARCHAR(36) PRIMARY KEY,
    suggestion_text VARCHAR(255) NOT NULL,
    suggestion_type ENUM('query', 'product', 'category', 'brand') NOT NULL,
    reference_id VARCHAR(36), -- Product/Category/Brand ID
    search_count INT DEFAULT 0,
    click_count INT DEFAULT 0,
    conversion_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    weight DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_suggestion (suggestion_text, suggestion_type),
    INDEX idx_type (suggestion_type),
    INDEX idx_active (is_active),
    INDEX idx_weight (weight),
    INDEX idx_search_count (search_count),
    FULLTEXT idx_suggestion_fulltext (suggestion_text)
);

-- Search Analytics Table
CREATE TABLE IF NOT EXISTS search_analytics (
    id VARCHAR(36) PRIMARY KEY,
    date DATE NOT NULL,
    total_queries INT DEFAULT 0,
    unique_queries INT DEFAULT 0,
    zero_result_queries INT DEFAULT 0,
    avg_response_time_ms DECIMAL(8,2),
    top_queries JSON, -- Array of top search terms
    popular_categories JSON,
    popular_filters JSON,
    conversion_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_date (date),
    INDEX idx_date (date)
);

-- Search Performance Metrics Table
CREATE TABLE IF NOT EXISTS search_performance (
    id VARCHAR(36) PRIMARY KEY,
    query_id VARCHAR(36),
    elasticsearch_time_ms INT,
    database_time_ms INT,
    total_time_ms INT,
    cache_hit BOOLEAN DEFAULT FALSE,
    result_size_kb INT,
    shard_count INT,
    node_count INT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_query_id (query_id),
    INDEX idx_created_at (created_at),
    INDEX idx_cache_hit (cache_hit)
);

-- Search Filters Cache Table
CREATE TABLE IF NOT EXISTS search_filters_cache (
    id VARCHAR(36) PRIMARY KEY,
    filter_type VARCHAR(50) NOT NULL, -- 'category', 'brand', 'price_range', etc.
    filter_key VARCHAR(100) NOT NULL,
    filter_value JSON NOT NULL,
    product_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_filter (filter_type, filter_key),
    INDEX idx_type (filter_type),
    INDEX idx_active (is_active),
    INDEX idx_updated (last_updated)
);

-- Popular Search Terms Table
CREATE TABLE IF NOT EXISTS popular_search_terms (
    id VARCHAR(36) PRIMARY KEY,
    term VARCHAR(255) NOT NULL UNIQUE,
    search_count INT DEFAULT 0,
    last_searched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trend_score DECIMAL(5,2) DEFAULT 0.00,
    category VARCHAR(50),

    INDEX idx_search_count (search_count),
    INDEX idx_trend_score (trend_score),
    INDEX idx_category (category),
    INDEX idx_last_searched (last_searched),
    FULLTEXT idx_term_fulltext (term)
);

-- Search Personalization Table
CREATE TABLE IF NOT EXISTS search_personalization (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    preferred_categories JSON,
    preferred_brands JSON,
    price_range_min DECIMAL(10,2),
    price_range_max DECIMAL(10,2),
    preferred_sort VARCHAR(50) DEFAULT 'relevance',
    search_history JSON, -- Recent searches
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user (user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_updated (updated_at)
);

-- Search Recommendations Table (for "related searches")
CREATE TABLE IF NOT EXISTS search_recommendations (
    id VARCHAR(36) PRIMARY KEY,
    base_query VARCHAR(255) NOT NULL,
    recommended_query VARCHAR(255) NOT NULL,
    confidence_score DECIMAL(3,2),
    click_count INT DEFAULT 0,
    conversion_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_recommendation (base_query, recommended_query),
    INDEX idx_base_query (base_query(100)),
    INDEX idx_confidence (confidence_score),
    INDEX idx_active (is_active)
);

-- Search Spell Corrections Table
CREATE TABLE IF NOT EXISTS search_spell_corrections (
    id VARCHAR(36) PRIMARY KEY,
    misspelled_word VARCHAR(100) NOT NULL,
    corrected_word VARCHAR(100) NOT NULL,
    correction_count INT DEFAULT 0,
    confidence_score DECIMAL(3,2),
    is_auto_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_correction (misspelled_word),
    INDEX idx_corrected (corrected_word),
    INDEX idx_confidence (confidence_score)
);

-- Search Categories Mapping Table
CREATE TABLE IF NOT EXISTS search_categories (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    parent_category_id VARCHAR(36),
    level INT DEFAULT 1,
    product_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    search_boost DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_category (category_id),
    INDEX idx_parent (parent_category_id),
    INDEX idx_level (level),
    INDEX idx_active (is_active),
    INDEX idx_boost (search_boost)
);

-- Search Brands Mapping Table
CREATE TABLE IF NOT EXISTS search_brands (
    id VARCHAR(36) PRIMARY KEY,
    brand_id VARCHAR(36) NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    product_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    search_boost DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_brand (brand_id),
    INDEX idx_active (is_active),
    INDEX idx_boost (search_boost),
    FULLTEXT idx_brand_fulltext (brand_name)
);