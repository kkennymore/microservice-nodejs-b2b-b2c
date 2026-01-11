import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
// import { connectDB } from '@/shared/config.js';

// Import custom middleware
import { authenticationMiddleware } from '@/middleware/authMiddleware.js';
import { loggingMiddleware } from '@/middleware/loggingMiddleware.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import { corsOptions } from '@/config/corsConfig.js';
import { serviceRoutes } from '@/config/serviceRoutes.js';
import GatewayService from '@/services/GatewayService.js';

const app = express();
const PORT = process.env.GATEWAY_PORT || 9000;

// Initialize Gateway Service
const gatewayService = new GatewayService();

// Trust proxy for rate limiting behind load balancers
app.set('trust proxy', 1);

// Global middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: gatewayService.getServiceHealth()
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Multivendor Marketplace API Gateway',
    version: '1.0.0',
    description: 'Centralized API gateway for all microservices',
    services: serviceRoutes.map(route => ({
      path: route.path,
      target: route.target,
      description: route.description
    }))
  });
});

// Rate limiting - Global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: 900 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' // Skip health checks
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 admin requests per windowMs
  message: {
    success: false,
    message: 'Too many admin operations, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Analytics rate limiting
const analyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // limit each IP to 200 analytics requests per hour
  message: {
    success: false,
    message: 'Analytics request limit exceeded, please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply global rate limiting
app.use('/api/', globalLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth/', authLimiter);

// Apply admin rate limiting to system routes
app.use('/api/system/', adminLimiter);

// Apply analytics rate limiting to analytics routes
app.use('/api/analytics/', analyticsLimiter);
app.use('/api/dashboard/', analyticsLimiter);
app.use('/api/reports/', analyticsLimiter);

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Custom middleware for logging and monitoring
app.use(loggingMiddleware);

// API Versioning middleware
app.use('/api/v1', (req, res, next) => {
  req.apiVersion = 'v1';
  next();
});

// Service discovery and health checking
app.get('/api/services', async (req, res) => {
  try {
    const services = await gatewayService.discoverServices();
    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to discover services'
    });
  }
});

// Create proxy middleware for each service
serviceRoutes.forEach(route => {
  const proxyOptions = {
    target: route.target,
    changeOrigin: true,
    pathRewrite: route.pathRewrite || {},
    router: route.loadBalancing?.enabled ? (req) => {
      // Use load balancing to select target
      const target = gatewayService.getServiceInstance(route.name, route.loadBalancing.strategy);
      return target || route.target;
    } : undefined,
    onProxyReq: (proxyReq, req, res) => {
      // Add gateway metadata
      proxyReq.setHeader('X-Gateway', 'true');
      proxyReq.setHeader('X-API-Version', req.apiVersion || 'v1');
      proxyReq.setHeader('X-Client-IP', req.ip);
      proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'] || generateRequestId());
      proxyReq.setHeader('X-Service-Name', route.name);

      // Track request for load balancing
      if (route.loadBalancing?.enabled) {
        const targetUrl = proxyReq.getHeader('host');
        gatewayService.trackRequest(targetUrl, true);
      }

      // Forward user information if authenticated
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-User-Email', req.user.email);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add gateway response headers
      proxyRes.headers['X-Gateway-Processed'] = 'true';
      proxyRes.headers['X-Response-Time'] = Date.now() - req.startTime;

      // Stop tracking request
      if (route.loadBalancing?.enabled) {
        const targetUrl = req.headers.host;
        gatewayService.trackRequest(targetUrl, false);
      }

      // Log response
      const actualTarget = route.loadBalancing?.enabled
        ? gatewayService.getServiceInstance(route.name, route.loadBalancing.strategy)
        : route.target;
      console.log(`📡 ${req.method} ${req.originalUrl} -> ${actualTarget} [${proxyRes.statusCode}]`);
    },
    onError: (err, req, res) => {
      console.error(`🚨 Proxy error for ${req.originalUrl}:`, err.message);

      // Stop tracking request on error
      if (route.loadBalancing?.enabled) {
        const targetUrl = req.headers.host;
        gatewayService.trackRequest(targetUrl, false);
      }

      res.status(502).json({
        success: false,
        message: 'Service temporarily unavailable',
        service: route.name,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  };

  // Apply authentication middleware for protected routes
  if (route.protected) {
    app.use(route.path, authenticationMiddleware);
  }

  // Apply additional middleware if specified
  if (route.middleware && route.middleware.length > 0) {
    route.middleware.forEach(middleware => {
      app.use(route.path, middleware);
    });
  }

  // Create and apply proxy middleware
  const proxy = createProxyMiddleware(proxyOptions);
  app.use(route.path, proxy);

  console.log(`🔗 Gateway route configured: ${route.path} -> ${route.target}`);
});

// Catch-all route for unmatched API requests
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableServices: serviceRoutes.map(r => r.path)
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database for gateway-specific operations
    // await connectDB();

    // Initialize gateway services
    await gatewayService.initialize();

    app.listen(PORT, () => {
      console.log(`🚪 API Gateway running on port ${PORT}`);
      console.log(`🔄 Routing ${serviceRoutes.length} services`);
      console.log(`🛡️ Security middleware active`);
      console.log(`📊 Monitoring and logging enabled`);
      console.log(`🌐 CORS configured for frontend access`);
      console.log(`⚖️ Load balancing enabled for analytics, dashboard, reports, and shipping services`);
      console.log(`👑 Admin controls available via /api/system/*`);
      console.log(`📈 Analytics available via /api/analytics/*, /api/dashboard/*, /api/reports/*`);
      console.log(`📦 Shipping available via /api/shipping/*`);
    });
  } catch (error) {
    console.error('❌ Failed to start API Gateway:', error);
    process.exit(1);
  }
};

// Utility function to generate request ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down API Gateway...');
  await gatewayService.shutdown();
  process.exit(0);
});