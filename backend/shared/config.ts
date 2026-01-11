// backend/shared/config.js
// Environment variables are loaded by the service that imports this config

const config = {
  database: {
    host: process.env.MYSQL_HOST || 'mysql',
    port: process.env.MYSQL_PORT || 3306,
    username: process.env.MYSQL_USER || 'marketplace',
    password: process.env.MYSQL_PASSWORD || 'marketplace123',
    database: process.env.MYSQL_DATABASE || 'fenap_marketplace',
    dialect: 'mysql',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_USER || 'admin'}:${process.env.RABBITMQ_PASSWORD || 'admin123'}@${process.env.RABBITMQ_HOST || 'rabbitmq'}:${process.env.RABBITMQ_PORT || 5672}/${process.env.RABBITMQ_VHOST || 'marketplace'}`,
    exchange: 'marketplace_exchange',
    queues: {
      email: 'email_queue',
      notification: 'notification_queue',
      transaction: 'transaction_queue',
      product: 'product_queue',
      ticket: 'ticket_queue'
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    }
  },
  social: {
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || ''
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    }
  },
  socket: {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  },
  ports: {
    auth: process.env.AUTH_PORT || 9001,
    products: process.env.PRODUCTS_PORT || 9002,
    transactions: process.env.TRANSACTIONS_PORT || 9003,
    messaging: process.env.MESSAGING_PORT || 9004,
    notifications: process.env.NOTIFICATIONS_PORT || 9005,
    advertising: process.env.ADVERTISING_PORT || 9006,
    ticketing: process.env.TICKETING_PORT || 9007,
    system: process.env.SYSTEM_PORT || 9008,
    analytics: process.env.ANALYTICS_PORT || 9009,
    shipping: process.env.SHIPPING_PORT || 9010,
    gateway: process.env.GATEWAY_PORT || 9000
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:9001',
    products: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:9002',
    transactions: process.env.TRANSACTIONS_SERVICE_URL || 'http://localhost:9003',
    messaging: process.env.MESSAGING_SERVICE_URL || 'http://localhost:9004',
    notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:9005',
    advertising: process.env.ADVERTISING_SERVICE_URL || 'http://localhost:9006',
    ticketing: process.env.TICKETING_SERVICE_URL || 'http://localhost:9007',
    system: process.env.SYSTEM_SERVICE_URL || 'http://localhost:9008',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:9009',
    shipping: process.env.SHIPPING_SERVICE_URL || 'http://localhost:9010'
  },
  logging: {
    enabled: process.env.LOGGING_ENABLED === 'true' || false,
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },
  resilience: {
    retryAttempts: process.env.RETRY_ATTEMPTS || 3,
    retryDelay: process.env.RETRY_DELAY || 1000,
    circuitBreakerTimeout: process.env.CIRCUIT_BREAKER_TIMEOUT || 5000
  },
  payments: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || ''
    }
  },
  notifications: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
    },
    fcm: {
      serverKey: process.env.FCM_SERVER_KEY || ''
    }
  },
  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000,
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 100
    },
    fileUpload: {
      maxSize: process.env.MAX_FILE_SIZE || 10485760,
      allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',')
    }
  },
  app: {
    name: process.env.APP_NAME || 'Multivendor Marketplace API',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development',
    debug: process.env.DEBUG === 'true' || false,
    docs: {
      enabled: process.env.API_DOCS_ENABLED === 'true' || true,
      path: process.env.API_DOCS_PATH || '/api-docs'
    }
  },
  monitoring: {
    healthCheck: {
      interval: process.env.HEALTH_CHECK_INTERVAL || 30000,
      timeout: process.env.HEALTH_CHECK_TIMEOUT || 5000
    }
  },
  external: {
    ga: {
      trackingId: process.env.GA_TRACKING_ID || ''
    },
    recaptcha: {
      secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
      siteKey: process.env.RECAPTCHA_SITE_KEY || ''
    }
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:9000'
};

// Simple connectDB function for services that need it
export const connectDB = async () => {
  // Services should implement their own database connection
  console.log('connectDB called - implement in service');
  return null;
};

// Re-export authenticateToken from auth.js for convenience
export { authenticateToken } from './auth.js';

export default config;