import express from 'express';
import NotificationCampaignService from '@/services/NotificationCampaignService.js';
import { NotificationCampaignModel } from '@/models/index.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create a new campaign
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const campaignData = { ...req.body, created_by: userId };

    const campaignId = await NotificationCampaignService.createCampaign(campaignData);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: { campaign_id: campaignId }
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create campaign'
    });
  }
});

// Get user's campaigns
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const campaigns = await NotificationCampaignService.campaignModel.findByUserId(userId, limit, offset);

    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page,
          limit,
          total: campaigns.length, // TODO: Get actual total count
          pages: Math.ceil(campaigns.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns'
    });
  }
});

// Get campaign by ID
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await NotificationCampaignService.campaignModel.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check ownership
    if (campaign.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign'
    });
  }
});

// Start a campaign
router.post('/:campaignId/start', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await NotificationCampaignService.campaignModel.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check ownership
    if (campaign.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const result = await NotificationCampaignService.startCampaign(campaignId);

    res.json({
      success: true,
      message: 'Campaign started successfully',
      data: result
    });
  } catch (error) {
    console.error('Start campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start campaign'
    });
  }
});

// Cancel a campaign
router.post('/:campaignId/cancel', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await NotificationCampaignService.campaignModel.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check ownership
    if (campaign.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await NotificationCampaignService.cancelCampaign(campaignId);

    res.json({
      success: true,
      message: 'Campaign cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel campaign'
    });
  }
});

// Get campaign analytics
router.get('/:campaignId/analytics', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await NotificationCampaignService.campaignModel.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check ownership
    if (campaign.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const analytics = await NotificationCampaignService.getCampaignAnalytics(campaignId);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign analytics'
    });
  }
});

// Get campaign statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await NotificationCampaignService.getCampaignStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign statistics'
    });
  }
});

// Delete campaign
router.delete('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await NotificationCampaignService.campaignModel.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check ownership
    if (campaign.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const success = await NotificationCampaignService.campaignModel.delete(campaignId, req.user.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign'
    });
  }
});

export default router;