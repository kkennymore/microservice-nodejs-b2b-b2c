-- Analytics Service Database Migration
-- Run this script to create all analytics-related tables

-- USE fenap_marketplace; -- Database selected by connection

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(100) NOT NULL,
  user_id VARCHAR(36) NULL,
  session_id VARCHAR(255),
  event_data JSON DEFAULT ('{}'),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_event_type (event_type),
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_created_at (created_at)
) COMMENT 'Raw analytics events for tracking user behavior and system events';

-- Sales analytics summary table
CREATE TABLE IF NOT EXISTS sales_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0.00,
  average_order_value DECIMAL(10,2) DEFAULT 0.00,
  unique_customers INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_date (date),
  INDEX idx_date (date)
) COMMENT 'Daily aggregated sales analytics data';

-- User analytics summary table
CREATE TABLE IF NOT EXISTS user_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  new_users INT DEFAULT 0,
  active_users INT DEFAULT 0,
  returning_users INT DEFAULT 0,
  sessions INT DEFAULT 0,
  page_views INT DEFAULT 0,
  average_session_duration INT DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_date (date),
  INDEX idx_date (date)
) COMMENT 'Daily aggregated user behavior analytics data';

-- Product analytics summary table
CREATE TABLE IF NOT EXISTS product_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id VARCHAR(36),
  date DATE NOT NULL,
  views INT DEFAULT 0,
  add_to_cart INT DEFAULT 0,
  purchases INT DEFAULT 0,
  revenue DECIMAL(15,2) DEFAULT 0.00,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_product_id (product_id),
  INDEX idx_date (date),
  UNIQUE KEY unique_product_date (product_id, date)
) COMMENT 'Daily product performance analytics data';

-- Dashboard cache table
CREATE TABLE IF NOT EXISTS dashboard_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  cache_data JSON NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_cache_key (cache_key),
  INDEX idx_expires_at (expires_at)
) COMMENT 'Cached dashboard data for improved performance';

-- Analytics reports table
CREATE TABLE IF NOT EXISTS analytics_reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_type VARCHAR(100) NOT NULL,
  report_name VARCHAR(255) NOT NULL,
  parameters JSON DEFAULT ('{}'),
  generated_by VARCHAR(36) NOT NULL,
  file_path VARCHAR(500),
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,

  -- FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_report_type (report_type),
  INDEX idx_status (status),
  INDEX idx_created_by (generated_by),
  INDEX idx_created_at (created_at)
) COMMENT 'Generated analytics reports tracking';

-- Real-time metrics table
CREATE TABLE IF NOT EXISTS realtime_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metric_name VARCHAR(100) NOT NULL,
  metric_value JSON NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_metric_name (metric_name),
  INDEX idx_recorded_at (recorded_at)
) COMMENT 'Real-time metrics for live dashboard updates';

-- Create some initial analytics views for better query performance
-- Note: Cross-database views removed for microservices architecture

CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT
  DATE(ae.timestamp) as activity_date,
  COUNT(DISTINCT ae.user_id) as active_users,
  COUNT(*) as total_events,
  COUNT(DISTINCT ae.session_id) as sessions
FROM analytics_events ae
WHERE ae.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(ae.timestamp);

-- Insert sample data for testing (remove in production)
INSERT INTO analytics_events (event_type, user_id, session_id, event_data, ip_address) VALUES
('page_view', 1, 'session_123', '{"page": "/products", "duration": 45}', '127.0.0.1'),
('user_login', 1, 'session_123', '{"method": "email"}', '127.0.0.1'),
('product_view', 1, 'session_123', '{"product_id": 1, "category": "electronics"}', '127.0.0.1'),
('add_to_cart', 1, 'session_123', '{"product_id": 1, "quantity": 1}', '127.0.0.1')
ON DUPLICATE KEY UPDATE event_type = VALUES(event_type);