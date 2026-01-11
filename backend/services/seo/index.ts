const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const amqp = require('amqplib');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const Joi = require('joi');
const _ = require('lodash');

// Environment variables
const PORT = process.env.PORT || 3016;
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'marketplace_seo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

// SEO Configuration
const SEO_CONFIG = {
  siteName: process.env.SITE_NAME || 'Multivendor Marketplace',
  siteUrl: process.env.SITE_URL || 'https://marketplace.com',
  defaultTitle: 'Multivendor Marketplace - Shop Amazing Products',
  defaultDescription: 'Discover amazing products from trusted sellers worldwide',
  defaultImage: '/images/og-default.jpg',
  twitterHandle: process.env.TWITTER_HANDLE || '@marketplace',
  organizationName: process.env.ORGANIZATION_NAME || 'Marketplace Inc.',
  contactEmail: process.env.CONTACT_EMAIL || 'contact@marketplace.com'
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
  defaultMeta: { service: 'seo-service' },
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
    await rabbitChannel.assertQueue('seo_events', { durable: true });
    await rabbitChannel.assertQueue('content_updates', { durable: true });
    logger.info('Connected to RabbitMQ');

  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    process.exit(1);
  }
}

// SEO Utilities Class
class SEOUtils {
  constructor() {
    this.config = SEO_CONFIG;
  }

  // Generate meta title with proper length and formatting
  generateTitle(title, suffix = true) {
    if (!title) return this.config.defaultTitle;

    const cleanTitle = title.trim();
    const maxLength = 60;

    if (suffix && cleanTitle.length < maxLength - 3) {
      return `${cleanTitle} | ${this.config.siteName}`;
    }

    if (cleanTitle.length > maxLength) {
      return cleanTitle.substring(0, maxLength - 3) + '...';
    }

    return cleanTitle;
  }

  // Generate meta description with proper length
  generateDescription(description, fallback = '') {
    if (!description && !fallback) return this.config.defaultDescription;

    const text = description || fallback;
    const cleanDesc = text.trim();
    const maxLength = 160;

    if (cleanDesc.length <= maxLength) return cleanDesc;

    // Try to cut at word boundary
    const truncated = cleanDesc.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  // Generate keywords from text
  extractKeywords(text, limit = 10) {
    if (!text) return [];

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));

