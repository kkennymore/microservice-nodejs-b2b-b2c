import { NotificationModel, NotificationPreferenceModel } from '@/models/index.js';
import NotificationQueueService from '@/services/NotificationQueueService.js';

class NotificationController {
  constructor() {
    this.notificationModel = new NotificationModel();
    this.preferenceModel = new NotificationPreferenceModel();
  }

  // Get user's notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const includeRead = req.query.include_read === 'true';

      const result = await this.notificationModel.findByUserId(userId, limit, (page - 1) * limit, includeRead);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }

  // Get unread notification count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await this.notificationModel.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unread_count: count }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count'
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const success = await this.notificationModel.markAsRead(notificationId, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const count = await this.notificationModel.markAllAsRead(userId);

      res.json({
        success: true,
        message: `${count} notifications marked as read`
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read'
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const success = await this.notificationModel.delete(notificationId, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  }

  // Get notification statistics
  async getStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await this.notificationModel.getStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics'
      });
    }
  }

  // Send test notification
  async sendTestNotification(req, res) {
    try {
      const userId = req.user.id;
      const { channels = ['email', 'sms', 'push'] } = req.body;

      // Create test notification
      const notificationId = await this.notificationModel.create({
        user_id: userId,
        type: 'system',
        title: 'Test Notification',
        message: 'This is a test notification from the marketplace.',
        data: { test: true },
        priority: 'normal'
      });

      // Queue delivery through selected channels
      const queueResult = await NotificationQueueService.queueNotification({
        userId,
        notificationId,
        channels,
        title: 'Test Notification',
        message: 'This is a test notification from the marketplace.',
        data: { test: true },
        immediate: true // Send immediately for testing
      });

      res.json({
        success: true,
        message: 'Test notification sent',
        data: {
          notification_id: notificationId,
          results: queueResult
        }
      });
    } catch (error) {
      console.error('Send test notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification'
      });
    }
  }

  // Get user preferences
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      let preferences = await this.preferenceModel.findByUserId(userId);

      // Create default preferences if none exist
      if (!preferences) {
        await this.preferenceModel.create(userId);
        preferences = await this.preferenceModel.findByUserId(userId);
      }

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences'
      });
    }
  }

  // Update user preferences
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const { email, sms, push } = req.body;

      // Validate preferences structure
      if ((email && typeof email !== 'object') ||
          (sms && typeof sms !== 'object') ||
          (push && typeof push !== 'object')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid preferences format'
        });
      }

      let preferences = await this.preferenceModel.findByUserId(userId);

      if (!preferences) {
        // Create preferences first
        await this.preferenceModel.create(userId);
        preferences = await this.preferenceModel.findByUserId(userId);
      }

      const success = await this.preferenceModel.update(userId, { email, sms, push });

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Preferences not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification preferences updated'
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences'
      });
    }
  }

  // Send notification (admin only)
  async sendNotification(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const {
        userId,
        type = 'system',
        title,
        message,
        data = {},
        priority = 'normal',
        channels = ['email', 'sms', 'push'],
        immediate = false
      } = req.body;

      // Validate required fields
      if (!userId || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'User ID, title, and message are required'
        });
      }

      // Create notification record
      const notificationId = await this.notificationModel.create({
        user_id: userId,
        type,
        title,
        message,
        data,
        priority
      });

      // Queue delivery
      const queueResult = await NotificationQueueService.queueNotification({
        userId,
        notificationId,
        type,
        title,
        message,
        data,
        priority,
        channels,
        immediate
      });

      res.json({
        success: true,
        message: 'Notification queued for delivery',
        data: {
          notification_id: notificationId,
          queue_result: queueResult
        }
      });
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification'
      });
    }
  }
}

export default new NotificationController();