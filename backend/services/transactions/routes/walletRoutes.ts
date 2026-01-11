import express from 'express';
import walletController from '@/controllers/WalletController.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user's wallet
router.get('/', walletController.getWallet);

// Credit wallet
router.post('/credit', walletController.creditWallet);

// Debit wallet
router.post('/debit', walletController.debitWallet);

// Get wallet transaction history
router.get('/transactions', walletController.getWalletTransactions);

// Transfer money between users (future feature)
router.post('/transfer', walletController.transferMoney);

export default router;