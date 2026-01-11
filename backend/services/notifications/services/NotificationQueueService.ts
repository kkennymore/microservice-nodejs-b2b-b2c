import EmailService from '@/EmailService.js';
import SMSService from '@/SMSService.js';
import PushNotificationService from '@/PushNotificationService.js';
import WhatsAppService from '@/WhatsAppService.js';
import { NotificationModel } from '@/models/index.js';

class NotificationQueueService {
  constructor() {
    this.channel = null;
    this.isInitialized = false;
    this.consumers = [];
  }

  // Initialize the queue service
  async initialize() {
    this.isInitialized = true;
    console.log('📋 Notification queue service initialized');
  }

  // Set up RabbitMQ channel and consumers
  async initializeQueues(channel) {
    this.channel = channel;

    // Set up consumers for each queue
    await this.setupEmailConsumer();
    await this.setupSMSConsumer();
    await this.setupPushConsumer();
    await this.setupWhatsAppConsumer();
    await this.setupGeneralConsumer();

    console.log('📋 All notification queue consumers initialized');
  }

  // Email queue consumer
  async setupEmailConsumer() {
    const queue = 'email_queue';

    await this.channel.assertQueue(queue, { durable: true });

    const consumer = await this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const emailData = JSON.parse(msg.content.toString());
          await this.processEmailNotification(emailData);
          this.channel.ack(msg);
        } catch (error) {
          console.error('Email queue processing error:', error);
          this.channel.nack(msg, false, false); // Don't requeue on error
        }
      }
    });

    this.consumers.push(consumer.consumerTag);
    console.log('📧 Email queue consumer started');
  }

  // SMS queue consumer
  async setupSMSConsumer() {
    const queue = 'sms_queue';

    await this.channel.assertQueue(queue, { durable: true });

    const consumer = await this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const smsData = JSON.parse(msg.content.toString());
          await this.processSMSNotification(smsData);
          this.channel.ack(msg);
        } catch (error) {
          console.error('SMS queue processing error:', error);
          this.channel.nack(msg, false, false);
        }
      }
    });

    this.consumers.push(consumer.consumerTag);
    console.log('📱 SMS queue consumer started');
  }

  // Push notification queue consumer
  async setupPushConsumer() {
    const queue = 'push_queue';

    await this.channel.assertQueue(queue, { durable: true });

    const consumer = await this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const pushData = JSON.parse(msg.content.toString());
          await this.processPushNotification(pushData);
          this.channel.ack(msg);
        } catch (error) {
          console.error('Push queue processing error:', error);
          this.channel.nack(msg, false, false);
        }
      }
    });

    this.consumers.push(consumer.consumerTag);
    console.log('📲 Push notification queue consumer started');
  }

  // WhatsApp queue consumer
  async setupWhatsAppConsumer() {
    const queue = 'whatsapp_queue';

    await this.channel.assertQueue(queue, { durable: true });

    const consumer = await this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const whatsappData = JSON.parse(msg.content.toString());
          await this.processWhatsAppNotification(whatsappData);
          this.channel.ack(msg);
        } catch (error) {
          console.error('WhatsApp queue processing error:', error);
          this.channel.nack(msg, false, false);
        }
      }
    });

    this.consumers.push(consumer.consumerTag);
    console.log('📱 WhatsApp queue consumer started');
  }

  // General notification queue consumer
  async setupGeneralConsumer() {
    const queue = 'notification_queue';

    await this.channel.assertQueue(queue, { durable: true });

    const consumer = await this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const notificationData = JSON.parse(msg.content.toString());
          await this.processGeneralNotification(notificationData);
          this.channel.ack(msg);
        } catch (error) {
          console.error('General notification queue processing error:', error);
          this.channel.nack(msg, false, false);
        }
      }
    });

    this.consumers.push(consumer.consumerTag);
    console.log('📢 General notification queue consumer started');
  }

  // Process email notification
  async processEmailNotification(emailData) {
    try {
      const result = await EmailService.sendEmail(emailData);

      // Update notification status if it exists
      if (emailData.notificationId) {
        const notificationModel = new NotificationModel();
        await notificationModel.pool.execute(
          'UPDATE notifications SET is_sent = TRUE, sent_at = NOW() WHERE id = ?',
          [emailData.notificationId]
        );
      }

      console.log(`✅ Email notification processed: ${result.messageId}`);
    } catch (error) {
      console.error('Failed to process email notification:', error);
      throw error;
    }
  }

  // Process SMS notification
  async processSMSNotification(smsData) {
    try {
      const result = await SMSService.sendSMS(smsData);

      // Update notification status if it exists
      if (smsData.notificationId) {
        const notificationModel = new NotificationModel();
        await notificationModel.pool.execute(
          'UPDATE notifications SET is_sent = TRUE, sent_at = NOW() WHERE id = ?',
          [smsData.notificationId]
        );
      }

      console.log(`✅ SMS notification processed: ${result.messageId}`);
    } catch (error) {
      console.error('Failed to process SMS notification:', error);
      throw error;
    }
  }

  // Process push notification
  async processPushNotification(pushData) {
    try {
      const result = await PushNotificationService.sendPushNotification(pushData.userId, pushData);

      // Update notification status if it exists
      if (pushData.notificationId) {
        const notificationModel = new NotificationModel();
        await notificationModel.pool.execute(
          'UPDATE notifications SET is_sent = TRUE, sent_at = NOW() WHERE id = ?',
          [pushData.notificationId]
        );
      }

      console.log(`✅ Push notification processed: ${result.sent} devices`);
    } catch (error) {
      console.error('Failed to process push notification:', error);
      throw error;
    }
  }

  // Process WhatsApp notification
  async processWhatsAppNotification(whatsappData) {
    try {
      const result = await WhatsAppService.sendTemplatedMessage(
        whatsappData.userId,
        whatsappData.to,
        whatsappData.template,
        whatsappData.templateData
      );

      // Update notification status if it exists
      if (whatsappData.notificationId) {
        const notificationModel = new NotificationModel();
        await notificationModel.pool.execute(
          'UPDATE notifications SET is_sent = TRUE, sent_at = NOW() WHERE id = ?',
          [whatsappData.notificationId]
        );
      }

      console.log(`✅ WhatsApp notification processed: ${result.messageId}`);
    } catch (error) {
      console.error('Failed to process WhatsApp notification:', error);
      throw error;
    }
  }

  // Process general notification (creates notification record and queues specific delivery)
  async processGeneralNotification(notificationData) {
    try {
      const { userId, type, title, message, data, priority, channels } = notificationData;

      // Create notification record
      const notificationModel = new NotificationModel();
      const notificationId = await notificationModel.create({
        user_id: userId,
        type: 'system',
        title,
        message,
        data,
        priority,
        is_sent: false
      });

      // Queue delivery through appropriate channels
      if (channels && channels.length > 0) {
        for (const channel of channels) {
          await this.queueChannelNotification(channel, {
            ...notificationData,
            notificationId
          });
        }
      }

      console.log(`✅ General notification processed: ${notificationId}`);
    } catch (error) {
      console.error('Failed to process general notification:', error);
      throw error;
    }
  }

  // Queue notification for specific channel
  async queueChannelNotification(channel, notificationData) {
    const queues = {
      email: 'email_queue',
      sms: 'sms_queue',
      push: 'push_queue',
      whatsapp: 'whatsapp_queue'
    };

    const queue = queues[channel];
    if (!queue) {
      console.warn(`Unknown notification channel: ${channel}`);
      return;
    }

    await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(notificationData)), {
      persistent: true
    });
  }

  // Send notification immediately (bypass queue)
  async sendImmediate(notificationData) {
    const { channels = ['email', 'sms', 'push'] } = notificationData;

    const results = {};

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            results.email = await EmailService.sendEmail(notificationData);
            break;
          case 'sms':
            results.sms = await SMSService.sendSMS(notificationData);
            break;
          case 'push':
            results.push = await PushNotificationService.sendPushNotification(
              notificationData.userId,
              notificationData
            );
            break;
        }
      } catch (error) {
        results[channel] = { success: false, error: error.message };
      }
    }

    return results;
  }

  // Queue notification for later processing
  async queueNotification(notificationData) {
    const queue = notificationData.immediate ? null : 'notification_queue';

    if (queue) {
      await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(notificationData)), {
        persistent: true
      });
      return { queued: true, queue };
    } else {
      return await this.sendImmediate(notificationData);
    }
  }

  // Get queue status
  getQueueStatus() {
    return {
      initialized: this.isInitialized,
      consumers: this.consumers.length,
      channel: this.channel ? 'connected' : 'disconnected'
    };
  }

  // Graceful shutdown
  async shutdown() {
    if (this.channel) {
      // Cancel all consumers
      for (const consumerTag of this.consumers) {
        try {
          await this.channel.cancel(consumerTag);
        } catch (error) {
          console.error('Error canceling consumer:', error);
        }
      }
    }
  }
}

export default new NotificationQueueService();