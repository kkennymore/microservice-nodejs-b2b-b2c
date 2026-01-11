-- Enhanced Analytics Service Database Schema
-- Advanced business intelligence, predictive analytics, and real-time reporting

CREATE DATABASE IF NOT EXISTS enhanced_analytics_db;
USE enhanced_analytics_db;

-- Cohort analysis table for user segmentation and behavior analysis
CREATE TABLE cohort_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cohort_name VARCHAR(255) NOT NULL,
    cohort_type ENUM('time_based', 'behavior_based', 'demographic') NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    segment_criteria JSON NOT NULL,
    user_count INT DEFAULT 0,
    retention_rate DECIMAL(5,4) DEFAULT 0.0000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cohort_type (cohort_type),
    INDEX idx_dates (start_date, end_date)
);

-- Predictive models table for ML model management
CREATE TABLE predictive_models (
    id INT PRIMARY KEY AUTO_INCREMENT,
    model_name VARCHAR(255) NOT NULL,
    model_type ENUM('customer_churn', 'purchase_prediction', 'recommendation_score', 'price_optimization') NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    accuracy_score DECIMAL(5,4),
    training_data_size INT,
    last_trained_at DATETIME,
    model_parameters JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_model_type (model_type),
    INDEX idx_active (is_active)
);

-- Advanced metrics table for custom KPIs and business intelligence
CREATE TABLE advanced_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric_name VARCHAR(255) NOT NULL,
    metric_category ENUM('revenue', 'user_engagement', 'conversion', 'retention', 'performance') NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(50),
    time_period ENUM('hourly', 'daily', 'weekly', 'monthly', 'yearly') NOT NULL,
    calculated_at DATETIME NOT NULL,
    data_source VARCHAR(255),
    filters_applied JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category_period (metric_category, time_period),
    INDEX idx_calculated_at (calculated_at),
    INDEX idx_metric_name (metric_name)
);

-- Dashboards table for saved dashboard configurations
CREATE TABLE dashboards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dashboard_name VARCHAR(255) NOT NULL,
    dashboard_description TEXT,
    user_id INT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    layout_config JSON NOT NULL,
    widgets_config JSON NOT NULL,
    refresh_interval INT DEFAULT 300, -- seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_public (is_public)
);

-- Reports table for scheduled and ad-hoc reporting
CREATE TABLE reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_name VARCHAR(255) NOT NULL,
    report_type ENUM('scheduled', 'ad_hoc', 'automated') NOT NULL,
    report_format ENUM('json', 'csv', 'pdf', 'excel') NOT NULL,
    query_config JSON NOT NULL,
    schedule_config JSON, -- for scheduled reports
    recipient_emails JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at DATETIME,
    next_run_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_report_type (report_type),
    INDEX idx_active (is_active),
    INDEX idx_next_run (next_run_at)
);

-- Real-time metrics table for live data aggregation
CREATE TABLE real_time_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric_key VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4),
    timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    source_service VARCHAR(100),
    tags JSON,
    INDEX idx_metric_key (metric_key),
    INDEX idx_timestamp (timestamp),
    INDEX idx_source (source_service)
);

-- Predictions table for ML model outputs
CREATE TABLE predictions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    model_id INT NOT NULL,
    entity_type ENUM('user', 'product', 'order', 'campaign') NOT NULL,
    entity_id INT NOT NULL,
    prediction_score DECIMAL(5,4),
    prediction_label VARCHAR(255),
    confidence_score DECIMAL(5,4),
    prediction_data JSON,
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES predictive_models(id) ON DELETE CASCADE,
    INDEX idx_model_entity (model_id, entity_type, entity_id),
    INDEX idx_expires (expires_at)
);

-- Custom alerts table for automated monitoring
CREATE TABLE custom_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alert_name VARCHAR(255) NOT NULL,
    alert_condition JSON NOT NULL,
    alert_threshold JSON NOT NULL,
    alert_channels JSON NOT NULL, -- email, slack, webhook, etc.
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_last_triggered (last_triggered_at)
);

-- Audit log for analytics operations
CREATE TABLE analytics_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at)
);