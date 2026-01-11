-- Shipping Service Database Migration
-- Run this script to create all shipping-related tables

USE fenap_marketplace;

-- Shipping carriers table
CREATE TABLE IF NOT EXISTS shipping_carriers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  tracking_url VARCHAR(255),
  api_endpoint VARCHAR(255),
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  is_active BOOLEAN DEFAULT 1,
  supported_countries JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_code (code),
  INDEX idx_active (is_active)
) COMMENT 'Shipping carriers like FedEx, UPS, USPS, DHL';

-- Shipping zones table
CREATE TABLE IF NOT EXISTS shipping_zones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  countries JSON NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_active (is_active)
) COMMENT 'Geographic shipping zones (domestic, international, etc.)';

-- Shipping rates table
CREATE TABLE IF NOT EXISTS shipping_rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  carrier_id INT NOT NULL,
  zone_id INT NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  weight_min DECIMAL(10,2) DEFAULT 0,
  weight_max DECIMAL(10,2),
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  estimated_days_min INT,
  estimated_days_max INT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES shipping_zones(id) ON DELETE CASCADE,
  INDEX idx_carrier_zone (carrier_id, zone_id),
  INDEX idx_active (is_active),
  INDEX idx_service_type (service_type)
) COMMENT 'Shipping rates by carrier, zone, and service type';

-- Seller shipping settings table
CREATE TABLE IF NOT EXISTS seller_shipping_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  seller_id INT NOT NULL,
  default_carrier_id INT,
  free_shipping_threshold DECIMAL(10,2),
  handling_time_days INT DEFAULT 1,
  return_policy TEXT,
  customs_info JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (default_carrier_id) REFERENCES shipping_carriers(id) ON DELETE SET NULL,
  INDEX idx_seller_id (seller_id)
) COMMENT 'Seller-specific shipping configurations';

-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  seller_id INT NOT NULL,
  carrier_id INT NOT NULL,
  tracking_number VARCHAR(100) UNIQUE,
  service_type VARCHAR(50),
  status ENUM('pending', 'label_created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned') DEFAULT 'pending',
  shipping_cost DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  weight DECIMAL(10,2),
  dimensions JSON,
  ship_from JSON NOT NULL,
  ship_to JSON NOT NULL,
  label_url VARCHAR(500),
  tracking_url VARCHAR(500),
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_tracking_number (tracking_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) COMMENT 'Shipment records for orders';

-- Shipment items table
CREATE TABLE IF NOT EXISTS shipment_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shipment_id INT NOT NULL,
  order_item_id INT NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  INDEX idx_shipment_id (shipment_id),
  INDEX idx_order_item_id (order_item_id)
) COMMENT 'Items included in each shipment';

-- Tracking events table
CREATE TABLE IF NOT EXISTS tracking_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shipment_id INT NOT NULL,
  tracking_number VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_description TEXT,
  location VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  event_date TIMESTAMP NOT NULL,
  carrier_event_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  INDEX idx_shipment_id (shipment_id),
  INDEX idx_tracking_number (tracking_number),
  INDEX idx_event_date (event_date),
  INDEX idx_event_type (event_type)
) COMMENT 'Detailed tracking events from carriers';

-- Return shipments table
CREATE TABLE IF NOT EXISTS return_shipments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  original_shipment_id INT NOT NULL,
  return_reason VARCHAR(255),
  status ENUM('requested', 'approved', 'label_created', 'shipped', 'received', 'refunded', 'rejected') DEFAULT 'requested',
  carrier_id INT,
  tracking_number VARCHAR(100) UNIQUE,
  return_cost DECIMAL(10,2),
  refund_amount DECIMAL(10,2),
  return_address JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (original_shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(id) ON DELETE SET NULL,
  INDEX idx_original_shipment (original_shipment_id),
  INDEX idx_status (status),
  INDEX idx_tracking_number (tracking_number)
) COMMENT 'Return shipment handling';

-- Insert default carriers
INSERT INTO shipping_carriers (name, code, tracking_url, api_endpoint, is_active, supported_countries) VALUES
('FedEx', 'fedex', 'https://www.fedex.com/en-us/tracking.html', 'https://apis.fedex.com', 1, '["US", "CA", "MX"]'),
('UPS', 'ups', 'https://www.ups.com/track', 'https://onlinetools.ups.com', 1, '["US", "CA", "MX", "EU"]'),
('USPS', 'usps', 'https://tools.usps.com/go/TrackConfirmAction', 'https://secure.shippingapis.com', 1, '["US"]'),
('DHL', 'dhl', 'https://www.dhl.com/us-en/home/tracking.html', 'https://api.dhl.com', 1, '["US", "EU", "AS", "AU"]'),
('Canada Post', 'canada_post', 'https://www.canadapost.ca/track/', 'https://ct.soa-gw.canadapost.ca', 0, '["CA"]')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default shipping zones
INSERT INTO shipping_zones (name, countries, is_active) VALUES
('United States', '["US"]', 1),
('Canada', '["CA"]', 1),
('Mexico', '["MX"]', 1),
('European Union', '["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "DK", "FI", "SE", "IE", "LU", "MT", "CY", "EE", "LV", "LT", "SK", "SI", "HR", "BG", "RO", "HU", "CZ", "PL", "GR"]', 1),
('Asia Pacific', '["JP", "CN", "KR", "SG", "AU", "NZ", "TH", "MY", "ID", "PH", "VN"]', 1),
('Rest of World', '["BR", "AR", "CL", "CO", "PE", "VE", "ZA", "NG", "EG", "KE", "MA", "TN", "TR", "RU", "IN", "PK", "BD", "LK", "NP", "MM", "KH", "LA"]', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert sample shipping rates
INSERT INTO shipping_rates (carrier_id, zone_id, service_type, service_name, weight_max, price, estimated_days_min, estimated_days_max, is_active) VALUES
(1, 1, 'GROUND', 'FedEx Ground', 68.0, 12.99, 1, 5, 1),
(1, 1, 'EXPRESS', 'FedEx Express', 68.0, 24.99, 1, 2, 1),
(2, 1, 'GROUND', 'UPS Ground', 68.0, 11.99, 1, 5, 1),
(2, 1, '3DAY', 'UPS 3 Day Select', 68.0, 18.99, 3, 3, 1),
(3, 1, 'PRIORITY', 'USPS Priority Mail', 70.0, 8.99, 1, 3, 1),
(3, 1, 'FIRST_CLASS', 'USPS First Class', 0.8, 4.99, 1, 3, 1)
ON DUPLICATE KEY UPDATE price = VALUES(price);