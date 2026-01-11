// backend/services/auth/routes/sellerRoutes.js
import express from 'express';
const router = express.Router();
import PligsSellerController from '@/controllers/SellerController.js';
import pligsAuthMiddleware from '@/middlewares/authMiddleware.js';

// Initialize controller (will be set in index.js)
let sellerController;

const setController = (sequelize, redisClient, rabbitChannel) => {
  sellerController = new PligsSellerController(sequelize, redisClient, rabbitChannel);

  // Seller middleware - check if user is seller
  const sellerMiddleware = [pligsAuthMiddleware, (req, res, next) => {
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Seller access required'
      });
    }
    next();
  }];

  // Dashboard routes
  router.get('/dashboard/overview',
    sellerMiddleware,
    sellerController.pligsGetDashboardOverview
  );

  // Product management routes
  router.get('/products',
    sellerMiddleware,
    sellerController.pligsGetProducts
  );

  // Order management routes
  router.get('/orders',
    sellerMiddleware,
    sellerController.pligsGetOrders
  );

  router.put('/orders/:orderId/status',
    sellerMiddleware,
    sellerController.pligsUpdateOrderStatus
  );

  // Analytics routes
  router.get('/analytics',
    sellerMiddleware,
    sellerController.pligsGetAnalytics
  );

  // Customer management routes
  router.get('/customers',
    sellerMiddleware,
    sellerController.pligsGetCustomers
  );
};

export { router, setController };