    const wordCount = _.countBy(words);
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([word]) => word);
  }

  // Check if word is a stop word
  isStopWord(word) {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'an', 'a'];
    return stopWords.includes(word.toLowerCase());
  }

  // Generate canonical URL
  generateCanonicalUrl(path) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.config.siteUrl}${cleanPath}`;
  }

  // Generate structured data for different entity types
  generateStructuredData(entityType, entityData) {
    const baseData = {
      '@context': 'https://schema.org',
      '@type': this.getSchemaType(entityType),
    };

    switch (entityType) {
      case 'product':
        return {
          ...baseData,
          name: entityData.name,
          description: entityData.description,
          image: entityData.images || [this.config.defaultImage],
          offers: {
            '@type': 'Offer',
            price: entityData.price,
            priceCurrency: entityData.currency || 'USD',
            availability: entityData.inStock ? 'InStock' : 'OutOfStock',
            seller: {
              '@type': 'Organization',
              name: entityData.seller?.name || this.config.siteName
            }
          },
          aggregateRating: entityData.averageRating ? {
            '@type': 'AggregateRating',
            ratingValue: entityData.averageRating,
            reviewCount: entityData.reviewCount || 0
          } : undefined,
          brand: entityData.brand ? {
            '@type': 'Brand',
            name: entityData.brand
          } : undefined
        };

      case 'organization':
        return {
          ...baseData,
          name: this.config.organizationName,
          url: this.config.siteUrl,
          logo: `${this.config.siteUrl}/images/logo.png`,
          contactPoint: {
            '@type': 'ContactPoint',
            email: this.config.contactEmail,
            contactType: 'customer service'
          }
        };

      default:
        return baseData;
    }
  }

  // Get Schema.org type for entity
  getSchemaType(entityType) {
    const typeMap = {
      product: 'Product',
      category: 'CollectionPage',
      brand: 'Brand',
      seller: 'Organization',
      page: 'WebPage',
      blog_post: 'BlogPosting'
    };
    return typeMap[entityType] || 'WebPage';
  }

  // Generate robots directive
  generateRobotsDirective(options = {}) {
    const directives = [];

    if (options.index !== false) directives.push('index');
    else directives.push('noindex');

    if (options.follow !== false) directives.push('follow');
    else directives.push('nofollow');

    if (options.archive === false) directives.push('noarchive');
    if (options.snippet === false) directives.push('nosnippet');
    if (options.imageindex === false) directives.push('noimageindex');

    return directives.join(',');
  }

  // Validate URL format
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

const seoUtils = new SEOUtils();

// Validation schemas
const metaSchema = Joi.object({
  entityType: Joi.string().valid('page', 'product', 'category', 'brand', 'seller', 'blog_post').required(),
  entityId: Joi.string().required(),
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(300).optional(),
  keywords: Joi.array().items(Joi.string()).optional(),
  canonicalUrl: Joi.string().uri().optional(),
  ogImage: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional()
});

const redirectSchema = Joi.object({
  oldUrl: Joi.string().required(),
  newUrl: Joi.string().uri().required(),
  redirectType: Joi.string().valid('301', '302', '307', '308').optional()
});

// Routes

// Get meta data for entity
app.get('/api/seo/meta/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    // Try cache first
    const cacheKey = `seo_meta:${entityType}:${entityId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Get from database
    const [meta] = await db.execute(
      'SELECT * FROM seo_meta WHERE entity_type = ? AND entity_id = ? AND is_active = true',
      [entityType, entityId]
    );

    if (!meta.length) {
      // Generate default meta data
      const defaultMeta = await generateDefaultMeta(entityType, entityId);
      return res.json(defaultMeta);
    }

    const metaData = meta[0];

    // Format response
    const response = {
      title: seoUtils.generateTitle(metaData.title),
      description: seoUtils.generateDescription(metaData.description),
      keywords: metaData.keywords ? JSON.parse(metaData.keywords) : [],
      canonicalUrl: metaData.canonical_url || seoUtils.generateCanonicalUrl(`/${entityType}/${entityId}`),
      robots: metaData.robots_directive,
      openGraph: {
        title: metaData.og_title || seoUtils.generateTitle(metaData.title),
        description: metaData.og_description || seoUtils.generateDescription(metaData.description),
        image: metaData.og_image || SEO_CONFIG.defaultImage,
        type: metaData.og_type
      },
      twitter: {
        card: metaData.twitter_card,
        title: metaData.twitter_title || seoUtils.generateTitle(metaData.title),
        description: metaData.twitter_description || seoUtils.generateDescription(metaData.description),
        image: metaData.twitter_image || metaData.og_image || SEO_CONFIG.defaultImage
      },
      structuredData: metaData.structured_data ? JSON.parse(metaData.structured_data) : null
    };

    // Cache for 1 hour
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));

    res.json(response);

  } catch (error) {
    logger.error('Get meta error:', error);
    res.status(500).json({ error: 'Failed to get meta data' });
  }
});

