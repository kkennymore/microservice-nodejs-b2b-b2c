import admin from 'firebase-admin';
import config from '/app/shared/config.js';
import { PushTokenModel, NotificationTemplateModel } from '@/models/index.js';

// Initialize Firebase Admin SDK
let firebaseApp = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Use service account file path
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  } else {
    console.warn('⚠️ Firebase credentials not configured - Push notifications disabled');
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

class PushNotificationService {
  constructor() {
    this.messaging = firebaseApp ? admin.messaging() : null;
    this.templates = new Map();
    this.initializeTemplates();
  }

  // Initialize push notification templates
  async initializeTemplates() {
    try {
      const templateModel = new NotificationTemplateModel();
      const templates = await templateModel.findByType('push');

      for (const template of templates) {
        if (template.is_active) {
          this.templates.set(template.name, {
            title: template.subject,
            body: template.content,
            variables: template.variables
          });
        }
      }

      console.log(`📲 Loaded ${this.templates.size} push notification templates`);
    } catch (error) {
      console.error('Failed to initialize push templates:', error);
    }
  }

  // Send templated push notification
  async sendTemplatedPush(userId, templateName, templateData = {}, options = {}) {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Push template '${templateName}' not found`);
      }

      let title = template.title || 'Notification';
      let body = template.body;

      // Replace template variables
      for (const [key, value] of Object.entries(templateData)) {
        title = title.replace(new RegExp(`{{${key}}}`, 'g'), value);
        body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      return await this.sendPushNotification(userId, {
        title,
        body,
        data: templateData,
        ...options
      });
    } catch (error) {
      console.error('Templated push send error:', error);
      throw error;
    }
  }

  // Send custom push notification
  async sendPushNotification(userId, notificationData) {
    try {
      if (!this.messaging) {
        throw new Error('Push notification service not configured');
      }

      const {
        title,
        body,
        data = {},
        icon,
        badge,
        sound = 'default',
        clickAction,
        ttl = 86400 // 24 hours
      } = notificationData;

      // Get user's active push tokens
      const pushTokenModel = new PushTokenModel();
      const tokens = await pushTokenModel.findByUserId(userId);

      if (tokens.length === 0) {
        console.log(`📲 No push tokens found for user ${userId}`);
        return { success: true, sent: 0, message: 'No push tokens available' };
      }

      // Prepare FCM message
      const message = {
        notification: {
          title,
          body
        },
        data: {
          ...data,
          userId: userId.toString(),
          timestamp: Date.now().toString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: sound,
            defaultSound: true,
            clickAction: clickAction || 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: sound,
              badge: badge || 1
            }
          }
        },
        webpush: {
          notification: {
            icon: icon || '/favicon.ico',
            badge: badge || '/favicon.ico'
          }
        },
        tokens: tokens.map(t => t.token)
      };

      // Add TTL
      if (ttl > 0) {
        message.android.ttl = ttl;
        message.apns.headers = {
          'apns-expiration': Math.floor(Date.now() / 1000) + ttl
        };
      }

      // Send message
      const response = await this.messaging.sendMulticast(message);

      // Update last used timestamp for successful tokens
      const successfulTokens = tokens.filter((_, index) => response.responses[index]?.success);

      for (const token of successfulTokens) {
        await pushTokenModel.pool.execute(
          'UPDATE push_tokens SET last_used_at = NOW() WHERE id = ?',
          [token.id]
        );
      }

      // Handle failed tokens (might be expired)
      const failedTokens = tokens.filter((_, index) => !response.responses[index]?.success);

      for (const token of failedTokens) {
        const error = response.responses[tokens.indexOf(token)]?.error;
        if (error?.code === 'messaging/registration-token-not-registered') {
          // Token is invalid/expired, deactivate it
          await pushTokenModel.deactivateToken(userId, token.device_id);
          console.log(`📲 Deactivated expired push token for user ${userId}`);
        }
      }

      const result = {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        total: tokens.length,
        messageId: response.responses[0]?.messageId
      };

      console.log(`📲 Push notification sent to ${result.sent}/${result.total} devices for user ${userId}`);

      return result;
    } catch (error) {
      console.error('Push notification send error:', error);
      throw new Error(`Failed to send push notification: ${error.message}`);
    }
  }

  // Send push to multiple users
  async sendBulkPush(notifications) {
    const results = [];

    for (const notification of notifications) {
      try {
        const result = await this.sendPushNotification(notification.userId, notification);
        results.push({
          userId: notification.userId,
          ...result
        });
      } catch (error) {
        results.push({
          userId: notification.userId,
          success: false,
          error: error.message
        });
      }

      // Small delay to avoid overwhelming FCM
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  // Register push token for user
  async registerToken(userId, tokenData) {
    try {
      const pushTokenModel = new PushTokenModel();

      const tokenId = await pushTokenModel.create({
        user_id: userId,
        ...tokenData
      });

      console.log(`📲 Push token registered for user ${userId}: ${tokenData.device_type}`);

      return { success: true, tokenId };
    } catch (error) {
      console.error('Push token registration error:', error);
      throw new Error('Failed to register push token');
    }
  }

  // Unregister push token
  async unregisterToken(userId, deviceId) {
    try {
      const pushTokenModel = new PushTokenModel();
      const result = await pushTokenModel.deactivateToken(userId, deviceId);

      console.log(`📲 Push token unregistered for user ${userId}, device ${deviceId}`);

      return { success: result };
    } catch (error) {
      console.error('Push token unregistration error:', error);
      throw new Error('Failed to unregister push token');
    }
  }

  // Get user's push tokens
  async getUserTokens(userId) {
    try {
      const pushTokenModel = new PushTokenModel();
      return await pushTokenModel.findByUserId(userId);
    } catch (error) {
      console.error('Get user tokens error:', error);
      throw new Error('Failed to get user tokens');
    }
  }

  // Test push notification
  async sendTestNotification(userId) {
    return await this.sendPushNotification(userId, {
      title: 'Test Notification',
      body: 'This is a test push notification from the marketplace.',
      data: {
        type: 'test',
        timestamp: Date.now()
      }
    });
  }

  // Reload templates
  async reloadTemplates() {
    this.templates.clear();
    await this.initializeTemplates();
  }

  // Check service availability
  isServiceAvailable() {
    return this.messaging !== null;
  }

  // Get available templates
  getAvailableTemplates() {
    return Array.from(this.templates.keys());
  }
}

export default new PushNotificationService();