const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const amqp = require('amqplib');
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const Joi = require('joi');
const natural = require('natural');
const stopword = require('stopword');
const _ = require('lodash');

// Environment variables
const PORT = process.env.PORT || 3015;
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'marketplace_search',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const ELASTICSEARCH_NODE = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';

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

// Stricter rate limiting for search endpoints
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 search requests per minute
  message: 'Too many search requests, please try again later.'
});
app.use('/api/search', searchLimiter);

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'search-service' },
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
let elasticsearchClient;

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
    await rabbitChannel.assertQueue('search_events', { durable: true });
    await rabbitChannel.assertQueue('product_updates', { durable: true });
    logger.info('Connected to RabbitMQ');

    // Elasticsearch connection
    elasticsearchClient = new ElasticsearchClient({
      node: ELASTICSEARCH_NODE,
      maxRetries: 5,
      requestTimeout: 60000,
    });

    // Test Elasticsearch connection
    await elasticsearchClient.ping();
    logger.info('Connected to Elasticsearch');

  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    process.exit(1);
  }
}

// Validation schemas
const searchSchema = Joi.object({
  q: Joi.string().min(1).max(500).optional(),
  category: Joi.string().optional(),
  brand: Joi.string().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  inStock: Joi.boolean().optional(),
  sortBy: Joi.string().valid('relevance', 'price_asc', 'price_desc', 'newest', 'rating', 'popularity').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  filters: Joi.object().optional()
});

const autocompleteSchema = Joi.object({
  q: Joi.string().min(1).max(100).required(),
  limit: Joi.number().integer().min(1).max(20).optional()
});

// Search utilities
class SearchEngine {
  constructor() {
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
  }

  // Process search query
  processQuery(query) {
    if (!query) return '';

    // Tokenize and remove stopwords
    let tokens = this.tokenizer.tokenize(query.toLowerCase());
    tokens = stopword.removeStopwords(tokens);

    // Stem tokens
    const stemmedTokens = tokens.map(token => this.stemmer.stem(token));

    return stemmedTokens.join(' ');
  }

  // Build Elasticsearch query
  buildSearchQuery(processedQuery, filters = {}) {
    const queryBody = {
      bool: {
        must: [],
        filter: [],
        should: [],
        minimum_should_match: processedQuery ? 1 : 0
      }
    };

    // Main search query
    if (processedQuery) {
      queryBody.bool.must.push({
        multi_match: {
          query: processedQuery,
          fields: [
            'name^3',           // Title gets highest weight
            'description^2',    // Description gets medium weight
            'category^2',       // Category gets medium weight
            'brand^1.5',        // Brand gets lower weight
            'tags^1.5',         // Tags get lower weight
            'sku^1'             // SKU gets lowest weight
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'and'
        }
      });

      // Fuzzy matching for typos
      queryBody.bool.should.push({
        multi_match: {
          query: processedQuery,
          fields: ['name', 'description'],
          fuzziness: 2,
          prefix_length: 1
        }
      });
    }

    // Filters
    if (filters.category) {
      queryBody.bool.filter.push({
        term: { category: filters.category }
      });
    }

    if (filters.brand) {
      queryBody.bool.filter.push({
        term: { brand: filters.brand }
      });
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceRange = {};
      if (filters.minPrice !== undefined) priceRange.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) priceRange.lte = filters.maxPrice;

      queryBody.bool.filter.push({
        range: { price: priceRange }
      });
    }

    if (filters.inStock !== undefined) {
      queryBody.bool.filter.push({
        term: { in_stock: filters.inStock }
      });
    }

    return queryBody;
  }

  // Build sort query
  buildSortQuery(sortBy = 'relevance') {
    const sortOptions = {
      relevance: ['_score', { created_at: 'desc' }],
      price_asc: [{ price: 'asc' }, '_score'],
      price_desc: [{ price: 'desc' }, '_score'],
      newest: [{ created_at: 'desc' }, '_score'],
      rating: [{ average_rating: 'desc' }, '_score'],
      popularity: [{ sales_count: 'desc' }, '_score']
    };

    return sortOptions[sortBy] || sortOptions.relevance;
  }

  // Calculate search relevance score
  calculateRelevanceScore(searchTerm, product) {
    let score = 0;

    // Exact title match gets highest score
    if (product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      score += 100;
    }

    // Category match
    if (product.category.toLowerCase().includes(searchTerm.toLowerCase())) {
      score += 50;
    }

    // Description match
    if (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      score += 25;
    }

    // Brand match
    if (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) {
      score += 20;
    }

    // Tag matches
    if (product.tags) {
      const tagMatches = product.tags.filter(tag =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      ).length;
      score += tagMatches * 15;
    }

    // Popularity boost
    score += (product.sales_count || 0) * 0.1;
    score += (product.average_rating || 0) * 5;

    // Recency boost (newer products get slight boost)
    const daysSinceCreated = (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysSinceCreated) * 0.1;

    return score;
  }
}

