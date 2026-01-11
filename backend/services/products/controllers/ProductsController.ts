// backend/services/products/controllers/ProductsController.js
import Joi from 'joi';
import { Op } from 'sequelize';
import multer from 'multer';
import fs from 'fs/promises';

import config from '@/shared/config';
import events from '@/shared/events';
import PligsProduct from '@/models/Product';
import PligsCategory from '@/models/Category';
import pligsFileService from '@/services/fileService';
import WatermarkService from '@/utils/watermarkService';
import pligsLogger from '@/utils/logger';

const upload = multer({ dest: 'uploads/' });
const watermarkService = new WatermarkService();

class PligsProductsController {
  constructor(sequelize, redisClient, rabbitChannel) {
    this.productModel = new PligsProduct(sequelize);
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

  pligsValidateProductCreation = (req, res, next) => {
    const schema = Joi.object({
      name: Joi.string().min(2).max(255).required(),
      description: Joi.string().min(10).required(),
      price: Joi.number().positive().required(),
      wholesalePrice: Joi.number().positive().optional(),
      categoryId: Joi.string().uuid().required(),
      subcategoryId: Joi.string().uuid().optional(),
      brand: Joi.string().optional(),
      stock: Joi.number().integer().min(0).default(0),
      minOrderQuantity: Joi.number().integer().min(1).default(1),
      weight: Joi.number().positive().optional(),
      dimensions: Joi.object({
        length: Joi.number().positive(),
        width: Joi.number().positive(),
        height: Joi.number().positive()
      }).optional(),
      specifications: Joi.object().optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      colors: Joi.array().items(Joi.string()).optional(),
      sizes: Joi.array().items(Joi.string()).optional(),
      type: Joi.string().valid('tangible', 'intangible', 'service').default('tangible'),
      discountType: Joi.string().valid('percentage', 'fixed').optional(),
      discountValue: Joi.number().positive().when('discountType', {
        is: Joi.exist(),
        then: Joi.required()
      }).optional(),
      discountValidUntil: Joi.date().when('discountType', {
        is: Joi.exist(),
        then: Joi.required()
      }).optional(),
      shippingInfo: Joi.object().optional(),
      warranty: Joi.string().optional(),
      returnPolicy: Joi.string().optional(),
      seoTitle: Joi.string().optional(),
      seoDescription: Joi.string().optional(),
      metaKeywords: Joi.array().items(Joi.string()).optional()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    next();
  };

  pligsCreateProduct = async (req, res) => {
    try {
      const sellerId = req.user.id;
      const productData = {
        ...req.body,
        sellerId,
        images: req.files ? req.files.map(file => file.filename) : []
      };

      const product = await this.productModel.pligsCreateProduct(productData);

      // Cache invalidation
      await this.redisClient.del(`products:seller:${sellerId}`);

      // Publish event
      await this.pligsPublishEvent(events.PRODUCT_CREATED, { productId: product.id, sellerId });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });

    } catch (error) {
      pligsLogger.error('Create product error:', error);
      res.status(500).json({ success: false, message: 'Failed to create product' });
    }
  };

  pligsGetProducts = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        minPrice,
        maxPrice,
        type,
        seller,
        approved = true,
        active = true
      } = req.query;

