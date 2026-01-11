const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const amqp = require('amqplib');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const Joi = require('joi');
const cron = require('node-cron');
const moment = require('moment');

// Environment variables
const PORT = process.env.PORT || 3009;
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'marketplace_promotions',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'promotions-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Database connection
let db;
let redisClient;
let rabbitChannel;

// Initialize connections
async function initializeConnections() {
  try {
    // MySQL connection
    db = await mysql.createPool(MYSQL_CONFIG);
    logger.info('Connected to MySQL database');

    // Redis connection
    redisClient = redis.createClient({ url: REDIS_URL });
    await redisClient.connect();
    logger.info('Connected to Redis');

    // RabbitMQ connection
    const connection = await amqp.connect(RABBITMQ_URL);
    rabbitChannel = await connection.createChannel();
    await rabbitChannel.assertQueue('promotion_events', { durable: true });
    await rabbitChannel.assertQueue('order_events', { durable: true });
    logger.info('Connected to RabbitMQ');

  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    process.exit(1);
  }
}

// Validation schemas
const createCouponSchema = Joi.object({
  code: Joi.string().min(3).max(50).required(),
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  type: Joi.string().valid('percentage', 'fixed', 'free_shipping').required(),
  value: Joi.number().min(0).when('type', {
    is: 'free_shipping',
    then: Joi.forbidden(),
    otherwise: Joi.required()
  }),
  minOrderAmount: Joi.number().min(0).optional(),
  maxDiscountAmount: Joi.number().min(0).optional(),
  usageLimit: Joi.number().integer().min(1).optional(),
  perUserLimit: Joi.number().integer().min(1).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().when('startDate', {
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('startDate'))
  }).optional(),
  applicableProducts: Joi.array().items(Joi.string().uuid()).optional(),
  applicableCategories: Joi.array().items(Joi.string().uuid()).optional(),
  applicableSellers: Joi.array().items(Joi.string().uuid()).optional(),
  excludedProducts: Joi.array().items(Joi.string().uuid()).optional(),
  firstTimeCustomersOnly: Joi.boolean().optional()
});

