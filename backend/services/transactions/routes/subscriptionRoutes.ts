import express from 'express';
import subscriptionController from '@/controllers/SubscriptionController.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all available plans
router.get('/plans', subscriptionController.getPlans);

// Get current user's subscription
router.get('/current', subscriptionController.getCurrentSubscription);

// Subscribe to a plan
router.post('/subscribe', subscriptionController.subscribe);

// Cancel subscription
router.post('/cancel', subscriptionController.cancelSubscription);

// Renew subscription
router.post('/renew', subscriptionController.renewSubscription);

// Update subscription (admin only)
router.patch('/:id', subscriptionController.updateSubscription);

// Get all subscriptions (admin only)
router.get('/admin/all', subscriptionController.getAllSubscriptions);

export default router;