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

// Environment variables
const PORT = process.env.PORT || 3014;
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'marketplace_wishlist',
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

// Stricter rate limiting for wishlist modifications
const wishlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 wishlist operations per hour
  message: 'Too many wishlist operations, please try again later.'
});
app.use('/api/wishlists', wishlistLimiter);

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'wishlist-service' },
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
    await rabbitChannel.assertQueue('wishlist_events', { durable: true });
    await rabbitChannel.assertQueue('price_alerts', { durable: true });
    await rabbitChannel.assertQueue('availability_alerts', { durable: true });
    logger.info('Connected to RabbitMQ');

  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    process.exit(1);
  }
}

// Validation schemas
const createWishlistSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().max(500).optional(),
  isPublic: Joi.boolean().optional()
});

const updateWishlistSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().max(500).optional(),
  isPublic: Joi.boolean().optional()
});

const addItemSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).max(100).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  notes: Joi.string().max(500).optional(),
  priceAlert: Joi.boolean().optional(),
  alertPrice: Joi.number().positive().optional()
});

const shareWishlistSchema = Joi.object({
  shareType: Joi.string().valid('private', 'public_link', 'friends').required(),
  sharedWith: Joi.string().uuid().optional(),
  expiresAt: Joi.date().greater('now').optional()
});

const priceAlertSchema = Joi.object({
  alertPrice: Joi.number().positive().required()
});

