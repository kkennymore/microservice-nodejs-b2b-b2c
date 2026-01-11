import express from 'express';
import { SalesAnalyticsModel, UserAnalyticsModel, ProductAnalyticsModel } from '@/models/index.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Generate sales report
router.get('/sales', async (req, res) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const salesModel = new SalesAnalyticsModel();
    const [overview, byPeriod, clv] = await Promise.all([
      salesModel.getSalesOverview(start_date, end_date),
      salesModel.getSalesByPeriod(start_date, end_date, 'day'),
      salesModel.getCustomerLifetimeValue()
    ]);

    const reportData = {
      title: 'Sales Performance Report',
      period: { start: start_date, end: end_date },
      generatedAt: new Date().toISOString(),
      overview: {
        ...overview,
        total_revenue: parseFloat(overview.total_revenue || 0),
        average_order_value: parseFloat(overview.average_order_value || 0)
      },
      dailyBreakdown: byPeriod.map(item => ({
        date: item.period,
        orders: item.orders,
        revenue: parseFloat(item.revenue || 0),
        avgOrderValue: parseFloat(item.avg_order_value || 0)
      })),
      topCustomers: clv.slice(0, 20)
    };

    if (format === 'json') {
      res.json({
        success: true,
        data: reportData
      });
    } else {
      // Generate CSV
      const csv = generateSalesCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sales_report_${start_date}_${end_date}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales report'
    });
  }
});

// Generate user behavior report
router.get('/users', async (req, res) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const userModel = new UserAnalyticsModel();
    const [acquisition, retention, segmentation, geographic] = await Promise.all([
      userModel.getUserAcquisition(start_date, end_date),
      userModel.getUserRetention(),
      userModel.getUserSegmentation(),
      userModel.getGeographicDistribution()
    ]);

    const reportData = {
      title: 'User Behavior Report',
      period: { start: start_date, end: end_date },
      generatedAt: new Date().toISOString(),
      acquisition: acquisition,
      retention: retention,
      segmentation: segmentation,
      geographic: geographic
    };

    if (format === 'json') {
      res.json({
        success: true,
        data: reportData
      });
    } else {
      const csv = generateUserCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="user_report_${start_date}_${end_date}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    console.error('User report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate user report'
    });
  }
});

// Generate product performance report
router.get('/products', async (req, res) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query;

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

    const reportData = {
      title: 'Product Performance Report',
      period: { start: start_date, end: end_date },
      generatedAt: new Date().toISOString(),
      performance: performance,
      categories: categories,
      inventory: inventory,
      conversion: conversion
    };

    if (format === 'json') {
      res.json({
        success: true,
        data: reportData
      });
    } else {
      const csv = generateProductCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="product_report_${start_date}_${end_date}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    console.error('Product report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate product report'
    });
  }
});

// Generate comprehensive business report
router.get('/business', async (req, res) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Gather data from all models
    const salesModel = new SalesAnalyticsModel();
    const userModel = new UserAnalyticsModel();
    const productModel = new ProductAnalyticsModel();

    const [salesOverview, salesByPeriod, userAcquisition, userRetention, topProducts] = await Promise.all([
      salesModel.getSalesOverview(start_date, end_date),
      salesModel.getSalesByPeriod(start_date, end_date, 'month'),
      userModel.getUserAcquisition(start_date, end_date),
      userModel.getUserRetention(),
      productModel.getProductPerformance(start_date, end_date)
    ]);

    const reportData = {
      title: 'Comprehensive Business Report',
      period: { start: start_date, end: end_date },
      generatedAt: new Date().toISOString(),
      executiveSummary: {
        totalRevenue: parseFloat(salesOverview.total_revenue || 0),
        totalOrders: parseInt(salesOverview.total_orders || 0),
        uniqueCustomers: parseInt(salesOverview.unique_customers || 0),
        userRetentionRate: userRetention.retention_rate,
        averageOrderValue: parseFloat(salesOverview.average_order_value || 0)
      },
      sales: {
        overview: salesOverview,
        monthlyBreakdown: salesByPeriod
      },
      users: {
        acquisition: userAcquisition,
        retention: userRetention
      },
      products: {
        performance: topProducts
      }
    };

    if (format === 'json') {
      res.json({
        success: true,
        data: reportData
      });
    } else {
      const csv = generateBusinessCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="business_report_${start_date}_${end_date}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    console.error('Business report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate business report'
    });
  }
});

// Helper functions for CSV generation
function generateSalesCSV(reportData) {
  const headers = ['Date', 'Orders', 'Revenue', 'Average Order Value'];
  const rows = [headers.join(',')];

  reportData.dailyBreakdown.forEach(day => {
    rows.push([day.date, day.orders, day.revenue, day.avgOrderValue].join(','));
  });

  return rows.join('\n');
}

function generateUserCSV(reportData) {
  const headers = ['Date', 'New Users', 'Role'];
  const rows = [headers.join(',')];

  reportData.acquisition.forEach(day => {
    rows.push([day.date, day.new_users, day.role].join(','));
  });

  return rows.join('\n');
}

function generateProductCSV(reportData) {
  // Simplified CSV for products
  const headers = ['Metric', 'Value'];
  const rows = [headers.join(',')];

  rows.push(['Total Products', reportData.inventory.total_products || 0]);
  rows.push(['Low Stock Items', reportData.inventory.low_stock_items || 0]);
  rows.push(['Conversion Rate', `${reportData.conversion.conversion_rate || 0}%`]);

  return rows.join('\n');
}

function generateBusinessCSV(reportData) {
  const headers = ['Metric', 'Value'];
  const rows = [headers.join(',')];

  const summary = reportData.executiveSummary;
  rows.push(['Total Revenue', summary.totalRevenue]);
  rows.push(['Total Orders', summary.totalOrders]);
  rows.push(['Unique Customers', summary.uniqueCustomers]);
  rows.push(['User Retention Rate', `${summary.userRetentionRate.toFixed(2)}%`]);
  rows.push(['Average Order Value', summary.averageOrderValue]);

  return rows.join('\n');
}

export default router;