import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '/app/shared/config.js';
import { EmailLogModel, NotificationTemplateModel } from '@/models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = this.createTransport();
    this.templates = new Map();
    this.templateDir = path.join(__dirname, '../templates');
    this.initializeTemplates();
  }

  // Create email transporter based on configuration
  createTransport() {
    const emailConfig = config.email;

    if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    }

    // Default SMTP configuration
      return nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass
      }
    });
  }

  // Initialize email templates
  async initializeTemplates() {
    try {
      // Load templates from database
      const templateModel = new NotificationTemplateModel();
      const templates = await templateModel.findByType('email');

      for (const template of templates) {
        if (template.is_active) {
          this.templates.set(template.name, {
            subject: handlebars.compile(template.subject || ''),
            content: handlebars.compile(template.content),
            variables: template.variables
          });
        }
      }

      console.log(`📧 Loaded ${this.templates.size} email templates`);
    } catch (error) {
      console.error('Failed to initialize email templates:', error);
    }
  }

  // Send email using template
  async sendTemplatedEmail(userId, toEmail, templateName, templateData = {}) {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      const subject = template.subject(templateData);
      const html = template.content(templateData);

      return await this.sendEmail({
        userId,
        to: toEmail,
        subject,
        html,
        template: templateName,
        templateData
      });
    } catch (error) {
      console.error('Templated email send error:', error);
      throw error;
    }
  }

  // Send custom email
  async sendEmail(emailData) {
    try {
      const {
        userId,
        to,
        subject,
        html,
        text,
        template,
        templateData = {},
        priority = 'normal'
      } = emailData;

      // Create email log entry
      const emailLogModel = new EmailLogModel();
      const logId = await emailLogModel.create({
        user_id: userId,
        to_email: to,
        subject,
        template,
        data: templateData,
        status: 'pending',
        provider: this.getProviderName()
      });

      // Prepare email options
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Marketplace'}" <${process.env.EMAIL_FROM || config.email.auth.user}>`,
        to,
        subject,
        html,
        text,
        // Add priority headers
        priority: priority === 'high' ? 'high' : 'normal',
        headers: {
          'X-Priority': priority === 'high' ? '1' : '3',
          'X-Mailer': 'Marketplace Notifications Service'
        }
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      // Update log with success
      await emailLogModel.updateStatus(logId, 'sent', info.messageId);

      console.log(`📧 Email sent successfully to ${to}: ${subject}`);

      return {
        success: true,
        messageId: info.messageId,
        logId
      };
    } catch (error) {
      console.error('Email send error:', error);

      // Update log with failure
      if (emailData.logId) {
        const emailLogModel = new EmailLogModel();
        await emailLogModel.updateStatus(emailData.logId, 'failed', null, error.message);
      }

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Send bulk emails
  async sendBulkEmails(emails) {
    const results = [];

    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        results.push({ ...result, email: email.to });
      } catch (error) {
        results.push({
          success: false,
          email: email.to,
          error: error.message
        });
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  // Verify email configuration
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('📧 Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }

  // Get provider name
  getProviderName() {
    if (process.env.EMAIL_PROVIDER === 'sendgrid') return 'sendgrid';
    if (process.env.EMAIL_PROVIDER === 'ses') return 'ses';
    return 'smtp';
  }

  // Reload templates (for admin updates)
  async reloadTemplates() {
    this.templates.clear();
    await this.initializeTemplates();
  }

  // Get available templates
  getAvailableTemplates() {
    return Array.from(this.templates.keys());
  }

  // Validate template data
  validateTemplateData(templateName, data) {
    const template = this.templates.get(templateName);
    if (!template) return false;

    const requiredVars = template.variables || [];
    return requiredVars.every(varName => data.hasOwnProperty(varName));
  }
}

export default new EmailService();