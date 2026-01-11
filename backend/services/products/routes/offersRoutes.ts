// backend/services/products/routes/offersRoutes.js
import express from 'express';
const router = express.Router();
import PligsOffersController from '@/controllers/OffersController.js';
import pligsAuthMiddleware from '@/middlewares/authMiddleware.js';

// Initialize controller (will be set in index.js)
let offersController;

const setController = (sequelize, redisClient, rabbitChannel) => {
  offersController = new PligsOffersController(sequelize, redisClient, rabbitChannel);

  // Routes
  router.get('/',
    pligsAuthMiddleware,
    offersController.pligsGetOffers
  );

  router.get('/:id',
    pligsAuthMiddleware,
    offersController.pligsGetOffer
  );

  router.post('/:id/respond',
    pligsAuthMiddleware,
    offersController.pligsRespondToOffer
  );
};

export { router, setController };