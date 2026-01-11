import express from 'express';
import conversationController from '@/controllers/ConversationController.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create a new conversation
router.post('/', conversationController.createConversation);

// Get user's conversations
router.get('/', conversationController.getUserConversations);

// Get conversation by ID
router.get('/:conversationId', conversationController.getConversation);

// Update conversation
router.put('/:conversationId', conversationController.updateConversation);

// Add participant to conversation
router.post('/:conversationId/participants', conversationController.addParticipant);

// Remove participant from conversation
router.delete('/:conversationId/participants', conversationController.removeParticipant);

// Delete conversation
router.delete('/:conversationId', conversationController.deleteConversation);

export default router;