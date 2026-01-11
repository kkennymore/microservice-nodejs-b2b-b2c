// Environment variable validation for Ticketing Service

export const validateEnvironment = () => {
  const required = [
    'MYSQL_HOST',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
    'JWT_SECRET'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // Validate database port
  const dbPort = parseInt(process.env.MYSQL_PORT || '3306')
  if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error('MYSQL_PORT must be a valid port number')
  }

  // Validate service port
  const servicePort = parseInt(process.env.TICKETING_PORT || '3007')
  if (isNaN(servicePort) || servicePort < 1 || servicePort > 65535) {
    throw new Error('TICKETING_PORT must be a valid port number')
  }

  // Validate JWT secret length
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('WARNING: JWT_SECRET is shorter than recommended (32+ characters)')
  }

  // Validate CORS origin
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('http')) {
    throw new Error('FRONTEND_URL must be a valid HTTP/HTTPS URL')
  }

  // Validate email configuration if provided
  if (process.env.EMAIL_HOST) {
    const emailPort = parseInt(process.env.EMAIL_PORT || '587')
    if (isNaN(emailPort) || emailPort < 1 || emailPort > 65535) {
      throw new Error('EMAIL_PORT must be a valid port number')
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('WARNING: Email is configured but EMAIL_USER or EMAIL_PASS is missing')
    }
  }

  console.log('✅ Environment validation passed')
}

export const getEnvironmentInfo = () => {
  return {
    node_env: process.env.NODE_ENV || 'development',
    service_port: process.env.TICKETING_PORT || 3007,
    database: {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      database: process.env.MYSQL_DATABASE
    },
    message_queue: process.env.RABBITMQ_URL ? 'configured' : 'not configured',
    email: {
      host: process.env.EMAIL_HOST || 'not configured',
      port: process.env.EMAIL_PORT || 587,
      user: process.env.EMAIL_USER ? 'configured' : 'not configured'
    },
    alerts: {
      email_recipients: process.env.ALERT_EMAIL_RECIPIENTS ? 'configured' : 'not configured'
    },
    cors: process.env.FRONTEND_URL || 'http://localhost:3000',
    features: {
      file_uploads: 'enabled',
      email_notifications: process.env.EMAIL_HOST ? 'enabled' : 'disabled',
      sla_monitoring: 'enabled',
      audit_logging: 'enabled'
    }
  }
}