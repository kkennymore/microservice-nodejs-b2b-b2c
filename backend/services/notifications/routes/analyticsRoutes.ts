import express from 'express';
import NotificationAnalyticsService from '@/services/NotificationAnalyticsService.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const dashboardData = await NotificationAnalyticsService.getDashboardData();

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data'
    });
  }
});

// Get analytics for date range
router.get('/range', async (req, res) => {
  try {
    const { start_date, end_date, channel, campaign_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const analytics = await NotificationAnalyticsService.getAnalytics(
      start_date,
      end_date,
      channel,
      campaign_id
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics range error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics'
    });
  }
});

// Get real-time metrics
router.get('/realtime', async (req, res) => {
  try {
    const metrics = NotificationAnalyticsService.getRealTimeMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get realtime metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve real-time metrics'
    });
  }
});

// Get performance insights
router.get('/insights', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const insights = await NotificationAnalyticsService.getPerformanceInsights(days);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance insights'
    });
  }
});

// Get channel performance
router.get('/channels', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const analyticsModel = NotificationAnalyticsService.analyticsModel;
    const performance = await analyticsModel.getChannelPerformance(start_date, end_date);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Get channel performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve channel performance'
    });
  }
});

// Export analytics data
router.get('/export', async (req, res) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const exportedData = await NotificationAnalyticsService.exportAnalytics(
      start_date,
      end_date,
      format
    );

    // Set appropriate headers based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${start_date}_${end_date}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${start_date}_${end_date}.json"`);
    }

    res.send(exportedData);
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics'
    });
  }
});

// Record analytics event (internal API)
router.post('/event', async (req, res) => {
  try {
    const eventData = req.body;
    await NotificationAnalyticsService.recordEvent(eventData);

    res.json({
      success: true,
      message: 'Analytics event recorded'
    });
  } catch (error) {
    console.error('Record analytics event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record analytics event'
    });
  }
});

// Get top performing campaigns
router.get('/campaigns/top', async (req, res) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const analyticsModel = NotificationAnalyticsService.analyticsModel;
    const topCampaigns = await analyticsModel.getTopCampaigns(start_date, end_date, limit);

    res.json({
      success: true,
      data: topCampaigns
    });
  } catch (error) {
    console.error('Get top campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve top campaigns'
    });
  }
});

export default router;