const availabilityAlertSchema = Joi.object({
  alertType: Joi.string().valid('back_in_stock', 'price_drop', 'new_variant').required(),
  thresholdValue: Joi.number().positive().optional()
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

// Wishlist ownership middleware
const requireWishlistOwner = async (req, res, next) => {
  try {
    const { wishlistId } = req.params;
    const [wishlist] = await db.execute(
      'SELECT user_id FROM wishlists WHERE id = ?',
      [wishlistId]
    );

    if (!wishlist.length) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    if (wishlist[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.wishlistOwner = wishlist[0].user_id;
    next();
  } catch (error) {
    logger.error('Wishlist ownership check error:', error);
    res.status(500).json({ error: 'Failed to verify ownership' });
  }
};

// Routes

// Get user wishlists
app.get('/api/wishlists', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [wishlists] = await db.execute(`
      SELECT
        w.id, w.name, w.description, w.is_public, w.item_count,
        w.created_at, w.updated_at,
        COUNT(DISTINCT f.follower_id) as followers_count
      FROM wishlists w
      LEFT JOIN wishlist_followers f ON w.id = f.wishlist_id
      WHERE w.user_id = ?
      GROUP BY w.id
      ORDER BY w.updated_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), offset]);

    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM wishlists WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        wishlists: wishlists.map(w => ({
          ...w,
          is_public: Boolean(w.is_public)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching wishlists:', error);
    res.status(500).json({ error: 'Failed to fetch wishlists' });
  }
});

// Get specific wishlist
app.get('/api/wishlists/:wishlistId', authenticate, async (req, res) => {
  try {
    const { wishlistId } = req.params;
    const { includeItems = 'true' } = req.query;

    // Check access permissions
    const [wishlist] = await db.execute(`
      SELECT
        w.*,
        COUNT(DISTINCT f.follower_id) as followers_count,
        COUNT(DISTINCT wi.id) as items_count
      FROM wishlists w
      LEFT JOIN wishlist_followers f ON w.id = f.wishlist_id
      LEFT JOIN wishlist_items wi ON w.id = wi.wishlist_id
      WHERE w.id = ?
      GROUP BY w.id
    `, [wishlistId]);

    if (!wishlist.length) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    const wishlistData = wishlist[0];

    // Check if user has access
    if (wishlistData.user_id !== req.user.id && !wishlistData.is_public && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    let items = [];
    if (includeItems === 'true') {
      [items] = await db.execute(`
        SELECT
          wi.id, wi.quantity, wi.priority, wi.notes, wi.price_alert,
          wi.alert_price, wi.added_at,
          p.id as product_id, p.name, p.price, p.image_url, p.sku,
          p.stock_quantity, p.is_available
        FROM wishlist_items wi
        JOIN products p ON wi.product_id = p.id
        WHERE wi.wishlist_id = ?
        ORDER BY wi.added_at DESC
      `, [wishlistId]);
    }

    res.json({
      success: true,
      data: {
        wishlist: {
          ...wishlistData,
          is_public: Boolean(wishlistData.is_public),
          is_default: Boolean(wishlistData.is_default),
          items: items.map(item => ({
            ...item,
            price_alert: Boolean(item.price_alert)
          }))
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Create wishlist
app.post('/api/wishlists', authenticate, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;

    const { error } = createWishlistSchema.validate({ name, description, isPublic });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const wishlistId = uuidv4();

    await db.execute(`
      INSERT INTO wishlists (id, user_id, name, description, is_public)
      VALUES (?, ?, ?, ?, ?)
    `, [
      wishlistId,
      req.user.id,
      name || 'My Wishlist',
      description || null,
      isPublic || false
    ]);

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('wishlist_events', Buffer.from(JSON.stringify({
        type: 'wishlist_created',
        wishlistId,
        userId: req.user.id,
        isPublic: isPublic || false
      })));
    }

    res.status(201).json({
      success: true,
      message: 'Wishlist created successfully',
      data: { wishlistId }
    });

  } catch (error) {
    logger.error('Error creating wishlist:', error);
    res.status(500).json({ error: 'Failed to create wishlist' });
  }
});

// Update wishlist
app.put('/api/wishlists/:wishlistId', authenticate, requireWishlistOwner, async (req, res) => {
  try {
    const { wishlistId } = req.params;
    const { name, description, isPublic } = req.body;

    const { error } = updateWishlistSchema.validate({ name, description, isPublic });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    await db.execute(`
      UPDATE wishlists
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          is_public = COALESCE(?, is_public),
          updated_at = NOW()
      WHERE id = ?
    `, [name, description, isPublic, wishlistId]);

    res.json({
      success: true,
      message: 'Wishlist updated successfully'
    });

  } catch (error) {
    logger.error('Error updating wishlist:', error);
    res.status(500).json({ error: 'Failed to update wishlist' });
  }
});

// Delete wishlist
app.delete('/api/wishlists/:wishlistId', authenticate, requireWishlistOwner, async (req, res) => {
  try {
    const { wishlistId } = req.params;

    await db.execute('DELETE FROM wishlists WHERE id = ?', [wishlistId]);

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('wishlist_events', Buffer.from(JSON.stringify({
        type: 'wishlist_deleted',
        wishlistId,
        userId: req.user.id
      })));
    }

    res.json({
      success: true,
      message: 'Wishlist deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting wishlist:', error);
    res.status(500).json({ error: 'Failed to delete wishlist' });
  }
});

// Add item to wishlist
app.post('/api/wishlists/:wishlistId/items', authenticate, requireWishlistOwner, async (req, res) => {
  try {
    const { wishlistId } = req.params;
    const { productId, quantity, priority, notes, priceAlert, alertPrice } = req.body;

    const { error } = addItemSchema.validate({
      productId, quantity, priority, notes, priceAlert, alertPrice
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if product exists
    const [product] = await db.execute(
      'SELECT id, price, stock_quantity, is_available FROM products WHERE id = ?',
      [productId]
    );

    if (!product.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if item already exists in wishlist
    const [existing] = await db.execute(
      'SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?',
      [wishlistId, productId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    const itemId = uuidv4();

    await db.execute(`
      INSERT INTO wishlist_items (id, wishlist_id, product_id, quantity, priority, notes, price_alert, alert_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      itemId,
      wishlistId,
      productId,
      quantity || 1,
      priority || 'medium',
      notes || null,
      priceAlert || false,
      alertPrice || null
    ]);

    // Update wishlist item count
    await db.execute(
      'UPDATE wishlists SET item_count = item_count + 1, updated_at = NOW() WHERE id = ?',
      [wishlistId]
    );

    // Create price alert if requested
    if (priceAlert && alertPrice) {
      const alertId = uuidv4();
      await db.execute(`
        INSERT INTO price_alerts (id, wishlist_item_id, original_price, alert_price)
        VALUES (?, ?, ?, ?)
      `, [alertId, itemId, product[0].price, alertPrice]);
    }

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('wishlist_events', Buffer.from(JSON.stringify({
        type: 'item_added',
        wishlistId,
        itemId,
        productId,
        userId: req.user.id
      })));
    }

    res.status(201).json({
      success: true,
      message: 'Item added to wishlist successfully',
      data: { itemId }
    });

  } catch (error) {
    logger.error('Error adding item to wishlist:', error);
    res.status(500).json({ error: 'Failed to add item to wishlist' });
  }
});

// Update wishlist item
app.put('/api/wishlists/:wishlistId/items/:itemId', authenticate, requireWishlistOwner, async (req, res) => {
  try {
    const { wishlistId, itemId } = req.params;
    const { quantity, priority, notes, priceAlert, alertPrice } = req.body;

    const { error } = addItemSchema.validate({
      productId: 'placeholder', quantity, priority, notes, priceAlert, alertPrice
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify item belongs to wishlist
    const [item] = await db.execute(
      'SELECT id FROM wishlist_items WHERE id = ? AND wishlist_id = ?',
      [itemId, wishlistId]
    );

    if (!item.length) {
      return res.status(404).json({ error: 'Item not found in wishlist' });
    }

    await db.execute(`
      UPDATE wishlist_items
      SET quantity = COALESCE(?, quantity),
          priority = COALESCE(?, priority),
          notes = COALESCE(?, notes),
          price_alert = COALESCE(?, price_alert),
          alert_price = COALESCE(?, alert_price)
      WHERE id = ?
    `, [quantity, priority, notes, priceAlert, alertPrice, itemId]);

    // Update price alert if requested
    if (priceAlert && alertPrice) {
      await db.execute(`
        INSERT INTO price_alerts (id, wishlist_item_id, original_price, alert_price)
        VALUES (?, ?, (SELECT price FROM products p JOIN wishlist_items wi ON p.id = wi.product_id WHERE wi.id = ?), ?)
        ON DUPLICATE KEY UPDATE alert_price = VALUES(alert_price)
      `, [uuidv4(), itemId, itemId, alertPrice]);
    }

    res.json({
      success: true,
      message: 'Wishlist item updated successfully'
    });

  } catch (error) {
    logger.error('Error updating wishlist item:', error);
    res.status(500).json({ error: 'Failed to update wishlist item' });
  }
});

// Remove item from wishlist
app.delete('/api/wishlists/:wishlistId/items/:itemId', authenticate, requireWishlistOwner, async (req, res) => {
  try {
    const { wishlistId, itemId } = req.params;

    const [result] = await db.execute(
      'DELETE FROM wishlist_items WHERE id = ? AND wishlist_id = ?',
      [itemId, wishlistId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found in wishlist' });
    }

    // Update wishlist item count
    await db.execute(
      'UPDATE wishlists SET item_count = item_count - 1, updated_at = NOW() WHERE id = ?',
      [wishlistId]
    );

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('wishlist_events', Buffer.from(JSON.stringify({
        type: 'item_removed',
        wishlistId,
        itemId,
        userId: req.user.id
      })));
    }

    res.json({
      success: true,
      message: 'Item removed from wishlist successfully'
    });

  } catch (error) {
    logger.error('Error removing item from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove item from wishlist' });
  }
});

// Share wishlist
app.post('/api/wishlists/:wishlistId/share', authenticate, requireWishlistOwner, async (req, res) => {
  try {
    const { wishlistId } = req.params;
    const { shareType, sharedWith, expiresAt } = req.body;

    const { error } = shareWishlistSchema.validate({ shareType, sharedWith, expiresAt });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const shareId = uuidv4();
    const shareToken = shareType === 'public_link' ? uuidv4() : null;

    await db.execute(`
      INSERT INTO wishlist_shares (id, wishlist_id, shared_by, shared_with, share_token, share_type, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      shareId,
      wishlistId,
      req.user.id,
      sharedWith || null,
      shareToken,
      shareType,
      expiresAt || null
    ]);

    const shareUrl = shareToken ? `${process.env.FRONTEND_URL || 'http://localhost:8080'}/shared-wishlist/${shareToken}` : null;

    res.json({
      success: true,
      message: 'Wishlist shared successfully',
      data: {
        shareId,
        shareToken,
        shareUrl,
        shareType,
        expiresAt
      }
    });

  } catch (error) {
    logger.error('Error sharing wishlist:', error);
    res.status(500).json({ error: 'Failed to share wishlist' });
  }
});

// Get shared wishlist (public access)
app.get('/api/shared-wishlist/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;

    const [share] = await db.execute(`
      SELECT
        ws.wishlist_id, ws.share_type, ws.expires_at, ws.view_count,
        w.name, w.description, w.item_count, w.created_at,
        u.username as owner_name
      FROM wishlist_shares ws
      JOIN wishlists w ON ws.wishlist_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE ws.share_token = ? AND (ws.expires_at IS NULL OR ws.expires_at > NOW())
    `, [shareToken]);

    if (!share.length) {
      return res.status(404).json({ error: 'Shared wishlist not found or expired' });
    }

    const shareData = share[0];

    // Increment view count
    await db.execute(
      'UPDATE wishlist_shares SET view_count = view_count + 1 WHERE share_token = ?',
      [shareToken]
    );

    // Get wishlist items
    const [items] = await db.execute(`
      SELECT
        wi.quantity, wi.priority, wi.added_at,
        p.id as product_id, p.name, p.price, p.image_url, p.sku,
        p.stock_quantity, p.is_available
      FROM wishlist_items wi
      JOIN products p ON wi.product_id = p.id
      WHERE wi.wishlist_id = ?
      ORDER BY wi.added_at DESC
    `, [shareData.wishlist_id]);

    res.json({
      success: true,
      data: {
        wishlist: {
          name: shareData.name,
          description: shareData.description,
          itemCount: shareData.item_count,
          ownerName: shareData.owner_name,
          createdAt: shareData.created_at,
          items: items
        },
        share: {
          shareType: shareData.share_type,
          viewCount: shareData.view_count + 1,
          expiresAt: shareData.expires_at
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching shared wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch shared wishlist' });
  }
});

// Follow/unfollow wishlist
app.post('/api/wishlists/:wishlistId/follow', authenticate, async (req, res) => {
  try {
    const { wishlistId } = req.params;
    const { action } = req.body; // 'follow' or 'unfollow'

    // Check if wishlist is public
    const [wishlist] = await db.execute(
      'SELECT is_public, user_id FROM wishlists WHERE id = ?',
      [wishlistId]
    );

    if (!wishlist.length) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    if (!wishlist[0].is_public) {
      return res.status(403).json({ error: 'Cannot follow private wishlist' });
    }

    if (wishlist[0].user_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow your own wishlist' });
    }

    if (action === 'follow') {
      // Check if already following
      const [existing] = await db.execute(
        'SELECT id FROM wishlist_followers WHERE wishlist_id = ? AND follower_id = ?',
        [wishlistId, req.user.id]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Already following this wishlist' });
      }

      await db.execute(`
        INSERT INTO wishlist_followers (id, wishlist_id, follower_id)
        VALUES (?, ?, ?)
      `, [uuidv4(), wishlistId, req.user.id]);

      res.json({ success: true, message: 'Wishlist followed successfully' });

    } else if (action === 'unfollow') {
      await db.execute(
        'DELETE FROM wishlist_followers WHERE wishlist_id = ? AND follower_id = ?',
        [wishlistId, req.user.id]
      );

      res.json({ success: true, message: 'Wishlist unfollowed successfully' });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    logger.error('Error following/unfollowing wishlist:', error);
    res.status(500).json({ error: 'Failed to update follow status' });
  }
});

// Get followed wishlists
app.get('/api/wishlists/followed', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [wishlists] = await db.execute(`
      SELECT
        w.id, w.name, w.description, w.item_count, w.created_at, w.updated_at,
        u.username as owner_name,
        f.followed_at
      FROM wishlist_followers f
      JOIN wishlists w ON f.wishlist_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE f.follower_id = ? AND w.is_public = true
      ORDER BY f.followed_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), offset]);

    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM wishlist_followers f
      JOIN wishlists w ON f.wishlist_id = w.id
      WHERE f.follower_id = ? AND w.is_public = true
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        wishlists,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching followed wishlists:', error);
    res.status(500).json({ error: 'Failed to fetch followed wishlists' });
  }
});