// Update meta data for entity
app.put('/api/seo/meta/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const metaData = req.body;

    const { error } = metaSchema.validate({ entityType, entityId, ...metaData });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if meta data exists
    const [existing] = await db.execute(
      'SELECT id FROM seo_meta WHERE entity_type = ? AND entity_id = ?',
      [entityType, entityId]
    );

    const metaId = existing.length > 0 ? existing[0].id : uuidv4();

    // Prepare data
    const data = {
      title: metaData.title,
      description: metaData.description,
      keywords: metaData.keywords ? JSON.stringify(metaData.keywords) : null,
      canonical_url: metaData.canonicalUrl,
      og_title: metaData.ogTitle,
      og_description: metaData.ogDescription,
      og_image: metaData.ogImage,
      twitter_title: metaData.twitterTitle,
      twitter_description: metaData.twitterDescription,
      twitter_image: metaData.twitterImage,
      is_active: metaData.isActive !== false
    };

    if (existing.length > 0) {
      // Update
      await db.execute(
        `UPDATE seo_meta SET ${Object.keys(data).map(key => `${key} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
        [...Object.values(data), metaId]
      );
    } else {
      // Insert
      await db.execute(
        `INSERT INTO seo_meta (id, entity_type, entity_id, url_path, ${Object.keys(data).join(', ')}) VALUES (?, ?, ?, ?, ${Object.keys(data).map(() => '?').join(', ')})`,
        [metaId, entityType, entityId, `/${entityType}/${entityId}`, ...Object.values(data)]
      );
    }

    // Clear cache
    const cacheKey = `seo_meta:${entityType}:${entityId}`;
    await redisClient.del(cacheKey);

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('seo_events', Buffer.from(JSON.stringify({
        type: 'meta_updated',
        entityType,
        entityId,
        metaId
      })));
    }

    res.json({
      success: true,
      message: 'Meta data updated successfully',
      metaId
    });

  } catch (error) {
    logger.error('Update meta error:', error);
    res.status(500).json({ error: 'Failed to update meta data' });
  }
});

// Get sitemap index
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [sitemaps] = await db.execute(
      'SELECT * FROM seo_sitemaps WHERE is_active = true ORDER BY sitemap_type'
    );

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${SEO_CONFIG.siteUrl}/sitemaps/${sitemap.filename}</loc>
    <lastmod>${sitemap.last_generated.toISOString()}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemapIndex);

  } catch (error) {
    logger.error('Sitemap index error:', error);
    res.status(500).send('Error generating sitemap index');
  }
});

// Get specific sitemap
app.get('/sitemaps/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    const [sitemap] = await db.execute(
      'SELECT * FROM seo_sitemaps WHERE filename = ? AND is_active = true',
      [filename]
    );

    if (!sitemap.length) {
      return res.status(404).send('Sitemap not found');
    }

    // Get sitemap URLs
    const [urls] = await db.execute(
      'SELECT * FROM seo_sitemap_urls WHERE sitemap_id = ? AND is_active = true ORDER BY priority DESC',
      [sitemap[0].id]
    );

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${SEO_CONFIG.siteUrl}${url.url}</loc>
    <lastmod>${url.last_modified.toISOString()}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemapXml);

  } catch (error) {
    logger.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt
app.get('/robots.txt', async (req, res) => {
  try {
    const [robots] = await db.execute(
      'SELECT * FROM seo_robots_txt WHERE is_active = true ORDER BY user_agent'
    );

    let robotsTxt = `User-agent: *\nAllow: /\n\n`;

    robots.forEach(robot => {
      robotsTxt += `User-agent: ${robot.user_agent}\n`;
      robotsTxt += `${robot.directives}\n`;
      if (robot.crawl_delay > 0) {
        robotsTxt += `Crawl-delay: ${robot.crawl_delay}\n`;
      }
      robotsTxt += '\n';
    });

    robotsTxt += `Sitemap: ${SEO_CONFIG.siteUrl}/sitemap.xml\n`;

    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);

  } catch (error) {
    logger.error('Robots.txt error:', error);
    res.status(500).send('Error generating robots.txt');
  }
});

// Redirect handler
app.get('/redirect', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).send('URL parameter required');
    }

    const [redirect] = await db.execute(
      'SELECT * FROM seo_redirects WHERE old_url = ? AND is_active = true',
      [url]
    );

    if (!redirect.length) {
      return res.status(404).send('Redirect not found');
    }

    const redirectData = redirect[0];

    // Update redirect count
    await db.execute(
      'UPDATE seo_redirects SET redirect_count = redirect_count + 1, last_redirected = NOW() WHERE id = ?',
      [redirectData.id]
    );

    res.redirect(parseInt(redirectData.redirect_type), redirectData.new_url);

  } catch (error) {
    logger.error('Redirect error:', error);
    res.status(500).send('Redirect error');
  }
});

