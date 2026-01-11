const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const amqp = require('amqplib');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const Joi = require('joi');
const _ = require('lodash');
const Decimal = require('decimal.js');

// Environment variables
const PORT = process.env.PORT || 3017;
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'marketplace_loyalty',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

// Loyalty Configuration
const LOYALTY_CONFIG = {
  pointsExpiryMonths: parseInt(process.env.POINTS_EXPIRY_MONTHS || '24'),
  referralBonusPoints: parseInt(process.env.REFERRAL_BONUS_POINTS || '500'),
  refereeBonusPoints: parseInt(process.env.REFERRER_BONUS_POINTS || '250'),
  signupBonusPoints: parseInt(process.env.SIGNUP_BONUS_POINTS || '100'),
  reviewBonusPoints: parseInt(process.env.REVIEW_BONUS_POINTS || '50'),
  birthdayBonusPoints: parseInt(process.env.BIRTHDAY_BONUS_POINTS || '200'),
  pointsPerDollarSpent: parseFloat(process.env.POINTS_PER_DOLLAR || '1.0'),
  minimumPurchaseForPoints: parseFloat(process.env.MIN_PURCHASE_POINTS || '10.0')
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
  defaultMeta: { service: 'loyalty-service' },
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
    await rabbitChannel.assertQueue('loyalty_events', { durable: true });
    await rabbitChannel.assertQueue('points_transactions', { durable: true });
    logger.info('Connected to RabbitMQ');

  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    process.exit(1);
  }
}

// Loyalty Engine Class
class LoyaltyEngine {
  constructor() {
    this.config = LOYALTY_CONFIG;
  }

  // Calculate points for purchase
  calculatePurchasePoints(orderTotal, userTier = 'bronze') {
    const total = new Decimal(orderTotal);

    if (total.lt(this.config.minimumPurchaseForPoints)) {
      return new Decimal(0);
    }

    let points = total.mul(this.config.pointsPerDollarSpent);

    // Apply tier multiplier
    const tierMultipliers = {
      bronze: 1.0,
      silver: 1.1,
      gold: 1.2,
      platinum: 1.3,
      diamond: 1.5
    };

    points = points.mul(tierMultipliers[userTier] || 1.0);

    return points.toDecimalPlaces(2);
  }

  // Generate referral code
  generateReferralCode(userId) {
    const hash = crypto.createHash('md5').update(userId + Date.now().toString()).digest('hex');
    return hash.substring(0, 8).toUpperCase();
  }

  // Calculate tier progress
  calculateTierProgress(currentPoints, currentTier) {
    const tiers = {
      bronze: { min: 0, max: 1000 },
      silver: { min: 1000, max: 5000 },
      gold: { min: 5000, max: 15000 },
      platinum: { min: 15000, max: 50000 },
      diamond: { min: 50000, max: null }
    };

    const tierInfo = tiers[currentTier];
    if (!tierInfo) return 0;

    if (tierInfo.max === null) return 100; // Diamond tier - no max

    const tierRange = tierInfo.max - tierInfo.min;
    const progress = ((currentPoints - tierInfo.min) / tierRange) * 100;

    return Math.min(Math.max(progress, 0), 100);
  }

  // Get next tier
  getNextTier(currentTier) {
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
      return null; // Already at highest tier
    }

    return tierOrder[currentIndex + 1];
  }

  // Check if user qualifies for tier upgrade
  checkTierUpgrade(currentPoints, currentTier) {
    const tierRequirements = {
      silver: 1000,
      gold: 5000,
      platinum: 15000,
      diamond: 50000
    };

    const nextTier = this.getNextTier(currentTier);
    if (!nextTier) return false;

    const requiredPoints = tierRequirements[nextTier];
    return currentPoints >= requiredPoints;
  }

  // Generate QR code for referral
  async generateReferralQR(referralCode, referralUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(referralUrl, {
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
}

const loyaltyEngine = new LoyaltyEngine();

// Validation schemas
const pointsTransactionSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  points: Joi.number().positive().required(),
  transactionType: Joi.string().valid('earned', 'redeemed', 'expired', 'adjusted', 'bonus').required(),
  referenceType: Joi.string().valid('purchase', 'review', 'referral', 'signup', 'birthday', 'manual', 'expiration').required(),
  referenceId: Joi.string().uuid().optional(),
  description: Joi.string().max(500).optional()
});

