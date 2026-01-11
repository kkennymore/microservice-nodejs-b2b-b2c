import express from 'express';
import mysql from 'mysql2/promise';
import redis from 'redis';
import amqp from 'amqplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Joi from 'joi';
import _ from 'lodash';
import sanitizeHtml from 'sanitize-html';

// Environment variables
const PORT = process.env.PORT || 3018;
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'marketplace_social',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

// Social Configuration
const SOCIAL_CONFIG = {
  maxPostsPerHour: parseInt(process.env.MAX_POSTS_PER_HOUR || '10'),
  maxFollowsPerDay: parseInt(process.env.MAX_FOLLOWS_PER_DAY || '50'),
  feedCacheTimeMinutes: parseInt(process.env.FEED_CACHE_MINUTES || '15'),
  trendingThreshold: parseInt(process.env.TRENDING_THRESHOLD || '10'),
  maxHashtagsPerPost: parseInt(process.env.MAX_HASHTAGS_PER_POST || '5'),
  shareUrlExpiryHours: parseInt(process.env.SHARE_URL_EXPIRY_HOURS || '168') // 7 days
};

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'social-service' },
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
    await rabbitChannel.assertQueue('social_events', { durable: true });
    await rabbitChannel.assertQueue('feed_updates', { durable: true });
    await rabbitChannel.assertQueue('notification_events', { durable: true });
    logger.info('Connected to RabbitMQ');

  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    process.exit(1);
  }
}

// Social Engine Class
class SocialEngine {
  constructor() {
    this.config = SOCIAL_CONFIG;
  }

  // Extract hashtags from text
  extractHashtags(text) {
    if (!text) return [];

    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex) || [];
    return [...new Set(matches.slice(0, this.config.maxHashtagsPerPost))];
  }

  // Extract mentions from text
  extractMentions(text) {
    if (!text) return [];

    const mentionRegex = /@[\w]+/g;
    const matches = text.match(mentionRegex) || [];
    return [...new Set(matches.map(mention => mention.substring(1)))];
  }

  // Generate share URL
  generateShareUrl(shareId, shareType = 'social') {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    return `${baseUrl}/share/${shareType}/${shareId}`;
  }

  // Generate QR code for sharing
  async generateShareQR(url) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      logger.error('QR Code generation error:', error);
      return null;
    }
  }

  // Calculate engagement score for posts
  calculateEngagementScore(likes, comments, shares, views, ageHours) {
    const engagement = (likes * 1) + (comments * 2) + (shares * 3);
    const recencyBonus = Math.max(0, 24 - ageHours) / 24; // Bonus for recent posts
    const viewRatio = views > 0 ? engagement / views : 0;

    return (engagement * 0.6) + (viewRatio * 0.3) + (recencyBonus * 0.1);
  }

  // Sanitize HTML content
  sanitizeContent(html) {
    return sanitizeHtml(html, {
      allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a'],
      allowedAttributes: {
        'a': ['href', 'target']
      },
      allowedSchemes: ['http', 'https', 'mailto']
    });
  }

  // Check rate limits
  async checkRateLimit(userId, action, limit, timeWindowMinutes) {
    const key = `ratelimit:${userId}:${action}`;
    const current = await redisClient.get(key);

    if (current && parseInt(current) >= limit) {
      return false;
    }

    const newCount = current ? parseInt(current) + 1 : 1;
    await redisClient.setEx(key, timeWindowMinutes * 60, newCount.toString());

    return true;
  }

  // Get trending hashtags
  async getTrendingHashtags(limit = 10) {
    const [hashtags] = await db.execute(`
      SELECT hashtag, usage_count, trending_score
      FROM social_hashtags
      WHERE is_blocked = false AND usage_count > ?
      ORDER BY trending_score DESC, usage_count DESC
      LIMIT ?
    `, [this.config.trendingThreshold, limit]);

    return hashtags;
  }

  // Update hashtag usage
  async updateHashtagUsage(hashtags) {
    if (!hashtags.length) return;

    for (const hashtag of hashtags) {
      await db.execute(`
        INSERT INTO social_hashtags (hashtag, usage_count, last_used)
        VALUES (?, 1, NOW())
        ON DUPLICATE KEY UPDATE
        usage_count = usage_count + 1,
        last_used = NOW()
      `, [hashtag]);
    }
  }
}

