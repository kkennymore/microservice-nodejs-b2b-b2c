-- Loyalty Service Database Schema

-- User Loyalty Accounts Table
CREATE TABLE IF NOT EXISTS loyalty_accounts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    current_points DECIMAL(12,2) DEFAULT 0.00,
    total_points_earned DECIMAL(12,2) DEFAULT 0.00,
    total_points_redeemed DECIMAL(12,2) DEFAULT 0.00,
    current_tier VARCHAR(50) DEFAULT 'bronze',
    tier_progress DECIMAL(5,2) DEFAULT 0.00,
    tier_upgrade_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user (user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_current_tier (current_tier),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
);

-- Loyalty Tiers Table
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id VARCHAR(36) PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL UNIQUE,
    tier_level INT NOT NULL UNIQUE,
    min_points DECIMAL(10,2) NOT NULL,
    max_points DECIMAL(10,2) NULL,
    multiplier DECIMAL(3,2) DEFAULT 1.00,
    benefits JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tier_level (tier_level),
    INDEX idx_min_points (min_points),
    INDEX idx_is_active (is_active)
);

-- Points Transactions Table
CREATE TABLE IF NOT EXISTS points_transactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    transaction_type ENUM('earned', 'redeemed', 'expired', 'adjusted', 'bonus') NOT NULL,
    points DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    reference_type ENUM('purchase', 'review', 'referral', 'signup', 'birthday', 'manual', 'expiration') NOT NULL,
    reference_id VARCHAR(36),
    description TEXT,
    expiry_date TIMESTAMP NULL,
    is_expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_reference_type (reference_type),
    INDEX idx_reference_id (reference_id),
    INDEX idx_created_at (created_at),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_is_expired (is_expired)
);

-- Rewards Catalog Table
CREATE TABLE IF NOT EXISTS rewards_catalog (
    id VARCHAR(36) PRIMARY KEY,
    reward_name VARCHAR(100) NOT NULL,
    reward_type ENUM('discount', 'free_shipping', 'product', 'cashback', 'experience', 'donation') NOT NULL,
    description TEXT,
    points_required DECIMAL(10,2) NOT NULL,
    value DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    max_claims INT DEFAULT -1, -- -1 for unlimited
    claims_count INT DEFAULT 0,
    valid_from TIMESTAMP NULL,
    valid_until TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    image_url VARCHAR(500),
    terms_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_reward_type (reward_type),
    INDEX idx_points_required (points_required),
    INDEX idx_is_active (is_active),
    INDEX idx_valid_until (valid_until),
    INDEX idx_sort_order (sort_order),
    FULLTEXT idx_reward_name (reward_name),
    FULLTEXT idx_description (description)
);

-- Reward Redemptions Table
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    reward_id VARCHAR(36) NOT NULL,
    points_used DECIMAL(10,2) NOT NULL,
    redemption_code VARCHAR(100) UNIQUE,
    redemption_status ENUM('pending', 'approved', 'fulfilled', 'cancelled', 'expired') DEFAULT 'pending',
    redemption_data JSON,
    fulfilled_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_reward_id (reward_id),
    INDEX idx_redemption_code (redemption_code),
    INDEX idx_redemption_status (redemption_status),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (reward_id) REFERENCES rewards_catalog(id) ON DELETE CASCADE
);

-- Referral Program Table
CREATE TABLE IF NOT EXISTS referral_program (
    id VARCHAR(36) PRIMARY KEY,
    referrer_id VARCHAR(36) NOT NULL,
    referee_id VARCHAR(36) NOT NULL,
    referral_code VARCHAR(20) UNIQUE,
    referral_status ENUM('pending', 'completed', 'expired', 'cancelled') DEFAULT 'pending',
    points_earned DECIMAL(10,2) DEFAULT 0.00,
    reward_claimed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    referral_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_referral (referrer_id, referee_id),
    INDEX idx_referrer_id (referrer_id),
    INDEX idx_referee_id (referee_id),
    INDEX idx_referral_code (referral_code),
    INDEX idx_referral_status (referral_status),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_at (created_at)
);

-- Points Rules Table
CREATE TABLE IF NOT EXISTS points_rules (
    id VARCHAR(36) PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_type ENUM('purchase', 'review', 'referral', 'signup', 'social', 'birthday', 'manual') NOT NULL,
    points_per_unit DECIMAL(8,2) DEFAULT 0.00,
    max_points_per_transaction DECIMAL(8,2) NULL,
    max_points_per_day DECIMAL(8,2) NULL,
    max_points_per_month DECIMAL(8,2) NULL,
    conditions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    valid_from TIMESTAMP NULL,
    valid_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_rule_name (rule_name),
    INDEX idx_rule_type (rule_type),
    INDEX idx_is_active (is_active),
    INDEX idx_priority (priority),
    INDEX idx_valid_until (valid_until)
);

-- Loyalty Analytics Table
CREATE TABLE IF NOT EXISTS loyalty_analytics (
    id VARCHAR(36) PRIMARY KEY,
    date DATE NOT NULL,
    metric_type ENUM('points_earned', 'points_redeemed', 'new_members', 'tier_upgrades', 'redemptions', 'referrals') NOT NULL,
    metric_value DECIMAL(12,2) DEFAULT 0.00,
    count_value INT DEFAULT 0,
    tier_breakdown JSON,
    category_breakdown JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_metric_date (date, metric_type),
    INDEX idx_date (date),
    INDEX idx_metric_type (metric_type)
);

-- Points Expiration Settings Table
CREATE TABLE IF NOT EXISTS points_expiration_settings (
    id VARCHAR(36) PRIMARY KEY,
    expiration_months INT DEFAULT 24,
    notification_days_before INT DEFAULT 30,
    auto_expiry_enabled BOOLEAN DEFAULT TRUE,
    expiry_notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Loyalty Campaigns Table
CREATE TABLE IF NOT EXISTS loyalty_campaigns (
    id VARCHAR(36) PRIMARY KEY,
    campaign_name VARCHAR(100) NOT NULL,
    campaign_type ENUM('points_multiplier', 'bonus_points', 'special_reward', 'tier_boost') NOT NULL,
    description TEXT,
    conditions JSON,
    rewards JSON,
    target_users JSON,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    max_participants INT DEFAULT -1,
    participants_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_campaign_type (campaign_type),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_is_active (is_active),
    FULLTEXT idx_campaign_name (campaign_name)
);

-- Campaign Participations Table
CREATE TABLE IF NOT EXISTS campaign_participations (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    participation_status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    points_earned DECIMAL(10,2) DEFAULT 0.00,
    rewards_claimed JSON,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,

    UNIQUE KEY unique_campaign_user (campaign_id, user_id),
    INDEX idx_campaign_id (campaign_id),
    INDEX idx_user_id (user_id),
    INDEX idx_participation_status (participation_status),
    FOREIGN KEY (campaign_id) REFERENCES loyalty_campaigns(id) ON DELETE CASCADE
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS loyalty_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    points_expiry_notifications BOOLEAN DEFAULT TRUE,
    reward_notifications BOOLEAN DEFAULT TRUE,
    referral_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user (user_id),
    INDEX idx_user_id (user_id)
);