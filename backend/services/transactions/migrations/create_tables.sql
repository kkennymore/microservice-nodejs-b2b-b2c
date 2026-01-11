-- Transactions Service Database Migration
-- Run this script to create all transaction-related tables

USE fenap_marketplace;

-- Transactions table for payment records
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('payment', 'refund', 'withdrawal', 'deposit', 'subscription') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  external_transaction_id VARCHAR(255),
  status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
  description TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
);

-- Wallets table for user balances
CREATE TABLE IF NOT EXISTS wallets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  balance DECIMAL(15,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Wallet transactions table for balance changes
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  wallet_id INT NOT NULL,
  transaction_id INT,
  amount DECIMAL(15,2) NOT NULL,
  type ENUM('credit', 'debit') NOT NULL,
  description TEXT,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_created_at (created_at)
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  interval_type ENUM('month', 'year') NOT NULL,
  interval_count INT DEFAULT 1,
  features JSON,
  active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_active (active),
  INDEX idx_price (price)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  status ENUM('active', 'inactive', 'cancelled', 'expired') DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT 1,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date)
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, interval_type, features) VALUES
('Basic Seller', 'Essential features for small sellers', 9.99, 'month', '{"products": 50, "analytics": true, "support": "email"}'),
('Pro Seller', 'Advanced features for growing businesses', 29.99, 'month', '{"products": 500, "analytics": true, "support": "priority", "marketing": true}'),
('Enterprise Seller', 'Full features for large businesses', 99.99, 'month', '{"products": -1, "analytics": true, "support": "dedicated", "marketing": true, "api": true}'),
('Basic Yearly', 'Essential features billed annually', 99.99, 'year', '{"products": 50, "analytics": true, "support": "email"}'),
('Pro Yearly', 'Advanced features billed annually', 299.99, 'year', '{"products": 500, "analytics": true, "support": "priority", "marketing": true}'),
('Enterprise Yearly', 'Full features billed annually', 999.99, 'year', '{"products": -1, "analytics": true, "support": "dedicated", "marketing": true, "api": true}');

-- Escrow table for buyer protection
CREATE TABLE IF NOT EXISTS escrow (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_id INT NOT NULL,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('held', 'released', 'refunded', 'disputed') DEFAULT 'held',
  auto_release_date DATE,
  release_conditions JSON,
  dispute_reason TEXT,
  dispute_resolved_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_buyer_id (buyer_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_status (status),
  INDEX idx_auto_release_date (auto_release_date)
);

-- Create trigger to automatically create wallet for new users
DELIMITER ;;
CREATE TRIGGER create_wallet_on_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO wallets (user_id, balance, currency) VALUES (NEW.id, 0, 'USD');
END;;
DELIMITER ;