// Create redirect
app.post('/api/seo/redirects', async (req, res) => {
  try {
    const { oldUrl, newUrl, redirectType = '301' } = req.body;

    const { error } = redirectSchema.validate({ oldUrl, newUrl, redirectType });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const redirectId = uuidv4();

    await db.execute(
      'INSERT INTO seo_redirects (id, old_url, new_url, redirect_type) VALUES (?, ?, ?, ?)',
      [redirectId, oldUrl, newUrl, redirectType]
    );

    res.status(201).json({
      success: true,
      message: 'Redirect created successfully',
      redirectId
    });

  } catch (error) {
    logger.error('Create redirect error:', error);
    res.status(500).json({ error: 'Failed to create redirect' });
  }
});

// Get SEO analytics
app.get('/api/seo/analytics', async (req, res) => {
  try {
    const { entityType, entityId, period = '30d' } = req.query;

    let query = `
      SELECT
        DATE(date) as date,
        SUM(page_views) as page_views,
        SUM(unique_visitors) as unique_visitors,
        AVG(avg_time_on_page) as avg_time_on_page,
        AVG(bounce_rate) as bounce_rate,
        SUM(organic_search_clicks) as organic_search_clicks,
        SUM(organic_search_impressions) as organic_search_impressions,
        AVG(organic_search_ctr) as organic_search_ctr,
        AVG(organic_search_position) as organic_search_position
      FROM seo_analytics
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ${period.replace('d', '')} DAY)
    `;

    const params = [];

    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }

    if (entityId) {
      query += ' AND entity_id = ?';
      params.push(entityId);
    }

    query += ' GROUP BY DATE(date) ORDER BY date DESC';

    const [analytics] = await db.execute(query, params);

    res.json({
      success: true,
      data: {
        period,
        analytics: analytics.map(row => ({
          ...row,
          date: row.date
        }))
      }
    });

  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Generate sitemaps endpoint (admin)
app.post('/api/admin/seo/generate-sitemaps', async (req, res) => {
  try {
    // This would trigger sitemap generation
    // For now, just return success
    res.json({
      success: true,
      message: 'Sitemap generation initiated'
    });

  } catch (error) {
    logger.error('Generate sitemaps error:', error);
    res.status(500).json({ error: 'Failed to generate sitemaps' });
  }
});

// Helper function to generate default meta data
async function generateDefaultMeta(entityType, entityId) {
  let title = '';
  let description = '';
  let keywords = [];

  // This would typically fetch entity data from other services
  // For now, return defaults
  switch (entityType) {
    case 'product':
      title = `Product - ${entityId}`;
      description = 'View this amazing product on our marketplace';
      keywords = ['product', 'marketplace'];
      break;
    case 'category':
      title = `Category - ${entityId}`;
      description = `Browse products in the ${entityId} category`;
      keywords = ['category', entityId];
      break;
    default:
      title = `${entityType} - ${entityId}`;
      description = `View ${entityType} information`;
      keywords = [entityType];
  }

  return {
    title: seoUtils.generateTitle(title),
    description: seoUtils.generateDescription(description),
    keywords,
    canonicalUrl: seoUtils.generateCanonicalUrl(`/${entityType}/${entityId}`),
    robots: 'index,follow',
    openGraph: {
      title: seoUtils.generateTitle(title),
      description: seoUtils.generateDescription(description),
      image: SEO_CONFIG.defaultImage,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: seoUtils.generateTitle(title),
      description: seoUtils.generateDescription(description),
      image: SEO_CONFIG.defaultImage
    },
    structuredData: null
  };
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
    logger.info(`SEO service listening on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;