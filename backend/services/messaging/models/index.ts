import mysql from 'mysql2/promise';
import config from '/app/shared/config.js';

export class ConversationModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(conversationData) {
    const {
      type, // 'direct', 'group', 'order_support'
      title,
      description,
      created_by,
      participants = [],
      metadata = {}
    } = conversationData;

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Create conversation
      const [conversationResult] = await connection.execute(
        `INSERT INTO conversations (type, title, description, created_by, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [type, title, description, created_by, JSON.stringify(metadata)]
      );

      const conversationId = conversationResult.insertId;

      // Add participants
      if (participants.length > 0) {
        const participantValues = participants.map(userId => [conversationId, userId]);
        await connection.execute(
          `INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
           VALUES ${participantValues.map(() => '(?, ?, NOW())').join(', ')}`,
          participantValues.flat()
        );
      }

      await connection.commit();
      return conversationId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findById(id) {
    const [rows] = await this.pool.execute(
      `SELECT c.*, u.username as creator_username, u.firstName, u.lastName
       FROM conversations c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const conversation = rows[0];
    conversation.metadata = JSON.parse(conversation.metadata || '{}');

    // Get participants
    const [participants] = await this.pool.execute(
      `SELECT cp.*, u.username, u.firstName, u.lastName, u.email
       FROM conversation_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.conversation_id = ?`,
      [id]
    );

    conversation.participants = participants;

    return conversation;
  }

  async findByUserId(userId, limit = 50, offset = 0) {
    const [rows] = await this.pool.execute(
      `SELECT c.*,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count,
              (SELECT content FROM messages m WHERE m.conversation_id = c.id
               ORDER BY m.created_at DESC LIMIT 1) as last_message,
              (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id
               ORDER BY m.created_at DESC LIMIT 1) as last_message_at
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       WHERE cp.user_id = ?
       ORDER BY c.updated_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async addParticipant(conversationId, userId, addedBy) {
    await this.pool.execute(
      `INSERT INTO conversation_participants (conversation_id, user_id, added_by, joined_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE joined_at = NOW()`,
      [conversationId, userId, addedBy]
    );

    // Update conversation updated_at
    await this.pool.execute(
      'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
      [conversationId]
    );
  }

  async removeParticipant(conversationId, userId) {
    await this.pool.execute(
      'DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );

    // Update conversation updated_at
    await this.pool.execute(
      'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
      [conversationId]
    );
  }

  async updateLastActivity(conversationId) {
    await this.pool.execute(
      'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
      [conversationId]
    );
  }
}

export class MessageModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(messageData) {
    const {
      conversation_id,
      sender_id,
      content,
      message_type = 'text', // 'text', 'image', 'file', 'system'
      metadata = {},
      reply_to = null
    } = messageData;

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert message
      const [result] = await connection.execute(
        `INSERT INTO messages (conversation_id, sender_id, content, message_type, metadata, reply_to, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [conversation_id, sender_id, content, message_type, JSON.stringify(metadata), reply_to]
      );

      const messageId = result.insertId;

      // Update conversation last activity
      await connection.execute(
        'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
        [conversation_id]
      );

      // Mark message as read for sender
      await connection.execute(
        `INSERT INTO message_reads (message_id, user_id, read_at)
         VALUES (?, ?, NOW())`,
        [messageId, sender_id]
      );

      await connection.commit();
      return messageId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findByConversationId(conversationId, limit = 50, offset = 0) {
    const [rows] = await this.pool.execute(
      `SELECT m.*,
              u.username as sender_username,
              u.firstName as sender_first_name,
              u.lastName as sender_last_name,
              u.profileImage as sender_profile_image,
              mr.read_at,
              (SELECT COUNT(*) FROM message_reads mr2 WHERE mr2.message_id = m.id) as read_count,
              (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = m.conversation_id) as total_participants
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.user_id = ?
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [null, conversationId, limit, offset] // TODO: Pass current user ID for read status
    );

    return rows.reverse().map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      is_read: !!row.read_at,
      read_count: parseInt(row.read_count),
      total_participants: parseInt(row.total_participants)
    }));
  }

  async markAsRead(messageId, userId) {
    await this.pool.execute(
      `INSERT INTO message_reads (message_id, user_id, read_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE read_at = NOW()`,
      [messageId, userId]
    );
  }

  async markConversationAsRead(conversationId, userId) {
    await this.pool.execute(
      `INSERT INTO message_reads (message_id, user_id, read_at)
       SELECT m.id, ?, NOW()
       FROM messages m
       WHERE m.conversation_id = ? AND m.sender_id != ?
       ON DUPLICATE KEY UPDATE read_at = NOW()`,
      [userId, conversationId, userId]
    );
  }

  async getUnreadCount(userId) {
    const [rows] = await this.pool.execute(
      `SELECT COUNT(*) as unread_count
       FROM messages m
       JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
       LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.user_id = cp.user_id
       WHERE cp.user_id = ? AND m.sender_id != ? AND mr.message_id IS NULL`,
      [userId, userId]
    );

    return rows[0].unread_count;
  }

  async getUnreadCountByConversation(userId, conversationId) {
    const [rows] = await this.pool.execute(
      `SELECT COUNT(*) as unread_count
       FROM messages m
       LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.user_id = ?
       WHERE m.conversation_id = ? AND m.sender_id != ? AND mr.message_id IS NULL`,
      [userId, conversationId, userId]
    );

    return rows[0].unread_count;
  }

  async delete(messageId, deletedBy) {
    await this.pool.execute(
      `UPDATE messages SET is_deleted = 1, deleted_by = ?, deleted_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [deletedBy, messageId]
    );
  }
}

export class MessageAttachmentModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(attachmentData) {
    const {
      message_id,
      filename,
      original_filename,
      mime_type,
      file_size,
      file_path,
      uploaded_by
    } = attachmentData;

    const [result] = await this.pool.execute(
      `INSERT INTO message_attachments (message_id, filename, original_filename, mime_type, file_size, file_path, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [message_id, filename, original_filename, mime_type, file_size, file_path, uploaded_by]
    );

    return result.insertId;
  }

  async findByMessageId(messageId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM message_attachments WHERE message_id = ? ORDER BY created_at ASC',
      [messageId]
    );

    return rows;
  }

  async delete(attachmentId, deletedBy) {
    await this.pool.execute(
      'UPDATE message_attachments SET is_deleted = 1, deleted_by = ?, deleted_at = NOW() WHERE id = ?',
      [deletedBy, attachmentId]
    );
  }
}