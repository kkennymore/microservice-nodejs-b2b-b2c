import express from 'express';
import messageController from '@/controllers/MessageController.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Send a message
router.post('/', messageController.sendMessage);

// Get messages for a conversation
router.get('/conversation/:conversationId', messageController.getMessages);

// Mark messages as read
router.post('/read', messageController.markAsRead);

// Mark conversation as read
router.post('/conversation/:conversationId/read', messageController.markConversationAsRead);

// Get unread message count
router.get('/unread', messageController.getUnreadCount);

// Get unread count for specific conversation
router.get('/conversation/:conversationId/unread', messageController.getConversationUnreadCount);

// Edit a message
router.put('/:messageId', messageController.editMessage);

// Delete a message
router.delete('/:messageId', messageController.deleteMessage);

export default router;