import express from 'express';
import WhatsAppService from '@/services/WhatsAppService.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Send WhatsApp message using template
router.post('/send', async (req, res) => {
  try {
    const userId = req.user.id;
    const { to, template, templateData } = req.body;

    const result = await WhatsAppService.sendTemplatedMessage(userId, to, template, templateData);

    res.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send WhatsApp message'
    });
  }
});

// Send custom WhatsApp message
router.post('/custom', async (req, res) => {
  try {
    const userId = req.user.id;
    const { to, message } = req.body;

    const result = await WhatsAppService.sendCustomMessage(userId, to, message);

    res.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send custom WhatsApp error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send WhatsApp message'
    });
  }
});

// Get WhatsApp message status
router.get('/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const status = await WhatsAppService.getMessageStatus(messageId);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message status'
    });
  }
});

// Get available WhatsApp templates
router.get('/templates', async (req, res) => {
  try {
    const templates = WhatsAppService.getAvailableTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get WhatsApp templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get WhatsApp templates'
    });
  }
});

// Get WhatsApp statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    // TODO: Implement WhatsApp stats tracking
    const stats = {
      total: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      total_cost: 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get WhatsApp stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get WhatsApp statistics'
    });
  }
});

export default router;