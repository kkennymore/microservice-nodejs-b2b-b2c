import { getConnection } from '/app/shared/database.js';

async function runMigrations() {
  let connection;
  try {
    connection = await getConnection();

    // Conversations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type ENUM('direct', 'group', 'order_support', 'system') NOT NULL DEFAULT 'direct',
        title VARCHAR(255),
        description TEXT,
        created_by VARCHAR(36) NOT NULL,
        metadata JSON DEFAULT ('{}'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_created_by (created_by),
        INDEX idx_type (type),
        INDEX idx_updated_at (updated_at)
      )
    `);

    // Conversation participants table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        added_by VARCHAR(36),
        role ENUM('admin', 'member') DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP NULL,

        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_conversation_user (conversation_id, user_id),
        INDEX idx_user_id (user_id),
        INDEX idx_conversation_id (conversation_id)
      )
    `);

    // Messages table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        sender_id VARCHAR(36) NOT NULL,
        content TEXT,
        message_type ENUM('text', 'image', 'file', 'system', 'emoji') DEFAULT 'text',
        metadata JSON DEFAULT ('{}'),
        reply_to INT NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_by VARCHAR(36) NULL,
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
      )
    `);

    // Message reads table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS message_reads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        message_id INT NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_message_user (message_id, user_id),
        INDEX idx_message_id (message_id),
        INDEX idx_user_id (user_id),
        INDEX idx_read_at (read_at)
      )
    `);

    // Message attachments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        message_id INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        uploaded_by VARCHAR(36) NOT NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_by VARCHAR(36) NULL,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_message_id (message_id),
        INDEX idx_uploaded_by (uploaded_by),
        INDEX idx_mime_type (mime_type)
      )
    `);

    // Typing indicators table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS typing_indicators (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_conversation_user_typing (conversation_id, user_id),
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_user_id (user_id),
        INDEX idx_last_updated (last_updated)
      )
    `);

    // Create additional indexes for performance
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)
    `);

    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at)
    `);

    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_message_reads_user_read ON message_reads(user_id, read_at)
    `);

    console.log('✅ Messaging service migrations completed successfully');
    console.log('📋 Created tables: conversations, conversation_participants, messages, message_reads, message_attachments, typing_indicators');
    console.log('🔗 Real-time messaging infrastructure ready');

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