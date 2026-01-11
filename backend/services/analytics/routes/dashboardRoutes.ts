import express from 'express';
import { DashboardModel } from '@/models/index.js';
import AnalyticsAggregator from '@/services/AnalyticsAggregator.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard KPIs
router.get('/kpis', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      // Default to last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const start_date = startDate.toISOString().split('T')[0];
      const end_date = endDate.toISOString().split('T')[0];
    }

    const dashboardModel = new DashboardModel();
    const kpis = await dashboardModel.getKPIs(start_date, end_date);

    res.json({
      success: true,
      data: kpis
    });
  } catch (error) {
    console.error('Dashboard KPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard KPIs'
    });
  }
});

// Get revenue chart data
router.get('/revenue-chart', async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    if (!start_date || !end_date) {
      // Default to last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const start_date = startDate.toISOString().split('T')[0];
      const end_date = endDate.toISOString().split('T')[0];
    }

    const dashboardModel = new DashboardModel();
    const chartData = await dashboardModel.getRevenueChart(start_date, end_date, group_by);

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Revenue chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue chart data'
    });
  }
});

// Get top metrics
router.get('/top-metrics', async (req, res) => {
  try {
    const dashboardModel = new DashboardModel();
    const topMetrics = await dashboardModel.getTopMetrics();

    res.json({
      success: true,
      data: topMetrics
    });
  } catch (error) {
    console.error('Top metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top metrics'
    });
  }
});

// Get real-time dashboard data
router.get('/realtime', async (req, res) => {
  try {
    const dashboardModel = new DashboardModel();
    const realtimeData = await dashboardModel.getRealtimeMetrics();

    // Add aggregator status
    const aggregatorStatus = AnalyticsAggregator.getStatus();

    res.json({
      success: true,
      data: {
        ...realtimeData,
        aggregator: aggregatorStatus
      }
    });
  } catch (error) {
    console.error('Realtime dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time dashboard data'
    });
  }
});

// Get dashboard summary
router.get('/summary', async (req, res) => {
  try {
    const dashboardModel = new DashboardModel();
    const aggregatorStatus = AnalyticsAggregator.getStatus();

    // Get KPIs for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const start_date = startDate.toISOString().split('T')[0];
    const end_date = endDate.toISOString().split('T')[0];

    const [kpis, realtime] = await Promise.all([
      dashboardModel.getKPIs(start_date, end_date),
      dashboardModel.getRealtimeMetrics()
    ]);

    res.json({
      success: true,
      data: {
        kpis,
        realtime,
        system: {
          aggregatorRunning: aggregatorStatus.running,
          lastAggregation: aggregatorStatus.lastAggregation
        },
        period: {
          start: start_date,
          end: end_date
        }
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary'
    });
  }
});

// WebSocket upgrade endpoint for real-time dashboard
router.get('/ws', (req, res) => {
  // This would normally upgrade to WebSocket
  // For now, return WebSocket endpoint info
  res.json({
    success: true,
    message: 'Use WebSocket connection to ws://localhost:3009 for real-time updates',
    endpoint: 'ws://localhost:3009'
  });
});

export default router;