const rewardRedemptionSchema = Joi.object({
  rewardId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required()
});

const referralSchema = Joi.object({
  referrerId: Joi.string().uuid().required(),
  refereeEmail: Joi.string().email().required()
});

// Routes

// Get user loyalty account
app.get('/api/loyalty/account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Try cache first
    const cacheKey = `loyalty_account:${userId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Get account from database
    const [account] = await db.execute(
      'SELECT * FROM loyalty_accounts WHERE user_id = ? AND is_active = true',
      [userId]
    );

    if (!account.length) {
      // Create new account if it doesn't exist
      const accountId = uuidv4();
      await db.execute(
        'INSERT INTO loyalty_accounts (id, user_id) VALUES (?, ?)',
        [accountId, userId]
      );

      const newAccount = {
        id: accountId,
        user_id: userId,
        current_points: 0,
        total_points_earned: 0,
        total_points_redeemed: 0,
        current_tier: 'bronze',
        tier_progress: 0,
        is_active: true
      };

      // Cache for 5 minutes
      await redisClient.setEx(cacheKey, 300, JSON.stringify(newAccount));

      return res.json(newAccount);
    }

    const accountData = account[0];
    const tierProgress = loyaltyEngine.calculateTierProgress(
      parseFloat(accountData.current_points),
      accountData.current_tier
    );

    const response = {
      ...accountData,
      tier_progress: tierProgress,
      next_tier: loyaltyEngine.getNextTier(accountData.current_tier)
    };

    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(response));

    res.json(response);

  } catch (error) {
    logger.error('Get loyalty account error:', error);
    res.status(500).json({ error: 'Failed to get loyalty account' });
  }
});

// Award points to user
app.post('/api/loyalty/points/award', async (req, res) => {
  try {
    const { userId, points, transactionType, referenceType, referenceId, description } = req.body;

    const { error } = pointsTransactionSchema.validate({
      userId, points, transactionType, referenceType, referenceId, description
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Get current account balance
    const [account] = await db.execute(
      'SELECT current_points FROM loyalty_accounts WHERE user_id = ? AND is_active = true',
      [userId]
    );

    if (!account.length) {
      return res.status(404).json({ error: 'Loyalty account not found' });
    }

    const currentBalance = parseFloat(account[0].current_points);
    const pointsToAdd = parseFloat(points);
    const newBalance = currentBalance + pointsToAdd;

    // Record transaction
    const transactionId = uuidv4();
    await db.execute(`
      INSERT INTO points_transactions
      (id, user_id, transaction_type, points, balance_before, balance_after, reference_type, reference_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      transactionId,
      userId,
      transactionType,
      pointsToAdd,
      currentBalance,
      newBalance,
      referenceType,
      referenceId || null,
      description || null
    ]);

    // Update account balance and totals
    if (transactionType === 'earned') {
      await db.execute(`
        UPDATE loyalty_accounts
        SET current_points = ?, total_points_earned = total_points_earned + ?, updated_at = NOW()
        WHERE user_id = ?
      `, [newBalance, pointsToAdd, userId]);
    } else if (transactionType === 'redeemed') {
      await db.execute(`
        UPDATE loyalty_accounts
        SET current_points = ?, total_points_redeemed = total_points_redeemed + ?, updated_at = NOW()
        WHERE user_id = ?
      `, [newBalance, Math.abs(pointsToAdd), userId]);
    }

    // Check for tier upgrade
    const updatedAccount = await checkAndUpgradeTier(userId);

    // Clear cache
    const cacheKey = `loyalty_account:${userId}`;
    await redisClient.del(cacheKey);

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('loyalty_events', Buffer.from(JSON.stringify({
        type: 'points_awarded',
        userId,
        points: pointsToAdd,
        transactionType,
        referenceType,
        newBalance
      })));
    }

    res.json({
      success: true,
      message: 'Points awarded successfully',
      transactionId,
      newBalance: updatedAccount.current_points,
      tier: updatedAccount.current_tier
    });

  } catch (error) {
    logger.error('Award points error:', error);
    res.status(500).json({ error: 'Failed to award points' });
  }
});

