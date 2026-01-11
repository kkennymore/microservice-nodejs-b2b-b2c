import express from 'express';
import transactionController from '@/controllers/TransactionController.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create transaction
router.post('/', transactionController.createTransaction);

// Get transaction by ID
router.get('/:id', transactionController.getTransaction);

// Get user's transactions
router.get('/', transactionController.getUserTransactions);

// Process payment
router.post('/payment', transactionController.processPayment);

// Confirm PayPal payment
router.post('/paypal/confirm', transactionController.confirmPayPalPayment);

// Process refund
router.post('/refund', transactionController.processRefund);

// Update transaction status (admin only)
router.patch('/:id/status', transactionController.updateTransactionStatus);

// Get transaction statistics (admin only)
router.get('/admin/stats', transactionController.getTransactionStats);

export default router;