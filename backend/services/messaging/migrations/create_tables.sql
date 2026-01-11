-- Messaging Service Database Migration
-- Run this script to create all messaging-related tables

USE fenap_marketplace;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('direct', 'group', 'order_support', 'system') NOT NULL DEFAULT 'direct',
  title VARCHAR(255),
  description TEXT,
  created_by INT NOT NULL,
  metadata JSON DEFAULT ('{}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_created_by (created_by),
  INDEX idx_type (type),
  INDEX idx_updated_at (updated_at)
) COMMENT 'Chat conversations between users';

-- Conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,
  added_by INT,
  role ENUM('admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NULL,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_conversation_user (conversation_id, user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_conversation_id (conversation_id)
) COMMENT 'Users participating in conversations';

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT,
  message_type ENUM('text', 'image', 'file', 'system', 'emoji') DEFAULT 'text',
  metadata JSON DEFAULT ('{}'),
  reply_to INT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by INT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL,
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_sender_id (sender_id),
  INDEX idx_created_at (created_at),
  INDEX idx_message_type (message_type)
) COMMENT 'Individual messages within conversations';

-- Message reads table (for read receipts)
CREATE TABLE IF NOT EXISTS message_reads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_message_user (message_id, user_id),
  INDEX idx_message_id (message_id),
  INDEX idx_user_id (user_id),
  INDEX idx_read_at (read_at)
) COMMENT 'Tracks which users have read which messages';

-- Message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  uploaded_by INT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by INT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_message_id (message_id),
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_mime_type (mime_type)
) COMMENT 'File attachments for messages';

-- Typing indicators table (for real-time typing status)
CREATE TABLE IF NOT EXISTS typing_indicators (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_conversation_user_typing (conversation_id, user_id),
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_user_id (user_id),
  INDEX idx_last_updated (last_updated)
) COMMENT 'Tracks users currently typing in conversations';

-- Create indexes for better performance
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_message_reads_user_read ON message_reads(user_id, read_at);