      const cacheKey = `products:${JSON.stringify(req.query)}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      let products;
      if (seller && req.user.role === 'admin') {
        // Admin viewing seller's products
        products = await this.productModel.pligsFindBySeller(seller, { page, limit, isApproved: approved === 'true', isActive: active === 'true' });
      } else if (req.user.role === 'seller') {
        // Seller viewing own products
        products = await this.productModel.pligsFindBySeller(req.user.id, { page, limit });
      } else {
        // Buyer viewing approved products
        products = await this.productModel.pligsFindApproved({
          page,
          limit,
          categoryId: category,
          search,
          minPrice,
          maxPrice,
          type
        });
      }

      await this.redisClient.setex(cacheKey, 300, JSON.stringify(products)); // Cache for 5 minutes

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      pligsLogger.error('Get products error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
  };

  pligsGetProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `product:${id}`;

      let product = await this.redisClient.get(cacheKey);
      if (product) {
        product = JSON.parse(product);
      } else {
        product = await this.productModel.pligsFindById(id);
        if (product) {
          await this.redisClient.setex(cacheKey, 600, JSON.stringify(product)); // Cache for 10 minutes
        }
      }

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Check permissions
      if (req.user.role !== 'admin' && product.sellerId !== req.user.id && !product.isApproved) {
        return res.status(403).json({ success: false, message: 'Product not approved' });
      }

      // Increment view count for buyers
      if (req.user.role === 'buyer') {
        await this.productModel.pligsIncrementViewCount(id);
        await this.pligsPublishEvent(events.PRODUCT_VIEWED, { productId: id, userId: req.user.id });
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      pligsLogger.error('Get product error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch product' });
    }
  };

  pligsUpdateProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const product = await this.productModel.pligsFindById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Check ownership
      if (req.user.role !== 'admin' && product.sellerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const updatedProduct = await this.productModel.pligsUpdateProduct(id, updateData);

      // Cache invalidation
      await this.redisClient.del(`product:${id}`);
      await this.redisClient.del(`products:seller:${product.sellerId}`);

      // Publish event
      await this.pligsPublishEvent(events.PRODUCT_UPDATED, { productId: id, sellerId: product.sellerId });

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: updatedProduct
      });

    } catch (error) {
      pligsLogger.error('Update product error:', error);
      res.status(500).json({ success: false, message: 'Failed to update product' });
    }
  };

  pligsDeleteProduct = async (req, res) => {
    try {
      const { id } = req.params;

      const product = await this.productModel.pligsFindById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Check ownership
      if (req.user.role !== 'admin' && product.sellerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      await this.productModel.pligsDeleteProduct(id);

      // Cache invalidation
      await this.redisClient.del(`product:${id}`);
      await this.redisClient.del(`products:seller:${product.sellerId}`);

      // Publish event
      await this.pligsPublishEvent(events.PRODUCT_DELETED, { productId: id, sellerId: product.sellerId });

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      pligsLogger.error('Delete product error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
  };

  pligsApproveProduct = async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      const product = await this.productModel.pligsApproveProduct(id);

      // Cache invalidation
      await this.redisClient.del(`product:${id}`);

      // Publish event
      await this.pligsPublishEvent(events.PRODUCT_APPROVED, { productId: id, sellerId: product.sellerId });

      res.json({
        success: true,
        message: 'Product approved successfully',
        data: product
      });

    } catch (error) {
      pligsLogger.error('Approve product error:', error);
      res.status(500).json({ success: false, message: 'Failed to approve product' });
    }
  };

  pligsMakeOffer = async (req, res) => {
    try {
      const { id } = req.params;
      const { offerPrice, message } = req.body;

      const product = await this.productModel.pligsFindById(id);
      if (!product || !product.isApproved) {
        return res.status(404).json({ success: false, message: 'Product not found or not approved' });
      }

      const offer = {
        productId: id,
        buyerId: req.user.id,
        sellerId: product.sellerId,
        offerPrice,
        message,
        status: 'pending'
      };

      // Store offer in cache (in production, use database)
      const offerId = `offer_${Date.now()}`;
      await this.redisClient.setex(`offer:${offerId}`, 86400, JSON.stringify(offer));

      // Publish event
      await this.pligsPublishEvent(events.PRODUCT_OFFER_MADE, { offerId, productId: id, buyerId: req.user.id, sellerId: product.sellerId });

      res.json({
        success: true,
        message: 'Offer submitted successfully',
        data: { offerId }
      });

    } catch (error) {
      pligsLogger.error('Make offer error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit offer' });
    }
  };

  pligsGetFeaturedProducts = async (req, res) => {
    try {
      const cacheKey = 'products:featured';
      let products = await this.redisClient.get(cacheKey);

      if (!products) {
        products = await this.productModel.pligsGetFeaturedProducts();
        await this.redisClient.setex(cacheKey, 3600, JSON.stringify(products)); // Cache for 1 hour
      } else {
        products = JSON.parse(products);
      }

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      pligsLogger.error('Get featured products error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch featured products' });
    }
  };

  pligsGetSaleProducts = async (req, res) => {
    try {
      const cacheKey = 'products:sale';
      let products = await this.redisClient.get(cacheKey);

      if (!products) {
        products = await this.productModel.pligsGetOnSaleProducts();
        await this.redisClient.setex(cacheKey, 1800, JSON.stringify(products)); // Cache for 30 minutes
      } else {
        products = JSON.parse(products);
      }

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      pligsLogger.error('Get sale products error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch sale products' });
    }
  };

  pligsUploadImages = [
    upload.array('images', 7), // Max 7 images as per requirement
    async (req, res) => {
      try {
        const files = req.files;
        const uploadedUrls = [];
        const watermarkResults = [];

        // Get seller information for watermarking
        const sellerId = req.user?.id || req.body.sellerId;
        let watermarkSettings = null;

        if (sellerId) {
          try {
            // Fetch watermark settings from auth service
            const authResponse = await fetch(`${config.authServiceUrl}/api/auth/business/${sellerId}`, {
              headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json'
              }
            });

            if (authResponse.ok) {
              const businessData = await authResponse.json();
              if (businessData.success && businessData.data) {
                watermarkSettings = {
                  enabled: businessData.data.enableWatermark !== false,
                  text: businessData.data.watermarkText || businessData.data.businessName || 'Pligs Marketplace',
                  opacity: businessData.data.watermarkOpacity || 0.3,
                  position: businessData.data.watermarkPosition || 'bottom-right',
                  fontSize: businessData.data.watermarkFontSize || 24,
                  color: businessData.data.watermarkColor || '#FFFFFF',
                  backgroundColor: businessData.data.watermarkBackgroundColor || '#000000',
                  backgroundOpacity: businessData.data.watermarkBackgroundOpacity || 0.5
                };
              }
            }
          } catch (error) {
            pligsLogger.warn('Could not fetch watermark settings:', error);
            // Use default settings
            watermarkSettings = {
              enabled: true,
              text: 'Pligs Marketplace',
              opacity: 0.3,
              position: 'bottom-right',
              fontSize: 24,
              color: '#FFFFFF',
              backgroundColor: '#000000',
              backgroundOpacity: 0.5
            };
          }
        }

        for (const file of files) {
          try {
            let finalPath = file.path;
            let watermarkResult = null;

            // Apply watermark if enabled and seller info available
            if (watermarkSettings && watermarkSettings.enabled) {
              const watermarkedPath = file.path.replace(/\.[^/.]+$/, '_watermarked$&');

              try {
                watermarkResult = await watermarkService.processImageWithWatermark(
                  file.path,
                  watermarkedPath,
                  sellerId
                );

                // Use watermarked image
                finalPath = watermarkedPath;

                // Clean up original file
                await fs.unlink(file.path).catch(() => {});

              } catch (watermarkError) {
                pligsLogger.error('Watermark processing failed, using original image:', watermarkError);
                // Continue with original image if watermarking fails
              }
            }

            // Upload the final image (watermarked or original)
            const tempFile = {
              ...file,
              path: finalPath,
              filename: finalPath.split('/').pop()
            };

            const url = await pligsFileService.pligsUploadFile(tempFile);
            uploadedUrls.push(url);

            if (watermarkResult) {
              watermarkResults.push({
                filename: file.originalname,
                watermarked: true,
                watermarkText: watermarkSettings.text,
                position: watermarkSettings.position
              });
            } else {
              watermarkResults.push({
                filename: file.originalname,
                watermarked: false,
                reason: watermarkSettings ? 'watermark disabled' : 'no seller info'
              });
            }

            // Clean up watermarked file if it was created
            if (finalPath !== file.path) {
              await fs.unlink(finalPath).catch(() => {});
            }

          } catch (fileError) {
            pligsLogger.error(`Failed to process file ${file.originalname}:`, fileError);
            watermarkResults.push({
              filename: file.originalname,
              watermarked: false,
              error: fileError.message
            });
          }
        }

        res.json({
          success: true,
          data: {
            urls: uploadedUrls,
            watermarkResults: watermarkResults,
            message: `${uploadedUrls.length} images uploaded successfully`
          }
        });

      } catch (error) {
        pligsLogger.error('Upload images error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload images' });
      }
    }
  ];

  pligsToggleLike = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const product = await this.productModel.pligsFindById(id);
      if (!product || !product.isApproved) {
        return res.status(404).json({ success: false, message: 'Product not found or not approved' });
      }

      // In a real implementation, you'd check if user already liked it
      // For now, just increment
      const liked = await this.productModel.pligsToggleLike(id, userId);

      if (liked) {
        await this.pligsPublishEvent(events.PRODUCT_LIKED, { productId: id, userId });
      }

      res.json({
        success: true,
        message: liked ? 'Product liked' : 'Failed to like product'
      });

    } catch (error) {
      pligsLogger.error('Toggle like error:', error);
      res.status(500).json({ success: false, message: 'Failed to toggle like' });
    }
  };

  pligsCheckContactPermission = async (req, res) => {
    try {
      const { id } = req.params;
      const userSubscription = req.user.subscription || 'free';

      const hasPermission = await this.productModel.pligsCheckContactPermission(id, userSubscription);

      res.json({
        success: true,
        data: { hasPermission }
      });

    } catch (error) {
      pligsLogger.error('Check contact permission error:', error);
      res.status(500).json({ success: false, message: 'Failed to check contact permission' });
    }
  };

  pligsGetDiscountedPrice = async (req, res) => {
    try {
      const { id } = req.params;

      const discountedPrice = await this.productModel.pligsGetDiscountedPrice(id);

      res.json({
        success: true,
        data: { discountedPrice }
      });

    } catch (error) {
      pligsLogger.error('Get discounted price error:', error);
      res.status(500).json({ success: false, message: 'Failed to get discounted price' });
    }
  };

  pligsCanUploadVideos = async (req, res) => {
    try {
      const { id } = req.params;
      const userSubscription = req.user.subscription || 'free';

      const canUpload = await this.productModel.pligsCanUploadVideos(id, userSubscription);

      res.json({
        success: true,
        data: { canUpload }
      });

    } catch (error) {
      pligsLogger.error('Check video upload permission error:', error);
      res.status(500).json({ success: false, message: 'Failed to check video upload permission' });
    }
  };

  pligsUploadVideos = [
    upload.array('videos', 2), // Max 2 videos as per requirement
    async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if user can upload videos for this product
        const canUpload = await this.productModel.pligsCanUploadVideos(id, req.user.subscription || 'free');
        if (!canUpload) {
          return res.status(403).json({
            success: false,
            message: 'Video upload not allowed for your subscription plan'
          });
        }

        const files = req.files;
        if (!files || files.length === 0) {
          return res.status(400).json({ success: false, message: 'No video files provided' });
        }

        const uploadedUrls = [];

        for (const file of files) {
          try {
            const url = await pligsFileService.pligsUploadFile(file);
            uploadedUrls.push(url);

            // Clean up uploaded file
            await fs.unlink(file.path).catch(() => {});
          } catch (fileError) {
            pligsLogger.error(`Failed to upload video ${file.originalname}:`, fileError);
          }
        }

        // Update product with new video URLs
        const product = await this.productModel.pligsFindById(id);
        const existingVideos = product.videos || [];
        const updatedVideos = [...existingVideos, ...uploadedUrls];

        await this.productModel.pligsUpdateProduct(id, { videos: updatedVideos });

        // Cache invalidation
        await this.redisClient.del(`product:${id}`);

        // Publish event
        await this.pligsPublishEvent(events.PRODUCT_VIDEOS_UPDATED, {
          productId: id,
          sellerId: product.sellerId,
          videoCount: uploadedUrls.length
        });

        res.json({
          success: true,
          message: `${uploadedUrls.length} videos uploaded successfully`,
          data: { urls: uploadedUrls }
        });

      } catch (error) {
        pligsLogger.error('Upload videos error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload videos' });
      }
    }
  ];

  async pligsPublishEvent(eventType, data) {
    try {
      await this.rabbitChannel.publish(config.rabbitmq.exchange, eventType, Buffer.from(JSON.stringify(data)));
    } catch (error) {
      pligsLogger.error('Failed to publish event:', error);
    }
  }
}

export default PligsProductsController;