-- Recommender Service Database Migrations
-- Creates tables for recommendation system

USE fenap_marketplace;

-- User-product interactions table
CREATE TABLE IF NOT EXISTS user_product_interactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  interaction_type ENUM('view', 'click', 'add_to_cart', 'purchase', 'review', 'favorite') NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.00,
  metadata JSON,
  session_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_user_product (user_id, product_id),
  INDEX idx_interaction_type (interaction_type),
  INDEX idx_created_at (created_at),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recommendation results table
CREATE TABLE IF NOT EXISTS recommendation_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  recommended_products JSON NOT NULL,
  algorithm VARCHAR(50) NOT NULL DEFAULT 'hybrid',
  context JSON,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_algorithm (algorithm),
  INDEX idx_session (session_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recommendation clicks table
CREATE TABLE IF NOT EXISTS recommendation_clicks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  recommendation_id INT,
  position INT,
  session_id VARCHAR(255),
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (recommendation_id) REFERENCES recommendation_results(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_product (product_id),
  INDEX idx_recommendation (recommendation_id),
  INDEX idx_position (position),
  INDEX idx_session (session_id),
  INDEX idx_clicked_at (clicked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Model performance metrics table
CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  model_name VARCHAR(100) NOT NULL,
  algorithm VARCHAR(50) NOT NULL,
  metric_name VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,4),
  dataset_size INT,
  training_time_seconds INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_model (model_name),
  INDEX idx_algorithm (algorithm),
  INDEX idx_metric (metric_name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A/B testing experiments table
CREATE TABLE IF NOT EXISTS ab_testing_experiments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  experiment_name VARCHAR(100) NOT NULL UNIQUE,
  algorithm_a VARCHAR(50) NOT NULL,
  algorithm_b VARCHAR(50) NOT NULL,
  target_metric VARCHAR(50) NOT NULL DEFAULT 'click_rate',
  sample_size INT DEFAULT 1000,
  status ENUM('active', 'completed', 'paused') DEFAULT 'active',
  winner VARCHAR(50),
  confidence_level DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,

  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A/B testing results table
CREATE TABLE IF NOT EXISTS ab_testing_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  experiment_id INT NOT NULL,
  algorithm VARCHAR(50) NOT NULL,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (experiment_id) REFERENCES ab_testing_experiments(id) ON DELETE CASCADE,
  INDEX idx_experiment (experiment_id),
  INDEX idx_algorithm (algorithm),
  INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User preferences for recommendations
CREATE TABLE IF NOT EXISTS user_recommendation_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  preferred_categories JSON,
  preferred_price_range JSON,
  excluded_categories JSON,
  favorite_brands JSON,
  interaction_weights JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;