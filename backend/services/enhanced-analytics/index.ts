import express from 'express';
import mysql from 'mysql2/promise';
import redis from 'redis';
import amqp from 'amqplib';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import cron from 'node-cron';
import axios from 'axios';
import PredictiveAnalyticsEngine from './predictive-engine';

const app = express();
const PORT = process.env.PORT || 3019;

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/enhanced-analytics-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/enhanced-analytics.log' })
  ]
});

// Database connection
let db;
let predictiveEngine;
async function connectDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'enhanced_analytics_db'
    });
    predictiveEngine = new PredictiveAnalyticsEngine(db);
    logger.info('Connected to MySQL database');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
}

// Redis connection
let redisClient;
async function connectRedis() {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    await redisClient.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.error('Redis connection failed:', error);
  }
}

// RabbitMQ connection
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();

    // Analytics events queue
    await channel.assertQueue('analytics_events', { durable: true });

    // Listen to events from other services
    const queues = ['order_events', 'user_events', 'product_events', 'payment_events'];

    for (const queueName of queues) {
      await channel.assertQueue(queueName, { durable: true });
      await channel.consume(queueName, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            await processEvent(event);
            channel.ack(msg);
          } catch (error) {
            logger.error(`Error processing event from ${queueName}:`, error);
            channel.nack(msg, false, false);
          }
        }
      });
      logger.info(`Listening to ${queueName} queue`);
    }

    logger.info('Connected to RabbitMQ and set up event listeners');
  } catch (error) {
    logger.error('RabbitMQ connection failed:', error);
  }
}

// Process events from other services for real-time aggregation
async function processEvent(event) {
  try {
    const { type, data, timestamp } = event;

    switch (type) {
      case 'order_created':
        await aggregateOrderMetrics(data);
        break;
      case 'user_registered':
        await aggregateUserMetrics(data);
        break;
      case 'product_viewed':
        await aggregateProductMetrics(data);
        break;
      case 'payment_completed':
        await aggregateRevenueMetrics(data);
        break;
      default:
        logger.info(`Unhandled event type: ${type}`);
    }

    // Store real-time metric
    if (redisClient) {
      await redisClient.set(`event:${type}:${Date.now()}`, JSON.stringify(event), { EX: 3600 });
    }
  } catch (error) {
    logger.error('Error processing event:', error);
  }
}

// Real-time aggregation functions
async function aggregateOrderMetrics(orderData) {
  const { user_id, total_amount, product_count, created_at } = orderData;

  // Update real-time metrics
  await db.execute(
    'INSERT INTO real_time_metrics (metric_key, metric_value, source_service, tags) VALUES (?, ?, ?, ?)',
    ['orders_created', 1, 'transactions', JSON.stringify({ user_id, total_amount })]
  );

  await db.execute(
    'INSERT INTO real_time_metrics (metric_key, metric_value, source_service, tags) VALUES (?, ?, ?, ?)',
    ['revenue_total', total_amount, 'transactions', JSON.stringify({ order_id: orderData.id })]
  );

  // Update advanced metrics
  await db.execute(
    'INSERT INTO advanced_metrics (metric_name, metric_category, metric_value, time_period, calculated_at, data_source) VALUES (?, ?, ?, ?, NOW(), ?)',
    ['Daily Orders', 'conversion', 1, 'daily', 'transactions_service']
  );

  // Cache user order stats
  if (redisClient) {
    const userKey = `user:${user_id}:orders`;
    await redisClient.incr(userKey);
    await redisClient.expire(userKey, 86400); // 24 hours
  }
}

async function aggregateUserMetrics(userData) {
  const { id, created_at } = userData;

  await db.execute(
    'INSERT INTO real_time_metrics (metric_key, metric_value, source_service, tags) VALUES (?, ?, ?, ?)',
    ['users_registered', 1, 'authentication', JSON.stringify({ user_id: id })]
  );

  await db.execute(
    'INSERT INTO advanced_metrics (metric_name, metric_category, metric_value, time_period, calculated_at, data_source) VALUES (?, ?, ?, ?, NOW(), ?)',
    ['Daily Registrations', 'user_engagement', 1, 'daily', 'authentication_service']
  );
}