// Get points transaction history
app.get('/api/loyalty/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    let query = `
      SELECT * FROM points_transactions
      WHERE user_id = ?
    `;

    const params = [userId];

    if (type) {
      query += ' AND transaction_type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const [transactions] = await db.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM points_transactions WHERE user_id = ?';
    const countParams = [userId];

    if (type) {
      countQuery += ' AND transaction_type = ?';
      countParams.push(type);
    }

    const [countResult] = await db.execute(countQuery, countParams);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Get rewards catalog
app.get('/api/loyalty/rewards', async (req, res) => {
  try {
    const { category, minPoints, maxPoints, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT * FROM rewards_catalog
      WHERE is_active = true AND (valid_until IS NULL OR valid_until > NOW())
    `;

    const params = [];

    if (category) {
      query += ' AND reward_type = ?';
      params.push(category);
    }

    if (minPoints) {
      query += ' AND points_required >= ?';
      params.push(parseFloat(minPoints));
    }

    if (maxPoints) {
      query += ' AND points_required <= ?';
      params.push(parseFloat(maxPoints));
    }

    query += ' ORDER BY sort_order ASC, points_required ASC LIMIT ? OFFSET ?';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const [rewards] = await db.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM rewards_catalog WHERE is_active = true';
    const countParams = [];

    if (category) {
      countQuery += ' AND reward_type = ?';
      countParams.push(category);
    }

    const [countResult] = await db.execute(countQuery, countParams);

    res.json({
      success: true,
      data: {
        rewards: rewards.map(reward => ({
          ...reward,
          value: parseFloat(reward.value),
          points_required: parseFloat(reward.points_required)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get rewards error:', error);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

// Redeem reward
app.post('/api/loyalty/rewards/redeem', async (req, res) => {
  try {
    const { rewardId, userId } = req.body;

    const { error } = rewardRedemptionSchema.validate({ rewardId, userId });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Get reward details
    const [reward] = await db.execute(
      'SELECT * FROM rewards_catalog WHERE id = ? AND is_active = true',
      [rewardId]
    );

    if (!reward.length) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    const rewardData = reward[0];

    // Check if reward is still available
    if (rewardData.max_claims > 0 && rewardData.claims_count >= rewardData.max_claims) {
      return res.status(400).json({ error: 'Reward is no longer available' });
    }

    // Get user account
    const [account] = await db.execute(
      'SELECT current_points FROM loyalty_accounts WHERE user_id = ? AND is_active = true',
      [userId]
    );

    if (!account.length) {
      return res.status(404).json({ error: 'Loyalty account not found' });
    }

    const currentPoints = parseFloat(account[0].current_points);
    const pointsRequired = parseFloat(rewardData.points_required);

    if (currentPoints < pointsRequired) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Generate redemption code
    const redemptionCode = `RWD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create redemption record
    const redemptionId = uuidv4();
    await db.execute(`
      INSERT INTO reward_redemptions
      (id, user_id, reward_id, points_used, redemption_code, redemption_status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [redemptionId, userId, rewardId, pointsRequired, redemptionCode]);

    // Deduct points
    const newBalance = currentPoints - pointsRequired;
    await db.execute(
      'UPDATE loyalty_accounts SET current_points = ?, total_points_redeemed = total_points_redeemed + ? WHERE user_id = ?',
      [newBalance, pointsRequired, userId]
    );

    // Update reward claims count
    await db.execute(
      'UPDATE rewards_catalog SET claims_count = claims_count + 1 WHERE id = ?',
      [rewardId]
    );

    // Record points transaction
    const transactionId = uuidv4();
    await db.execute(`
      INSERT INTO points_transactions
      (id, user_id, transaction_type, points, balance_before, balance_after, reference_type, reference_id, description)
      VALUES (?, ?, 'redeemed', ?, ?, ?, 'reward', ?, ?)
    `, [
      transactionId,
      userId,
      -pointsRequired,
      currentPoints,
      newBalance,
      redemptionId,
      `Redeemed ${rewardData.reward_name}`
    ]);

    // Clear cache
    const cacheKey = `loyalty_account:${userId}`;
    await redisClient.del(cacheKey);

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('loyalty_events', Buffer.from(JSON.stringify({
        type: 'reward_redeemed',
        userId,
        rewardId,
        redemptionId,
        pointsUsed: pointsRequired
      })));
    }

    res.json({
      success: true,
      message: 'Reward redeemed successfully',
      data: {
        redemptionId,
        redemptionCode,
        newBalance,
        reward: rewardData
      }
    });

  } catch (error) {
    logger.error('Redeem reward error:', error);
    res.status(500).json({ error: 'Failed to redeem reward' });
  }
});

// Get user redemptions
app.get('/api/loyalty/redemptions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    let query = `
      SELECT rr.*, rc.reward_name, rc.reward_type, rc.value
      FROM reward_redemptions rr
      JOIN rewards_catalog rc ON rr.reward_id = rc.id
      WHERE rr.user_id = ?
    `;

    const params = [userId];

    if (status) {
      query += ' AND rr.redemption_status = ?';
      params.push(status);
    }

    query += ' ORDER BY rr.created_at DESC LIMIT ? OFFSET ?';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const [redemptions] = await db.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM reward_redemptions WHERE user_id = ?';
    const countParams = [userId];

    if (status) {
      countQuery += ' AND redemption_status = ?';
      countParams.push(status);
    }

    const [countResult] = await db.execute(countQuery, countParams);

    res.json({
      success: true,
      data: {
        redemptions: redemptions.map(redemption => ({
          ...redemption,
          value: parseFloat(redemption.value),
          points_used: parseFloat(redemption.points_used)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get redemptions error:', error);
    res.status(500).json({ error: 'Failed to get redemptions' });
  }
});

// Create referral
app.post('/api/loyalty/referrals', async (req, res) => {
  try {
    const { referrerId, refereeEmail } = req.body;

    const { error } = referralSchema.validate({ referrerId, refereeEmail });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if referee already exists
    const [existingReferral] = await db.execute(
      'SELECT id FROM referral_program WHERE referrer_id = ? AND referee_email = ?',
      [referrerId, refereeEmail]
    );

    if (existingReferral.length > 0) {
      return res.status(400).json({ error: 'Referral already exists for this email' });
    }

    // Generate referral code and URL
    const referralCode = loyaltyEngine.generateReferralCode(referrerId);
    const referralUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/ref/${referralCode}`;

    // Generate QR code
    const qrCode = await loyaltyEngine.generateReferralQR(referralCode, referralUrl);

    // Create referral record
    const referralId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3); // 3 months expiry

    await db.execute(`
      INSERT INTO referral_program
      (id, referrer_id, referee_email, referral_code, expires_at, referral_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      referralId,
      referrerId,
      refereeEmail,
      referralCode,
      expiresAt,
      JSON.stringify({ qr_code: qrCode, referral_url: referralUrl })
    ]);

    res.json({
      success: true,
      message: 'Referral created successfully',
      data: {
        referralId,
        referralCode,
        referralUrl,
        qrCode,
        expiresAt
      }
    });

  } catch (error) {
    logger.error('Create referral error:', error);
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

// Get referral by code
app.get('/api/loyalty/referrals/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const [referral] = await db.execute(
      'SELECT * FROM referral_program WHERE referral_code = ? AND expires_at > NOW()',
      [code]
    );

    if (!referral.length) {
      return res.status(404).json({ error: 'Invalid or expired referral code' });
    }

    const referralData = referral[0];
    const referralInfo = {
      ...referralData,
      referral_data: JSON.parse(referralData.referral_data || '{}')
    };

    res.json({
      success: true,
      data: referralInfo
    });

  } catch (error) {
    logger.error('Get referral error:', error);
    res.status(500).json({ error: 'Failed to get referral' });
  }
});

// Get loyalty tiers
app.get('/api/loyalty/tiers', async (req, res) => {
  try {
    const [tiers] = await db.execute(
      'SELECT * FROM loyalty_tiers WHERE is_active = true ORDER BY tier_level ASC'
    );

    res.json({
      success: true,
      data: {
        tiers: tiers.map(tier => ({
          ...tier,
          min_points: parseFloat(tier.min_points),
          max_points: tier.max_points ? parseFloat(tier.max_points) : null,
          multiplier: parseFloat(tier.multiplier)
        }))
      }
    });

  } catch (error) {
    logger.error('Get tiers error:', error);
    res.status(500).json({ error: 'Failed to get tiers' });
  }
});

// Get loyalty analytics
app.get('/api/loyalty/analytics', async (req, res) => {
  try {
    const { period = '30d', metric } = req.query;

    let query = `
      SELECT
        DATE(date) as date,
        metric_type,
        SUM(metric_value) as total_value,
        SUM(count_value) as total_count
      FROM loyalty_analytics
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ${period.replace('d', '')} DAY)
    `;

    const params = [];

    if (metric) {
      query += ' AND metric_type = ?';
      params.push(metric);
    }

    query += ' GROUP BY DATE(date), metric_type ORDER BY date DESC';

    const [analytics] = await db.execute(query, params);

    res.json({
      success: true,
      data: {
        period,
        analytics: analytics.map(row => ({
          ...row,
          total_value: parseFloat(row.total_value),
          total_count: parseInt(row.total_count)
        }))
      }
    });

  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Admin routes
app.post('/api/admin/loyalty/rewards', async (req, res) => {
  try {
    // Check admin permissions - simplified for demo
    const { name, type, description, pointsRequired, value, maxClaims } = req.body;

    const rewardId = uuidv4();
    await db.execute(`
      INSERT INTO rewards_catalog
      (id, reward_name, reward_type, description, points_required, value, max_claims)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [rewardId, name, type, description, pointsRequired, value, maxClaims]);

    res.status(201).json({
      success: true,
      message: 'Reward created successfully',
      rewardId
    });

  } catch (error) {
    logger.error('Create reward error:', error);
    res.status(500).json({ error: 'Failed to create reward' });
  }
});

// Helper function to check and upgrade tier
async function checkAndUpgradeTier(userId) {
  try {
    const [account] = await db.execute(
      'SELECT current_points, current_tier FROM loyalty_accounts WHERE user_id = ? AND is_active = true',
      [userId]
    );

    if (!account.length) return;

    const { current_points, current_tier } = account[0];

    if (loyaltyEngine.checkTierUpgrade(parseFloat(current_points), current_tier)) {
      const nextTier = loyaltyEngine.getNextTier(current_tier);

      if (nextTier) {
        await db.execute(
          'UPDATE loyalty_accounts SET current_tier = ?, tier_upgrade_date = NOW() WHERE user_id = ?',
          [nextTier, userId]
        );

        // Publish tier upgrade event
        if (rabbitChannel) {
          rabbitChannel.sendToQueue('loyalty_events', Buffer.from(JSON.stringify({
            type: 'tier_upgraded',
            userId,
            oldTier: current_tier,
            newTier: nextTier,
            points: current_points
          })));
        }

        return { current_points, current_tier: nextTier };
      }
    }

    return { current_points, current_tier };
  } catch (error) {
    logger.error('Tier upgrade check error:', error);
    return null;
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
    logger.info(`Loyalty service listening on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;