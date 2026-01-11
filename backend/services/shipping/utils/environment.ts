// Environment variable validation for production readiness

export const validateEnvironment = () => {
  const required = [
    'MYSQL_HOST',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate database port
  const dbPort = parseInt(process.env.MYSQL_PORT || '3306');
  if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error('MYSQL_PORT must be a valid port number');
  }

  // Validate JWT secret length
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('WARNING: JWT_SECRET is shorter than recommended (32+ characters)');
  }

  // Validate CORS origin
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('http')) {
    throw new Error('FRONTEND_URL must be a valid HTTP/HTTPS URL');
  }

  // Optional carrier API keys (warn if missing in production)
  if (process.env.NODE_ENV === 'production') {
    const carriers = ['FEDEX_API_KEY', 'UPS_ACCESS_KEY', 'USPS_USERNAME'];
    const missingCarriers = carriers.filter(key => !process.env[key]);
    if (missingCarriers.length > 0) {
      console.warn(`⚠️  Missing carrier API keys (shipping may not work): ${missingCarriers.join(', ')}`);
    }
  }

  console.log('✅ Environment validation passed');
};

export const getEnvironmentInfo = () => {
  return {
    node_env: process.env.NODE_ENV || 'development',
    service_port: process.env.SHIPPING_PORT || 3010,
    database: {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      database: process.env.MYSQL_DATABASE
    },
    carriers: {
      fedex: process.env.FEDEX_API_KEY ? 'configured' : 'not configured',
      ups: process.env.UPS_ACCESS_KEY ? 'configured' : 'not configured',
      usps: process.env.USPS_USERNAME ? 'configured' : 'not configured'
    },
    cors: process.env.FRONTEND_URL || 'http://localhost:3000'
  };
};