import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3006;

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'fenap_user',
  password: process.env.DB_PASSWORD || 'fenap_password',
  database: process.env.DB_NAME || 'fenap_marketplace',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let db;
try {
  db = mysql.createPool(dbConfig);
  console.log('Advertising Service: Connected to database');
} catch (error) {
  console.error('Advertising Service: Database connection failed:', error);
  process.exit(1);
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      // Verify user exists and is active
      const [users] = await db.execute(
        'SELECT id, email, role, status FROM users WHERE id = ? AND status = "active"',
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(403).json({ error: 'User not found or inactive' });
      }

      req.user = users[0];
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Campaign Management Routes

// Get all campaigns with filtering
app.get('/api/campaigns', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      type,
      advertiser_id,
      page = 1,
      limit = 20,
      search
    } = req.query;

    let whereClause = '1=1';
    const params = [];

    // Build where clause based on filters
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      whereClause += ' AND campaign_type = ?';
      params.push(type);
    }

    if (advertiser_id) {
      whereClause += ' AND advertiser_id = ?';
      params.push(advertiser_id);
    }

    if (search) {
      whereClause += ' AND (campaign_name LIKE ? OR title LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add permission-based filtering
    if (req.user.role === 'seller') {
      whereClause += ' AND (advertiser_id = ? OR created_by = ?)';
      params.push(req.user.id, req.user.id);
    }

    const offset = (page - 1) * limit;

    // Get campaigns
    const [campaigns] = await db.execute(`
      SELECT
        c.*,
        u1.email as creator_email,
        u2.email as advertiser_email,
        u3.email as approver_email,
        COUNT(ca.id) as ad_count,
        SUM(ca.impressions) as total_impressions,
        SUM(ca.clicks) as total_clicks,
        SUM(ca.conversions) as total_conversions
      FROM advertising_campaigns c
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.advertiser_id = u2.id
      LEFT JOIN users u3 ON c.approved_by = u3.id
      LEFT JOIN campaign_ads ca ON c.id = ca.campaign_id
      WHERE ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total FROM advertising_campaigns WHERE ${whereClause}
    `, params);

    res.json({
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Create new campaign
app.post('/api/campaigns', authenticateToken, requireRole(['seller', 'admin']), async (req, res) => {
  try {
    const {
      campaign_name,
      campaign_type = 'promotional',
      priority = 'medium',
      target_audience,
      target_locations,
      target_categories,
      target_price_range,
      budget_type = 'daily',
      daily_budget,
      total_budget,
      bid_strategy = 'manual',
      max_bid,
      start_date,
      end_date,
      schedule_days,
      schedule_hours,
      title,
      description,
      image_url,
      banner_url,
      landing_url,
      call_to_action
    } = req.body;

    // Validate required fields
    if (!campaign_name || !title || !description) {
      return res.status(400).json({ error: 'Campaign name, title, and description are required' });
    }

    // Insert campaign
    const [result] = await db.execute(`
      INSERT INTO advertising_campaigns (
        campaign_name, campaign_type, status, priority,
        target_audience, target_locations, target_categories, target_price_range,
        budget_type, daily_budget, total_budget, bid_strategy, max_bid,
        start_date, end_date, schedule_days, schedule_hours,
        title, description, image_url, banner_url, landing_url, call_to_action,
        created_by, advertiser_id
      ) VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      campaign_name, campaign_type, priority,
      JSON.stringify(target_audience || {}),
      JSON.stringify(target_locations || []),
      JSON.stringify(target_categories || []),
      JSON.stringify(target_price_range || {}),
      budget_type, daily_budget, total_budget, bid_strategy, max_bid,
      start_date, end_date,
      JSON.stringify(schedule_days || []),
      JSON.stringify(schedule_hours || []),
      title, description, image_url, banner_url, landing_url, call_to_action,
      req.user.id, req.user.role === 'seller' ? req.user.id : null
    ]);

    res.status(201).json({
      id: result.insertId,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign
app.put('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const updates = req.body;

    // Check permissions
    const [campaigns] = await db.execute(
      'SELECT * FROM advertising_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    const canEdit = req.user.role === 'admin' ||
                    campaign.created_by === req.user.id ||
                    campaign.advertiser_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Build update query
    const fields = [];
    const values = [];

    const allowedFields = [
      'campaign_name', 'campaign_type', 'priority', 'target_audience',
      'target_locations', 'target_categories', 'target_price_range',
      'budget_type', 'daily_budget', 'total_budget', 'bid_strategy', 'max_bid',
      'start_date', 'end_date', 'schedule_days', 'schedule_hours',
      'title', 'description', 'image_url', 'banner_url', 'landing_url', 'call_to_action'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(typeof updates[field] === 'object' ? JSON.stringify(updates[field]) : updates[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(campaignId);

    await db.execute(`
      UPDATE advertising_campaigns
      SET ${fields.join(', ')}
      WHERE id = ?
    `, values);

    res.json({ message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Approve/Reject campaign
app.put('/api/campaigns/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    const campaignId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected' });
    }

    await db.execute(`
      UPDATE advertising_campaigns
      SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP,
          rejection_reason = ?
      WHERE id = ?
    `, [status, req.user.id, rejection_reason || null, campaignId]);

    res.json({ message: `Campaign ${status} successfully` });
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

// Delete campaign
app.delete('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;

    // Check permissions
    const [campaigns] = await db.execute(
      'SELECT * FROM advertising_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    const canDelete = req.user.role === 'admin' || campaign.created_by === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Only allow deletion of draft campaigns
    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft campaigns can be deleted' });
    }

    await db.execute('DELETE FROM advertising_campaigns WHERE id = ?', [campaignId]);

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Ad Management Routes

// Get ads for a campaign
app.get('/api/campaigns/:campaignId/ads', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.campaignId;

    // Check campaign access
    const [campaigns] = await db.execute(
      'SELECT * FROM advertising_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    const canAccess = req.user.role === 'admin' ||
                     campaign.created_by === req.user.id ||
                     campaign.advertiser_id === req.user.id;

    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const [ads] = await db.execute(`
      SELECT * FROM campaign_ads
      WHERE campaign_id = ?
      ORDER BY created_at DESC
    `, [campaignId]);

    res.json({ ads });
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// Create ad
app.post('/api/campaigns/:campaignId/ads', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const {
      ad_type = 'banner',
      ad_name,
      headline,
      description,
      primary_image,
      secondary_images,
      video_url,
      button_text,
      button_url,
      custom_targeting
    } = req.body;

    // Check campaign access
    const [campaigns] = await db.execute(
      'SELECT * FROM advertising_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    const canEdit = req.user.role === 'admin' ||
                   campaign.created_by === req.user.id ||
                   campaign.advertiser_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const [result] = await db.execute(`
      INSERT INTO campaign_ads (
        campaign_id, ad_type, ad_name, headline, description,
        primary_image, secondary_images, video_url, button_text, button_url,
        custom_targeting
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      campaignId, ad_type, ad_name, headline, description,
      primary_image, JSON.stringify(secondary_images || []),
      video_url, button_text, button_url,
      JSON.stringify(custom_targeting || {})
    ]);

    res.status(201).json({
      id: result.insertId,
      message: 'Ad created successfully'
    });
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

// Update ad
app.put('/api/ads/:id', authenticateToken, async (req, res) => {
  try {
    const adId = req.params.id;
    const updates = req.body;

    // Check ad ownership
    const [ads] = await db.execute(`
      SELECT ca.*, ac.created_by, ac.advertiser_id
      FROM campaign_ads ca
      JOIN advertising_campaigns ac ON ca.campaign_id = ac.id
      WHERE ca.id = ?
    `, [adId]);

    if (ads.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const ad = ads[0];
    const canEdit = req.user.role === 'admin' ||
                   ad.created_by === req.user.id ||
                   ad.advertiser_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const fields = [];
    const values = [];

    const allowedFields = [
      'ad_type', 'ad_name', 'status', 'headline', 'description',
      'primary_image', 'secondary_images', 'video_url', 'button_text',
      'button_url', 'custom_targeting'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(typeof updates[field] === 'object' ? JSON.stringify(updates[field]) : updates[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(adId);

    await db.execute(`
      UPDATE campaign_ads
      SET ${fields.join(', ')}
      WHERE id = ?
    `, values);

    res.json({ message: 'Ad updated successfully' });
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

// Delete ad
app.delete('/api/ads/:id', authenticateToken, async (req, res) => {
  try {
    const adId = req.params.id;

    // Check ad ownership
    const [ads] = await db.execute(`
      SELECT ca.*, ac.created_by, ac.advertiser_id
      FROM campaign_ads ca
      JOIN advertising_campaigns ac ON ca.campaign_id = ac.id
      WHERE ca.id = ?
    `, [adId]);

    if (ads.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const ad = ads[0];
    const canDelete = req.user.role === 'admin' ||
                     ad.created_by === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await db.execute('DELETE FROM campaign_ads WHERE id = ?', [adId]);

    res.json({ message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

// Placement Management Routes

// Get all placements
app.get('/api/placements', async (req, res) => {
  try {
    const [placements] = await db.execute(
      'SELECT * FROM ad_placements WHERE is_active = TRUE ORDER BY placement_name'
    );

    res.json({ placements });
  } catch (error) {
    console.error('Error fetching placements:', error);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

// Assign campaign to placements
app.post('/api/campaigns/:campaignId/placements', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const { placements } = req.body; // Array of { placement_id, weight }

    // Check campaign access
    const [campaigns] = await db.execute(
      'SELECT * FROM advertising_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    const canEdit = req.user.role === 'admin' ||
                   campaign.created_by === req.user.id ||
                   campaign.advertiser_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Insert placements
    const values = placements.map(p => [campaignId, p.placement_id, p.weight || 1]);

    await db.execute(`
      INSERT INTO campaign_placements (campaign_id, placement_id, weight)
      VALUES ${values.map(() => '(?, ?, ?)').join(', ')}
      ON DUPLICATE KEY UPDATE weight = VALUES(weight), is_active = TRUE
    `, values.flat());

    res.json({ message: 'Placements assigned successfully' });
  } catch (error) {
    console.error('Error assigning placements:', error);
    res.status(500).json({ error: 'Failed to assign placements' });
  }
});

// Ad Serving Routes

// Get ads for placement (public endpoint)
app.get('/api/ads/serve/:placement', async (req, res) => {
  try {
    const placement = req.params.placement;
    const {
      user_id,
      session_id,
      location,
      device_type = 'desktop',
      browser,
      referrer,
      ip_address,
      limit = 1
    } = req.query;

    // Get active placements
    const [placements] = await db.execute(`
      SELECT id FROM ad_placements
      WHERE placement_name = ? AND is_active = TRUE
    `, [placement]);

    if (placements.length === 0) {
      return res.json({ ads: [] });
    }

    const placementId = placements[0].id;

    // Get eligible campaigns with ads
    const [campaigns] = await db.execute(`
      SELECT
        c.id as campaign_id,
        c.budget_type,
        c.daily_budget,
        c.total_budget,
        c.spend,
        c.target_audience,
        c.target_locations,
        c.target_categories,
        c.target_price_range,
        c.start_date,
        c.end_date,
        c.schedule_days,
        c.schedule_hours,
        cp.weight,
        ca.id as ad_id,
        ca.ad_type,
        ca.headline,
        ca.description,
        ca.primary_image,
        ca.secondary_images,
        ca.video_url,
        ca.button_text,
        ca.button_url,
        ca.custom_targeting
      FROM advertising_campaigns c
      JOIN campaign_placements cp ON c.id = cp.campaign_id AND cp.is_active = TRUE
      JOIN campaign_ads ca ON c.id = ca.campaign_id AND ca.status = 'active'
      WHERE cp.placement_id = ?
        AND c.status = 'active'
        AND (c.start_date IS NULL OR c.start_date <= CURDATE())
        AND (c.end_date IS NULL OR c.end_date >= CURDATE())
      ORDER BY cp.weight DESC, RAND()
      LIMIT ?
    `, [placementId, parseInt(limit)]);

    if (campaigns.length === 0) {
      return res.json({ ads: [] });
    }

    // Filter campaigns based on targeting (simplified)
    const eligibleAds = [];

    for (const campaign of campaigns) {
      // Check budget constraints
      if (campaign.budget_type === 'daily' && campaign.daily_budget &&
          campaign.spend >= campaign.daily_budget) {
        continue;
      }

      if (campaign.budget_type === 'total' && campaign.total_budget &&
          campaign.spend >= campaign.total_budget) {
        continue;
      }

      // For now, include all eligible campaigns
      // In production, add sophisticated targeting logic
      eligibleAds.push({
        campaign_id: campaign.campaign_id,
        ad_id: campaign.ad_id,
        ad_type: campaign.ad_type,
        headline: campaign.headline,
        description: campaign.description,
        primary_image: campaign.primary_image,
        secondary_images: JSON.parse(campaign.secondary_images || '[]'),
        video_url: campaign.video_url,
        button_text: campaign.button_text,
        button_url: campaign.button_url,
        weight: campaign.weight
      });

      // Record impression
      try {
        await db.execute(`
          INSERT INTO ad_impressions (
            campaign_id, ad_id, placement_id, user_id, session_id,
            ip_address, user_agent, referrer, location, device_type, browser
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          campaign.campaign_id, campaign.ad_id, placementId,
          user_id || null, session_id,
          ip_address, req.get('User-Agent'), referrer, location, device_type, browser
        ]);

        // Update campaign impression count
        await db.execute(`
          UPDATE advertising_campaigns
          SET impressions = impressions + 1
          WHERE id = ?
        `, [campaign.campaign_id]);

        // Update ad impression count
        await db.execute(`
          UPDATE campaign_ads
          SET impressions = impressions + 1,
              ctr = (clicks / (impressions + 1)) * 100
          WHERE id = ?
        `, [campaign.ad_id]);
      } catch (impressionError) {
        console.error('Error recording impression:', impressionError);
        // Don't fail the ad serving for impression tracking errors
      }
    }

    res.json({ ads: eligibleAds });
  } catch (error) {
    console.error('Error serving ads:', error);
    res.status(500).json({ error: 'Failed to serve ads' });
  }
});

// Track ad click
app.post('/api/ads/:adId/click', async (req, res) => {
  try {
    const adId = req.params.adId;
    const {
      campaign_id,
      placement_id,
      user_id,
      session_id,
      ip_address,
      referrer,
      landing_url
    } = req.body;

    // Record click
    await db.execute(`
      INSERT INTO ad_clicks (
        campaign_id, ad_id, placement_id, user_id, session_id,
        ip_address, user_agent, referrer, landing_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      campaign_id, adId, placement_id, user_id || null, session_id,
      ip_address, req.get('User-Agent'), referrer, landing_url
    ]);

    // Update campaign click count and spend
    await db.execute(`
      UPDATE advertising_campaigns
      SET clicks = clicks + 1,
          spend = spend + 0.01, -- Simplified CPC calculation
          ctr = ((clicks + 1) / impressions) * 100
      WHERE id = ?
    `, [campaign_id]);

    // Update ad click count
    await db.execute(`
      UPDATE campaign_ads
      SET clicks = clicks + 1,
          ctr = ((clicks + 1) / impressions) * 100
      WHERE id = ?
    `, [adId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Track conversion
app.post('/api/ads/conversion', authenticateToken, async (req, res) => {
  try {
    const {
      campaign_id,
      ad_id,
      click_id,
      conversion_type = 'purchase',
      conversion_value,
      order_id,
      custom_event
    } = req.body;

    await db.execute(`
      INSERT INTO ad_conversions (
        campaign_id, ad_id, click_id, user_id, conversion_type,
        conversion_value, order_id, custom_event
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      campaign_id, ad_id, click_id, req.user.id, conversion_type,
      conversion_value, order_id, custom_event
    ]);

    // Update campaign conversion metrics
    await db.execute(`
      UPDATE advertising_campaigns
      SET conversions = conversions + 1,
          revenue = revenue + ?,
          roas = (revenue + ?) / spend
      WHERE id = ?
    `, [conversion_value || 0, conversion_value || 0, campaign_id]);

    // Update ad conversion count
    await db.execute(`
      UPDATE campaign_ads
      SET conversions = conversions + 1
      WHERE id = ?
    `, [ad_id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// Analytics Routes

// Get campaign analytics
app.get('/api/campaigns/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { start_date, end_date } = req.query;

    // Check permissions
    const [campaigns] = await db.execute(
      'SELECT * FROM advertising_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    const canAccess = req.user.role === 'admin' ||
                     campaign.created_by === req.user.id ||
                     campaign.advertiser_id === req.user.id;

    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Build date filter
    let dateFilter = '';
    const params = [campaignId];

    if (start_date && end_date) {
      dateFilter = 'AND DATE(ai.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    // Get daily analytics
    const [dailyStats] = await db.execute(`
      SELECT
        DATE(ai.created_at) as date,
        COUNT(DISTINCT ai.id) as impressions,
        COUNT(DISTINCT ac.id) as clicks,
        COUNT(DISTINCT ac.id) as conversions,
        SUM(ac.conversion_value) as revenue,
        AVG(ac.conversion_value) as avg_order_value
      FROM ad_impressions ai
      LEFT JOIN ad_clicks ac ON ai.id = ac.impression_id
      LEFT JOIN ad_conversions aconv ON ac.id = aconv.click_id
      WHERE ai.campaign_id = ? ${dateFilter}
      GROUP BY DATE(ai.created_at)
      ORDER BY date DESC
    `, params);

    // Get overall metrics
    const [overallStats] = await db.execute(`
      SELECT
        COUNT(DISTINCT ai.id) as total_impressions,
        COUNT(DISTINCT ac.id) as total_clicks,
        COUNT(DISTINCT aconv.id) as total_conversions,
        COALESCE(SUM(ac.conversion_value), 0) as total_revenue,
        COALESCE(AVG(ac.conversion_value), 0) as avg_order_value,
        c.spend,
        c.budget_type,
        c.daily_budget,
        c.total_budget
      FROM advertising_campaigns c
      LEFT JOIN ad_impressions ai ON c.id = ai.campaign_id ${dateFilter.replace('ai.', '')}
      LEFT JOIN ad_clicks ac ON c.id = ac.campaign_id ${dateFilter.replace('ai.', 'ac.').replace('created_at', 'ac.created_at')}
      LEFT JOIN ad_conversions aconv ON c.id = aconv.campaign_id ${dateFilter.replace('ai.', 'aconv.').replace('created_at', 'aconv.created_at')}
      WHERE c.id = ?
      GROUP BY c.id
    `, [campaignId]);

    const stats = overallStats[0] || {};
    const ctr = stats.total_impressions > 0 ? (stats.total_clicks / stats.total_impressions) * 100 : 0;
    const cpc = stats.total_clicks > 0 ? stats.spend / stats.total_clicks : 0;
    const roas = stats.spend > 0 ? stats.total_revenue / stats.spend : 0;

    res.json({
      campaign: campaign,
      overall: {
        impressions: stats.total_impressions || 0,
        clicks: stats.total_clicks || 0,
        conversions: stats.total_conversions || 0,
        revenue: stats.total_revenue || 0,
        spend: stats.spend || 0,
        ctr: ctr,
        cpc: cpc,
        roas: roas,
        avg_order_value: stats.avg_order_value || 0
      },
      daily: dailyStats,
      budget: {
        type: stats.budget_type,
        daily_budget: stats.daily_budget,
        total_budget: stats.total_budget,
        remaining: stats.budget_type === 'daily' ?
          (stats.daily_budget || 0) - (stats.spend || 0) :
          (stats.total_budget || 0) - (stats.spend || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// File upload endpoint
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const filename = `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    const filepath = path.join('uploads', filename);

    // Move file to final location
    fs.renameSync(req.file.path, filepath);

    // Return file URL (in production, this would be a CDN URL)
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

    res.json({
      url: fileUrl,
      filename: filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.json({
      status: 'healthy',
      service: 'advertising-service',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'advertising-service',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Advertising Service: Received SIGTERM, shutting down gracefully');
  if (db) {
    await db.end();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Advertising Service: Received SIGINT, shutting down gracefully');
  if (db) {
    await db.end();
  }
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Advertising Service running on port ${PORT}`);
});</content>
<parameter name="filePath">backend/services/advertising/index.js