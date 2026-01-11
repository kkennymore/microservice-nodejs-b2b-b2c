const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const amqp = require('amqplib');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const Joi = require('joi');

// Environment variables
const PORT = process.env.PORT || 3008;
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'marketplace_reviews',
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

// Stricter rate limiting for review submissions
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 reviews per hour
  message: 'Too many reviews submitted, please try again later.'
});
app.use('/api/reviews', reviewLimiter);

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'reviews-service' },
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
    await rabbitChannel.assertQueue('review_events', { durable: true });
    logger.info('Connected to RabbitMQ');

  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    process.exit(1);
  }
}

// Validation schemas
const createReviewSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().max(200).optional(),
  comment: Joi.string().max(2000).optional(),
  orderId: Joi.string().uuid().optional()
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().max(200).optional(),
  comment: Joi.string().max(2000).optional()
});

const reportReviewSchema = Joi.object({
  reason: Joi.string().valid('spam', 'inappropriate', 'offensive', 'fake', 'irrelevant', 'other').required(),
  description: Joi.string().max(500).optional()
});

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // Max 5 images per review
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
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

// Routes

// Get product reviews
app.get('/api/products/:productId/reviews', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest', verified = 'false' } = req.query;

    const offset = (page - 1) * limit;
    let orderBy = 'r.created_at DESC';

    switch (sort) {
      case 'oldest':
        orderBy = 'r.created_at ASC';
        break;
      case 'highest':
        orderBy = 'r.rating DESC, r.created_at DESC';
        break;
      case 'lowest':
        orderBy = 'r.rating ASC, r.created_at DESC';
        break;
      case 'helpful':
        orderBy = 'r.helpful_votes DESC, r.created_at DESC';
        break;
    }

    let whereClause = 'r.product_id = ? AND r.status = "approved"';
    const params = [productId];

    if (verified === 'true') {
      whereClause += ' AND r.verified_purchase = true';
    }

    // Get reviews
    const [reviews] = await db.execute(`
      SELECT
        r.id, r.rating, r.title, r.comment, r.verified_purchase,
        r.helpful_votes, r.total_votes, r.created_at, r.updated_at,
        u.id as user_id, u.username, u.avatar,
        JSON_ARRAYAGG(ri.image_url) as images
      FROM product_reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN review_images ri ON r.id = ri.review_id
      WHERE ${whereClause}
      GROUP BY r.id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total FROM product_reviews r WHERE ${whereClause}
    `, params);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Calculate rating distribution
    const [ratingStats] = await db.execute(`
      SELECT
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews
      FROM product_reviews
      WHERE product_id = ? AND status = 'approved'
    `, [productId]);

    res.json({
      success: true,
      data: {
        reviews: reviews.map(review => ({
          ...review,
          images: review.images && review.images !== '[null]' ? JSON.parse(review.images).filter(img => img) : [],
          created_at: review.created_at,
          updated_at: review.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        },
        stats: ratingStats[0]
      }
    });

  } catch (error) {
    logger.error('Error fetching product reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create product review
app.post('/api/products/:productId/reviews', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment, orderId } = req.body;

    // Validate input
    const { error } = createReviewSchema.validate({ productId, rating, title, comment, orderId });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if user already reviewed this product
    const [existing] = await db.execute(
      'SELECT id FROM product_reviews WHERE product_id = ? AND user_id = ?',
      [productId, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    // Check if order belongs to user (for verified purchase)
    let verifiedPurchase = false;
    if (orderId) {
      const [orderCheck] = await db.execute(
        'SELECT id FROM orders WHERE id = ? AND customer_id = ? AND status IN ("delivered", "completed")',
        [orderId, req.user.id]
      );
      verifiedPurchase = orderCheck.length > 0;
    }

    const reviewId = uuidv4();

    // Insert review
    await db.execute(`
      INSERT INTO product_reviews (id, product_id, user_id, order_id, rating, title, comment, verified_purchase)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [reviewId, productId, req.user.id, orderId || null, rating, title || null, comment || null, verifiedPurchase]);

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageId = uuidv4();

        // Process image with Sharp (resize, optimize)
        const processedImage = await sharp(file.buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();

        // In a real implementation, upload to cloud storage (AWS S3, etc.)
        const imageUrl = `/uploads/reviews/${reviewId}/${imageId}.jpg`;

        await db.execute(`
          INSERT INTO review_images (id, review_id, image_url, sort_order)
          VALUES (?, ?, ?, ?)
        `, [imageId, reviewId, imageUrl, i]);
      }
    }

    // Update analytics cache
    await updateReviewAnalytics(productId, 'product');

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('review_events', Buffer.from(JSON.stringify({
        type: 'review_created',
        reviewId,
        productId,
        userId: req.user.id,
        rating
      })));
    }

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { reviewId }
    });

  } catch (error) {
    logger.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update product review
app.put('/api/reviews/:reviewId', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;

    const { error } = updateReviewSchema.validate({ rating, title, comment });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check ownership
    const [review] = await db.execute(
      'SELECT user_id FROM product_reviews WHERE id = ?',
      [reviewId]
    );

    if (!review.length || review[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }

    // Update review
    await db.execute(`
      UPDATE product_reviews
      SET rating = COALESCE(?, rating), title = COALESCE(?, title), comment = COALESCE(?, comment), updated_at = NOW()
      WHERE id = ?
    `, [rating, title, comment, reviewId]);

    res.json({
      success: true,
      message: 'Review updated successfully'
    });

  } catch (error) {
    logger.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete product review
app.delete('/api/reviews/:reviewId', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Check ownership
    const [review] = await db.execute(
      'SELECT user_id, product_id FROM product_reviews WHERE id = ?',
      [reviewId]
    );

    if (!review.length) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    // Delete review
    await db.execute('DELETE FROM product_reviews WHERE id = ?', [reviewId]);

    // Update analytics cache
    await updateReviewAnalytics(review[0].product_id, 'product');

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Vote on review
app.post('/api/reviews/:reviewId/vote', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { voteType } = req.body;

    if (!['helpful', 'not_helpful'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // Check if user already voted
    const [existing] = await db.execute(
      'SELECT id FROM review_votes WHERE review_id = ? AND user_id = ?',
      [reviewId, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already voted on this review' });
    }

    // Insert vote
    await db.execute(`
      INSERT INTO review_votes (id, review_id, user_id, vote_type)
      VALUES (?, ?, ?, ?)
    `, [uuidv4(), reviewId, req.user.id, voteType]);

    // Update vote counts
    const incrementField = voteType === 'helpful' ? 'helpful_votes' : 'total_votes';
    await db.execute(`
      UPDATE product_reviews
      SET ${incrementField} = ${incrementField} + 1, total_votes = total_votes + 1
      WHERE id = ?
    `, [reviewId]);

    res.json({
      success: true,
      message: 'Vote recorded successfully'
    });

  } catch (error) {
    logger.error('Error voting on review:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Report review
app.post('/api/reviews/:reviewId/report', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason, description } = req.body;

    const { error } = reportReviewSchema.validate({ reason, description });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if review exists
    const [review] = await db.execute(
      'SELECT id FROM product_reviews WHERE id = ?',
      [reviewId]
    );

    if (!review.length) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user already reported
    const [existing] = await db.execute(
      'SELECT id FROM review_reports WHERE review_id = ? AND reported_by = ?',
      [reviewId, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already reported this review' });
    }

    // Insert report
    await db.execute(`
      INSERT INTO review_reports (id, review_id, review_type, reported_by, reason, description)
      VALUES (?, ?, 'product', ?, ?, ?)
    `, [uuidv4(), reviewId, req.user.id, reason, description || null]);

    res.json({
      success: true,
      message: 'Report submitted successfully'
    });

  } catch (error) {
    logger.error('Error reporting review:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Get product review analytics
app.get('/api/products/:productId/analytics', async (req, res) => {
  try {
    const { productId } = req.params;

    // Try cache first
    const cacheKey = `review_analytics:${productId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached) });
    }

    // Calculate analytics
    const [stats] = await db.execute(`
      SELECT
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM product_reviews
      WHERE product_id = ? AND status = 'approved'
    `, [productId]);

    const analytics = {
      averageRating: parseFloat(stats[0].average_rating || 0).toFixed(1),
      totalReviews: stats[0].total_reviews,
      ratingDistribution: {
        5: stats[0].five_stars,
        4: stats[0].four_stars,
        3: stats[0].three_stars,
        2: stats[0].two_stars,
        1: stats[0].one_star
      }
    };

    // Cache for 1 hour
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(analytics));

    res.json({ success: true, data: analytics });

  } catch (error) {
    logger.error('Error fetching review analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Admin routes
app.get('/api/admin/reviews', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type = 'product' } = req.query;
    const offset = (page - 1) * limit;

    let tableName, joinTable, selectFields;

    if (type === 'product') {
      tableName = 'product_reviews';
      joinTable = 'products p ON r.product_id = p.id';
      selectFields = 'p.name as entity_name, p.id as entity_id';
    } else {
      tableName = 'seller_reviews';
      joinTable = 'users u ON r.seller_id = u.id';
      selectFields = 'u.username as entity_name, u.id as entity_id';
    }

    const [reviews] = await db.execute(`
      SELECT
        r.*,
        ru.username as reviewer_name,
        ${selectFields}
      FROM ${tableName} r
      LEFT JOIN users ru ON r.user_id = ru.id
      LEFT JOIN ${joinTable}
      ${status ? 'WHERE r.status = ?' : ''}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, status ? [status, parseInt(limit), offset] : [parseInt(limit), offset]);

    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total FROM ${tableName} ${status ? 'WHERE status = ?' : ''}
    `, status ? [status] : []);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching admin reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.put('/api/admin/reviews/:reviewId/moderate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (action === 'delete') {
      await db.execute('DELETE FROM product_reviews WHERE id = ?', [reviewId]);
    } else {
      const status = action === 'approve' ? 'approved' : 'rejected';
      await db.execute(`
        UPDATE product_reviews
        SET status = ?, moderated_by = ?, moderated_at = NOW(), moderation_reason = ?
        WHERE id = ?
      `, [status, req.user.id, reason || null, reviewId]);
    }

    res.json({ success: true, message: `Review ${action}d successfully` });

  } catch (error) {
    logger.error('Error moderating review:', error);
    res.status(500).json({ error: 'Failed to moderate review' });
  }
});

// Helper function to update review analytics
async function updateReviewAnalytics(entityId, entityType) {
  try {
    const [stats] = await db.execute(`
      SELECT
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews,
        JSON_OBJECT(
          '5', COUNT(CASE WHEN rating = 5 THEN 1 END),
          '4', COUNT(CASE WHEN rating = 4 THEN 1 END),
          '3', COUNT(CASE WHEN rating = 3 THEN 1 END),
          '2', COUNT(CASE WHEN rating = 2 THEN 1 END),
          '1', COUNT(CASE WHEN rating = 1 THEN 1 END)
        ) as rating_distribution
      FROM product_reviews
      WHERE product_id = ? AND status = 'approved'
    `, [entityId]);

    const analytics = {
      average_rating: parseFloat(stats[0].average_rating || 0),
      total_reviews: stats[0].total_reviews,
      rating_distribution: JSON.parse(stats[0].rating_distribution)
    };

    await db.execute(`
      INSERT INTO review_analytics (id, entity_id, entity_type, average_rating, total_reviews, rating_distribution)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        average_rating = VALUES(average_rating),
        total_reviews = VALUES(total_reviews),
        rating_distribution = VALUES(rating_distribution),
        last_updated = NOW()
    `, [uuidv4(), entityId, entityType, analytics.average_rating, analytics.total_reviews, JSON.stringify(analytics.rating_distribution)]);

    // Invalidate cache
    const cacheKey = `review_analytics:${entityId}`;
    await redisClient.del(cacheKey);

  } catch (error) {
    logger.error('Error updating review analytics:', error);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  await initializeConnections();

  app.listen(PORT, () => {
    logger.info(`Reviews service listening on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;