-- Social Service Database Schema

-- User Follows Table
CREATE TABLE IF NOT EXISTS user_follows (
    id VARCHAR(36) PRIMARY KEY,
    follower_id VARCHAR(36) NOT NULL,
    following_id VARCHAR(36) NOT NULL,
    follow_status ENUM('active', 'blocked', 'muted') DEFAULT 'active',
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unfollowed_at TIMESTAMP NULL,

    UNIQUE KEY unique_follow (follower_id, following_id),
    INDEX idx_follower_id (follower_id),
    INDEX idx_following_id (following_id),
    INDEX idx_follow_status (follow_status),
    INDEX idx_followed_at (followed_at)
);

-- Product Shares Table
CREATE TABLE IF NOT EXISTS product_shares (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    share_type ENUM('social', 'direct', 'embed', 'qr') NOT NULL,
    platform ENUM('facebook', 'twitter', 'instagram', 'pinterest', 'whatsapp', 'email', 'link') NULL,
    share_url VARCHAR(500),
    share_text TEXT,
    share_image VARCHAR(500),
    click_count INT DEFAULT 0,
    conversion_count INT DEFAULT 0,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,

    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_share_type (share_type),
    INDEX idx_platform (platform),
    INDEX idx_shared_at (shared_at),
    FULLTEXT idx_share_text (share_text)
);

-- Social Posts Table
CREATE TABLE IF NOT EXISTS social_posts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    post_type ENUM('product_share', 'review', 'question', 'tip', 'story', 'poll') NOT NULL,
    entity_type ENUM('product', 'category', 'seller', 'review') NULL,
    entity_id VARCHAR(36) NULL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    media_urls JSON,
    tags JSON,
    location VARCHAR(100),
    is_public BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_post_type (post_type),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_is_public (is_public),
    INDEX idx_is_featured (is_featured),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_content (content),
    FULLTEXT idx_title (title)
);

-- Post Interactions Table (likes, comments, shares)
CREATE TABLE IF NOT EXISTS post_interactions (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    interaction_type ENUM('like', 'comment', 'share', 'bookmark', 'report') NOT NULL,
    content TEXT,
    parent_interaction_id VARCHAR(36) NULL, -- For threaded comments
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_interaction (post_id, user_id, interaction_type),
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_interaction_type (interaction_type),
    INDEX idx_parent_interaction (parent_interaction_id),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_content (content)
);

-- Social Feed Table (cached feeds for performance)
CREATE TABLE IF NOT EXISTS social_feeds (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    feed_type ENUM('following', 'trending', 'discovery', 'personalized') NOT NULL,
    post_ids JSON NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cache_expires TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_feed (user_id, feed_type),
    INDEX idx_user_id (user_id),
    INDEX idx_feed_type (feed_type),
    INDEX idx_last_updated (last_updated),
    INDEX idx_cache_expires (cache_expires)
);

-- User Mentions Table
CREATE TABLE IF NOT EXISTS user_mentions (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    mentioned_user_id VARCHAR(36) NOT NULL,
    mentioning_user_id VARCHAR(36) NOT NULL,
    mention_text VARCHAR(200),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_post_id (post_id),
    INDEX idx_mentioned_user (mentioned_user_id),
    INDEX idx_mentioning_user (mentioning_user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- Social Hashtags Table
CREATE TABLE IF NOT EXISTS social_hashtags (
    id VARCHAR(36) PRIMARY KEY,
    hashtag VARCHAR(100) NOT NULL UNIQUE,
    usage_count INT DEFAULT 0,
    trending_score DECIMAL(5,2) DEFAULT 0.00,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_blocked BOOLEAN DEFAULT FALSE,

    INDEX idx_usage_count (usage_count),
    INDEX idx_trending_score (trending_score),
    INDEX idx_last_used (last_used),
    INDEX idx_is_blocked (is_blocked),
    FULLTEXT idx_hashtag (hashtag)
);

-- Social Analytics Table
CREATE TABLE IF NOT EXISTS social_analytics (
    id VARCHAR(36) PRIMARY KEY,
    date DATE NOT NULL,
    entity_type ENUM('post', 'user', 'product', 'hashtag') NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    clicks INT DEFAULT 0,
    conversions INT DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    reach INT DEFAULT 0,
    impressions INT DEFAULT 0,

    UNIQUE KEY unique_entity_date (entity_type, entity_id, date),
    INDEX idx_date (date),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_engagement_rate (engagement_rate)
);

-- Social Notifications Table
CREATE TABLE IF NOT EXISTS social_notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    notification_type ENUM('follow', 'like', 'comment', 'share', 'mention', 'tag') NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    entity_type ENUM('post', 'product', 'user') NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_notification_type (notification_type),
    INDEX idx_actor_id (actor_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_is_read (is_read),
    INDEX idx_is_archived (is_archived),
    INDEX idx_created_at (created_at)
);

-- Social Commerce Table (product recommendations based on social activity)
CREATE TABLE IF NOT EXISTS social_commerce (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    recommendation_type ENUM('social_proof', 'friends_like', 'trending', 'similar_users') NOT NULL,
    score DECIMAL(5,2) DEFAULT 0.00,
    reasons JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_product (user_id, product_id, recommendation_type),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_recommendation_type (recommendation_type),
    INDEX idx_score (score),
    INDEX idx_last_updated (last_updated)
);

-- Social Groups/Communities Table
CREATE TABLE IF NOT EXISTS social_groups (
    id VARCHAR(36) PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    description TEXT,
    group_type ENUM('product', 'category', 'interest', 'seller') NOT NULL,
    entity_id VARCHAR(36) NULL, -- Product/Category/Seller ID
    owner_id VARCHAR(36) NOT NULL,
    member_count INT DEFAULT 0,
    post_count INT DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    rules TEXT,
    avatar_url VARCHAR(500),
    cover_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_group_type (group_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_owner_id (owner_id),
    INDEX idx_is_private (is_private),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_group_name (group_name),
    FULLTEXT idx_description (description)
);

-- Group Memberships Table
CREATE TABLE IF NOT EXISTS group_memberships (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('owner', 'moderator', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE KEY unique_membership (group_id, user_id),
    INDEX idx_group_id (group_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role (role),
    INDEX idx_joined_at (joined_at),
    INDEX idx_is_active (is_active),
    FOREIGN KEY (group_id) REFERENCES social_groups(id) ON DELETE CASCADE
);

-- Social Badges/Achievements Table
CREATE TABLE IF NOT EXISTS social_badges (
    id VARCHAR(36) PRIMARY KEY,
    badge_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    badge_type ENUM('engagement', 'contribution', 'social', 'shopping') NOT NULL,
    criteria JSON,
    points_value INT DEFAULT 0,
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_badge_type (badge_type),
    INDEX idx_rarity (rarity),
    INDEX idx_is_active (is_active),
    FULLTEXT idx_badge_name (badge_name)
);

-- User Badges Table
CREATE TABLE IF NOT EXISTS user_badges (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    badge_id VARCHAR(36) NOT NULL,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_displayed BOOLEAN DEFAULT TRUE,

    UNIQUE KEY unique_user_badge (user_id, badge_id),
    INDEX idx_user_id (user_id),
    INDEX idx_badge_id (badge_id),
    INDEX idx_awarded_at (awarded_at),
    INDEX idx_is_displayed (is_displayed),
    FOREIGN KEY (badge_id) REFERENCES social_badges(id) ON DELETE CASCADE
);