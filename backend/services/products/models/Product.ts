// backend/services/products/models/Product.js
import { DataTypes } from 'sequelize';

class PligsProduct {
  constructor(sequelize) {
    this.model = sequelize.define('Product', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      sellerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      wholesalePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      subcategoryId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: true
      },
      images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      videos: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      minOrderQuantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      dimensions: {
        type: DataTypes.JSON,
        allowNull: true
      },
      specifications: {
        type: DataTypes.JSON,
        allowNull: true
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      colors: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      sizes: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      type: {
        type: DataTypes.ENUM('tangible', 'intangible', 'service'),
        defaultValue: 'tangible'
      },
      isApproved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isOnSale: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      salePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      saleStartDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      saleEndDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0.00
      },
      reviewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      likes: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      contactEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      discountType: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        allowNull: true
      },
      discountValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      discountValidUntil: {
        type: DataTypes.DATE,
        allowNull: true
      },
      maxVideos: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      shippingInfo: {
        type: DataTypes.JSON,
        allowNull: true
      },
      warranty: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      returnPolicy: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      seoTitle: {
        type: DataTypes.STRING,
        allowNull: true
      },
      seoDescription: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metaKeywords: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'products',
      indexes: [
        { fields: ['sellerId'] },
        { fields: ['categoryId'] },
        { fields: ['isApproved'] },
        { fields: ['isActive'] },
        { fields: ['isFeatured'] },
        { fields: ['type'] },
        { fields: ['name'] },
        { fields: ['price'] },
        { fields: ['rating'] },
        { fields: ['likes'] },
        { fields: ['discountType', 'discountValidUntil'] }
      ]
    });
  }

  pligsGetModel() {
    return this.model;
  }

  // Business logic methods
  async pligsFindById(id) {
    return await this.model.findByPk(id);
  }

  async pligsFindBySeller(sellerId, options = {}) {
    const { page = 1, limit = 20, isApproved, isActive } = options;
    const offset = (page - 1) * limit;

    const where = { sellerId };
    if (isApproved !== undefined) where.isApproved = isApproved;
    if (isActive !== undefined) where.isActive = isActive;

    return await this.model.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  async pligsFindApproved(options = {}) {
    const { page = 1, limit = 20, categoryId, search, minPrice, maxPrice, type } = options;
    const offset = (page - 1) * limit;

    const where = { isApproved: true, isActive: true };

    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { tags: { [Op.contains]: [search] } }
      ];
    }

    return await this.model.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  async pligsCreateProduct(productData) {
    return await this.model.create(productData);
  }

  async pligsUpdateProduct(id, updateData) {
    const product = await this.model.findByPk(id);
    if (!product) throw new Error('Product not found');
    return await product.update(updateData);
  }

  async pligsDeleteProduct(id) {
    const product = await this.model.findByPk(id);
    if (!product) throw new Error('Product not found');
    return await product.destroy();
  }

  async pligsApproveProduct(id) {
    return await this.pligsUpdateProduct(id, { isApproved: true });
  }

  async pligsRejectProduct(id, reason) {
    return await this.pligsUpdateProduct(id, { isApproved: false, rejectionReason: reason });
  }

  async pligsIncrementViewCount(id) {
    const product = await this.model.findByPk(id);
    if (product) {
      await product.increment('viewCount', { by: 1 });
    }
  }

  async pligsUpdateRating(id, newRating, newReviewCount) {
    const product = await this.model.findByPk(id);
    if (product) {
      const currentTotal = product.rating * product.reviewCount;
      const newTotal = currentTotal + newRating;
      const updatedRating = newTotal / newReviewCount;

      await product.update({
        rating: updatedRating,
        reviewCount: newReviewCount
      });
    }
  }

  async pligsToggleLike(id, userId) {
    // This would typically use a separate likes table
    // For now, just increment/decrement
    const product = await this.model.findByPk(id);
    if (product) {
      await product.increment('likes', { by: 1 });
      return true;
    }
    return false;
  }

  async pligsCheckContactPermission(id, userSubscription) {
    const product = await this.model.findByPk(id);
    if (!product) return false;

    // Free users can't contact sellers for premium products
    if (userSubscription === 'free' && !product.contactEnabled) {
      return false;
    }

    return true;
  }

  async pligsGetDiscountedPrice(id) {
    const product = await this.model.findByPk(id);
    if (!product) return null;

    const now = new Date();
    if (product.discountType && product.discountValidUntil && product.discountValidUntil > now) {
      if (product.discountType === 'percentage') {
        return product.price * (1 - product.discountValue / 100);
      } else if (product.discountType === 'fixed') {
        return Math.max(0, product.price - product.discountValue);
      }
    }

    return product.price;
  }

  async pligsCanUploadVideos(id, userSubscription) {
    const product = await this.model.findByPk(id);
    if (!product) return false;

    const subscriptionLimits = {
      free: 0,
      silver: 2,
      gold: 5,
      platinum: -1 // unlimited
    };

    const limit = subscriptionLimits[userSubscription] || 0;
    if (limit === -1) return true; // unlimited

    const currentVideos = product.videos ? product.videos.length : 0;
    return currentVideos < limit;
  }

  async pligsGetFeaturedProducts(limit = 10) {
    return await this.model.findAll({
      where: { isApproved: true, isActive: true, isFeatured: true },
      limit,
      order: [['createdAt', 'DESC']]
    });
  }

  async pligsGetOnSaleProducts(limit = 10) {
    return await this.model.findAll({
      where: {
        isApproved: true,
        isActive: true,
        isOnSale: true,
        saleEndDate: { [Op.gt]: new Date() }
      },
      limit,
      order: [['saleEndDate', 'ASC']]
    });
  }
}

export default PligsProduct;