const searchEngine = new SearchEngine();

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      req.user = null; // Allow anonymous searches
      return next();
    }

    // Verify token with auth service
    const response = await fetch(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      req.user = null;
      return next();
    }

    const userData = await response.json();
    req.user = userData.data;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    req.user = null;
    next();
  }
};

// Routes

// Main search endpoint
app.post('/api/search', authenticate, async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      inStock,
      sortBy = 'relevance',
      page = 1,
      limit = 20,
      filters = {}
    } = req.body;

    // Validate input
    const { error } = searchSchema.validate({
      q, category, brand, minPrice, maxPrice, inStock, sortBy, page, limit, filters
    });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Process search query
    const processedQuery = searchEngine.processQuery(q);
    const searchFilters = { category, brand, minPrice, maxPrice, inStock, ...filters };

    // Check cache first
    const cacheKey = `search:${processedQuery}:${JSON.stringify(searchFilters)}:${sortBy}:${page}:${limit}`;
    const cachedResult = await redisClient.get(cacheKey);

    if (cachedResult) {
      const result = JSON.parse(cachedResult);
      result.from_cache = true;

      // Log search analytics
      await logSearchQuery(req, q, searchFilters, result.total, Date.now() - startTime);

      return res.json({ success: true, data: result });
    }

    // Build Elasticsearch query
    const esQuery = searchEngine.buildSearchQuery(processedQuery, searchFilters);
    const sort = searchEngine.buildSortQuery(sortBy);

    // Execute search
    const searchResponse = await elasticsearchClient.search({
      index: 'products',
      body: {
        query: esQuery,
        sort,
        from: (page - 1) * limit,
        size: limit,
        track_total_hits: true
      }
    });

    // Process results
    const hits = searchResponse.hits.hits;
    const total = searchResponse.hits.total.value;

    const products = hits.map(hit => ({
      ...hit._source,
      _score: hit._score,
      relevance_score: searchEngine.calculateRelevanceScore(q || '', hit._source)
    }));

    // Get facets/aggregations
    const aggregationsResponse = await elasticsearchClient.search({
      index: 'products',
      body: {
        query: esQuery,
        size: 0,
        aggs: {
          categories: { terms: { field: 'category', size: 50 } },
          brands: { terms: { field: 'brand', size: 50 } },
          price_ranges: {
            range: {
              field: 'price',
              ranges: [
                { to: 25 }, { from: 25, to: 50 }, { from: 50, to: 100 },
                { from: 100, to: 250 }, { from: 250, to: 500 }, { from: 500 }
              ]
            }
          },
          avg_rating: { avg: { field: 'average_rating' } },
          min_price: { min: { field: 'price' } },
          max_price: { max: { field: 'price' } }
        }
      }
    });

    const facets = {
      categories: aggregationsResponse.aggregations.categories.buckets,
      brands: aggregationsResponse.aggregations.brands.buckets,
      price_ranges: aggregationsResponse.aggregations.price_ranges.buckets,
      stats: {
        avg_rating: aggregationsResponse.aggregations.avg_rating.value,
        min_price: aggregationsResponse.aggregations.min_price.value,
        max_price: aggregationsResponse.aggregations.max_price.value
      }
    };

    const result = {
      query: q,
      processed_query: processedQuery,
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / limit),
      facets,
      sort_by: sortBy,
      from_cache: false
    };

    // Cache results for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));

    // Log search analytics
    await logSearchQuery(req, q, searchFilters, total, Date.now() - startTime);

    // Publish search event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('search_events', Buffer.from(JSON.stringify({
        type: 'search_performed',
        userId: req.user?.id,
        query: q,
        filters: searchFilters,
        resultCount: total,
        responseTime: Date.now() - startTime
      })));
    }

    res.json({ success: true, data: result });

  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Autocomplete endpoint
app.get('/api/search/autocomplete', authenticate, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    const { error } = autocompleteSchema.validate({ q, limit: parseInt(limit) });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Get suggestions from database
    const [suggestions] = await db.execute(`
      SELECT suggestion_text, suggestion_type, reference_id, search_count
      FROM search_suggestions
      WHERE suggestion_text LIKE ? AND is_active = true
      ORDER BY weight DESC, search_count DESC
      LIMIT ?
    `, [`${q}%`, parseInt(limit)]);

    // Get popular searches if no specific suggestions
    if (suggestions.length < limit) {
      const remaining = limit - suggestions.length;
      const [popular] = await db.execute(`
        SELECT term as suggestion_text, 'query' as suggestion_type, search_count
        FROM popular_search_terms
        WHERE term LIKE ?
        ORDER BY search_count DESC
        LIMIT ?
      `, [`${q}%`, remaining]);

      suggestions.push(...popular);
    }

    res.json({
      success: true,
      data: {
        suggestions: suggestions.map(s => ({
          text: s.suggestion_text,
          type: s.suggestion_type,
          reference_id: s.reference_id,
          count: s.search_count
        }))
      }
    });

  } catch (error) {
    logger.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Autocomplete failed' });
  }
});

