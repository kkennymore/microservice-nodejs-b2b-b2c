-- Advertising Service Database Migration
-- Run this script to create all advertising-related tables

USE fenap_marketplace;

-- Advertising campaigns table
CREATE TABLE IF NOT EXISTS advertising_campaigns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type ENUM('banner', 'featured', 'sponsored', 'promotional', 'seasonal') DEFAULT 'promotional',
  status ENUM('draft', 'pending_approval', 'approved', 'active', 'paused', 'completed', 'rejected', 'cancelled') DEFAULT 'draft',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',

  -- Targeting
  target_audience JSON,
  target_locations JSON,
  target_categories JSON,
  target_price_range JSON,

  -- Budget and bidding
  budget_type ENUM('daily', 'total', 'unlimited') DEFAULT 'daily',
  daily_budget DECIMAL(10,2),
  total_budget DECIMAL(10,2),
  bid_strategy ENUM('manual', 'auto', 'target_roas', 'target_impressions') DEFAULT 'manual',
  max_bid DECIMAL(8,2),

  -- Scheduling
  start_date DATE,
  end_date DATE,
  schedule_days JSON, -- ["monday", "tuesday", etc.]
  schedule_hours JSON, -- ["09:00-17:00", etc.]

  -- Content
  title VARCHAR(255),
  description TEXT,
  image_url VARCHAR(500),
  banner_url VARCHAR(500),
  landing_url VARCHAR(500),
  call_to_action VARCHAR(100),

  -- Performance tracking
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0.00,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  ctr DECIMAL(5,4) DEFAULT 0.0000,
  cpc DECIMAL(8,2) DEFAULT 0.00,
  roas DECIMAL(8,2) DEFAULT 0.00,

  -- Owner and approval
  created_by INT NOT NULL,
  advertiser_id INT, -- For marketplace sellers
  approved_by INT,
  approved_at TIMESTAMP,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (advertiser_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_type (campaign_type),
  INDEX idx_priority (priority),
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date),
  INDEX idx_created_by (created_by),
  INDEX idx_advertiser (advertiser_id),
  INDEX idx_approved (approved_by)
) COMMENT 'Advertising campaigns with targeting, budgeting, and performance tracking';

-- Campaign ads table
CREATE TABLE IF NOT EXISTS campaign_ads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  ad_type ENUM('banner', 'text', 'video', 'carousel', 'story') DEFAULT 'banner',
  ad_name VARCHAR(255) NOT NULL,
  status ENUM('active', 'paused', 'rejected', 'pending') DEFAULT 'active',

  -- Content
  headline VARCHAR(255),
  description TEXT,
  primary_image VARCHAR(500),
  secondary_images JSON,
  video_url VARCHAR(500),
  button_text VARCHAR(50),
  button_url VARCHAR(500),

  -- Targeting (can override campaign level)
  custom_targeting JSON,

  -- Performance
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0.0000,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
  INDEX idx_campaign (campaign_id),
  INDEX idx_status (status),
  INDEX idx_type (ad_type)
) COMMENT 'Individual ads within campaigns';

-- Ad placements table
CREATE TABLE IF NOT EXISTS ad_placements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  placement_name VARCHAR(255) NOT NULL UNIQUE,
  placement_type ENUM('homepage_banner', 'category_banner', 'product_page', 'search_results', 'sidebar', 'footer', 'popup') NOT NULL,
  description TEXT,
  dimensions VARCHAR(50), -- "728x90", "300x250", etc.
  max_ads INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_type (placement_type),
  INDEX idx_active (is_active)
) COMMENT 'Available advertising placement locations';

-- Campaign placements junction table
CREATE TABLE IF NOT EXISTS campaign_placements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  placement_id INT NOT NULL,
  weight INT DEFAULT 1, -- For rotation priority
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (placement_id) REFERENCES ad_placements(id) ON DELETE CASCADE,
  UNIQUE KEY unique_campaign_placement (campaign_id, placement_id),
  INDEX idx_campaign (campaign_id),
  INDEX idx_placement (placement_id),
  INDEX idx_active (is_active)
) COMMENT 'Campaign to placement assignments with weights';

