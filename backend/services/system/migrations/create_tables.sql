-- System Service Database Migration
-- Run this script to create all system administration tables

USE fenap_marketplace;

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSON NOT NULL,
  setting_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
  description TEXT,
  is_system BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_setting_key (setting_key),
  INDEX idx_is_system (is_system)
) COMMENT 'Global system configuration settings';

-- Admin action logs table
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INT,
  action_description TEXT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_action_type (action_type),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at)
) COMMENT 'Audit log of all administrative actions';

-- System maintenance table
CREATE TABLE IF NOT EXISTS system_maintenance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  maintenance_type ENUM('scheduled', 'emergency', 'upgrade', 'backup') DEFAULT 'scheduled',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'failed') DEFAULT 'scheduled',
  affected_services JSON,
  created_by INT NOT NULL,
  notified_users BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_scheduled_start (scheduled_start),
  INDEX idx_maintenance_type (maintenance_type)
) COMMENT 'System maintenance windows and schedules';

-- User management table (extends user profiles for admin purposes)
CREATE TABLE IF NOT EXISTS user_management (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  account_status ENUM('active', 'suspended', 'banned', 'pending_verification') DEFAULT 'active',
  risk_score DECIMAL(3,2) DEFAULT 0.00,
  last_login_at TIMESTAMP,
  login_attempts INT DEFAULT 0,
  account_locked_until TIMESTAMP,
  email_verified BOOLEAN DEFAULT 0,
  phone_verified BOOLEAN DEFAULT 0,
  documents_verified BOOLEAN DEFAULT 0,
  admin_notes TEXT,
  flagged_at TIMESTAMP,
  flagged_reason TEXT,
  suspension_reason TEXT,
  ban_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_account_status (account_status),
  INDEX idx_risk_score (risk_score),
  INDEX idx_last_login (last_login_at),
  INDEX idx_flagged (flagged_at)
) COMMENT 'Extended user management information for admin oversight';

-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_type ENUM('error', 'warning', 'info', 'critical') DEFAULT 'info',
  alert_title VARCHAR(255) NOT NULL,
  alert_message TEXT NOT NULL,
  source_service VARCHAR(50),
  source_component VARCHAR(100),
  severity_level INT DEFAULT 1,
  status ENUM('active', 'acknowledged', 'resolved', 'dismissed') DEFAULT 'active',
  acknowledged_by INT,
  acknowledged_at TIMESTAMP,
  resolved_by INT,
  resolved_at TIMESTAMP,
  alert_data JSON,
  auto_resolve BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_alert_type (alert_type),
  INDEX idx_status (status),
  INDEX idx_severity (severity_level),
  INDEX idx_source_service (source_service),
  INDEX idx_created_at (created_at)
) COMMENT 'System alerts and notifications for administrators';

-- API rate limiting table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  identifier VARCHAR(255) NOT NULL,
  identifier_type ENUM('ip', 'user', 'api_key') DEFAULT 'ip',
  endpoint VARCHAR(255) NOT NULL,
  request_count INT DEFAULT 0,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  limit_exceeded BOOLEAN DEFAULT 0,
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_identifier_endpoint_window (identifier, endpoint, window_start),
  INDEX idx_identifier (identifier),
  INDEX idx_window_end (window_end),
  INDEX idx_blocked_until (blocked_until)
) COMMENT 'API rate limiting tracking and enforcement';

-- System performance metrics table
CREATE TABLE IF NOT EXISTS system_performance_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_name VARCHAR(50) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(15,4),
  metric_unit VARCHAR(20),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,

  INDEX idx_service_name (service_name),
  INDEX idx_metric_type (metric_type),
  INDEX idx_recorded_at (recorded_at)
) COMMENT 'System performance metrics collection';

-- User notification preferences (admin override)
CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN DEFAULT 1,
  sms_enabled BOOLEAN DEFAULT 0,
  push_enabled BOOLEAN DEFAULT 1,
  webhook_url VARCHAR(500),
  webhook_enabled BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_admin_notification (admin_id, notification_type),
  INDEX idx_admin_id (admin_id),
  INDEX idx_notification_type (notification_type)
) COMMENT 'Admin notification preferences for system alerts';

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_system) VALUES
('platform_name', '"Multivendor Marketplace"', 'string', 'Platform display name', 1),
('platform_version', '"1.0.0"', 'string', 'Current platform version', 1),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode for entire platform', 1),
('registration_enabled', 'true', 'boolean', 'Allow new user registrations', 1),
('max_file_upload_size', '10485760', 'number', 'Maximum file upload size in bytes (10MB)', 0),
('session_timeout', '3600000', 'number', 'User session timeout in milliseconds (1 hour)', 0),
('rate_limit_general', '100', 'number', 'General API rate limit per 15 minutes', 0),
('rate_limit_strict', '10', 'number', 'Strict API rate limit per 15 minutes', 0),
('email_verification_required', 'true', 'boolean', 'Require email verification for new accounts', 0),
('phone_verification_required', 'false', 'boolean', 'Require phone verification for new accounts', 0),
('default_currency', '"USD"', 'string', 'Default platform currency', 1),
('supported_currencies', '["USD", "EUR", "GBP", "CAD"]', 'array', 'List of supported currencies', 1),
('timezone', '"UTC"', 'string', 'Default platform timezone', 1),
('alert_email_recipients', '["admin@platform.com"]', 'array', 'Email addresses for system alerts', 0),
('backup_retention_days', '30', 'number', 'Number of days to retain backups', 0),
('log_retention_days', '90', 'number', 'Number of days to retain application logs', 0)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Insert sample admin action log
INSERT INTO admin_action_logs (admin_id, action_type, resource_type, action_description, ip_address) VALUES
(1, 'system_initialization', 'system', 'System service initialized with default settings', '127.0.0.1');

-- Create default admin notification preferences (will be populated when admins are assigned)
-- This is handled by application logic when admin role is assigned