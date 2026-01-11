// backend/services/auth/routes/userRoutes.js
import express from 'express';
const router = express.Router();
import pligsAuthMiddleware from '@/middlewares/authMiddleware.js';
import PligsAuthController from '@/controllers/AuthController.js';

// Initialize controller (will be set in index.js)
let authController;

const setController = (sequelize, redisClient, rabbitChannel) => {
  authController = new PligsAuthController(sequelize, redisClient, rabbitChannel);
};

// Profile routes
router.get('/profile',
  pligsAuthMiddleware,
  (req, res) => res.json({ success: true, message: 'Profile endpoint' })
);

router.put('/profile',
  pligsAuthMiddleware,
  (req, res) => res.json({ success: true, message: 'Update profile endpoint' })
);

// Subscription routes
router.get('/subscription',
  pligsAuthMiddleware,
  async (req, res) => {
    try {
      const features = await authController.userModel.pligsGetSubscriptionFeatures(req.user.id);
      const user = await authController.userModel.pligsFindById(req.user.id);

      res.json({
        success: true,
        data: {
          plan: user.subscriptionPlan,
          status: user.subscriptionStatus,
          startDate: user.subscriptionStartDate,
          endDate: user.subscriptionEndDate,
          features
        }
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({ success: false, message: 'Failed to get subscription' });
    }
  }
);

router.post('/subscription/upgrade',
  pligsAuthMiddleware,
  async (req, res) => {
    try {
      const { plan, durationMonths = 1 } = req.body;

      if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const updatedUser = await authController.userModel.pligsUpgradeSubscription(
        req.user.id,
        plan,
        durationMonths
      );

      res.json({
        success: true,
        message: 'Subscription upgraded successfully',
        data: {
          plan: updatedUser.subscriptionPlan,
          endDate: updatedUser.subscriptionEndDate
        }
      });
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      res.status(500).json({ success: false, message: 'Failed to upgrade subscription' });
    }
  }
);

export { router, setController };