// Search suggestions endpoint
app.get('/api/search/suggestions', authenticate, async (req, res) => {
  try {
    const { q, type, limit = 5 } = req.query;

    let query = `
      SELECT suggestion_text, suggestion_type, reference_id, search_count
      FROM search_suggestions
      WHERE is_active = true
    `;

    const params = [];

    if (q) {
      query += ' AND suggestion_text LIKE ?';
      params.push(`${q}%`);
    }

    if (type) {
      query += ' AND suggestion_type = ?';
      params.push(type);
    }

    query += ' ORDER BY weight DESC, search_count DESC LIMIT ?';
    params.push(parseInt(limit));

    const [suggestions] = await db.execute(query, params);

    res.json({
      success: true,
      data: { suggestions }
    });

  } catch (error) {
    logger.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Search analytics endpoint
app.get('/api/search/analytics', authenticate, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const [analytics] = await db.execute(`
      SELECT
        COUNT(*) as total_queries,
        COUNT(DISTINCT query_text) as unique_queries,
        COUNT(CASE WHEN result_count = 0 THEN 1 END) as zero_result_queries,
        AVG(response_time_ms) as avg_response_time,
        SUM(result_count) as total_results_returned
      FROM search_queries
      WHERE created_at BETWEEN ? AND ?
    `, [startDate, endDate]);

    const [topQueries] = await db.execute(`
      SELECT query_text, COUNT(*) as count
      FROM search_queries
      WHERE created_at BETWEEN ? AND ? AND query_text IS NOT NULL
      GROUP BY query_text
      ORDER BY count DESC
      LIMIT 10
    `, [startDate, endDate]);

    res.json({
      success: true,
      data: {
        period,
        start_date: startDate,
        end_date: endDate,
        analytics: analytics[0],
        top_queries: topQueries
      }
    });

  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Related searches endpoint
app.get('/api/search/related/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 5 } = req.query;

    const [related] = await db.execute(`
      SELECT recommended_query, confidence_score, click_count
      FROM search_recommendations
      WHERE base_query = ? AND is_active = true
      ORDER BY confidence_score DESC, click_count DESC
      LIMIT ?
    `, [query, parseInt(limit)]);

    res.json({
      success: true,
      data: { related_searches: related }
    });

  } catch (error) {
    logger.error('Related searches error:', error);
    res.status(500).json({ error: 'Failed to get related searches' });
  }
});

// Popular searches endpoint
app.get('/api/search/popular', async (req, res) => {
  try {
    const { limit = 10, category } = req.query;

    let query = `
      SELECT term, search_count, category, trend_score
      FROM popular_search_terms
      WHERE 1=1
    `;

    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY trend_score DESC, search_count DESC LIMIT ?';
    params.push(parseInt(limit));

    const [popular] = await db.execute(query, params);

    res.json({
      success: true,
      data: { popular_searches: popular }
    });

  } catch (error) {
    logger.error('Popular searches error:', error);
    res.status(500).json({ error: 'Failed to get popular searches' });
  }
});

// Spell check endpoint
app.get('/api/search/spellcheck/:word', async (req, res) => {
  try {
    const { word } = req.params;

    const [corrections] = await db.execute(`
      SELECT corrected_word, confidence_score, correction_count
      FROM search_spell_corrections
      WHERE misspelled_word = ?
      ORDER BY confidence_score DESC
      LIMIT 3
    `, [word]);

    res.json({
      success: true,
      data: {
        original_word: word,
        corrections: corrections
      }
    });

  } catch (error) {
    logger.error('Spell check error:', error);
    res.status(500).json({ error: 'Spell check failed' });
  }
});

// Admin routes
app.post('/api/admin/search/reindex', authenticate, async (req, res) => {
  try {
    // Check admin permissions
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Trigger product reindexing
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('search_events', Buffer.from(JSON.stringify({
        type: 'reindex_requested',
        userId: req.user.id,
        timestamp: new Date()
      })));
    }

    res.json({
      success: true,
      message: 'Reindexing initiated'
    });

  } catch (error) {
    logger.error('Reindex error:', error);
    res.status(500).json({ error: 'Failed to initiate reindexing' });
  }
});

// Helper function to log search queries
async function logSearchQuery(req, query, filters, resultCount, responseTime) {
  try {
    const queryId = uuidv4();

    await db.execute(`
      INSERT INTO search_queries
      (id, user_id, query_text, filters, result_count, response_time_ms, ip_address, user_agent, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      queryId,
      req.user?.id || null,
      query || null,
      JSON.stringify(filters),
      resultCount,
      responseTime,
      req.ip,
      req.get('User-Agent'),
      req.sessionID || null
    ]);

    // Update search suggestions
    if (query) {
      await db.execute(`
        INSERT INTO popular_search_terms (term, search_count, last_searched)
        VALUES (?, 1, NOW())
        ON DUPLICATE KEY UPDATE
        search_count = search_count + 1,
        last_searched = NOW()
      `, [query]);
    }

  } catch (error) {
    logger.error('Error logging search query:', error);
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
    logger.info(`Search service listening on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;