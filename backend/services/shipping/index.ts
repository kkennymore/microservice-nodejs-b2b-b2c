import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from '/app/shared/config.js';
import shippingRoutes from '@/routes/shippingRoutes.js';
import { shippingLimiter, trackingLimiter, strictLimiter } from '@/middlewares/rateLimiter.js';
import { ServiceMonitor, requestTimer, errorTracker, checkDatabaseHealth, checkCarrierHealth } from '@/utils/monitoring.js';
import { validateEnvironment, getEnvironmentInfo } from '@/utils/environment.js';

const app = express();
const PORT = process.env.SHIPPING_PORT || 3010;

// Initialize monitoring
const monitor = new ServiceMonitor('shipping-service');

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

    // Check carrier health (mock for now)
    const carrierHealth = {
      fedex: await checkCarrierHealth('fedex', { is_active: true, api_key: process.env.FEDEX_API_KEY }),
      ups: await checkCarrierHealth('ups', { is_active: true, api_key: process.env.UPS_ACCESS_KEY }),
      usps: await checkCarrierHealth('usps', { is_active: true, api_key: process.env.USPS_USERNAME })
    };

    const healthStatus = monitor.getHealthStatus();

    res.json({
      ...healthStatus,
      database: dbHealth,
      carriers: carrierHealth
    });
  } catch (error) {
    res.status(503).json({
      service: 'shipping',
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
    title: 'Shipping Service API',
    version: '1.0.0',
    description: 'Shipping and logistics management for multivendor marketplace',
    endpoints: {
      shipping: '/api/shipping/*'
    },
    features: [
      'Multi-carrier shipping rates',
      'Automated label generation',
      'Real-time package tracking',
      'Seller shipping settings',
      'Address validation',
      'Return shipping management'
    ]
  });
});

// Routes with rate limiting
app.use('/api/shipping/rates', shippingLimiter);
app.use('/api/shipping/shipments', strictLimiter);
app.use('/api/shipping/track', trackingLimiter);
app.use('/api/shipping', shippingLimiter, shippingRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found in shipping service'
  });
});

// Error tracking
app.use(errorTracker(monitor));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Shipping service error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Validate environment
    validateEnvironment();

    console.log('🚀 Starting Shipping Service with config:', getEnvironmentInfo());

    // Connect to database
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚚 Shipping service running on port ${PORT}`);
      console.log(`📦 Multi-carrier shipping management active`);
      console.log(`🏷️ Automated label generation ready`);
      console.log(`📍 Real-time tracking enabled`);
    });
  } catch (error) {
    console.error('❌ Failed to start shipping service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down shipping service gracefully...`);

  try {
    // Stop accepting new connections
    app.disable('accept');

    console.log('✅ Shipping service shut down gracefully');
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