// Get public wishlists
app.get('/api/wishlists/public', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'w.is_public = true';
    const params = [];

    if (search) {
      whereClause += ' AND (w.name LIKE ? OR w.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [wishlists] = await db.execute(`
      SELECT
        w.id, w.name, w.description, w.item_count, w.created_at, w.updated_at,
        u.username as owner_name,
        COUNT(DISTINCT f.follower_id) as followers_count
      FROM wishlists w
      JOIN users u ON w.user_id = u.id
      LEFT JOIN wishlist_followers f ON w.id = f.wishlist_id
      WHERE ${whereClause}
      GROUP BY w.id
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total FROM wishlists w WHERE ${whereClause}
    `, params);

    res.json({
      success: true,
      data: {
        wishlists,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching public wishlists:', error);
    res.status(500).json({ error: 'Failed to fetch public wishlists' });
  }
});

// Create availability alert
app.post('/api/alerts/availability', authenticate, async (req, res) => {
  try {
    const { productId, alertType, thresholdValue } = req.body;

    const { error } = availabilityAlertSchema.validate({ alertType, thresholdValue });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if product exists
    const [product] = await db.execute(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );

    if (!product.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if alert already exists
    const [existing] = await db.execute(
      'SELECT id FROM availability_alerts WHERE user_id = ? AND product_id = ? AND alert_type = ?',
      [req.user.id, productId, alertType]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Alert already exists for this product' });
    }

    const alertId = uuidv4();

    await db.execute(`
      INSERT INTO availability_alerts (id, user_id, product_id, alert_type, threshold_value)
      VALUES (?, ?, ?, ?, ?)
    `, [alertId, req.user.id, productId, alertType, thresholdValue || null]);

    res.status(201).json({
      success: true,
      message: 'Availability alert created successfully',
      data: { alertId }
    });

  } catch (error) {
    logger.error('Error creating availability alert:', error);
    res.status(500).json({ error: 'Failed to create availability alert' });
  }
});

// Get user alerts
app.get('/api/alerts', authenticate, async (req, res) => {
  try {
    const [priceAlerts] = await db.execute(`
      SELECT
        pa.id, pa.alert_price, pa.triggered_price, pa.triggered_at, pa.status,
        wi.wishlist_id,
        p.id as product_id, p.name, p.price, p.image_url
      FROM price_alerts pa
      JOIN wishlist_items wi ON pa.wishlist_item_id = wi.id
      JOIN products p ON wi.product_id = p.id
      WHERE wi.wishlist_id IN (SELECT id FROM wishlists WHERE user_id = ?)
      ORDER BY pa.created_at DESC
    `, [req.user.id]);

    const [availabilityAlerts] = await db.execute(`
      SELECT
        aa.id, aa.alert_type, aa.threshold_value, aa.triggered_at, aa.is_active,
        p.id as product_id, p.name, p.price, p.image_url, p.is_available
      FROM availability_alerts aa
      JOIN products p ON aa.product_id = p.id
      WHERE aa.user_id = ?
      ORDER BY aa.created_at DESC
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        priceAlerts,
        availabilityAlerts
      }
    });

  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Delete alert
