// backend/services/products/routes/categoriesRoutes.js
import express from 'express';
const router = express.Router();
import PligsCategoriesController from '@/controllers/CategoriesController.js';
import pligsAuthMiddleware from '@/middlewares/authMiddleware.js';

// Initialize controller (will be set in index.js)
let categoriesController;

const setController = (sequelize, redisClient, rabbitChannel) => {
  categoriesController = new PligsCategoriesController(sequelize, redisClient, rabbitChannel);

  // Routes
  router.get('/',
    categoriesController.pligsGetCategories
  );

  router.get('/tree',
    categoriesController.pligsGetCategoryTree
  );

  router.get('/:id',
    categoriesController.pligsGetCategory
  );

  router.post('/',
    pligsAuthMiddleware,
    categoriesController.pligsValidateCategoryCreation,
    categoriesController.pligsCreateCategory
  );

  router.put('/:id',
    pligsAuthMiddleware,
    categoriesController.pligsUpdateCategory
  );

  router.delete('/:id',
    pligsAuthMiddleware,
    categoriesController.pligsDeleteCategory
  );
};

export { router, setController };