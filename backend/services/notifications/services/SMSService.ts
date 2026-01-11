import twilio from 'twilio';
import config from '/app/shared/config.js';
import { SMSLogModel, NotificationTemplateModel } from '@/models/index.js';

class SMSService {
  constructor() {
    this.client = null;
    this.templates = new Map();
    this.initializeClient();
    this.initializeTemplates();
  }

  // Initialize Twilio client
  initializeClient() {
    const twilioConfig = config.notifications?.twilio;

    if (twilioConfig?.accountSid && twilioConfig?.authToken) {
      this.client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
      console.log('📱 SMS service initialized with Twilio');
    } else {
      console.warn('⚠️ Twilio credentials not configured - SMS service disabled');
    }
  }

  // Initialize SMS templates
  async initializeTemplates() {
    try {
      const templateModel = new NotificationTemplateModel();
      const templates = await templateModel.findByType('sms');

      for (const template of templates) {
        if (template.is_active) {
          this.templates.set(template.name, {
            content: template.content,
            variables: template.variables
          });
        }
      }

      console.log(`📱 Loaded ${this.templates.size} SMS templates`);
    } catch (error) {
      console.error('Failed to initialize SMS templates:', error);
    }
  }

  // Send SMS using template
  async sendTemplatedSMS(userId, toPhone, templateName, templateData = {}) {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`SMS template '${templateName}' not found`);
      }

      // Replace template variables
      let message = template.content;
      for (const [key, value] of Object.entries(templateData)) {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      return await this.sendSMS({
        userId,
        to: toPhone,
        message,
        template: templateName,
        templateData
      });
    } catch (error) {
      console.error('Templated SMS send error:', error);
      throw error;
    }
  }

  // Send custom SMS
  async sendSMS(smsData) {
    try {
      const {
        userId,
        to,
        message,
        template,
        templateData = {}
      } = smsData;

      if (!this.client) {
        throw new Error('SMS service not configured');
      }

      // Clean phone number
      const cleanPhone = this.cleanPhoneNumber(to);

      // Create SMS log entry
      const smsLogModel = new SMSLogModel();
      const logId = await smsLogModel.create({
        user_id: userId,
        to_phone: cleanPhone,
        message,
        provider: 'twilio',
        status: 'pending'
      });

      // Send SMS via Twilio
      const twilioMessage = await this.client.messages.create({
        body: message,
        from: config.notifications?.twilio?.phoneNumber || process.env.TWILIO_PHONE_NUMBER,
        to: cleanPhone
      });

      // Calculate segments and cost (approximate)
      const segments = Math.ceil(message.length / 160);
      const cost = segments * 0.0075; // Approximate cost per segment

      // Update log with success
      await smsLogModel.updateStatus(logId, 'sent');

      console.log(`📱 SMS sent successfully to ${cleanPhone}: ${message.substring(0, 50)}...`);

      return {
        success: true,
        messageId: twilioMessage.sid,
        logId,
        segments,
        cost
      };
    } catch (error) {
      console.error('SMS send error:', error);

      // Update log with failure
      if (smsData.logId) {
        const smsLogModel = new SMSLogModel();
        await smsLogModel.updateStatus(smsData.logId, 'failed', null, error.message);
      }

      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  // Send bulk SMS
  async sendBulkSMS(messages) {
    const results = [];

    for (const message of messages) {
      try {
        const result = await this.sendSMS(message);
        results.push({ ...result, phone: message.to });
      } catch (error) {
        results.push({
          success: false,
          phone: message.to,
          error: error.message
        });
      }

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  // Clean and format phone number
  cleanPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Add +1 for US numbers if not present
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }

    // Add + prefix
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  // Validate phone number format
  validatePhoneNumber(phone) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Get SMS status
  async getSMSStatus(messageSid) {
    try {
      if (!this.client) return null;

      const message = await this.client.messages(messageSid).fetch();

      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        price: message.price,
        segments: message.numSegments
      };
    } catch (error) {
      console.error('SMS status check error:', error);
      return null;
    }
  }

  // Reload templates
  async reloadTemplates() {
    this.templates.clear();
    await this.initializeTemplates();
  }

  // Get available templates
  getAvailableTemplates() {
    return Array.from(this.templates.keys());
  }

  // Check service status
  async isServiceAvailable() {
    if (!this.client) return false;

    try {
      // Try to get account info to verify connection
      await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      return true;
    } catch (error) {
      console.error('SMS service availability check failed:', error);
      return false;
    }
  }

  // Get SMS statistics
  async getStatistics(userId, dateRange = 30) {
    const smsLogModel = new SMSLogModel();
    return await smsLogModel.getStats(userId);
  }
}

export default new SMSService();