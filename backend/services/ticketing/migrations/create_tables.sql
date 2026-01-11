-- Ticketing Service Database Migration
-- Run this script to create all ticketing-related tables

USE fenap_marketplace;

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ticket_number VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed', 'escalated') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  category ENUM('account', 'payment', 'shipping', 'product', 'technical', 'refund', 'other') DEFAULT 'other',
  subcategory VARCHAR(100),

  -- Customer information
  customer_id INT NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),

  -- Assignment
  assigned_to INT,
  department ENUM('billing', 'technical', 'shipping', 'general', 'management') DEFAULT 'general',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  first_response_at TIMESTAMP,
  sla_deadline TIMESTAMP,

  -- SLA tracking
  sla_breached BOOLEAN DEFAULT FALSE,
  response_time_minutes INT,
  resolution_time_hours INT,

  -- Metadata
  source ENUM('web', 'email', 'api', 'phone', 'chat') DEFAULT 'web',
  tags JSON,
  custom_fields JSON,

  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_ticket_number (ticket_number),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_category (category),
  INDEX idx_customer_id (customer_id),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_department (department),
  INDEX idx_created_at (created_at),
  INDEX idx_sla_deadline (sla_deadline)
) COMMENT 'Main support tickets table';

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  author_id INT NOT NULL,
  author_type ENUM('customer', 'agent', 'system') DEFAULT 'customer',
  message_type ENUM('message', 'note', 'system') DEFAULT 'message',
  content TEXT NOT NULL,
  attachments JSON,
  is_internal BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_author_id (author_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_internal (is_internal)
) COMMENT 'Messages and notes within support tickets';

-- Ticket attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  message_id INT,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by INT NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES ticket_messages(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_message_id (message_id),
  INDEX idx_uploaded_by (uploaded_by)
) COMMENT 'File attachments for support tickets';

-- Ticket history table
CREATE TABLE IF NOT EXISTS ticket_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  changed_by INT NOT NULL,
  change_type ENUM('status_change', 'assignment', 'priority_change', 'category_change', 'sla_update') NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_changed_by (changed_by),
  INDEX idx_change_type (change_type),
  INDEX idx_created_at (created_at)
) COMMENT 'Audit history of ticket changes';

-- Ticket templates table
CREATE TABLE IF NOT EXISTS ticket_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category ENUM('account', 'payment', 'shipping', 'product', 'technical', 'refund', 'other') NOT NULL,
  title_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  department ENUM('billing', 'technical', 'shipping', 'general', 'management') DEFAULT 'general',
  tags JSON,
  is_active BOOLEAN DEFAULT TRUE,

  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_category (category),
  INDEX idx_department (department),
  INDEX idx_is_active (is_active)
) COMMENT 'Predefined ticket templates for common issues';

-- SLA policies table
CREATE TABLE IF NOT EXISTS sla_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category ENUM('account', 'payment', 'shipping', 'product', 'technical', 'refund', 'other') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL,
  first_response_minutes INT NOT NULL,
  resolution_hours INT NOT NULL,
  business_hours_only BOOLEAN DEFAULT TRUE,
  exclude_weekends BOOLEAN DEFAULT TRUE,
  exclude_holidays BOOLEAN DEFAULT TRUE,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_category_priority (category, priority),
  INDEX idx_is_active (is_active)
) COMMENT 'SLA policies for different ticket types and priorities';

-- Agent workload table
CREATE TABLE IF NOT EXISTS agent_workload (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agent_id INT NOT NULL UNIQUE,
  active_tickets INT DEFAULT 0,
  max_capacity INT DEFAULT 10,
  specializations JSON,
  is_available BOOLEAN DEFAULT TRUE,

  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_is_available (is_available),
  INDEX idx_last_updated (last_updated)
) COMMENT 'Agent workload and capacity management';

