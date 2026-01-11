import express from 'express';
import EmailService from '@/services/EmailService.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Send email
router.post('/send', async (req, res) => {
  try {
    const userId = req.user.id;
    const emailData = { ...req.body, userId };

    const result = await EmailService.sendEmail(emailData);

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email'
    });
  }
});

// Send templated email
router.post('/template/:templateName', async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateName } = req.params;
    const { to, templateData } = req.body;

    const result = await EmailService.sendTemplatedEmail(userId, to, templateName, templateData);

    res.json({
      success: true,
      message: 'Templated email sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send templated email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send templated email'
    });
  }
});

// Get available email templates
router.get('/templates', async (req, res) => {
  try {
    const templates = EmailService.getAvailableTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email templates'
    });
  }
});

export default router;