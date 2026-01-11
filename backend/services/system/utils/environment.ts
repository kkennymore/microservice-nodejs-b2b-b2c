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

  // Validate system-specific settings
  if (process.env.ALERT_EMAIL_RECIPIENTS) {
    try {
      JSON.parse(process.env.ALERT_EMAIL_RECIPIENTS);
    } catch (error) {
      throw new Error('ALERT_EMAIL_RECIPIENTS must be a valid JSON array');
    }
  }

  console.log('✅ Environment validation passed');
};

export const getEnvironmentInfo = () => {
  return {
    node_env: process.env.NODE_ENV || 'development',
    service_port: process.env.SYSTEM_PORT || 3008,
    database: {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT || 3306,
      database: process.env.DATABASE_NAME
    },
    security: {
      jwt_secret_configured: !!process.env.JWT_SECRET,
      cors_origin: process.env.FRONTEND_URL || 'http://localhost:3000'
    },
    notifications: {
      alert_emails: process.env.ALERT_EMAIL_RECIPIENTS ? 'configured' : 'not configured',
      smtp_host: process.env.EMAIL_HOST ? 'configured' : 'not configured'
    },
    features: {
      maintenance_mode: process.env.NODE_ENV === 'production',
      rate_limiting: 'enabled',
      monitoring: 'enabled',
      auditing: 'enabled'
    }
  };
};