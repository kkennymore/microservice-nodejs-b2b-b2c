import express from 'express';
import notificationController from '@/controllers/NotificationController.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user's notifications
router.get('/', notificationController.getNotifications);

// Get unread notification count
router.get('/unread', notificationController.getUnreadCount);

// Get notification statistics
router.get('/stats', notificationController.getStats);

// Mark notification as read
router.put('/:notificationId/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', notificationController.deleteNotification);

// Get user preferences
router.get('/preferences', notificationController.getPreferences);

// Update user preferences
router.put('/preferences', notificationController.updatePreferences);

// Send test notification
router.post('/test', notificationController.sendTestNotification);

// Send notification (admin only)
router.post('/send', notificationController.sendNotification);

export default router;