-- SEO Service Database Schema

-- SEO Meta Data Table
CREATE TABLE IF NOT EXISTS seo_meta (
    id VARCHAR(36) PRIMARY KEY,
    entity_type ENUM('page', 'product', 'category', 'brand', 'seller', 'blog_post') NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    url_path VARCHAR(500) NOT NULL,
    title VARCHAR(200),
    description VARCHAR(300),
    keywords TEXT,
    canonical_url VARCHAR(500),
    robots_directive VARCHAR(100) DEFAULT 'index,follow',
    og_title VARCHAR(200),
    og_description VARCHAR(300),
    og_image VARCHAR(500),
    og_type VARCHAR(50) DEFAULT 'website',
    twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
    twitter_title VARCHAR(200),
    twitter_description VARCHAR(300),
    twitter_image VARCHAR(500),
    structured_data JSON,
    custom_meta JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_entity (entity_type, entity_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_url_path (url_path(100)),
    INDEX idx_is_active (is_active),
    FULLTEXT idx_title (title),
    FULLTEXT idx_description (description)
);

-- SEO Redirects Table
CREATE TABLE IF NOT EXISTS seo_redirects (
    id VARCHAR(36) PRIMARY KEY,
    old_url VARCHAR(500) NOT NULL,
    new_url VARCHAR(500) NOT NULL,
    redirect_type ENUM('301', '302', '307', '308') DEFAULT '301',
    is_active BOOLEAN DEFAULT TRUE,
    redirect_count INT DEFAULT 0,
    last_redirected TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_old_url (old_url),
    INDEX idx_is_active (is_active),
    INDEX idx_redirect_type (redirect_type),
    INDEX idx_redirect_count (redirect_count)
);

-- Sitemap Management Table
CREATE TABLE IF NOT EXISTS seo_sitemaps (
    id VARCHAR(36) PRIMARY KEY,
    sitemap_type ENUM('main', 'products', 'categories', 'brands', 'sellers', 'pages') NOT NULL,
    filename VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    last_generated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_urls INT DEFAULT 0,
    file_size_kb INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_filename (filename),
    INDEX idx_sitemap_type (sitemap_type),
    INDEX idx_is_active (is_active),
    INDEX idx_last_generated (last_generated)
);

-- Sitemap URLs Table
CREATE TABLE IF NOT EXISTS seo_sitemap_urls (
    id VARCHAR(36) PRIMARY KEY,
    sitemap_id VARCHAR(36) NOT NULL,
    url VARCHAR(500) NOT NULL,
    entity_type ENUM('page', 'product', 'category', 'brand', 'seller', 'blog_post') NOT NULL,
    entity_id VARCHAR(36),
    priority DECIMAL(3,2) DEFAULT 0.5,
    changefreq ENUM('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never') DEFAULT 'weekly',
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    INDEX idx_sitemap_id (sitemap_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_is_active (is_active),
    UNIQUE KEY unique_sitemap_url (sitemap_id, url(200)),
    FOREIGN KEY (sitemap_id) REFERENCES seo_sitemaps(id) ON DELETE CASCADE
);

-- SEO Analytics Table
CREATE TABLE IF NOT EXISTS seo_analytics (
    id VARCHAR(36) PRIMARY KEY,
    date DATE NOT NULL,
    entity_type ENUM('page', 'product', 'category', 'brand', 'seller') NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    page_views INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    avg_time_on_page DECIMAL(8,2),
    bounce_rate DECIMAL(5,2),
    organic_search_clicks INT DEFAULT 0,
    organic_search_impressions INT DEFAULT 0,
    organic_search_ctr DECIMAL(5,2),
    organic_search_position DECIMAL(5,2),
    backlinks INT DEFAULT 0,
    referring_domains INT DEFAULT 0,
    social_shares INT DEFAULT 0,
    conversions INT DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0.00,

    UNIQUE KEY unique_entity_date (entity_type, entity_id, date),
    INDEX idx_date (date),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_page_views (page_views)
);

-- SEO Keywords Tracking Table
CREATE TABLE IF NOT EXISTS seo_keywords (
    id VARCHAR(36) PRIMARY KEY,
    keyword VARCHAR(100) NOT NULL,
    entity_type ENUM('page', 'product', 'category', 'brand', 'seller') NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    search_volume INT DEFAULT 0,
    competition_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
    current_position INT,
    target_position INT DEFAULT 1,
    current_cpc DECIMAL(6,2),
    monthly_trend DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_keyword_entity (keyword, entity_type, entity_id),
    INDEX idx_keyword (keyword),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_current_position (current_position),
    INDEX idx_search_volume (search_volume),
    FULLTEXT idx_keyword_fulltext (keyword)
);

-- SEO Content Optimization Table
CREATE TABLE IF NOT EXISTS seo_content_optimization (
    id VARCHAR(36) PRIMARY KEY,
    entity_type ENUM('page', 'product', 'category', 'brand', 'seller', 'blog_post') NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    content_score INT DEFAULT 0, -- 0-100 SEO score
    title_score INT DEFAULT 0,
    description_score INT DEFAULT 0,
    heading_score INT DEFAULT 0,
    keyword_score INT DEFAULT 0,
    image_score INT DEFAULT 0,
    mobile_score INT DEFAULT 0,
    performance_score INT DEFAULT 0,
    recommendations JSON,
    last_analyzed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_entity (entity_type, entity_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_content_score (content_score),
    INDEX idx_last_analyzed (last_analyzed)
);

-- SEO Structured Data Templates Table
CREATE TABLE IF NOT EXISTS seo_structured_data_templates (
    id VARCHAR(36) PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    template_type ENUM('product', 'organization', 'website', 'breadcrumb', 'faq', 'review', 'event', 'recipe') NOT NULL,
    template_json JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_template_name (template_name),
    INDEX idx_template_type (template_type),
    INDEX idx_is_active (is_active)
);

-- SEO Robots.txt Management Table
CREATE TABLE IF NOT EXISTS seo_robots_txt (
    id VARCHAR(36) PRIMARY KEY,
    user_agent VARCHAR(100) NOT NULL,
    directives TEXT NOT NULL,
    crawl_delay INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_agent (user_agent),
    INDEX idx_is_active (is_active)
);

-- SEO Link Building Table
CREATE TABLE IF NOT EXISTS seo_link_building (
    id VARCHAR(36) PRIMARY KEY,
    source_url VARCHAR(500) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    link_type ENUM('internal', 'external', 'backlink') NOT NULL,
    anchor_text VARCHAR(200),
    link_status ENUM('active', 'broken', 'redirected') DEFAULT 'active',
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    domain_authority INT DEFAULT 0,
    page_authority INT DEFAULT 0,
    trust_flow INT DEFAULT 0,
    citation_flow INT DEFAULT 0,
    is_follow BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,

    INDEX idx_source_url (source_url(100)),
    INDEX idx_target_url (target_url(100)),
    INDEX idx_link_type (link_type),
    INDEX idx_link_status (link_status),
    INDEX idx_domain_authority (domain_authority),
    INDEX idx_last_checked (last_checked)
);

-- SEO Social Media Integration Table
CREATE TABLE IF NOT EXISTS seo_social_media (
    id VARCHAR(36) PRIMARY KEY,
    entity_type ENUM('page', 'product', 'category', 'brand', 'seller') NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    platform ENUM('facebook', 'twitter', 'instagram', 'linkedin', 'pinterest', 'youtube') NOT NULL,
    url VARCHAR(500),
    title VARCHAR(200),
    description VARCHAR(300),
    image VARCHAR(500),
    hashtags VARCHAR(500),
    share_count INT DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    last_shared TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE KEY unique_entity_platform (entity_type, entity_id, platform),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_platform (platform),
    INDEX idx_share_count (share_count)
);