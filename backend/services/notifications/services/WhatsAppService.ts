import axios from 'axios';

class WhatsAppService {
  constructor() {
    this.baseURL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.templates = new Map();
    this.initializeTemplates();
  }

  // Initialize WhatsApp templates
  async initializeTemplates() {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        console.warn('⚠️ WhatsApp credentials not configured - WhatsApp service disabled');
        return;
      }

      // Fetch available message templates
      const response = await axios.get(
        `${this.baseURL}/${this.phoneNumberId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      for (const template of response.data.data) {
        if (template.status === 'APPROVED') {
          this.templates.set(template.name, template);
        }
      }

      console.log(`📱 Loaded ${this.templates.size} WhatsApp templates`);
    } catch (error) {
      console.error('Failed to initialize WhatsApp templates:', error);
    }
  }

  // Send WhatsApp message using template
  async sendTemplatedMessage(userId, toPhone, templateName, templateData = {}) {
    try {
      if (!this.isServiceAvailable()) {
        throw new Error('WhatsApp service not configured');
      }

      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`WhatsApp template '${templateName}' not found`);
      }

      // Clean phone number
      const cleanPhone = this.cleanPhoneNumber(toPhone);

      // Prepare template components
      const components = [];

      if (templateData.header) {
        components.push({
          type: 'header',
          parameters: [{
            type: 'text',
            text: templateData.header
          }]
        });
      }

      if (templateData.body) {
        const bodyParams = [];
        // Extract variables from body text
        const bodyText = template.components.find(c => c.type === 'BODY')?.text || '';
        const variableMatches = bodyText.match(/\{\{\d+\}\}/g) || [];

        for (let i = 0; i < variableMatches.length; i++) {
          const varNumber = parseInt(variableMatches[i].replace(/\{\{|\}\}/g, ''));
          const value = templateData.body[i] || templateData[`var${varNumber}`] || '';
          bodyParams.push({
            type: 'text',
            text: value.toString()
          });
        }

        if (bodyParams.length > 0) {
          components.push({
            type: 'body',
            parameters: bodyParams
          });
        }
      }

      // Send message
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: templateData.language || 'en'
            },
            components: components
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`📱 WhatsApp message sent to ${cleanPhone}: ${templateName}`);

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      console.error('WhatsApp send error:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  // Send custom WhatsApp message (for approved use cases)
  async sendCustomMessage(userId, toPhone, message) {
    try {
      if (!this.isServiceAvailable()) {
        throw new Error('WhatsApp service not configured');
      }

      const cleanPhone = this.cleanPhoneNumber(toPhone);

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      console.error('WhatsApp custom message error:', error);
      throw new Error('Failed to send WhatsApp message');
    }
  }

  // Clean and format phone number for WhatsApp
  cleanPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Ensure it starts with country code
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned; // Default to US
    }

    return cleaned;
  }

  // Get message status
  async getMessageStatus(messageId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('WhatsApp status check error:', error);
      return null;
    }
  }

  // Check service availability
  isServiceAvailable() {
    return !!(this.accessToken && this.phoneNumberId);
  }

  // Get available templates
  getAvailableTemplates() {
    return Array.from(this.templates.keys());
  }
}

export default new WhatsAppService();