async function aggregateProductMetrics(productData) {
  const { product_id, user_id } = productData;

  await db.execute(
    'INSERT INTO real_time_metrics (metric_key, metric_value, source_service, tags) VALUES (?, ?, ?, ?)',
    ['product_views', 1, 'products', JSON.stringify({ product_id, user_id })]
  );

  // Cache product view stats
  if (redisClient) {
    const productKey = `product:${product_id}:views`;
    await redisClient.incr(productKey);
    await redisClient.expire(productKey, 3600); // 1 hour
  }
}

async function aggregateRevenueMetrics(paymentData) {
  const { amount, currency, order_id } = paymentData;

  await db.execute(
    'INSERT INTO real_time_metrics (metric_key, metric_value, source_service, tags) VALUES (?, ?, ?, ?)',
    ['revenue_collected', amount, 'transactions', JSON.stringify({ order_id, currency })]
  );

  await db.execute(
    'INSERT INTO advanced_metrics (metric_name, metric_category, metric_value, time_period, calculated_at, data_source) VALUES (?, ?, ?, ?, NOW(), ?)',
    ['Revenue Collected', 'revenue', amount, 'hourly', 'transactions_service']
  );
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// API Routes

// Cohort Analysis APIs
app.get('/api/cohorts', authenticateToken, async (req, res) => {
  try {
    const { type, start_date, end_date } = req.query;
    let query = 'SELECT * FROM cohort_analysis WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND cohort_type = ?';
      params.push(type);
    }
    if (start_date) {
      query += ' AND start_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND end_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching cohorts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/cohorts', authenticateToken, async (req, res) => {
  try {
    const { cohort_name, cohort_type, start_date, end_date, segment_criteria } = req.body;

    const [result] = await db.execute(
      'INSERT INTO cohort_analysis (cohort_name, cohort_type, start_date, end_date, segment_criteria) VALUES (?, ?, ?, ?, ?)',
      [cohort_name, cohort_type, start_date, end_date, JSON.stringify(segment_criteria)]
    );

    res.status(201).json({ id: result.insertId, message: 'Cohort created successfully' });
  } catch (error) {
    logger.error('Error creating cohort:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Predictive Models APIs
app.get('/api/models', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM predictive_models ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching models:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/models', authenticateToken, async (req, res) => {
  try {
    const { model_name, model_type, algorithm, model_parameters } = req.body;

    const [result] = await db.execute(
      'INSERT INTO predictive_models (model_name, model_type, algorithm, model_parameters) VALUES (?, ?, ?, ?)',
      [model_name, model_type, algorithm, JSON.stringify(model_parameters)]
    );

    res.status(201).json({ id: result.insertId, message: 'Model created successfully' });
  } catch (error) {
    logger.error('Error creating model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/models/:id/train', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get model details
    const [models] = await db.execute('SELECT * FROM predictive_models WHERE id = ?', [id]);
    if (models.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const model = models[0];

    // Train the model using predictive engine
    const trainingResult = await predictiveEngine.trainModel(model.model_type, {});

    // Update model with training results
    await db.execute(
      'UPDATE predictive_models SET last_trained_at = NOW(), accuracy_score = ? WHERE id = ?',
      [trainingResult.accuracy, id]
    );

    // Publish training event to RabbitMQ
    if (channel) {
      await channel.sendToQueue('analytics_events', Buffer.from(JSON.stringify({
        event: 'model_trained',
        model_id: id,
        accuracy: trainingResult.accuracy,
        timestamp: new Date()
      })));
    }

    res.json({
      message: 'Model training completed',
      accuracy: trainingResult.accuracy,
      trained_at: trainingResult.trained_at
    });
  } catch (error) {
    logger.error('Error training model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advanced Metrics APIs
app.get('/api/metrics', authenticateToken, async (req, res) => {
  try {
    const { category, period, start_date, end_date } = req.query;
    let query = 'SELECT * FROM advanced_metrics WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND metric_category = ?';
      params.push(category);
    }
    if (period) {
      query += ' AND time_period = ?';
      params.push(period);
    }
    if (start_date) {
      query += ' AND calculated_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND calculated_at <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY calculated_at DESC LIMIT 1000';

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/metrics', authenticateToken, async (req, res) => {
  try {
    const { metric_name, metric_category, metric_value, metric_unit, time_period, data_source, filters_applied } = req.body;

    const [result] = await db.execute(
      'INSERT INTO advanced_metrics (metric_name, metric_category, metric_value, metric_unit, time_period, calculated_at, data_source, filters_applied) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)',
      [metric_name, metric_category, metric_value, metric_unit, time_period, data_source, JSON.stringify(filters_applied)]
    );

    res.status(201).json({ id: result.insertId, message: 'Metric recorded successfully' });
  } catch (error) {
    logger.error('Error recording metric:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard APIs
app.get('/api/dashboards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.execute(
      'SELECT * FROM dashboards WHERE user_id = ? OR is_public = true ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching dashboards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/dashboards', authenticateToken, async (req, res) => {
  try {
    const { dashboard_name, dashboard_description, layout_config, widgets_config, is_public, refresh_interval } = req.body;
    const userId = req.user.id;

    const [result] = await db.execute(
      'INSERT INTO dashboards (dashboard_name, dashboard_description, user_id, is_public, layout_config, widgets_config, refresh_interval) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dashboard_name, dashboard_description, userId, is_public || false, JSON.stringify(layout_config), JSON.stringify(widgets_config), refresh_interval || 300]
    );

    res.status(201).json({ id: result.insertId, message: 'Dashboard created successfully' });
  } catch (error) {
    logger.error('Error creating dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reports APIs
app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM reports WHERE is_active = true ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const { report_name, report_type, report_format, query_config, schedule_config, recipient_emails } = req.body;

    const [result] = await db.execute(
      'INSERT INTO reports (report_name, report_type, report_format, query_config, schedule_config, recipient_emails) VALUES (?, ?, ?, ?, ?, ?)',
      [report_name, report_type, report_format, JSON.stringify(query_config), JSON.stringify(schedule_config), JSON.stringify(recipient_emails)]
    );

    res.status(201).json({ id: result.insertId, message: 'Report created successfully' });
  } catch (error) {
    logger.error('Error creating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Real-time Metrics APIs
app.get('/api/realtime-metrics', authenticateToken, async (req, res) => {
  try {
    const { metric_key, source_service, limit = 100 } = req.query;
    let query = 'SELECT * FROM real_time_metrics WHERE 1=1';
    const params = [];

    if (metric_key) {
      query += ' AND metric_key = ?';
      params.push(metric_key);
    }
    if (source_service) {
      query += ' AND source_service = ?';
      params.push(source_service);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching real-time metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/realtime-metrics', authenticateToken, async (req, res) => {
  try {
    const { metric_key, metric_value, source_service, tags } = req.body;

    const [result] = await db.execute(
      'INSERT INTO real_time_metrics (metric_key, metric_value, source_service, tags) VALUES (?, ?, ?, ?)',
      [metric_key, metric_value, source_service, JSON.stringify(tags)]
    );

    // Cache in Redis for fast access
    if (redisClient) {
      await redisClient.set(`metric:${metric_key}`, metric_value, { EX: 3600 }); // 1 hour expiry
    }

    res.status(201).json({ id: result.insertId, message: 'Metric recorded successfully' });
  } catch (error) {
    logger.error('Error recording real-time metric:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Predictions APIs
app.get('/api/predictions', authenticateToken, async (req, res) => {
  try {
    const { model_id, entity_type, entity_id } = req.query;
    let query = 'SELECT p.*, m.model_name, m.model_type FROM predictions p JOIN predictive_models m ON p.model_id = m.id WHERE 1=1';
    const params = [];

    if (model_id) {
      query += ' AND p.model_id = ?';
      params.push(model_id);
    }
    if (entity_type) {
      query += ' AND p.entity_type = ?';
      params.push(entity_type);
    }
    if (entity_id) {
      query += ' AND p.entity_id = ?';
      params.push(entity_id);
    }

    query += ' ORDER BY p.created_at DESC LIMIT 100';

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/predictions', authenticateToken, async (req, res) => {
  try {
    const { model_id, entity_type, entity_id, prediction_score, prediction_label, confidence_score, prediction_data } = req.body;

    const [result] = await db.execute(
      'INSERT INTO predictions (model_id, entity_type, entity_id, prediction_score, prediction_label, confidence_score, prediction_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [model_id, entity_type, entity_id, prediction_score, prediction_label, confidence_score, JSON.stringify(prediction_data)]
    );

    res.status(201).json({ id: result.insertId, message: 'Prediction recorded successfully' });
  } catch (error) {
    logger.error('Error recording prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Predictive Analytics APIs
app.post('/api/predict/churn/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const prediction = await predictiveEngine.predictChurn(userId);

    // Get or create churn prediction model
    let [models] = await db.execute('SELECT id FROM predictive_models WHERE model_type = "customer_churn" LIMIT 1');
    let modelId = models.length > 0 ? models[0].id : null;

    if (!modelId) {
      const [result] = await db.execute(
        'INSERT INTO predictive_models (model_name, model_type, algorithm) VALUES (?, ?, ?)',
        ['Customer Churn Predictor', 'customer_churn', 'decision_tree']
      );
      modelId = result.insertId;
    }

    // Store prediction
    const [result] = await db.execute(
      'INSERT INTO predictions (model_id, entity_type, entity_id, prediction_score, prediction_label, confidence_score, prediction_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [modelId, 'user', userId, prediction.score, prediction.label, prediction.confidence, JSON.stringify({ type: 'churn' })]
    );

    res.json({
      prediction_id: result.insertId,
      ...prediction
    });
  } catch (error) {
    logger.error('Error predicting churn:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/predict/purchase/:userId/:productId', authenticateToken, async (req, res) => {
  try {
    const { userId, productId } = req.params;

    const prediction = await predictiveEngine.predictPurchase(userId, productId);

    // Get or create purchase prediction model
    let [models] = await db.execute('SELECT id FROM predictive_models WHERE model_type = "purchase_prediction" LIMIT 1');
    let modelId = models.length > 0 ? models[0].id : null;

    if (!modelId) {
      const [result] = await db.execute(
        'INSERT INTO predictive_models (model_name, model_type, algorithm) VALUES (?, ?, ?)',
        ['Purchase Predictor', 'purchase_prediction', 'linear_regression']
      );
      modelId = result.insertId;
    }

    // Store prediction
    const [result] = await db.execute(
      'INSERT INTO predictions (model_id, entity_type, entity_id, prediction_score, prediction_label, confidence_score, prediction_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [modelId, 'user_product', `${userId}_${productId}`, prediction.score, prediction.label, prediction.confidence, JSON.stringify({ user_id: userId, product_id: productId })]
    );

    res.json({
      prediction_id: result.insertId,
      ...prediction
    });
  } catch (error) {
    logger.error('Error predicting purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/predict/recommendation/:userId/:productId', authenticateToken, async (req, res) => {
  try {
    const { userId, productId } = req.params;

    const prediction = await predictiveEngine.calculateRecommendationScore(userId, productId);

    // Get or create recommendation scoring model
    let [models] = await db.execute('SELECT id FROM predictive_models WHERE model_type = "recommendation_score" LIMIT 1');
    let modelId = models.length > 0 ? models[0].id : null;

    if (!modelId) {
      const [result] = await db.execute(
        'INSERT INTO predictive_models (model_name, model_type, algorithm) VALUES (?, ?, ?)',
        ['Recommendation Scorer', 'recommendation_score', 'collaborative_filtering']
      );
      modelId = result.insertId;
    }

    // Store prediction
    const [result] = await db.execute(
      'INSERT INTO predictions (model_id, entity_type, entity_id, prediction_score, confidence_score, prediction_data) VALUES (?, ?, ?, ?, ?, ?)',
      [modelId, 'user_product', `${userId}_${productId}`, prediction.score, prediction.confidence, JSON.stringify({ user_id: userId, product_id: productId })]
    );

    res.json({
      prediction_id: result.insertId,
      ...prediction
    });
  } catch (error) {
    logger.error('Error calculating recommendation score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/optimize/price/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const optimization = await predictiveEngine.optimizePrice(productId);

    // Get or create price optimization model
    let [models] = await db.execute('SELECT id FROM predictive_models WHERE model_type = "price_optimization" LIMIT 1');
    let modelId = models.length > 0 ? models[0].id : null;

    if (!modelId) {
      const [result] = await db.execute(
        'INSERT INTO predictive_models (model_name, model_type, algorithm) VALUES (?, ?, ?)',
        ['Price Optimizer', 'price_optimization', 'regression']
      );
      modelId = result.insertId;
    }

    // Store optimization result as prediction
    const [result] = await db.execute(
      'INSERT INTO predictions (model_id, entity_type, entity_id, prediction_score, confidence_score, prediction_data) VALUES (?, ?, ?, ?, ?, ?)',
      [modelId, 'product', productId, optimization.optimal_price, optimization.confidence, JSON.stringify(optimization)]
    );

    res.json({
      prediction_id: result.insertId,
      ...optimization
    });
  } catch (error) {
    logger.error('Error optimizing price:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cross-service Analytics APIs
app.get('/api/analytics/user-behavior/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Aggregate data from multiple services
    const [userData] = await Promise.allSettled([
      axios.get(`http://localhost:3001/api/users/${userId}`, { headers: { Authorization: `Bearer ${req.headers.authorization}` } }),
      axios.get(`http://localhost:3003/api/orders?user_id=${userId}&limit=100`, { headers: { Authorization: `Bearer ${req.headers.authorization}` } }),
      axios.get(`http://localhost:3002/api/products/views?user_id=${userId}`, { headers: { Authorization: `Bearer ${req.headers.authorization}` } }),
      axios.get(`http://localhost:3008/api/reviews?user_id=${userId}`, { headers: { Authorization: `Bearer ${req.headers.authorization}` } }),
      axios.get(`http://localhost:3014/api/wishlists/user/${userId}`, { headers: { Authorization: `Bearer ${req.headers.authorization}` } })
    ]);

    const behavior = {
      user_id: userId,
      total_orders: userData[1].status === 'fulfilled' ? userData[1].value.data.length : 0,
      total_spent: userData[1].status === 'fulfilled' ?
        userData[1].value.data.reduce((sum, order) => sum + order.total_amount, 0) : 0,
      products_viewed: userData[2].status === 'fulfilled' ? userData[2].value.data.count || 0 : 0,
      reviews_written: userData[3].status === 'fulfilled' ? userData[3].value.data.length : 0,
      wishlist_items: userData[4].status === 'fulfilled' ? userData[4].value.data.length || 0 : 0,
      categories_viewed: userData[2].status === 'fulfilled' ? userData[2].value.data.categories?.length || 0 : 0,
      avg_rating_given: userData[3].status === 'fulfilled' && userData[3].value.data.length > 0 ?
        userData[3].value.data.reduce((sum, r) => sum + r.rating, 0) / userData[3].value.data.length : 0
    };

    res.json(behavior);
  } catch (error) {
    logger.error('Error fetching user behavior:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/analytics/user-activity/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get activity from real-time metrics
    const [activities] = await db.execute(
      'SELECT * FROM real_time_metrics WHERE tags LIKE ? ORDER BY timestamp DESC LIMIT 50',
      [`%${userId}%`]
    );

    const activitySummary = {
      user_id: userId,
      total_actions: activities.length,
      recent_actions: activities.slice(0, 10),
      action_types: activities.reduce((acc, activity) => {
        acc[activity.metric_key] = (acc[activity.metric_key] || 0) + 1;
        return acc;
      }, {}),
      last_activity: activities.length > 0 ? activities[0].timestamp : null
    };

    res.json(activitySummary);
  } catch (error) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/analytics/business-overview', authenticateToken, async (req, res) => {
  try {
    // Aggregate business metrics from all services
    const [metrics] = await db.execute(`
      SELECT
        metric_category,
        SUM(metric_value) as total_value,
        AVG(metric_value) as avg_value,
        COUNT(*) as count,
        MAX(calculated_at) as latest_update
      FROM advanced_metrics
      WHERE calculated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY metric_category
    `);

    const overview = {
      total_revenue: metrics.find(m => m.metric_category === 'revenue')?.total_value || 0,
      total_users: metrics.find(m => m.metric_category === 'user_engagement')?.total_value || 0,
      total_orders: metrics.find(m => m.metric_category === 'conversion')?.total_value || 0,
      avg_order_value: metrics.find(m => m.metric_category === 'conversion')?.avg_value || 0,
      performance_score: metrics.find(m => m.metric_category === 'performance')?.avg_value || 0,
      last_updated: metrics.length > 0 ? Math.max(...metrics.map(m => new Date(m.latest_update))) : null
    };

    res.json(overview);
  } catch (error) {
    logger.error('Error fetching business overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/analytics/cross-service-report', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Generate comprehensive report across all services
    const report = {
      period: { start_date, end_date },
      revenue: await getRevenueReport(start_date, end_date),
      users: await getUserReport(start_date, end_date),
      products: await getProductReport(start_date, end_date),
      orders: await getOrderReport(start_date, end_date),
      predictions: await getPredictionSummary()
    };

    res.json(report);
  } catch (error) {
    logger.error('Error generating cross-service report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for cross-service reporting
async function getRevenueReport(startDate, endDate) {
  const [revenue] = await db.execute(`
    SELECT SUM(metric_value) as total, AVG(metric_value) as average, COUNT(*) as transactions
    FROM advanced_metrics
    WHERE metric_category = 'revenue' AND calculated_at BETWEEN ? AND ?
  `, [startDate, endDate]);

  return revenue[0] || { total: 0, average: 0, transactions: 0 };
}

async function getUserReport(startDate, endDate) {
  const [users] = await db.execute(`
    SELECT SUM(metric_value) as total_active, AVG(metric_value) as avg_engagement
    FROM advanced_metrics
    WHERE metric_category = 'user_engagement' AND calculated_at BETWEEN ? AND ?
  `, [startDate, endDate]);

  return users[0] || { total_active: 0, avg_engagement: 0 };
}

async function getProductReport(startDate, endDate) {
  const [products] = await db.execute(`
    SELECT COUNT(DISTINCT entity_id) as unique_products, AVG(metric_value) as avg_performance
    FROM advanced_metrics
    WHERE metric_category = 'performance' AND calculated_at BETWEEN ? AND ?
  `, [startDate, endDate]);

  return products[0] || { unique_products: 0, avg_performance: 0 };
}

async function getOrderReport(startDate, endDate) {
  const [orders] = await db.execute(`
    SELECT SUM(metric_value) as total_orders, AVG(metric_value) as avg_conversion
    FROM advanced_metrics
    WHERE metric_category = 'conversion' AND calculated_at BETWEEN ? AND ?
  `, [startDate, endDate]);

  return orders[0] || { total_orders: 0, avg_conversion: 0 };
}

async function getPredictionSummary() {
  const [predictions] = await db.execute(`
    SELECT
      entity_type,
      COUNT(*) as total_predictions,
      AVG(prediction_score) as avg_score,
      AVG(confidence_score) as avg_confidence
    FROM predictions
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY entity_type
  `);

  return predictions;
}

// Custom Alerts APIs
app.get('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM custom_alerts ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const { alert_name, alert_condition, alert_threshold, alert_channels } = req.body;

    const [result] = await db.execute(
      'INSERT INTO custom_alerts (alert_name, alert_condition, alert_threshold, alert_channels) VALUES (?, ?, ?, ?)',
      [alert_name, JSON.stringify(alert_condition), JSON.stringify(alert_threshold), JSON.stringify(alert_channels)]
    );

    res.status(201).json({ id: result.insertId, message: 'Alert created successfully' });
  } catch (error) {
    logger.error('Error creating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Scheduled tasks for automated reporting and model retraining
cron.schedule('0 0 * * *', async () => { // Daily at midnight
  try {
    logger.info('Running daily analytics aggregation...');

    // Aggregate daily metrics
    const [dailyMetrics] = await db.execute(`
      SELECT
        DATE(calculated_at) as date,
        metric_category,
        AVG(metric_value) as avg_value,
        SUM(metric_value) as sum_value,
        COUNT(*) as count,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value
      FROM advanced_metrics
      WHERE calculated_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      GROUP BY DATE(calculated_at), metric_category
    `);

    // Store aggregated daily metrics
    for (const metric of dailyMetrics) {
      await db.execute(
        'INSERT INTO advanced_metrics (metric_name, metric_category, metric_value, time_period, calculated_at, data_source, filters_applied) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [`${metric.metric_category}_daily_aggregate`, metric.metric_category, metric.sum_value, 'daily', new Date(), 'analytics_service', JSON.stringify({ aggregation_type: 'daily_sum' })]
      );
    }

    // Update cohort retention rates
    await updateCohortRetention();

    // Clean up old real-time metrics (keep last 7 days)
    await db.execute('DELETE FROM real_time_metrics WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY)');

    // Process scheduled reports
    const [reports] = await db.execute('SELECT * FROM reports WHERE report_type = "scheduled" AND is_active = true AND next_run_at <= NOW()');

    for (const report of reports) {
      await generateScheduledReport(report);
      // Update next run time (simplified - assuming daily reports)
      await db.execute('UPDATE reports SET last_run_at = NOW(), next_run_at = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE id = ?', [report.id]);
    }

    // Retrain models weekly (if it's Sunday)
    const today = new Date().getDay();
    if (today === 0) {
      await retrainModels();
    }

  } catch (error) {
    logger.error('Error in daily scheduled task:', error);
  }
});

// Hourly aggregation for more frequent metrics
cron.schedule('0 * * * *', async () => { // Every hour
  try {
    logger.info('Running hourly analytics aggregation...');

    // Aggregate hourly revenue and user activity
    const [hourlyData] = await db.execute(`
      SELECT
        'revenue' as metric_type,
        SUM(metric_value) as total_value,
        COUNT(*) as event_count
      FROM real_time_metrics
      WHERE metric_key = 'revenue_total' AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      UNION ALL
      SELECT
        'orders' as metric_type,
        SUM(metric_value) as total_value,
        COUNT(*) as event_count
      FROM real_time_metrics
      WHERE metric_key = 'orders_created' AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      UNION ALL
      SELECT
        'users_registered' as metric_type,
        SUM(metric_value) as total_value,
        COUNT(*) as event_count
      FROM real_time_metrics
      WHERE metric_key = 'users_registered' AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);

    for (const data of hourlyData) {
      await db.execute(
        'INSERT INTO advanced_metrics (metric_name, metric_category, metric_value, time_period, calculated_at, data_source) VALUES (?, ?, ?, ?, NOW(), ?)',
        [`${data.metric_type}_hourly`, getCategoryFromType(data.metric_type), data.total_value, 'hourly', 'analytics_service']
      );
    }

  } catch (error) {
    logger.error('Error in hourly scheduled task:', error);
  }
});

// Helper functions
async function updateCohortRetention() {
  const [cohorts] = await db.execute('SELECT * FROM cohort_analysis WHERE end_date IS NULL OR end_date > NOW()');

  for (const cohort of cohorts) {
    // Calculate retention (simplified - in real implementation, more complex logic)
    const [retentionData] = await db.execute(`
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM user_activity
      WHERE activity_date >= ? AND activity_date <= DATE_ADD(?, INTERVAL 30 DAY)
    `, [cohort.start_date, cohort.start_date]);

    const retentionRate = retentionData[0]?.active_users || 0;
    await db.execute('UPDATE cohort_analysis SET retention_rate = ?, user_count = ? WHERE id = ?',
      [retentionRate, retentionData[0]?.active_users || 0, cohort.id]);
  }
}

async function generateScheduledReport(report) {
  try {
    const queryConfig = JSON.parse(report.query_config);
    // Simplified report generation - in real implementation, execute complex queries
    const [data] = await db.execute(queryConfig.sql || 'SELECT COUNT(*) as count FROM advanced_metrics');

    // Send report via email (simplified - would integrate with email service)
    logger.info(`Generated report ${report.report_name} with ${data.length} records`);

    // Store report result
    await db.execute(
      'INSERT INTO advanced_metrics (metric_name, metric_category, metric_value, time_period, calculated_at, data_source) VALUES (?, ?, ?, ?, NOW(), ?)',
      [`report_${report.report_name}`, 'reporting', data.length, 'daily', 'analytics_service']
    );

  } catch (error) {
    logger.error(`Error generating report ${report.id}:`, error);
  }
}

async function retrainModels() {
  try {
    const [models] = await db.execute('SELECT * FROM predictive_models WHERE is_active = true');

    for (const model of models) {
      logger.info(`Retraining model: ${model.model_name}`);
      const trainingResult = await predictiveEngine.trainModel(model.model_type, {});

      await db.execute(
        'UPDATE predictive_models SET last_trained_at = NOW(), accuracy_score = ? WHERE id = ?',
        [trainingResult.accuracy, model.id]
      );
    }

    logger.info('Model retraining completed');
  } catch (error) {
    logger.error('Error in model retraining:', error);
  }
}

function getCategoryFromType(type) {
  const categoryMap = {
    revenue: 'revenue',
    orders: 'conversion',
    users_registered: 'user_engagement'
  };
  return categoryMap[type] || 'performance';
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  await connectDB();
  await connectRedis();
  await connectRabbitMQ();

  app.listen(PORT, () => {
    logger.info(`Enhanced Analytics Service running on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});