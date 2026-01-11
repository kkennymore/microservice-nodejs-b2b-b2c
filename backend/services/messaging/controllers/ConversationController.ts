import { ConversationModel } from '@/models/index.js';

class ConversationController {
  constructor() {
    this.conversationModel = new ConversationModel();
  }

  // Create a new conversation
  async createConversation(req, res) {
    try {
      const userId = req.user.id;
      const { type, title, description, participants = [], metadata = {} } = req.body;

      // Validate participants
      if (type === 'direct' && participants.length !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Direct conversations must have exactly one participant'
        });
      }

      // For direct conversations, check if one already exists
      if (type === 'direct' && participants.length === 1) {
        const existingConversation = await this.findExistingDirectConversation(userId, participants[0]);
        if (existingConversation) {
          return res.json({
            success: true,
            message: 'Direct conversation already exists',
            data: existingConversation
          });
        }
      }

      const conversationData = {
        type,
        title,
        description,
        created_by: userId,
        participants: [userId, ...participants], // Include creator
        metadata
      };

      const conversationId = await this.conversationModel.create(conversationData);
      const conversation = await this.conversationModel.findById(conversationId);

      // Notify participants via Socket.IO
      if (global.io) {
        for (const participant of conversation.participants) {
          global.io.to(`user_${participant.user_id}`).emit('conversation-created', {
            conversation
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: conversation
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create conversation'
      });
    }
  }

  // Helper method to find existing direct conversation
  async findExistingDirectConversation(userId1, userId2) {
    const [rows] = await this.conversationModel.pool.execute(
      `SELECT c.* FROM conversations c
       JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
       WHERE c.type = 'direct'
       AND cp1.user_id = ?
       AND cp2.user_id = ?
       AND cp1.user_id != cp2.user_id`,
      [userId1, userId2]
    );

    if (rows.length > 0) {
      return await this.conversationModel.findById(rows[0].id);
    }

    return null;
  }

  // Get conversation by ID
  async getConversation(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;

      const conversation = await this.conversationModel.findById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Check if user is participant
      const isParticipant = conversation.participants.some(p => p.user_id === userId);
      if (!isParticipant && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversation'
      });
    }
  }

  // Get user's conversations
  async getUserConversations(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const conversations = await this.conversationModel.findByUserId(userId, limit, offset);

      // Add unread count for each conversation
      for (const conversation of conversations) {
        // TODO: Implement unread count per conversation
        conversation.unread_count = 0;
      }

      res.json({
        success: true,
        data: {
          conversations,
          pagination: {
            page,
            limit,
            total: conversations.length, // TODO: Get actual total count
            pages: Math.ceil(conversations.length / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get user conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversations'
      });
    }
  }

  // Add participant to conversation
  async addParticipant(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const { user_id } = req.body;

      // Check if conversation exists and user has permission
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Check if user is admin or creator
      const userParticipant = conversation.participants.find(p => p.user_id === userId);
      if (!userParticipant || (userParticipant.role !== 'admin' && conversation.created_by !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add participants'
        });
      }

      await this.conversationModel.addParticipant(conversationId, user_id, userId);

      // Notify the new participant via Socket.IO
      if (global.io) {
        global.io.to(`user_${user_id}`).emit('added-to-conversation', {
          conversationId,
          addedBy: userId
        });

        // Notify existing participants
        global.io.to(`conversation_${conversationId}`).emit('participant-added', {
          conversationId,
          newParticipant: user_id,
          addedBy: userId
        });
      }

      res.json({
        success: true,
        message: 'Participant added successfully'
      });
    } catch (error) {
      console.error('Add participant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add participant'
      });
    }
  }

  // Remove participant from conversation
  async removeParticipant(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const { user_id } = req.body;

      // Check permissions
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Users can remove themselves, admins can remove anyone
      if (user_id !== userId) {
        const userParticipant = conversation.participants.find(p => p.user_id === userId);
        if (!userParticipant || (userParticipant.role !== 'admin' && conversation.created_by !== userId && req.user.role !== 'admin')) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to remove this participant'
          });
        }
      }

      await this.conversationModel.removeParticipant(conversationId, user_id);

      // Notify via Socket.IO
      if (global.io) {
        global.io.to(`user_${user_id}`).emit('removed-from-conversation', {
          conversationId,
          removedBy: userId
        });

        global.io.to(`conversation_${conversationId}`).emit('participant-removed', {
          conversationId,
          removedParticipant: user_id,
          removedBy: userId
        });
      }

      res.json({
        success: true,
        message: 'Participant removed successfully'
      });
    } catch (error) {
      console.error('Remove participant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove participant'
      });
    }
  }

  // Update conversation details
  async updateConversation(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const { title, description, metadata } = req.body;

      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Check permissions
      const userParticipant = conversation.participants.find(p => p.user_id === userId);
      if (!userParticipant || (userParticipant.role !== 'admin' && conversation.created_by !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this conversation'
        });
      }

      // Update conversation
      const updateFields = [];
      const updateValues = [];

      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }

      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }

      if (metadata !== undefined) {
        updateFields.push('metadata = ?');
        updateValues.push(JSON.stringify(metadata));
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()');
        updateValues.push(conversationId);

        await this.conversationModel.pool.execute(
          `UPDATE conversations SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );

        // Notify participants
        if (global.io) {
          global.io.to(`conversation_${conversationId}`).emit('conversation-updated', {
            conversationId,
            updates: { title, description, metadata },
            updatedBy: userId
          });
        }
      }

      res.json({
        success: true,
        message: 'Conversation updated successfully'
      });
    } catch (error) {
      console.error('Update conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update conversation'
      });
    }
  }

  // Delete conversation (soft delete by removing all participants)
  async deleteConversation(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;

      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Check permissions
      if (conversation.created_by !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only the conversation creator can delete it'
        });
      }

      // Remove all participants (effectively deleting the conversation)
      await this.conversationModel.pool.execute(
        'DELETE FROM conversation_participants WHERE conversation_id = ?',
        [conversationId]
      );

      // Notify remaining participants
      if (global.io) {
        global.io.to(`conversation_${conversationId}`).emit('conversation-deleted', {
          conversationId,
          deletedBy: userId
        });
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete conversation'
      });
    }
  }
}

export default new ConversationController();