const socialEngine = new SocialEngine();

// Validation schemas
const followSchema = Joi.object({
  followingId: Joi.string().uuid().required()
});

const shareSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  shareType: Joi.string().valid('social', 'direct', 'embed', 'qr').required(),
  platform: Joi.string().valid('facebook', 'twitter', 'instagram', 'pinterest', 'whatsapp', 'email', 'link').optional(),
  shareText: Joi.string().max(500).optional()
});

const postSchema = Joi.object({
  postType: Joi.string().valid('product_share', 'review', 'question', 'tip', 'story', 'poll').required(),
  entityType: Joi.string().valid('product', 'category', 'seller', 'review').optional(),
  entityId: Joi.string().uuid().optional(),
  title: Joi.string().max(200).optional(),
  content: Joi.string().min(1).max(2000).required(),
  mediaUrls: Joi.array().items(Joi.string().uri()).max(10).optional(),
  tags: Joi.array().items(Joi.string()).max(10).optional(),
  location: Joi.string().max(100).optional(),
  isPublic: Joi.boolean().optional()
});

const interactionSchema = Joi.object({
  interactionType: Joi.string().valid('like', 'comment', 'share', 'bookmark', 'report').required(),
  content: Joi.string().max(1000).when('interactionType', {
    is: 'comment',
    then: Joi.required()
  }).optional()
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token with auth service
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

// Routes

// Follow/Unfollow user
app.post('/api/social/follow/:followingId', authenticate, async (req, res) => {
  try {
    const { followingId } = req.params;
    const followerId = req.user.id;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check rate limit
    const canFollow = await socialEngine.checkRateLimit(followerId, 'follow', SOCIAL_CONFIG.maxFollowsPerDay, 1440);
    if (!canFollow) {
      return res.status(429).json({ error: 'Follow rate limit exceeded' });
    }

    // Check if already following
    const [existing] = await db.execute(
      'SELECT id, follow_status FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    if (existing.length > 0) {
      if (existing[0].follow_status === 'active') {
        // Unfollow
        await db.execute(
          'UPDATE user_follows SET follow_status = ?, unfollowed_at = NOW() WHERE id = ?',
          ['unfollowed', existing[0].id]
        );

        // Publish event
        if (rabbitChannel) {
          rabbitChannel.sendToQueue('social_events', Buffer.from(JSON.stringify({
            type: 'user_unfollowed',
            followerId,
            followingId
          })));
        }

        return res.json({ success: true, message: 'User unfollowed successfully' });
      } else {
        // Re-follow
        await db.execute(
          'UPDATE user_follows SET follow_status = ?, followed_at = NOW(), unfollowed_at = NULL WHERE id = ?',
          ['active', existing[0].id]
        );
      }
    } else {
      // New follow
      const followId = uuidv4();
      await db.execute(
        'INSERT INTO user_follows (id, follower_id, following_id, follow_status) VALUES (?, ?, ?, ?)',
        [followId, followerId, followingId, 'active']
      );
    }

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('social_events', Buffer.from(JSON.stringify({
        type: 'user_followed',
        followerId,
        followingId
      })));
    }

    res.json({ success: true, message: 'User followed successfully' });

  } catch (error) {
    logger.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Get user's followers/following
app.get('/api/social/follows/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'followers', page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query, countQuery, params;

    if (type === 'followers') {
      query = `
        SELECT uf.follower_id as user_id, uf.followed_at, u.username, u.avatar
        FROM user_follows uf
        JOIN users u ON uf.follower_id = u.id
        WHERE uf.following_id = ? AND uf.follow_status = 'active'
        ORDER BY uf.followed_at DESC
        LIMIT ? OFFSET ?
      `;
      countQuery = 'SELECT COUNT(*) as total FROM user_follows WHERE following_id = ? AND follow_status = ?';
      params = [userId, parseInt(limit), offset];
    } else {
      query = `
        SELECT uf.following_id as user_id, uf.followed_at, u.username, u.avatar
        FROM user_follows uf
        JOIN users u ON uf.following_id = u.id
        WHERE uf.follower_id = ? AND uf.follow_status = 'active'
        ORDER BY uf.followed_at DESC
        LIMIT ? OFFSET ?
      `;
      countQuery = 'SELECT COUNT(*) as total FROM user_follows WHERE follower_id = ? AND follow_status = ?';
      params = [userId, parseInt(limit), offset];
    }

    const [follows] = await db.execute(query, params);
    const [countResult] = await db.execute(countQuery, [userId, 'active']);

    res.json({
      success: true,
      data: {
        users: follows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get follows error:', error);
    res.status(500).json({ error: 'Failed to get follows' });
  }
});

// Share product
app.post('/api/social/share', authenticate, async (req, res) => {
  try {
    const { productId, shareType, platform, shareText } = req.body;
    const userId = req.user.id;

    const { error } = shareSchema.validate({ productId, shareType, platform, shareText });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Generate share URL
    const shareId = uuidv4();
    const shareUrl = socialEngine.generateShareUrl(shareId, shareType);

    // Generate QR code for certain share types
    let qrCode = null;
    if (shareType === 'qr') {
      qrCode = await socialEngine.generateShareQR(shareUrl);
    }

    // Create share record
    await db.execute(`
      INSERT INTO product_shares
      (id, user_id, product_id, share_type, platform, share_url, share_text, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))
    `, [
      shareId,
      userId,
      productId,
      shareType,
      platform || null,
      shareUrl,
      shareText || null,
      SOCIAL_CONFIG.shareUrlExpiryHours
    ]);

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('social_events', Buffer.from(JSON.stringify({
        type: 'product_shared',
        userId,
        productId,
        shareType,
        platform,
        shareUrl
      })));
    }

    res.json({
      success: true,
      message: 'Product shared successfully',
      data: {
        shareId,
        shareUrl,
        qrCode
      }
    });

  } catch (error) {
    logger.error('Share error:', error);
    res.status(500).json({ error: 'Failed to share product' });
  }
});

// Get share by ID
app.get('/api/social/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    const [share] = await db.execute(
      'SELECT ps.*, p.name as product_name, p.price, p.image_url FROM product_shares ps JOIN products p ON ps.product_id = p.id WHERE ps.id = ? AND ps.expires_at > NOW()',
      [shareId]
    );

    if (!share.length) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    const shareData = share[0];

    // Increment click count
    await db.execute('UPDATE product_shares SET click_count = click_count + 1 WHERE id = ?', [shareId]);

    res.json({
      success: true,
      data: {
        share: shareData,
        product: {
          id: shareData.product_id,
          name: shareData.product_name,
          price: parseFloat(shareData.price),
          imageUrl: shareData.image_url
        }
      }
    });

  } catch (error) {
    logger.error('Get share error:', error);
    res.status(500).json({ error: 'Failed to get share' });
  }
});

// Create social post
app.post('/api/social/posts', authenticate, async (req, res) => {
  try {
    const { postType, entityType, entityId, title, content, mediaUrls, tags, location, isPublic } = req.body;
    const userId = req.user.id;

    const { error } = postSchema.validate({
      postType, entityType, entityId, title, content, mediaUrls, tags, location, isPublic
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check rate limit
    const canPost = await socialEngine.checkRateLimit(userId, 'post', SOCIAL_CONFIG.maxPostsPerHour, 60);
    if (!canPost) {
      return res.status(429).json({ error: 'Post rate limit exceeded' });
    }

    // Sanitize content
    const sanitizedContent = socialEngine.sanitizeContent(content);

    // Extract hashtags and mentions
    const hashtags = socialEngine.extractHashtags(content);
    const mentions = socialEngine.extractMentions(content);

    // Create post
    const postId = uuidv4();
    await db.execute(`
      INSERT INTO social_posts
      (id, user_id, post_type, entity_type, entity_id, title, content, media_urls, tags, location, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      postId,
      userId,
      postType,
      entityType || null,
      entityId || null,
      title || null,
      sanitizedContent,
      mediaUrls ? JSON.stringify(mediaUrls) : null,
      tags ? JSON.stringify(tags) : null,
      location || null,
      isPublic !== false
    ]);

    // Update hashtag usage
    await socialEngine.updateHashtagUsage(hashtags);

    // Handle mentions
    for (const mention of mentions) {
      // Find mentioned user
      const [mentionedUser] = await db.execute('SELECT id FROM users WHERE username = ?', [mention]);
      if (mentionedUser.length > 0) {
        const mentionId = uuidv4();
        await db.execute(`
          INSERT INTO user_mentions (id, post_id, mentioned_user_id, mentioning_user_id, mention_text)
          VALUES (?, ?, ?, ?, ?)
        `, [mentionId, postId, mentionedUser[0].id, userId, `@${mention}`]);

        // Create notification
        if (rabbitChannel) {
          rabbitChannel.sendToQueue('notification_events', Buffer.from(JSON.stringify({
            type: 'mention',
            userId: mentionedUser[0].id,
            actorId: userId,
            entityType: 'post',
            entityId: postId,
            message: `${req.user.username} mentioned you in a post`
          })));
        }
      }
    }

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('social_events', Buffer.from(JSON.stringify({
        type: 'post_created',
        userId,
        postId,
        postType,
        entityType,
        entityId
      })));
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: { postId }
    });

  } catch (error) {
    logger.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get social feed
app.get('/api/social/feed', authenticate, async (req, res) => {
  try {
    const { type = 'following', page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Try cache first
    const cacheKey = `feed:${userId}:${type}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    let query, params;

    if (type === 'following') {
      query = `
        SELECT sp.*, u.username, u.avatar,
               TIMESTAMPDIFF(HOUR, sp.created_at, NOW()) as age_hours
        FROM social_posts sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.user_id IN (
          SELECT following_id FROM user_follows
          WHERE follower_id = ? AND follow_status = 'active'
        ) AND sp.is_public = true
        ORDER BY sp.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, parseInt(limit), offset];
    } else if (type === 'trending') {
      query = `
        SELECT sp.*, u.username, u.avatar,
               TIMESTAMPDIFF(HOUR, sp.created_at, NOW()) as age_hours,
               (${socialEngine.calculateEngagementScore('sp.like_count', 'sp.comment_count', 'sp.share_count', 'sp.view_count', 'TIMESTAMPDIFF(HOUR, sp.created_at, NOW())')}) as engagement_score
        FROM social_posts sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.is_public = true AND sp.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY engagement_score DESC
        LIMIT ? OFFSET ?
      `;
      params = [parseInt(limit), offset];
    } else {
      // Discovery feed - posts from users not followed
      query = `
        SELECT sp.*, u.username, u.avatar,
               TIMESTAMPDIFF(HOUR, sp.created_at, NOW()) as age_hours
        FROM social_posts sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.user_id NOT IN (
          SELECT following_id FROM user_follows
          WHERE follower_id = ? AND follow_status = 'active'
        ) AND sp.is_public = true AND sp.user_id != ?
        ORDER BY sp.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, userId, parseInt(limit), offset];
    }

    const [posts] = await db.execute(query, params);

    // Get total count
    let countQuery, countParams;
    if (type === 'following') {
      countQuery = `
        SELECT COUNT(*) as total FROM social_posts
        WHERE user_id IN (
          SELECT following_id FROM user_follows
          WHERE follower_id = ? AND follow_status = 'active'
        ) AND is_public = true
      `;
      countParams = [userId];
    } else if (type === 'trending') {
      countQuery = 'SELECT COUNT(*) as total FROM social_posts WHERE is_public = true AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)';
      countParams = [];
    } else {
      countQuery = `
        SELECT COUNT(*) as total FROM social_posts
        WHERE user_id NOT IN (
          SELECT following_id FROM user_follows
          WHERE follower_id = ? AND follow_status = 'active'
        ) AND is_public = true AND user_id != ?
      `;
      countParams = [userId, userId];
    }

    const [countResult] = await db.execute(countQuery, countParams);

    const result = {
      success: true,
      data: {
        posts: posts.map(post => ({
          ...post,
          media_urls: post.media_urls ? JSON.parse(post.media_urls) : [],
          tags: post.tags ? JSON.parse(post.tags) : [],
          engagement_score: post.engagement_score || 0
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    };

    // Cache for feed cache time
    await redisClient.setEx(cacheKey, SOCIAL_CONFIG.feedCacheTimeMinutes * 60, JSON.stringify(result));

    res.json(result);

  } catch (error) {
    logger.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

// Interact with post (like, comment, share)
app.post('/api/social/posts/:postId/interact', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const { interactionType, content } = req.body;
    const userId = req.user.id;

    const { error } = interactionSchema.validate({ interactionType, content });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if post exists
    const [post] = await db.execute('SELECT user_id FROM social_posts WHERE id = ?', [postId]);
    if (!post.length) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postOwnerId = post[0].user_id;

    // Check if interaction already exists
    const [existing] = await db.execute(
      'SELECT id FROM post_interactions WHERE post_id = ? AND user_id = ? AND interaction_type = ?',
      [postId, userId, interactionType]
    );

    if (existing.length > 0) {
      // Remove interaction
      await db.execute('DELETE FROM post_interactions WHERE id = ?', [existing[0].id]);

      // Update post counts
      const countField = `${interactionType}_count`;
      await db.execute(`UPDATE social_posts SET ${countField} = ${countField} - 1 WHERE id = ?`, [postId]);

      return res.json({ success: true, message: `${interactionType} removed` });
    }

    // Create interaction
    const interactionId = uuidv4();
    await db.execute(`
      INSERT INTO post_interactions (id, post_id, user_id, interaction_type, content)
      VALUES (?, ?, ?, ?, ?)
    `, [interactionId, postId, userId, interactionType, content || null]);

    // Update post counts
    const countField = `${interactionType}_count`;
    await db.execute(`UPDATE social_posts SET ${countField} = ${countField} + 1 WHERE id = ?`, [postId]);

    // Create notification for post owner (if not the same user)
    if (postOwnerId !== userId && rabbitChannel) {
      const notificationTypes = {
        like: 'liked your post',
        comment: 'commented on your post',
        share: 'shared your post'
      };

      if (notificationTypes[interactionType]) {
        rabbitChannel.sendToQueue('notification_events', Buffer.from(JSON.stringify({
          type: interactionType,
          userId: postOwnerId,
          actorId: userId,
          entityType: 'post',
          entityId: postId,
          message: `${req.user.username} ${notificationTypes[interactionType]}`
        })));
      }
    }

    res.json({
      success: true,
      message: `Post ${interactionType}d successfully`,
      data: { interactionId }
    });

  } catch (error) {
    logger.error('Post interaction error:', error);
    res.status(500).json({ error: 'Failed to interact with post' });
  }
});

// Get trending hashtags
app.get('/api/social/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const hashtags = await socialEngine.getTrendingHashtags(parseInt(limit));

    res.json({
      success: true,
      data: { hashtags }
    });

  } catch (error) {
    logger.error('Trending hashtags error:', error);
    res.status(500).json({ error: 'Failed to get trending hashtags' });
  }
});

// Get social notifications
app.get('/api/social/notifications/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT sn.*, u.username as actor_name, u.avatar as actor_avatar
      FROM social_notifications sn
      LEFT JOIN users u ON sn.actor_id = u.id
      WHERE sn.user_id = ?
    `;

    const params = [userId];

    if (unreadOnly === 'true') {
      query += ' AND sn.is_read = false';
    }

    query += ' ORDER BY sn.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [notifications] = await db.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM social_notifications WHERE user_id = ?';
    const countParams = [userId];

    if (unreadOnly === 'true') {
      countQuery += ' AND is_read = false';
    }

    const [countResult] = await db.execute(countQuery, countParams);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
app.put('/api/social/notifications/:notificationId/read', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;

    await db.execute('UPDATE social_notifications SET is_read = true WHERE id = ? AND user_id = ?', [notificationId, req.user.id]);

    res.json({ success: true, message: 'Notification marked as read' });

  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
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
    logger.info(`Social service listening on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;