import express from 'express';
import { AnalyticsEventModel, SalesAnalyticsModel, UserAnalyticsModel, ProductAnalyticsModel } from '@/models/index.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get analytics overview
router.get('/overview', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const [eventStats, salesOverview] = await Promise.all([
      new AnalyticsEventModel().getEventStats(start_date, end_date),
      new SalesAnalyticsModel().getSalesOverview(start_date, end_date)
    ]);

    res.json({
      success: true,
      data: {
        eventStats,
        salesOverview: {
          ...salesOverview,
          total_revenue: parseFloat(salesOverview.total_revenue || 0),
          average_order_value: parseFloat(salesOverview.average_order_value || 0)
        }
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview'
    });
  }
});

// Get sales analytics
router.get('/sales', async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const salesModel = new SalesAnalyticsModel();
    const [overview, byPeriod, topProducts] = await Promise.all([
      salesModel.getSalesOverview(start_date, end_date),
      salesModel.getSalesByPeriod(start_date, end_date, group_by),
      salesModel.getTopProducts(start_date, end_date)
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          ...overview,
          total_revenue: parseFloat(overview.total_revenue || 0),
          average_order_value: parseFloat(overview.average_order_value || 0)
        },
        byPeriod: byPeriod.map(item => ({
          ...item,
          revenue: parseFloat(item.revenue || 0),
          avg_order_value: parseFloat(item.avg_order_value || 0)
        })),
        topProducts
      }
    });
  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales analytics'
    });
  }
});

// Get user analytics
router.get('/users', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const userModel = new UserAnalyticsModel();
    const [acquisition, retention, engagement, segmentation, geographic] = await Promise.all([
      userModel.getUserAcquisition(start_date, end_date),
      userModel.getUserRetention(),
      userModel.getUserEngagement(start_date, end_date),
      userModel.getUserSegmentation(),
      userModel.getGeographicDistribution()
    ]);

    res.json({
      success: true,
      data: {
        acquisition,
        retention,
        engagement,
        segmentation,
        geographic
      }
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics'
    });
  }
});

// Get product analytics
router.get('/products', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const productModel = new ProductAnalyticsModel();
    const [performance, categories, inventory, conversion] = await Promise.all([
      productModel.getProductPerformance(start_date, end_date),
      productModel.getCategoryPerformance(start_date, end_date),
      productModel.getInventoryAnalytics(),
      productModel.getConversionFunnel(start_date, end_date)
    ]);

    res.json({
      success: true,
      data: {
        performance,
        categories,
        inventory,
        conversion
      }
    });
  } catch (error) {
    console.error('Product analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product analytics'
    });
  }
});

// Get customer lifetime value
router.get('/customers/lifetime-value', async (req, res) => {
  try {
    const salesModel = new SalesAnalyticsModel();
    const clv = await salesModel.getCustomerLifetimeValue();

    res.json({
      success: true,
      data: clv
    });
  } catch (error) {
    console.error('Customer lifetime value error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer lifetime value'
    });
  }
});

// Get real-time metrics
router.get('/realtime', async (req, res) => {
  try {
    // Import the real-time processor
    const RealTimeProcessor = (await import('../services/RealTimeProcessor.js')).default;
    const metrics = RealTimeProcessor.getRealtimeMetrics();

    res.json({
      success: true,
      data: {
        ...metrics,
        activeUsersCount: metrics.activeUsers ? metrics.activeUsers.size : 0
      }
    });
  } catch (error) {
    console.error('Real-time metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time metrics'
    });
  }
});

// Track analytics event (for client-side tracking)
router.post('/event', async (req, res) => {
  try {
    const userId = req.user.id;
    const eventData = {
      ...req.body,
      user_id: userId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      timestamp: new Date()
    };

    const eventModel = new AnalyticsEventModel();
    const eventId = await eventModel.create(eventData);

    // Emit to real-time processor
    if (global.io) {
      global.io.emit('analytics_event', eventData);
    }

    res.json({
      success: true,
      message: 'Analytics event recorded',
      data: { event_id: eventId }
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track analytics event'
    });
  }
});

// Get events by user (admin only)
router.get('/events/user/:userId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { userId } = req.params;
    const { start_date, end_date, event_type } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const eventModel = new AnalyticsEventModel();
    const events = await eventModel.getEventsByDateRange(start_date, end_date, event_type, userId);

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user events'
    });
  }
});

export default router;