-- Ad impressions table
CREATE TABLE IF NOT EXISTS ad_impressions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  ad_id INT NOT NULL,
  placement_id INT NOT NULL,
  user_id INT,
  session_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer VARCHAR(500),
  location VARCHAR(100), -- City/Country
  device_type ENUM('desktop', 'mobile', 'tablet') DEFAULT 'desktop',
  browser VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (ad_id) REFERENCES campaign_ads(id) ON DELETE CASCADE,
  FOREIGN KEY (placement_id) REFERENCES ad_placements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_campaign (campaign_id),
  INDEX idx_ad (ad_id),
  INDEX idx_placement (placement_id),
  INDEX idx_user (user_id),
  INDEX idx_session (session_id),
  INDEX idx_created_at (created_at)
) COMMENT 'Ad impression tracking for analytics';

-- Ad clicks table
CREATE TABLE IF NOT EXISTS ad_clicks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  ad_id INT NOT NULL,
  placement_id INT NOT NULL,
  impression_id INT,
  user_id INT,
  session_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer VARCHAR(500),
  landing_url VARCHAR(500),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (ad_id) REFERENCES campaign_ads(id) ON DELETE CASCADE,
  FOREIGN KEY (placement_id) REFERENCES ad_placements(id) ON DELETE CASCADE,
  FOREIGN KEY (impression_id) REFERENCES ad_impressions(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_campaign (campaign_id),
  INDEX idx_ad (ad_id),
  INDEX idx_placement (placement_id),
  INDEX idx_impression (impression_id),
  INDEX idx_user (user_id),
  INDEX idx_session (session_id),
  INDEX idx_created_at (created_at)
) COMMENT 'Ad click tracking for conversions';

-- Ad conversions table
CREATE TABLE IF NOT EXISTS ad_conversions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  ad_id INT NOT NULL,
  click_id INT,
  user_id INT,
  conversion_type ENUM('purchase', 'signup', 'lead', 'custom') DEFAULT 'purchase',
  conversion_value DECIMAL(10,2),
  order_id VARCHAR(100), -- Reference to transaction
  custom_event VARCHAR(100), -- For custom conversion tracking

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (ad_id) REFERENCES campaign_ads(id) ON DELETE CASCADE,
  FOREIGN KEY (click_id) REFERENCES ad_clicks(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_campaign (campaign_id),
  INDEX idx_ad (ad_id),
  INDEX idx_click (click_id),
  INDEX idx_user (user_id),
  INDEX idx_type (conversion_type),
  INDEX idx_created_at (created_at)
) COMMENT 'Ad conversion tracking for ROI measurement';

-- Ad budgets table
CREATE TABLE IF NOT EXISTS ad_budgets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  allocated_budget DECIMAL(10,2) NOT NULL,
  spent_budget DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('active', 'completed', 'overspent') DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
  UNIQUE KEY unique_campaign_period (campaign_id, period_start, period_end),
  INDEX idx_campaign (campaign_id),
  INDEX idx_period (period_start, period_end),
  INDEX idx_status (status)
) COMMENT 'Budget tracking and allocation per campaign period';

-- Insert default ad placements
INSERT INTO ad_placements (placement_name, placement_type, description, dimensions, max_ads) VALUES
('Homepage Hero Banner', 'homepage_banner', 'Main banner at the top of homepage', '1200x400', 1),
('Homepage Sidebar', 'sidebar', 'Sidebar ads on homepage', '300x250', 3),
('Category Page Banner', 'category_banner', 'Banner at top of category pages', '728x90', 1),
('Product Page Banner', 'product_page', 'Banner on individual product pages', '728x90', 1),
('Search Results Sidebar', 'sidebar', 'Ads in search results sidebar', '300x600', 2),
('Footer Banner', 'footer', 'Banner above footer', '728x90', 1),
('Popup Ad', 'popup', 'Modal popup advertisements', '600x400', 1),
('Featured Product Spotlight', 'featured', 'Premium featured product placement', '400x300', 4)
ON DUPLICATE KEY UPDATE placement_name = VALUES(placement_name);