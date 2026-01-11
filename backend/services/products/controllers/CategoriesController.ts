// backend/services/products/controllers/CategoriesController.js
import Joi from 'joi';
import PligsCategory from '@/models/Category.js';
import config from '/app/shared/config.js';
import events from '/app/shared/events.js';
import pligsLogger from '@/utils/logger.js';

class PligsCategoriesController {
  constructor(sequelize, redisClient, rabbitChannel) {
    this.categoryModel = new PligsCategory(sequelize);
    // Handle Redis client - use mock if not available
    this.redisClient = redisClient || {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve(null),
      setex: () => Promise.resolve(null),
      del: () => Promise.resolve(null),
      quit: () => Promise.resolve()
    };
    this.rabbitChannel = rabbitChannel;
  }

  pligsValidateCategoryCreation = (req, res, next) => {
    const schema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().optional(),
      parentId: Joi.string().uuid().optional(),
      sortOrder: Joi.number().integer().min(0).default(0),
      seoTitle: Joi.string().optional(),
      seoDescription: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    next();
  };

  pligsGetCategories = async (req, res) => {
    try {
      const cacheKey = 'categories:all';
      let categories = await this.redisClient.get(cacheKey);

      if (!categories) {
        categories = await this.categoryModel.pligsFindAllActive();
        await this.redisClient.setex(cacheKey, 3600, JSON.stringify(categories)); // Cache for 1 hour
      } else {
        categories = JSON.parse(categories);
      }

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      pligsLogger.error('Get categories error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
  };

  pligsGetCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `category:${id}`;

      let category = await this.redisClient.get(cacheKey);
      if (!category) {
        category = await this.categoryModel.pligsFindById(id);
        if (category) {
          await this.redisClient.setex(cacheKey, 3600, JSON.stringify(category));
        }
      } else {
        category = JSON.parse(category);
      }

      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json({
        success: true,
        data: category
      });

    } catch (error) {
      pligsLogger.error('Get category error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch category' });
    }
  };

  pligsGetCategoryTree = async (req, res) => {
    try {
      const cacheKey = 'categories:tree';
      let tree = await this.redisClient.get(cacheKey);

      if (!tree) {
        tree = await this.categoryModel.pligsGetCategoryTree();
        await this.redisClient.setex(cacheKey, 3600, JSON.stringify(tree));
      } else {
        tree = JSON.parse(tree);
      }

      res.json({
        success: true,
        data: tree
      });

    } catch (error) {
      pligsLogger.error('Get category tree error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch category tree' });
    }
  };

  pligsCreateCategory = async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const category = await this.categoryModel.pligsCreateCategory(req.body);

      // Cache invalidation
      await this.redisClient.del('categories:all');
      await this.redisClient.del('categories:tree');

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });

    } catch (error) {
      pligsLogger.error('Create category error:', error);
      res.status(500).json({ success: false, message: 'Failed to create category' });
    }
  };

  pligsUpdateCategory = async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const { id } = req.params;
      const category = await this.categoryModel.pligsUpdateCategory(id, req.body);

      // Cache invalidation
      await this.redisClient.del('categories:all');
      await this.redisClient.del('categories:tree');
      await this.redisClient.del(`category:${id}`);

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });

    } catch (error) {
      pligsLogger.error('Update category error:', error);
      res.status(500).json({ success: false, message: 'Failed to update category' });
    }
  };

  pligsDeleteCategory = async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const { id } = req.params;
      await this.categoryModel.pligsDeleteCategory(id);

      // Cache invalidation
      await this.redisClient.del('categories:all');
      await this.redisClient.del('categories:tree');
      await this.redisClient.del(`category:${id}`);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });

    } catch (error) {
      pligsLogger.error('Delete category error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
  };
}

export default PligsCategoriesController;