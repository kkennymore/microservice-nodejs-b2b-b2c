import express from 'express';
import escrowController from '@/controllers/EscrowController.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create escrow for transaction
router.post('/', escrowController.createEscrow);

// Get escrow details
router.get('/:id', escrowController.getEscrow);

// Get user's escrows
router.get('/', escrowController.getUserEscrows);

// Release escrow (buyer action)
router.post('/:id/release', escrowController.releaseEscrow);

// Create dispute
router.post('/:id/dispute', escrowController.createDispute);

// Resolve dispute (admin only)
router.post('/:id/resolve', escrowController.resolveDispute);

// Auto-release expired escrows (admin only)
router.post('/admin/auto-release', escrowController.autoReleaseExpired);

export default router;