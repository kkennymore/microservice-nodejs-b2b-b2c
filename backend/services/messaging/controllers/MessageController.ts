import { MessageModel, MessageAttachmentModel } from '@/models/index.js';
import MessageEncryption from '@/services/MessageEncryption.js';

class MessageController {
  constructor() {
    this.messageModel = new MessageModel();
    this.attachmentModel = new MessageAttachmentModel();
  }

  // Send a message
  async sendMessage(req, res) {
    try {
      const userId = req.user.id;
      const { conversation_id, content, message_type = 'text', metadata = {}, reply_to, encrypt = false } = req.body;

      // Validate conversation access
      // TODO: Check if user is participant in conversation

      let processedContent = content;
      let encryptionData = null;

      // Encrypt message if requested
      if (encrypt && content) {
        try {
          const encrypted = MessageEncryption.encryptForConversation(content, conversation_id, userId);
          processedContent = JSON.stringify(encrypted);
          encryptionData = encrypted;
          metadata.encrypted = true;
          metadata.content_hash = MessageEncryption.hashContent(content);
        } catch (error) {
          console.error('Message encryption failed:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to encrypt message'
          });
        }
      }

      const messageData = {
        conversation_id,
        sender_id: userId,
        content: processedContent,
        message_type,
        metadata,
        reply_to
      };

      const messageId = await this.messageModel.create(messageData);

      // Get the created message with sender info
      const [messages] = await this.messageModel.pool.execute(
        `SELECT m.*,
                u.username as sender_username,
                u.firstName as sender_first_name,
                u.lastName as sender_last_name,
                u.profileImage as sender_profile_image
         FROM messages m
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.id = ?`,
        [messageId]
      );

      const message = messages[0];
      message.metadata = JSON.parse(message.metadata || '{}');

      // Decrypt message if it was encrypted
      if (message.metadata.encrypted && encryptionData) {
        message.content = content; // Return original content to sender
        message.is_encrypted = true;
      }

      // Emit real-time message via Socket.IO
      if (global.io) {
        global.io.to(`conversation_${conversation_id}`).emit('new-message', {
          message,
          conversation_id
        });

        // Also emit to sender's personal room for UI updates
        global.io.to(`user_${userId}`).emit('message-sent', {
          message,
          conversation_id
        });
      }

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
  }

  // Get messages for a conversation
  async getMessages(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // TODO: Validate user has access to conversation

      const messages = await this.messageModel.findByConversationId(conversationId, limit, offset);

      // Process messages (decrypt if needed, add attachments)
      for (const message of messages) {
        // Handle encrypted messages
        if (message.metadata.encrypted) {
          try {
            const encryptionData = JSON.parse(message.content);
            if (MessageEncryption.validateEncryptionData(encryptionData)) {
              message.content = MessageEncryption.decryptFromConversation(
                encryptionData,
                conversationId,
                userId
              );
              message.is_encrypted = true;
              message.decrypted = true;
            }
          } catch (error) {
            console.error('Message decryption failed:', error);
            message.content = '[Encrypted message - decryption failed]';
            message.decryption_error = true;
          }
        }

        // Get attachments for media messages
        if (message.message_type !== 'text') {
          message.attachments = await this.attachmentModel.findByMessageId(message.id);
        }
      }

      res.json({
        success: true,
        data: {
          messages,
          pagination: {
            page,
            limit,
            total: messages.length, // TODO: Get actual total count
            pages: Math.ceil(messages.length / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch messages'
      });
    }
  }

  // Mark messages as read
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { messageIds } = req.body;

      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message IDs array is required'
        });
      }

      // Mark each message as read
      for (const messageId of messageIds) {
        await this.messageModel.markAsRead(messageId, userId);
      }

      // Emit read receipt via Socket.IO
      if (global.io && messageIds.length > 0) {
        // Get conversation ID from first message
        const [messages] = await this.messageModel.pool.execute(
          'SELECT conversation_id FROM messages WHERE id = ?',
          [messageIds[0]]
        );

        if (messages.length > 0) {
          const conversationId = messages[0].conversation_id;
          global.io.to(`conversation_${conversationId}`).emit('messages-read', {
            conversationId,
            userId,
            messageIds
          });
        }
      }

      res.json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read'
      });
    }
  }

  // Mark entire conversation as read
  async markConversationAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;

      await this.messageModel.markConversationAsRead(conversationId, userId);

      // Emit read receipt via Socket.IO
      if (global.io) {
        global.io.to(`conversation_${conversationId}`).emit('conversation-read', {
          conversationId,
          userId
        });
      }

      res.json({
        success: true,
        message: 'Conversation marked as read'
      });
    } catch (error) {
      console.error('Mark conversation as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark conversation as read'
      });
    }
  }

  // Get unread message count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const unreadCount = await this.messageModel.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          unread_count: unreadCount
        }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count'
      });
    }
  }

  // Get unread count for specific conversation
  async getConversationUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;

      const unreadCount = await this.messageModel.getUnreadCountByConversation(userId, conversationId);

      res.json({
        success: true,
        data: {
          conversation_id: conversationId,
          unread_count: unreadCount
        }
      });
    } catch (error) {
      console.error('Get conversation unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversation unread count'
      });
    }
  }

  // Delete a message
  async deleteMessage(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;

      // Get message to check ownership
      const [messages] = await this.messageModel.pool.execute(
        'SELECT * FROM messages WHERE id = ?',
        [messageId]
      );

      if (messages.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      const message = messages[0];

      // Check if user can delete this message
      if (message.sender_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own messages'
        });
      }

      await this.messageModel.delete(messageId, userId);

      // Emit message deletion via Socket.IO
      if (global.io) {
        global.io.to(`conversation_${message.conversation_id}`).emit('message-deleted', {
          messageId,
          conversationId: message.conversation_id,
          deletedBy: userId
        });
      }

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete message'
      });
    }
  }

  // Edit a message
  async editMessage(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { content } = req.body;

      // Get message to check ownership
      const [messages] = await this.messageModel.pool.execute(
        'SELECT * FROM messages WHERE id = ?',
        [messageId]
      );

      if (messages.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      const message = messages[0];

      // Check if user owns this message
      if (message.sender_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own messages'
        });
      }

      // Update message
      await this.messageModel.pool.execute(
        'UPDATE messages SET content = ?, updated_at = NOW() WHERE id = ?',
        [content, messageId]
      );

      // Emit message update via Socket.IO
      if (global.io) {
        global.io.to(`conversation_${message.conversation_id}`).emit('message-edited', {
          messageId,
          conversationId: message.conversation_id,
          newContent: content,
          editedBy: userId,
          editedAt: new Date()
        });
      }

      res.json({
        success: true,
        message: 'Message updated successfully'
      });
    } catch (error) {
      console.error('Edit message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update message'
      });
    }
  }
}

export default new MessageController();