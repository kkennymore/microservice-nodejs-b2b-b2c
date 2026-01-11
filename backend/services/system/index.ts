import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from '/app/shared/config.js';
import systemRoutes from '@/routes/systemRoutes.js';
import { ServiceMonitor, requestTimer, errorTracker, checkDatabaseHealth } from '@/utils/monitoring.js';
import { validateEnvironment, getEnvironmentInfo } from '@/utils/environment.js';
import { errorHandler } from '@/middlewares/errorHandler.js';
import { apiLimiter, strictLimiter } from '@/middlewares/rateLimiter.js';

const app = express();
const PORT = process.env.SYSTEM_PORT || 3008;

// Initialize monitoring
const monitor = new ServiceMonitor('system-service');

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

// Rate limiting
app.use('/api/system', apiLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth(() => require('/app/shared/database.js').getConnection());
    const healthStatus = monitor.getHealthStatus();

    res.json({
      ...healthStatus,
      database: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      service: 'system',
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
    title: 'System Service API',
    version: '1.0.0',
    description: 'System administration and management for multivendor marketplace',
    endpoints: {
      system: '/api/system/*'
    },
    features: [
      'User management and oversight',
      'System monitoring and health checks',
      'Configuration management',
      'Alert management and notifications',
      'Maintenance scheduling',
      'Admin action auditing',
      'Emergency controls'
    ],
    admin_routes: [
      'GET /api/system/dashboard/summary - Admin dashboard data',
      'GET /api/system/users - User management',
      'PUT /api/system/users/:id/status - Update user status',
      'GET /api/system/alerts - System alerts',
      'POST /api/system/maintenance - Schedule maintenance',
      'GET /api/system/logs - Admin action logs',
      'POST /api/system/emergency/shutdown - Emergency controls'
    ]
  });
});

// Routes
app.use('/api/system', systemRoutes);

// Error tracking
app.use(errorTracker(monitor));

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found in system service'
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down system service gracefully...`);

  try {
    // Stop accepting new connections
    app.disable('accept');

    console.log('✅ System service shut down gracefully');
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

// Start server
const startServer = async () => {
  try {
    // Validate environment
    validateEnvironment();

    console.log('🚀 Starting System Service with config:', getEnvironmentInfo());

    // Connect to database
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🔧 System service running on port ${PORT}`);
      console.log(`👑 Admin functions and system management active`);
      console.log(`📊 System monitoring and health checks enabled`);
      console.log(`🔔 Alert management and notifications ready`);
      console.log(`📋 Admin action auditing initialized`);
    });
  } catch (error) {
    console.error('❌ Failed to start system service:', error);
    process.exit(1);
  }
};

startServer();