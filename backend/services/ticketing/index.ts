import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { connectDB } from '/app/shared/config.js'
import ticketingRoutes from '@/routes/ticketingRoutes.js'
import serviceCommunicator from '/app/shared/communication/serviceCommunicator.js'
import TicketingService from '@/services/ticketingService.js'
import { ServiceMonitor, requestTimer, errorTracker, checkDatabaseHealth } from '@/utils/monitoring.js'
import { validateEnvironment, getEnvironmentInfo } from '@/utils/environment.js'
import { errorHandler } from '@/middlewares/errorHandler.js'
import { apiLimiter, ticketCreationLimiter } from '@/middlewares/rateLimiter.js'

const app = express()
const PORT = process.env.TICKETING_PORT || 3007

// Initialize services
const monitor = new ServiceMonitor('ticketing-service')
const ticketingService = new TicketingService()

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Monitoring middleware
app.use(requestTimer(monitor))

// Rate limiting
app.use('/api/ticketing', apiLimiter)

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth(() => require('/app/shared/database.js').getConnection())
    const healthStatus = monitor.getHealthStatus()

    res.json({
      ...healthStatus,
      database: dbHealth
    })
  } catch (error) {
    res.status(503).json({
      service: 'ticketing',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})

// Detailed metrics endpoint (admin only)
app.get('/metrics', (req, res) => {
  // In production, add authentication check here
  res.json(monitor.getDetailedMetrics())
})

// API documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Ticketing Service API',
    version: '1.0.0',
    description: 'Customer support ticketing system for multivendor marketplace',
    endpoints: {
      tickets: '/api/ticketing/tickets/*',
      messages: '/api/ticketing/tickets/:id/messages',
      templates: '/api/ticketing/templates',
      agents: '/api/ticketing/agents/*',
      admin: '/api/ticketing/admin/*'
    },
    features: [
      'Multi-channel ticket creation',
      'Agent workload management',
      'SLA tracking and breach alerts',
      'Canned responses and templates',
      'File attachments and sharing',
      'Real-time ticket updates',
      'Comprehensive audit logging',
      'Email notifications'
    ],
    ticket_categories: [
      'account', 'payment', 'shipping', 'product', 'technical', 'refund', 'other'
    ],
    ticket_priorities: [
      'low', 'medium', 'high', 'urgent'
    ],
    ticket_statuses: [
      'open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed', 'escalated'
    ]
  })
})

// Routes
app.use('/api/ticketing', ticketingRoutes)

// Error tracking
app.use(errorTracker(monitor))

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found in ticketing service'
  })
})

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down ticketing service gracefully...`)

  try {
    // Stop accepting new connections
    app.disable('accept')

    // Close service communicator
    await serviceCommunicator.close()

    console.log('✅ Ticketing service shut down gracefully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('unhandledRejection')
})

// Start server
const startServer = async () => {
  try {
    // Validate environment
    validateEnvironment()

    console.log('🎫 Starting Ticketing Service with config:', getEnvironmentInfo())

    // Connect to database
    await connectDB()

    // Initialize service integrations
    await serviceCommunicator.initialize(process.env.RABBITMQ_URL || 'amqp://localhost')

    // Register other services
    serviceCommunicator.registerService('auth', process.env.AUTH_SERVICE_URL || 'http://localhost:3001')
    serviceCommunicator.registerService('notifications', process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3005')

    // Start SLA monitoring
    setInterval(async () => {
      try {
        await ticketingService.checkSLABreaches()
      } catch (error) {
        console.error('SLA monitoring error:', error)
      }
    }, 300000) // Check every 5 minutes

    app.listen(PORT, () => {
      console.log(`🎫 Ticketing service running on port ${PORT}`)
      console.log(`🎫 Customer support ticketing system active`)
      console.log(`⏱️ SLA monitoring enabled`)
      console.log(`📧 Email notifications configured`)
      console.log(`📊 Agent workload management ready`)
    })
  } catch (error) {
    console.error('❌ Failed to start ticketing service:', error)
    process.exit(1)
  }
}

startServer()