-- Canned responses table
CREATE TABLE IF NOT EXISTS canned_responses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category ENUM('account', 'payment', 'shipping', 'product', 'technical', 'refund', 'other') DEFAULT 'other',
  tags JSON,
  usage_count INT DEFAULT 0,

  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_category (category),
  INDEX idx_usage_count (usage_count)
) COMMENT 'Pre-written responses for common support scenarios';

-- Insert default SLA policies
INSERT INTO sla_policies (name, category, priority, first_response_minutes, resolution_hours) VALUES
('Standard Account Support', 'account', 'low', 480, 24),      -- 8 hours response, 1 day resolution
('Standard Account Support', 'account', 'medium', 240, 12),   -- 4 hours response, 12 hours resolution
('Urgent Account Support', 'account', 'high', 60, 4),         -- 1 hour response, 4 hours resolution
('Critical Account Support', 'account', 'urgent', 15, 1),     -- 15 min response, 1 hour resolution

('Standard Payment Support', 'payment', 'low', 480, 24),
('Standard Payment Support', 'payment', 'medium', 240, 12),
('Urgent Payment Support', 'payment', 'high', 60, 4),
('Critical Payment Support', 'payment', 'urgent', 15, 1),

('Standard Shipping Support', 'shipping', 'low', 480, 48),    -- 2 days for shipping issues
('Standard Shipping Support', 'shipping', 'medium', 240, 24),
('Urgent Shipping Support', 'shipping', 'high', 120, 8),
('Critical Shipping Support', 'shipping', 'urgent', 30, 2),

('Standard Technical Support', 'technical', 'low', 720, 72),   -- 3 days for technical issues
('Standard Technical Support', 'technical', 'medium', 480, 48),
('Urgent Technical Support', 'technical', 'high', 120, 12),
('Critical Technical Support', 'technical', 'urgent', 30, 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert sample ticket templates
INSERT INTO ticket_templates (name, category, title_template, content_template, priority, department, created_by) VALUES
('Password Reset', 'account', 'Unable to access account - Password reset required', 'Hello,\n\nI am unable to access my account and need to reset my password. I have tried the password reset link but haven\'t received the email.\n\nPlease assist me in resetting my password.\n\nThank you.', 'medium', 'general', 1),

('Payment Failed', 'payment', 'Payment failed during checkout', 'Hello,\n\nI encountered a payment failure during checkout. The error message I received was: [Please specify error message]\n\nOrder details:\n- Items: [List items]\n- Total amount: [Amount]\n- Payment method: [Credit card/PayPal/etc]\n\nPlease help resolve this payment issue so I can complete my purchase.\n\nThank you.', 'high', 'billing', 1),

('Order Not Received', 'shipping', 'Order not received - tracking shows delivered', 'Hello,\n\nI have not received my order #[Order number] despite the tracking information showing it as delivered. \n\nOrder details:\n- Order number: [Order number]\n- Tracking number: [Tracking number]\n- Delivery date shown: [Date]\n- Items ordered: [List items]\n\nI have checked with neighbors and at the delivery location, but the package is not there. Please investigate this delivery issue.\n\nThank you.', 'high', 'shipping', 1),

('Product Quality Issue', 'product', 'Received damaged/defective product', 'Hello,\n\nI received a damaged/defective product in my recent order.\n\nOrder details:\n- Order number: [Order number]\n- Product: [Product name]\n- Issue description: [Describe the damage/defect]\n- Photos attached: [Yes/No]\n\nPlease arrange for a replacement or refund for this defective item.\n\nThank you.', 'medium', 'general', 1),

('Refund Request', 'refund', 'Requesting refund for order', 'Hello,\n\nI would like to request a refund for order #[Order number].\n\nReason for refund: [State reason - damaged product, wrong item, changed mind, etc.]\n\nOrder details:\n- Order date: [Date]\n- Items: [List items]\n- Payment method: [Original payment method]\n- Refund amount requested: [Full/Partial - specify amount]\n\nPlease process this refund request.\n\nThank you.', 'medium', 'billing', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);