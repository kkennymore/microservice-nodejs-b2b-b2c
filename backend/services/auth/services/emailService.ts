// backend/services/auth/services/emailService.js
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '@/shared/config';
import pligsLogger from '@/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PligsEmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth
    });
  }

  // Render HTML template with data
  async renderTemplate(templateName, data) {
    try {
      const templatePath = path.join(__dirname, '../email-templates', `${templateName}.html`);
      let template = await fs.readFile(templatePath, 'utf8');

      // Replace template variables
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, data[key]);
      });

      return template;
    } catch (error) {
      pligsLogger.error(`Failed to render template ${templateName}:`, error);
      throw error;
    }
  }

  // Send email with template
  async pligsSendEmail(to, subject, textContent, htmlContent, from = null) {
    try {
      const mailOptions = {
        from: from || config.email.auth.user,
        to,
        subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      pligsLogger.info(`Email sent to ${to}: ${subject}`);
      return result;
    } catch (error) {
      pligsLogger.error('Failed to send email:', error);
      throw error;
    }
  }

  async pligsSendVerificationEmail(email, token, userData = {}) {
    try {
      const verificationUrl = `${config.frontendUrl || process.env.FRONTEND_URL}/verify-email?token=${token}`;

      const htmlContent = await this.renderTemplate('email-verification', {
        verificationUrl,
        firstName: userData.firstName || 'User',
        ...userData
      });

      const textContent = `
        Welcome to Multivendor Marketplace!

        Please verify your email address by clicking the link below:
        ${verificationUrl}

        This link will expire in 24 hours.

        If you didn't create an account, please ignore this email.
      `;

      await this.pligsSendEmail(
        email,
        'Verify Your Email - Multivendor Marketplace',
        textContent,
        htmlContent
      );

    } catch (error) {
      pligsLogger.error('Failed to send verification email:', error);
      throw error;
    }
  }

  async pligsSendPasswordResetEmail(email, token, userData = {}) {
    try {
      const resetUrl = `${config.frontendUrl || process.env.FRONTEND_URL}/reset-password?token=${token}`;

      const htmlContent = await this.renderTemplate('password-reset', {
        resetUrl,
        firstName: userData.firstName || 'User',
        ...userData
      });

      const textContent = `
        Password Reset Request

        You requested a password reset for your Multivendor Marketplace account.
        Click the link below to reset your password:

        ${resetUrl}

        This link will expire in 1 hour.

        If you didn't request this password reset, please ignore this email.
        Never share this email with anyone.
      `;

      await this.pligsSendEmail(
        email,
        'Reset Your Password - Multivendor Marketplace',
        textContent,
        htmlContent
      );

    } catch (error) {
      pligsLogger.error('Failed to send password reset email:', error);
      throw error;
    }
  }
}

export default PligsEmailService;