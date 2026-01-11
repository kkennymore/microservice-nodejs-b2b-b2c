import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import amqp from 'amqplib';
import { connectDB } from '/app/shared/config.js';
import notificationRoutes from '@/routes/notificationRoutes.js';
import emailRoutes from '@/routes/emailRoutes.js';
import smsRoutes from '@/routes/smsRoutes.js';
import pushRoutes from '@/routes/pushRoutes.js';
import whatsappRoutes from '@/routes/whatsappRoutes.js';
import campaignRoutes from '@/routes/campaignRoutes.js';
import analyticsRoutes from '@/routes/analyticsRoutes.js';
import { errorHandler } from '@/middlewares/errorHandler.js';
import NotificationQueueService from '@/services/NotificationQueueService.js';

const app = express();
const PORT = process.env.NOTIFICATIONS_PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'notifications',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    queue_status: NotificationQueueService.getQueueStatus()
  });
});

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found in notifications service'
  });
});

// RabbitMQ connection for notification queuing
let rabbitChannel = null;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    rabbitChannel = await connection.createChannel();

    // Assert queues
    await rabbitChannel.assertQueue('email_queue', { durable: true });
    await rabbitChannel.assertQueue('sms_queue', { durable: true });
    await rabbitChannel.assertQueue('push_queue', { durable: true });
    await rabbitChannel.assertQueue('notification_queue', { durable: true });

    console.log('🐰 RabbitMQ connected for notifications');

    // Start consuming queues
    NotificationQueueService.initializeQueues(rabbitChannel);

  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Initialize notification queue service
    NotificationQueueService.initialize();

    app.listen(PORT, () => {
      console.log(`🚀 Notifications service running on port ${PORT}`);
      console.log(`📧 Email, SMS, and push notification services ready`);
      console.log(`📋 Notification queue processing active`);
    });
  } catch (error) {
    console.error('❌ Failed to start notifications service:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down notifications service...');
  if (rabbitChannel) {
    await rabbitChannel.close();
  }
  process.exit(0);
});

export default app;