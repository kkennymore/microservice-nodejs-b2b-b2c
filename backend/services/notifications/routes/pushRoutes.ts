import express from 'express';
import PushNotificationService from '@/services/PushNotificationService.js';
import { PushTokenModel } from '@/models/index.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Send push notification
router.post('/send', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationData = { ...req.body, userId };

    const result = await PushNotificationService.sendPushNotification(userId, notificationData);

    res.json({
      success: true,
      message: 'Push notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send push notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send push notification'
    });
  }
});

// Send templated push notification
router.post('/template/:templateName', async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateName } = req.params;
    const { templateData, options } = req.body;

    const result = await PushNotificationService.sendTemplatedPush(userId, templateName, templateData, options);

    res.json({
      success: true,
      message: 'Templated push notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send templated push error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send templated push notification'
    });
  }
});

// Register push token
router.post('/token', async (req, res) => {
  try {
    const userId = req.user.id;
    const tokenData = req.body;

    const result = await PushNotificationService.registerToken(userId, tokenData);

    res.json({
      success: true,
      message: 'Push token registered successfully',
      data: result
    });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to register push token'
    });
  }
});

// Unregister push token
router.delete('/token/:deviceId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.params;

    const success = await PushNotificationService.unregisterToken(userId, deviceId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Push token not found'
      });
    }

    res.json({
      success: true,
      message: 'Push token unregistered successfully'
    });
  } catch (error) {
    console.error('Unregister push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister push token'
    });
  }
});

// Get user's push tokens
router.get('/tokens', async (req, res) => {
  try {
    const userId = req.user.id;
    const tokens = await PushNotificationService.getUserTokens(userId);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Get push tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get push tokens'
    });
  }
});

// Send test push notification
router.post('/test', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await PushNotificationService.sendTestNotification(userId);

    res.json({
      success: true,
      message: 'Test push notification sent',
      data: result
    });
  } catch (error) {
    console.error('Send test push error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test push notification'
    });
  }
});

// Get available push templates
router.get('/templates', async (req, res) => {
  try {
    const templates = PushNotificationService.getAvailableTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get push templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get push notification templates'
    });
  }
});

export default router;