const applyCouponSchema = Joi.object({
  couponCode: Joi.string().required(),
  orderAmount: Joi.number().min(0).required(),
  userId: Joi.string().uuid().required(),
  items: Joi.array().items(Joi.object({
    productId: Joi.string().uuid().required(),
    quantity: Joi.number().integer().min(1).required(),
    price: Joi.number().min(0).required()
  })).required()
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token with auth service (simplified)
    const response = await fetch(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userData = await response.json();
    req.user = userData.data;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Seller middleware
const requireSeller = (req, res, next) => {
  if (!['admin', 'seller'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Seller access required' });
  }
  next();
};

// Routes

// Get available coupons for user
app.get('/api/coupons', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get active coupons that user hasn't used up
    const [coupons] = await db.execute(`
      SELECT
        c.id, c.code, c.name, c.description, c.type, c.value,
        c.min_order_amount, c.usage_limit, c.usage_count,
        c.per_user_limit, c.start_date, c.end_date
      FROM coupons c
      LEFT JOIN (
        SELECT coupon_id, COUNT(*) as user_usage
        FROM coupon_usage
        WHERE user_id = ?
        GROUP BY coupon_id
      ) cu ON c.id = cu.coupon_id
      WHERE c.is_active = true
        AND (c.start_date IS NULL OR c.start_date <= NOW())
        AND (c.end_date IS NULL OR c.end_date >= NOW())
        AND (c.usage_limit IS NULL OR c.usage_count < c.usage_limit)
        AND (cu.user_usage IS NULL OR cu.user_usage < c.per_user_limit)
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), offset]);

    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total FROM coupons c
      LEFT JOIN (
        SELECT coupon_id, COUNT(*) as user_usage
        FROM coupon_usage
        WHERE user_id = ?
        GROUP BY coupon_id
      ) cu ON c.id = cu.coupon_id
      WHERE c.is_active = true
        AND (c.start_date IS NULL OR c.start_date <= NOW())
        AND (c.end_date IS NULL OR c.end_date >= NOW())
        AND (c.usage_limit IS NULL OR c.usage_count < c.usage_limit)
        AND (cu.user_usage IS NULL OR cu.user_usage < c.per_user_limit)
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        coupons,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Validate and apply coupon
app.post('/api/coupons/validate', authenticate, async (req, res) => {
  try {
    const { error } = applyCouponSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { couponCode, orderAmount, userId, items } = req.body;

    // Get coupon details
    const [coupons] = await db.execute(`
      SELECT * FROM coupons
      WHERE code = ? AND is_active = true
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
    `, [couponCode]);

    if (coupons.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired coupon' });
    }

    const coupon = coupons[0];

    // Check usage limits
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return res.status(400).json({ error: 'Coupon usage limit exceeded' });
    }

    // Check user's usage
    const [userUsage] = await db.execute(
      'SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ? AND user_id = ?',
      [coupon.id, userId]
    );

    if (userUsage[0].count >= coupon.per_user_limit) {
      return res.status(400).json({ error: 'You have already used this coupon the maximum allowed times' });
    }

    // Check minimum order amount
    if (coupon.min_order_amount && orderAmount < coupon.min_order_amount) {
      return res.status(400).json({
        error: `Minimum order amount of $${coupon.min_order_amount} required`
      });
    }

    // Check applicable products/categories/sellers
    const applicableProducts = coupon.applicable_products ? JSON.parse(coupon.applicable_products) : [];
    const applicableCategories = coupon.applicable_categories ? JSON.parse(coupon.applicable_categories) : [];
    const applicableSellers = coupon.applicable_sellers ? JSON.parse(coupon.applicable_sellers) : [];
    const excludedProducts = coupon.excluded_products ? JSON.parse(coupon.excluded_products) : [];

    let discountAmount = 0;

    if (coupon.type === 'percentage') {
      // Calculate discount based on applicable items
      let applicableAmount = 0;

      for (const item of items) {
        // Check if product is excluded
        if (excludedProducts.includes(item.productId)) continue;

        // Check if product is in applicable list (if list exists)
        if (applicableProducts.length > 0 && !applicableProducts.includes(item.productId)) continue;

        // TODO: Check categories and sellers when we have that data
        applicableAmount += item.price * item.quantity;
      }

      discountAmount = Math.min(
        (applicableAmount * coupon.value) / 100,
        coupon.max_discount_amount || Infinity
      );

    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(coupon.value, coupon.max_discount_amount || coupon.value);
    } else if (coupon.type === 'free_shipping') {
      discountAmount = 0; // Will be handled differently
    }

    res.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          type: coupon.type,
          discountAmount: Math.round(discountAmount * 100) / 100,
          freeShipping: coupon.type === 'free_shipping'
        }
      }
    });

  } catch (error) {
    logger.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// Get active flash sales
app.get('/api/flash-sales', async (req, res) => {
  try {
    const [sales] = await db.execute(`
      SELECT
        fs.id, fs.name, fs.description, fs.discount_percentage,
        fs.start_time, fs.end_time, fs.max_quantity_per_user,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'productId', fsp.product_id,
            'originalPrice', fsp.original_price,
            'salePrice', fsp.sale_price,
            'soldQuantity', fsp.sold_quantity,
            'maxQuantity', fsp.max_quantity
          )
        ) as products
      FROM flash_sales fs
      LEFT JOIN flash_sale_products fsp ON fs.id = fsp.flash_sale_id
      WHERE fs.is_active = true
        AND fs.start_time <= NOW()
        AND fs.end_time >= NOW()
        AND (fs.total_quantity_limit IS NULL OR fs.sold_quantity < fs.total_quantity_limit)
      GROUP BY fs.id
      HAVING COUNT(fsp.product_id) > 0
    `);

    // Parse the products JSON
    const formattedSales = sales.map(sale => ({
      ...sale,
      products: JSON.parse(sale.products).filter(p => p.productId)
    }));

    res.json({
      success: true,
      data: { flashSales: formattedSales }
    });

  } catch (error) {
    logger.error('Error fetching flash sales:', error);
    res.status(500).json({ error: 'Failed to fetch flash sales' });
  }
});

// Get promotional banners
app.get('/api/banners', async (req, res) => {
  try {
    const { position } = req.query;

    let whereClause = 'is_active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())';
    const params = [];

    if (position) {
      whereClause += ' AND position = ?';
      params.push(position);
    }

    const [banners] = await db.execute(`
      SELECT * FROM promotional_banners
      WHERE ${whereClause}
      ORDER BY sort_order ASC, created_at DESC
    `, params);

    res.json({
      success: true,
      data: { banners }
    });

  } catch (error) {
    logger.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Track banner impression
app.post('/api/banners/:bannerId/impression', async (req, res) => {
  try {
    await db.execute(
      'UPDATE promotional_banners SET impression_count = impression_count + 1 WHERE id = ?',
      [req.params.bannerId]
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('Error tracking impression:', error);
    res.status(500).json({ error: 'Failed to track impression' });
  }
});

// Track banner click
app.post('/api/banners/:bannerId/click', async (req, res) => {
  try {
    await db.execute(
      'UPDATE promotional_banners SET click_count = click_count + 1 WHERE id = ?',
      [req.params.bannerId]
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Admin routes

// Coupons management
app.get('/api/admin/coupons', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (code LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      if (status === 'active') {
        whereClause += ' AND is_active = true AND (end_date IS NULL OR end_date >= NOW())';
      } else if (status === 'expired') {
        whereClause += ' AND end_date < NOW()';
      } else if (status === 'inactive') {
        whereClause += ' AND is_active = false';
      }
    }

    const [coupons] = await db.execute(`
      SELECT * FROM coupons
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total FROM coupons WHERE ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        coupons,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching admin coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

app.post('/api/admin/coupons', authenticate, requireAdmin, async (req, res) => {
  try {
    const { error } = createCouponSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const couponData = {
      id: uuidv4(),
      ...req.body,
      code: req.body.code.toUpperCase(),
      created_by: req.user.id
    };

    await db.execute(`
      INSERT INTO coupons (
        id, code, name, description, type, value, min_order_amount,
        max_discount_amount, usage_limit, per_user_limit, start_date,
        end_date, applicable_products, applicable_categories,
        applicable_sellers, excluded_products, first_time_customers_only,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      couponData.id, couponData.code, couponData.name, couponData.description,
      couponData.type, couponData.value, couponData.minOrderAmount,
      couponData.maxDiscountAmount, couponData.usageLimit, couponData.perUserLimit,
      couponData.startDate, couponData.endDate,
      JSON.stringify(couponData.applicableProducts || []),
      JSON.stringify(couponData.applicableCategories || []),
      JSON.stringify(couponData.applicableSellers || []),
      JSON.stringify(couponData.excludedProducts || []),
      couponData.firstTimeCustomersOnly || false,
      couponData.created_by
    ]);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: { couponId: couponData.id }
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    logger.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

app.put('/api/admin/coupons/:couponId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { couponId } = req.params;
    const updates = req.body;

    const allowedFields = [
      'name', 'description', 'type', 'value', 'min_order_amount',
      'max_discount_amount', 'usage_limit', 'per_user_limit',
      'start_date', 'end_date', 'applicable_products', 'applicable_categories',
      'applicable_sellers', 'excluded_products', 'first_time_customers_only',
      'is_active'
    ];

    const updateFields = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        const dbField = field.replace(/_([a-z])/g, (m, letter) => letter.toUpperCase());
        updateFields.push(`${field} = ?`);
        values.push(Array.isArray(updates[field]) ? JSON.stringify(updates[field]) : updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(couponId);

    await db.execute(`
      UPDATE coupons
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `, values);

    res.json({ success: true, message: 'Coupon updated successfully' });

  } catch (error) {
    logger.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

app.delete('/api/admin/coupons/:couponId', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM coupons WHERE id = ?', [req.params.couponId]);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    logger.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// Flash sales management
app.get('/api/admin/flash-sales', authenticate, requireAdmin, async (req, res) => {
  try {
    const [sales] = await db.execute(`
      SELECT
        fs.*,
        COUNT(fsp.product_id) as product_count
      FROM flash_sales fs
      LEFT JOIN flash_sale_products fsp ON fs.id = fsp.flash_sale_id
      GROUP BY fs.id
      ORDER BY fs.created_at DESC
    `);

    res.json({ success: true, data: { flashSales: sales } });

  } catch (error) {
    logger.error('Error fetching flash sales:', error);
    res.status(500).json({ error: 'Failed to fetch flash sales' });
  }
});

// Banners management
app.get('/api/admin/banners', authenticate, requireAdmin, async (req, res) => {
  try {
    const [banners] = await db.execute(`
      SELECT pb.*, u.username as created_by_name
      FROM promotional_banners pb
      LEFT JOIN users u ON pb.created_by = u.id
      ORDER BY pb.position, pb.sort_order
    `);

    res.json({ success: true, data: { banners } });

  } catch (error) {
    logger.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Analytics
app.get('/api/admin/analytics', authenticate, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // This would include complex analytics queries
    // For now, return mock data structure
    const analytics = {
      coupons: {
        totalCreated: 0,
        totalUsed: 0,
        totalDiscount: 0,
        topCoupons: []
      },
      flashSales: {
        totalSales: 0,
        totalRevenue: 0,
        topProducts: []
      },
      banners: {
        totalImpressions: 0,
        totalClicks: 0,
        clickThroughRate: 0
      }
    };

    res.json({ success: true, data: analytics });

  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Scheduled tasks
cron.schedule('0 */6 * * *', async () => {
  // Update expired coupons
  try {
    await db.execute(`
      UPDATE coupons
      SET is_active = false
      WHERE end_date < NOW() AND is_active = true
    `);
    logger.info('Updated expired coupons');
  } catch (error) {
    logger.error('Error updating expired coupons:', error);
  }
});

cron.schedule('*/5 * * * *', async () => {
  // Update expired flash sales
  try {
    await db.execute(`
      UPDATE flash_sales
      SET is_active = false
      WHERE end_time < NOW() AND is_active = true
    `);
    logger.info('Updated expired flash sales');
  } catch (error) {
    logger.error('Error updating expired flash sales:', error);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  await initializeConnections();

  app.listen(PORT, () => {
    logger.info(`Promotions service listening on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;