app.delete('/api/alerts/:alertId', authenticate, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { alertType } = req.query; // 'price' or 'availability'

    let tableName, userField;
    if (alertType === 'price') {
      tableName = 'price_alerts';
      userField = 'wishlist_item_id IN (SELECT id FROM wishlist_items WHERE wishlist_id IN (SELECT id FROM wishlists WHERE user_id = ?))';
    } else if (alertType === 'availability') {
      tableName = 'availability_alerts';
      userField = 'user_id = ?';
    } else {
      return res.status(400).json({ error: 'Invalid alert type' });
    }

    const [result] = await db.execute(
      `DELETE FROM ${tableName} WHERE id = ? AND ${userField}`,
      [alertId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// Get wishlist analytics
app.get('/api/wishlists/:wishlistId/analytics', authenticate, requireWishlistOwner, async (req, res) => {
  try {
    const { wishlistId } = req.params;

    // Try cache first
    const cacheKey = `wishlist_analytics:${wishlistId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached) });
    }

    const [analytics] = await db.execute(`
      SELECT
        total_views, unique_visitors, total_followers, conversion_rate,
        last_updated
      FROM wishlist_analytics
      WHERE wishlist_id = ?
    `, [wishlistId]);

    const analyticsData = analytics.length > 0 ? analytics[0] : {
      totalViews: 0,
      uniqueVisitors: 0,
      totalFollowers: 0,
      conversionRate: 0.00,
      lastUpdated: new Date()
    };

    // Cache for 30 minutes
    await redisClient.setEx(cacheKey, 1800, JSON.stringify(analyticsData));

    res.json({ success: true, data: analyticsData });

  } catch (error) {
    logger.error('Error fetching wishlist analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Admin routes
app.get('/api/admin/wishlists', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const [wishlists] = await db.execute(`
      SELECT
        w.*,
        u.username as owner_name,
        COUNT(DISTINCT wi.id) as items_count,
        COUNT(DISTINCT f.follower_id) as followers_count
      FROM wishlists w
      LEFT JOIN users u ON w.user_id = u.id
      LEFT JOIN wishlist_items wi ON w.id = wi.wishlist_id
      LEFT JOIN wishlist_followers f ON w.id = f.wishlist_id
      GROUP BY w.id
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);

    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM wishlists',
      []
    );

    res.json({
      success: true,
      data: {
        wishlists: wishlists.map(w => ({
          ...w,
          is_public: Boolean(w.is_public),
          is_default: Boolean(w.is_default)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching admin wishlists:', error);
    res.status(500).json({ error: 'Failed to fetch wishlists' });
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
    logger.info(`Wishlist service listening on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;