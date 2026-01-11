import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import amqp from 'amqplib';
import { connectDB } from '/app/shared/config.js';
import analyticsRoutes from '@/routes/analyticsRoutes.js';
import dashboardRoutes from '@/routes/dashboardRoutes.js';
import reportsRoutes from '@/routes/reportsRoutes.js';
import { errorHandler } from '@/middlewares/errorHandler.js';
import { analyticsLimiter, strictLimiter } from '@/middlewares/rateLimiter.js';
import { ServiceMonitor, requestTimer, errorTracker, checkDatabaseHealth } from '@/utils/monitoring.js';
import { validateEnvironment, getEnvironmentInfo } from '@/utils/environment.js';
import AnalyticsAggregator from '@/services/AnalyticsAggregator.js';
import RealTimeProcessor from '@/services/RealTimeProcessor.js';

const app = express();
const PORT = process.env.ANALYTICS_PORT || 3009;

// Initialize monitoring
const monitor = new ServiceMonitor('analytics-service');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Monitoring middleware
app.use(requestTimer(monitor));

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth(() => require('/app/shared/database.js').getConnection());
    const healthStatus = monitor.getHealthStatus();

    res.json({
      ...healthStatus,
      database: dbHealth,
      aggregators: AnalyticsAggregator.getStatus(),
      realtime: RealTimeProcessor.getStatus()
    });
  } catch (error) {
    res.status(503).json({
      service: 'analytics',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed metrics endpoint (admin only)
app.get('/metrics', (req, res) => {
  // In production, add authentication check here
  res.json(monitor.getDetailedMetrics());
});

// API documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Analytics Service API',
    version: '1.0.0',
    description: 'Business intelligence and analytics for multivendor marketplace',
    endpoints: {
      analytics: '/api/analytics/*',
      dashboard: '/api/dashboard/*',
      reports: '/api/reports/*'
    }
  });
});

// Routes with rate limiting
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);
app.use('/api/dashboard', analyticsLimiter, dashboardRoutes);
app.use('/api/reports', strictLimiter, reportsRoutes);

// Error tracking
app.use(errorTracker(monitor));

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found in analytics service'
  });
});

// RabbitMQ connection for real-time analytics
let rabbitChannel = null;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    rabbitChannel = await connection.createChannel();

    // Assert queues for analytics events
    await rabbitChannel.assertQueue('analytics_events', { durable: true });
    await rabbitChannel.assertQueue('user_events', { durable: true });
    await rabbitChannel.assertQueue('sales_events', { durable: true });
    await rabbitChannel.assertQueue('product_events', { durable: true });

    console.log('🐰 RabbitMQ connected for analytics');

    // Start consuming analytics events
    RealTimeProcessor.initializeEventConsumers(rabbitChannel);

  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Validate environment
    validateEnvironment();

    console.log('🚀 Starting Analytics Service with config:', getEnvironmentInfo());

    // Connect to database
    await connectDB();

    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Initialize analytics aggregator
    await AnalyticsAggregator.initialize();

    // Initialize real-time processor
    await RealTimeProcessor.initialize();

    app.listen(PORT, () => {
      console.log(`📊 Analytics service running on port ${PORT}`);
      console.log(`📈 Real-time analytics processing active`);
      console.log(`📊 Dashboard data aggregation running`);
      console.log(`📋 Analytics event consumption started`);
    });
  } catch (error) {
    console.error('❌ Failed to start analytics service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down analytics service gracefully...`);

  try {
    // Stop accepting new connections
    app.disable('accept');

    // Close WebSocket connections
    if (global.io) {
      global.io.close();
    }

    // Shutdown services
    await AnalyticsAggregator.shutdown();
    await RealTimeProcessor.shutdown();

    // Close RabbitMQ connection
    if (rabbitChannel) {
      await rabbitChannel.close();
    }

    // Close database connections
    // Note: Pool will be closed automatically

    console.log('✅ Analytics service shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();