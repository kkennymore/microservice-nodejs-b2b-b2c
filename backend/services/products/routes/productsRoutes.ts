// backend/services/products/routes/productsRoutes.js
import express from 'express';
const router = express.Router();
import PligsProductsController from '@/controllers/ProductsController.js';
import pligsAuthMiddleware from '@/middlewares/authMiddleware.js';

// Initialize controller (will be set in index.js)
let productsController;

const setController = (sequelize, redisClient, rabbitChannel) => {
  productsController = new PligsProductsController(sequelize, redisClient, rabbitChannel);

  // Routes
  router.post('/',
    pligsAuthMiddleware,
    productsController.pligsValidateProductCreation,
    productsController.pligsCreateProduct
  );

  router.get('/',
    pligsAuthMiddleware,
    productsController.pligsGetProducts
  );

  router.get('/featured',
    productsController.pligsGetFeaturedProducts
  );

  router.get('/sale',
    productsController.pligsGetSaleProducts
  );

  router.get('/:id',
    pligsAuthMiddleware,
    productsController.pligsGetProduct
  );

  router.put('/:id',
    pligsAuthMiddleware,
    productsController.pligsUpdateProduct
  );

  router.delete('/:id',
    pligsAuthMiddleware,
    productsController.pligsDeleteProduct
  );

  router.put('/:id/approve',
    pligsAuthMiddleware,
    productsController.pligsApproveProduct
  );

  router.post('/:id/offer',
    pligsAuthMiddleware,
    productsController.pligsMakeOffer
  );

  router.post('/upload/images',
    pligsAuthMiddleware,
    productsController.pligsUploadImages
  );

  router.post('/:id/like',
    pligsAuthMiddleware,
    productsController.pligsToggleLike
  );

  router.get('/:id/contact-permission',
    pligsAuthMiddleware,
    productsController.pligsCheckContactPermission
  );

  router.get('/:id/discounted-price',
    productsController.pligsGetDiscountedPrice
  );

  router.get('/:id/can-upload-videos',
    pligsAuthMiddleware,
    productsController.pligsCanUploadVideos
  );

  router.post('/:id/upload/videos',
    pligsAuthMiddleware,
    productsController.pligsUploadVideos
  );
};

export { router, setController };