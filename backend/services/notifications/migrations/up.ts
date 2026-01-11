import { getConnection } from '/app/shared/database.js';

async function runMigrations() {
  let connection;
  try {
    connection = await getConnection();

    // Notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        type ENUM('email', 'sms', 'push', 'system') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSON DEFAULT ('{}'),
        priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
        expires_at TIMESTAMP NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        is_sent BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_priority (priority),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at),
        INDEX idx_expires_at (expires_at)
      )
    `);

    // Email logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NULL,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        template VARCHAR(100),
        data JSON DEFAULT ('{}'),
        status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
        provider VARCHAR(50),
        message_id VARCHAR(255),
        error_message TEXT,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_to_email (to_email),
        INDEX idx_status (status),
        INDEX idx_provider (provider),
        INDEX idx_created_at (created_at)
      )
    `);

    // SMS logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NULL,
        to_phone VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        provider VARCHAR(50),
        message_sid VARCHAR(255),
        status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
        segments INT DEFAULT 1,
        cost DECIMAL(10,4) NULL,
        error_message TEXT,
        sent_at TIMESTAMP NULL,
        delivered_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_to_phone (to_phone),
        INDEX idx_status (status),
        INDEX idx_provider (provider),
        INDEX idx_created_at (created_at)
      )
    `);

    // Push tokens table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        device_type ENUM('ios', 'android', 'web') NOT NULL,
        token TEXT NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        app_version VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        last_used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_device (user_id, device_id),
        INDEX idx_user_id (user_id),
        INDEX idx_device_type (device_type),
        INDEX idx_is_active (is_active),
        INDEX idx_last_used_at (last_used_at)
      )
    `);

    // Notification preferences table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL UNIQUE,
        email_preferences JSON DEFAULT ('{"order_updates":true,"payment_notifications":true,"security_alerts":true,"marketing_emails":false,"product_updates":true,"system_maintenance":true}'),
        sms_preferences JSON DEFAULT ('{"order_updates":false,"payment_notifications":true,"security_alerts":true,"marketing_messages":false}'),
        push_preferences JSON DEFAULT ('{"order_updates":true,"payment_notifications":true,"security_alerts":true,"marketing_push":false,"product_updates":true,"new_messages":true}'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);

    // Notification templates table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        type ENUM('email', 'sms', 'push') NOT NULL,
        subject VARCHAR(255),
        content TEXT NOT NULL,
        variables JSON DEFAULT ('[]'),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_type (type),
        INDEX idx_is_active (is_active),
        INDEX idx_name (name)
      )
    `);

    // Insert default notification templates
    await connection.execute(`
      INSERT INTO notification_templates (name, type, subject, content, variables) VALUES
       ('order_placed', 'email', 'Order Confirmation - Order #{{order_id}}',
       'Dear {{customer_name}},\\n\\nYour order #{{order_id}} has been successfully placed.\\n\\nOrder Details:\\n{{order_details}}\\n\\nTotal: {{total_amount}}\\n\\nThank you for shopping with us!',
       '[\"customer_name\", \"order_id\", \"order_details\", \"total_amount\"]'),

      ('order_shipped', 'email', 'Your Order Has Been Shipped',
       'Hi {{customer_name}},\\n\\nGreat news! Your order #{{order_id}} has been shipped and is on its way.\\n\\nTracking Number: {{tracking_number}}\\nExpected Delivery: {{delivery_date}}\\n\\nYou can track your package here: {{tracking_url}}',
       '[\"customer_name\", \"order_id\", \"tracking_number\", \"delivery_date\", \"tracking_url\"]'),

       ('payment_received', 'email', 'Payment Confirmation',
       'Hello {{customer_name}},\\n\\nWe have received your payment of {{amount}} for order #{{order_id}}.\\n\\nPayment Method: {{payment_method}}\\nTransaction ID: {{transaction_id}}\\n\\nThank you for your business!',
       '[\"customer_name\", \"amount\", \"order_id\", \"payment_method\", \"transaction_id\"]'),

      ('welcome_email', 'email', 'Welcome to Our Marketplace!',
       'Welcome {{user_name}}!\\n\\nThank you for joining our marketplace. Your account has been successfully created.\\n\\nYou can now:\\n- Browse and purchase products\\n- Sell your own products\\n- Track your orders\\n- Manage your account\\n\\nHappy shopping!\\n\\nBest regards,\\nMarketplace Team',
       '[\"user_name\"]'),

      ('password_reset', 'email', 'Password Reset Request',
       'Hi {{user_name}},\\n\\nYou requested a password reset for your account.\\n\\nClick the link below to reset your password:\\n{{reset_link}}\\n\\nThis link will expire in 1 hour.\\n\\nIf you did not request this reset, please ignore this email.',
       '[\"user_name\", \"reset_link\"]'),

      ('new_message', 'push', NULL,
       'New message from {{sender_name}}',
       '[\"sender_name\"]'),

      ('order_update', 'push', NULL,
       'Order #{{order_id}} status updated: {{status}}',
       '[\"order_id\", \"status\"]'),

      ('payment_failed', 'push', NULL,
       'Payment failed for order #{{order_id}}',
       '[\"order_id\"]'),

       ('order_placed_sms', 'sms', NULL,
       'Order #{{order_id}} confirmed. Total: {{total}}. Track at {{tracking_url}}',
       '[\"order_id\", \"total\", \"tracking_url\"]'),

      ('payment_failed_sms', 'sms', NULL,
       'Payment failed for order #{{order_id}}. Please update payment method.',
       '[\"order_id\"]'),

      ('delivery_update_sms', 'sms', NULL,
       'Order #{{order_id}} {{status}}. {{delivery_info}}',
       '[\"order_id\", \"status\", \"delivery_info\"]')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);

    // Create additional indexes
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at)
    `);

    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_email_logs_user_status ON email_logs(user_id, status, created_at)
    `);

    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_sms_logs_user_status ON sms_logs(user_id, status, created_at)
    `);

    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active ON push_tokens(user_id, is_active)
    `);

    console.log('✅ Notifications service migrations completed successfully');
    console.log('📋 Created tables: notifications, email_logs, sms_logs, push_tokens, notification_preferences, notification_templates');
    console.log('📧 Default notification templates inserted');
    console.log('📨 Notification queuing system ready');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

runMigrations();