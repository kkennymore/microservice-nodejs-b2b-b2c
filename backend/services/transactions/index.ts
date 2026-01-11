import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from '/app/shared/database.js';
import transactionRoutes from '@/routes/transactionRoutes.js';
import walletRoutes from '@/routes/walletRoutes.js';
import subscriptionRoutes from '@/routes/subscriptionRoutes.js';
import escrowRoutes from '@/routes/escrowRoutes.js';
import { errorHandler } from '@/middlewares/errorHandler.js';

const app = express();
const PORT = process.env.TRANSACTIONS_PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'transactions',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/escrow', escrowRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found in transactions service'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Transactions service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start transactions service:', error);
    process.exit(1);
  }
};

startServer();

export default app;