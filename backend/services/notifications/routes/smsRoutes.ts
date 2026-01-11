import express from 'express';
import SMSService from '@/services/SMSService.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Send SMS
router.post('/send', async (req, res) => {
  try {
    const userId = req.user.id;
    const smsData = { ...req.body, userId };

    const result = await SMSService.sendSMS(smsData);

    res.json({
      success: true,
      message: 'SMS sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send SMS'
    });
  }
});

// Send templated SMS
router.post('/template/:templateName', async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateName } = req.params;
    const { to, templateData } = req.body;

    const result = await SMSService.sendTemplatedSMS(userId, to, templateName, templateData);

    res.json({
      success: true,
      message: 'Templated SMS sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send templated SMS error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send templated SMS'
    });
  }
});

// Get SMS status
router.get('/status/:messageSid', async (req, res) => {
  try {
    const { messageSid } = req.params;
    const status = await SMSService.getSMSStatus(messageSid);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'SMS not found'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get SMS status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SMS status'
    });
  }
});

// Get available SMS templates
router.get('/templates', async (req, res) => {
  try {
    const templates = SMSService.getAvailableTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get SMS templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SMS templates'
    });
  }
});

// Get SMS statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await SMSService.getStatistics(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get SMS stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SMS statistics'
    });
  }
});

export default router;