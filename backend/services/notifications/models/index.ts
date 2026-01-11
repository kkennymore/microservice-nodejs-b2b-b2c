import mysql from 'mysql2/promise';
import config from '/app/shared/config.js';

export class NotificationModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(notificationData) {
    const {
      user_id,
      type, // 'email', 'sms', 'push', 'system'
      title,
      message,
      data = {},
      priority = 'normal', // 'low', 'normal', 'high', 'urgent'
      expires_at = null,
      is_read = false,
      is_sent = false
    } = notificationData;

    const [result] = await this.pool.execute(
      `INSERT INTO notifications (user_id, type, title, message, data, priority, expires_at, is_read, is_sent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [user_id, type, title, message, JSON.stringify(data), priority, expires_at, is_read, is_sent]
    );

    return result.insertId;
  }

  async findByUserId(userId, limit = 50, offset = 0, includeRead = true) {
    const readCondition = includeRead ? '' : 'AND is_read = FALSE';
    const [rows] = await this.pool.execute(
      `SELECT * FROM notifications
       WHERE user_id = ? ${readCondition}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows.map(row => ({
      ...row,
      data: JSON.parse(row.data || '{}')
    }));
  }

  async markAsRead(notificationId, userId) {
    const [result] = await this.pool.execute(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW(), updated_at = NOW() WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return result.affectedRows > 0;
  }

  async markAllAsRead(userId) {
    const [result] = await this.pool.execute(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW(), updated_at = NOW() WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    return result.affectedRows;
  }

  async delete(notificationId, userId) {
    const [result] = await this.pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return result.affectedRows > 0;
  }

  async getUnreadCount(userId) {
    const [rows] = await this.pool.execute(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    return rows[0].unread_count;
  }

  async cleanupExpired() {
    const [result] = await this.pool.execute(
      'DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()'
    );

    return result.affectedRows;
  }

  async getStats(userId) {
    const [rows] = await this.pool.execute(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN type = 'email' THEN 1 ELSE 0 END) as emails,
        SUM(CASE WHEN type = 'sms' THEN 1 ELSE 0 END) as sms,
        SUM(CASE WHEN type = 'push' THEN 1 ELSE 0 END) as push
       FROM notifications WHERE user_id = ?`,
      [userId]
    );

    return rows[0];
  }
}

export class EmailLogModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(emailLogData) {
    const {
      user_id,
      to_email,
      subject,
      template,
      data = {},
      status = 'pending', // 'pending', 'sent', 'failed', 'bounced'
      provider, // 'smtp', 'sendgrid', 'ses', etc.
      message_id,
      error_message = null,
      sent_at = null
    } = emailLogData;

    const [result] = await this.pool.execute(
      `INSERT INTO email_logs (user_id, to_email, subject, template, data, status, provider, message_id, error_message, sent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, to_email, subject, template, JSON.stringify(data), status, provider, message_id, error_message, sent_at]
    );

    return result.insertId;
  }

  async updateStatus(id, status, messageId = null, errorMessage = null) {
    const [result] = await this.pool.execute(
      `UPDATE email_logs SET status = ?, message_id = ?, error_message = ?, sent_at = NOW()
       WHERE id = ?`,
      [status, messageId, errorMessage, id]
    );

    return result.affectedRows > 0;
  }

  async getByUserId(userId, limit = 50, offset = 0) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM email_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    return rows.map(row => ({
      ...row,
      data: JSON.parse(row.data || '{}')
    }));
  }

  async getStats(userId) {
    const [rows] = await this.pool.execute(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced
       FROM email_logs WHERE user_id = ?`,
      [userId]
    );

    return rows[0];
  }
}

export class SMSLogModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(smsLogData) {
    const {
      user_id,
      to_phone,
      message,
      provider, // 'twilio', 'nexmo', etc.
      message_sid,
      status = 'pending', // 'pending', 'sent', 'delivered', 'failed'
      segments = 1,
      cost = null,
      error_message = null,
      sent_at = null
    } = smsLogData;

    const [result] = await this.pool.execute(
      `INSERT INTO sms_logs (user_id, to_phone, message, provider, message_sid, status, segments, cost, error_message, sent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, to_phone, message, provider, message_sid, status, segments, cost, error_message, sent_at]
    );

    return result.insertId;
  }

  async updateStatus(id, status, errorMessage = null) {
    const [result] = await this.pool.execute(
      'UPDATE sms_logs SET status = ?, error_message = ?, delivered_at = NOW() WHERE id = ?',
      [status, errorMessage, id]
    );

    return result.affectedRows > 0;
  }

  async getByUserId(userId, limit = 50, offset = 0) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM sms_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    return rows;
  }

  async getStats(userId) {
    const [rows] = await this.pool.execute(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(segments) as total_segments,
        SUM(cost) as total_cost
       FROM sms_logs WHERE user_id = ?`,
      [userId]
    );

    return rows[0];
  }
}

export class PushTokenModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(pushTokenData) {
    const {
      user_id,
      device_type, // 'ios', 'android', 'web'
      token,
      device_id,
      app_version = null,
      is_active = true
    } = pushTokenData;

    // Deactivate existing tokens for this device
    await this.pool.execute(
      'UPDATE push_tokens SET is_active = FALSE WHERE user_id = ? AND device_id = ?',
      [user_id, device_id]
    );

    const [result] = await this.pool.execute(
      `INSERT INTO push_tokens (user_id, device_type, token, device_id, app_version, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [user_id, device_type, token, device_id, app_version, is_active]
    );

    return result.insertId;
  }

  async findByUserId(userId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM push_tokens WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    return rows;
  }

  async deactivateToken(userId, deviceId) {
    const [result] = await this.pool.execute(
      'UPDATE push_tokens SET is_active = FALSE, updated_at = NOW() WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );

    return result.affectedRows > 0;
  }

  async cleanupInactiveTokens(daysOld = 90) {
    const [result] = await this.pool.execute(
      'DELETE FROM push_tokens WHERE is_active = FALSE AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysOld]
    );

    return result.affectedRows;
  }
}

export class NotificationPreferenceModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(userId) {
    // Create default preferences
    const defaultPreferences = {
      email: {
        order_updates: true,
        payment_notifications: true,
        security_alerts: true,
        marketing_emails: false,
        product_updates: true,
        system_maintenance: true
      },
      sms: {
        order_updates: false,
        payment_notifications: true,
        security_alerts: true,
        marketing_messages: false
      },
      push: {
        order_updates: true,
        payment_notifications: true,
        security_alerts: true,
        marketing_push: false,
        product_updates: true,
        new_messages: true
      }
    };

    const [result] = await this.pool.execute(
      `INSERT INTO notification_preferences (user_id, email_preferences, sms_preferences, push_preferences, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [userId, JSON.stringify(defaultPreferences.email), JSON.stringify(defaultPreferences.sms), JSON.stringify(defaultPreferences.push)]
    );

    return result.insertId;
  }

  async findByUserId(userId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM notification_preferences WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const preferences = rows[0];
    return {
      ...preferences,
      email_preferences: JSON.parse(preferences.email_preferences || '{}'),
      sms_preferences: JSON.parse(preferences.sms_preferences || '{}'),
      push_preferences: JSON.parse(preferences.push_preferences || '{}')
    };
  }

  async update(userId, preferences) {
    const { email, sms, push } = preferences;

    const [result] = await this.pool.execute(
      `UPDATE notification_preferences
       SET email_preferences = ?, sms_preferences = ?, push_preferences = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [JSON.stringify(email), JSON.stringify(sms), JSON.stringify(push), userId]
    );

    return result.affectedRows > 0;
  }

  async getPreference(userId, channel, type) {
    const preferences = await this.findByUserId(userId);
    if (!preferences) {
      return true; // Default to enabled if no preferences set
    }

    const channelPrefs = preferences[`${channel}_preferences`];
    return channelPrefs[type] !== false; // Default to true if not explicitly disabled
  }
}

export class WhatsAppLogModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(whatsappLogData) {
    const {
      user_id,
      to_phone,
      template_name,
      message_type, // 'template' or 'custom'
      message_id,
      status = 'pending', // 'pending', 'sent', 'delivered', 'read', 'failed'
      cost = null,
      error_message = null,
      template_data = {},
      sent_at = null
    } = whatsappLogData;

    const [result] = await this.pool.execute(
      `INSERT INTO whatsapp_logs (user_id, to_phone, template_name, message_type, message_id, status, cost, error_message, template_data, sent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, to_phone, template_name, message_type, message_id, status, cost, error_message, JSON.stringify(template_data), sent_at]
    );

    return result.insertId;
  }

  async updateStatus(messageId, status, errorMessage = null) {
    const [result] = await this.pool.execute(
      'UPDATE whatsapp_logs SET status = ?, error_message = ?, delivered_at = NOW() WHERE message_id = ?',
      [status, errorMessage, messageId]
    );

    return result.affectedRows > 0;
  }

  async getByUserId(userId, limit = 50, offset = 0) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM whatsapp_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    return rows.map(row => ({
      ...row,
      template_data: JSON.parse(row.template_data || '{}')
    }));
  }

  async getStats(userId) {
    const [rows] = await this.pool.execute(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(cost) as total_cost
       FROM whatsapp_logs WHERE user_id = ?`,
      [userId]
    );

    return rows[0];
  }
}

export class NotificationTemplateModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async findByType(type) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM notification_templates WHERE type = ? AND is_active = TRUE ORDER BY name',
      [type]
    );

    return rows.map(row => ({
      ...row,
      variables: JSON.parse(row.variables || '[]')
    }));
  }

  async findByName(name) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM notification_templates WHERE name = ? AND is_active = TRUE',
      [name]
    );

    if (rows.length === 0) return null;

    const template = rows[0];
    template.variables = JSON.parse(template.variables || '[]');
    return template;
  }

  async create(templateData) {
    const {
      name,
      type,
      subject,
      content,
      variables = []
    } = templateData;

    const [result] = await this.pool.execute(
      `INSERT INTO notification_templates (name, type, subject, content, variables, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, TRUE, NOW(), NOW())`,
      [name, type, subject, content, JSON.stringify(variables)]
    );

    return result.insertId;
  }

  async update(id, templateData) {
    const { name, type, subject, content, variables, is_active } = templateData;

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (subject !== undefined) {
      updateFields.push('subject = ?');
      updateValues.push(subject);
    }
    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(content);
    }
    if (variables !== undefined) {
      updateFields.push('variables = ?');
      updateValues.push(JSON.stringify(variables));
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      const [result] = await this.pool.execute(
        `UPDATE notification_templates SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return result.affectedRows > 0;
    }

    return false;
  }

  async getAll(limit = 50, offset = 0) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM notification_templates ORDER BY type, name LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return rows.map(row => ({
      ...row,
      variables: JSON.parse(row.variables || '[]')
    }));
  }

  async findAllActive() {
    const [rows] = await this.pool.execute(
      'SELECT * FROM template_translations WHERE is_active = TRUE ORDER BY template_id, language_code'
    );

    return rows.map(row => ({
      ...row,
      variables: JSON.parse(row.variables || '[]')
    }));
  }

  async findByTemplateAndLanguage(templateId, languageCode) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM template_translations WHERE template_id = ? AND language_code = ? AND is_active = TRUE',
      [templateId, languageCode]
    );

    if (rows.length === 0) return null;

    const translation = rows[0];
    translation.variables = JSON.parse(translation.variables || '[]');
    return translation;
  }

  async update(id, translationData) {
    const { subject, content, variables, is_active } = translationData;

    const updateFields = [];
    const updateValues = [];

    if (subject !== undefined) {
      updateFields.push('subject = ?');
      updateValues.push(subject);
    }
    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(content);
    }
    if (variables !== undefined) {
      updateFields.push('variables = ?');
      updateValues.push(JSON.stringify(variables));
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      const [result] = await this.pool.execute(
        `UPDATE template_translations SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return result.affectedRows > 0;
    }

    return false;
  }

  async delete(id) {
    const [result] = await this.pool.execute(
      'UPDATE template_translations SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  async getStats() {
    const [templateStats] = await this.pool.execute(
      'SELECT COUNT(DISTINCT template_id) as total_templates, COUNT(*) as total_translations FROM template_translations WHERE is_active = TRUE'
    );

    const [languageStats] = await this.pool.execute(
      'SELECT language_code, COUNT(*) as count FROM template_translations WHERE is_active = TRUE GROUP BY language_code ORDER BY count DESC'
    );

    return {
      total_templates: templateStats[0].total_templates,
      total_translations: templateStats[0].total_translations,
      translations_per_language: languageStats
    };
  }
}

export class NotificationAnalyticsModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(analyticsData) {
    const {
      date,
      channel,
      metric,
      value,
      campaign_id,
      metadata = {}
    } = analyticsData;

    const [result] = await this.pool.execute(
      `INSERT INTO notification_analytics (date, channel, metric, value, campaign_id, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE value = value + VALUES(value)`,
      [date, channel, metric, value, campaign_id || null]
    );

    return result.insertId;
  }

  async findByDateRange(startDate, endDate, channel = null, campaignId = null) {
    let query = 'SELECT * FROM notification_analytics WHERE date BETWEEN ? AND ?';
    const params = [startDate, endDate];

    if (channel) {
      query += ' AND channel = ?';
      params.push(channel);
    }

    if (campaignId) {
      query += ' AND campaign_id = ?';
      params.push(campaignId);
    }

    query += ' ORDER BY date ASC, channel ASC, metric ASC';

    const [rows] = await this.pool.execute(query, params);
    return rows;
  }

  async getAggregatedMetrics(startDate, endDate, groupBy = ['channel', 'metric']) {
    const groupFields = groupBy.join(', ');
    const query = `
      SELECT ${groupFields}, SUM(value) as total_value, COUNT(*) as event_count
      FROM notification_analytics
      WHERE date BETWEEN ? AND ?
      GROUP BY ${groupFields}
      ORDER BY ${groupFields}
    `;

    const [rows] = await this.pool.execute(query, [startDate, endDate]);
    return rows;
  }

  async getChannelPerformance(startDate, endDate) {
    const query = `
      SELECT
        channel,
        SUM(CASE WHEN metric = 'sent' THEN value ELSE 0 END) as sent,
        SUM(CASE WHEN metric = 'delivered' THEN value ELSE 0 END) as delivered,
        SUM(CASE WHEN metric = 'failed' THEN value ELSE 0 END) as failed,
        SUM(CASE WHEN metric = 'opened' THEN value ELSE 0 END) as opened,
        SUM(CASE WHEN metric = 'clicked' THEN value ELSE 0 END) as clicked
      FROM notification_analytics
      WHERE date BETWEEN ? AND ?
      GROUP BY channel
    `;

    const [rows] = await this.pool.execute(query, [startDate, endDate]);

    // Calculate rates
    return rows.map(row => ({
      channel: row.channel,
      sent: parseInt(row.sent),
      delivered: parseInt(row.delivered),
      failed: parseInt(row.failed),
      opened: parseInt(row.opened),
      clicked: parseInt(row.clicked),
      delivery_rate: row.sent > 0 ? (row.delivered / row.sent * 100) : 0,
      open_rate: row.delivered > 0 ? (row.opened / row.delivered * 100) : 0,
      click_rate: row.opened > 0 ? (row.clicked / row.opened * 100) : 0
    }));
  }

  async cleanup(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const [result] = await this.pool.execute(
      'DELETE FROM notification_analytics WHERE date < ?',
      [cutoffDate.toISOString().split('T')[0]]
    );

    return result.affectedRows;
  }

  async getTopCampaigns(startDate, endDate, limit = 10) {
    const query = `
      SELECT
        c.id, c.name, c.type,
        SUM(CASE WHEN na.metric = 'sent' THEN na.value ELSE 0 END) as sent,
        SUM(CASE WHEN na.metric = 'delivered' THEN na.value ELSE 0 END) as delivered,
        SUM(CASE WHEN na.metric = 'opened' THEN na.value ELSE 0 END) as opened
      FROM notification_campaigns c
      LEFT JOIN notification_analytics na ON c.id = na.campaign_id
        AND na.date BETWEEN ? AND ?
      WHERE c.created_at >= ?
      GROUP BY c.id, c.name, c.type
      ORDER BY sent DESC
      LIMIT ?
    `;

    const [rows] = await this.pool.execute(query, [startDate, endDate, startDate, limit]);
    return rows;
  }
}

export class NotificationCampaignModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(campaignData) {
    const {
      name,
      description,
      type,
      template_id,
      target_criteria = {},
      content = {},
      scheduled_at,
      created_by
    } = campaignData;

    const status = scheduled_at ? 'scheduled' : 'draft';

    const [result] = await this.pool.execute(
      `INSERT INTO notification_campaigns (name, description, type, template_id, target_criteria, content, scheduled_at, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, description, type, template_id, JSON.stringify(target_criteria), JSON.stringify(content), scheduled_at, status, created_by]
    );

    return result.insertId;
  }

  async findById(id) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM notification_campaigns WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return null;

    const campaign = rows[0];
    return {
      ...campaign,
      target_criteria: JSON.parse(campaign.target_criteria || '{}'),
      content: JSON.parse(campaign.content || '{}')
    };
  }

  async findByUserId(userId, limit = 50, offset = 0) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM notification_campaigns WHERE created_by = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    return rows.map(row => ({
      ...row,
      target_criteria: JSON.parse(row.target_criteria || '{}'),
      content: JSON.parse(row.content || '{}')
    }));
  }

  async findScheduled() {
    const [rows] = await this.pool.execute(
      'SELECT * FROM notification_campaigns WHERE status = ? AND scheduled_at <= NOW()',
      ['scheduled']
    );

    return rows.map(row => ({
      ...row,
      target_criteria: JSON.parse(row.target_criteria || '{}'),
      content: JSON.parse(row.content || '{}')
    }));
  }

  async updateStatus(id, status) {
    const [result] = await this.pool.execute(
      'UPDATE notification_campaigns SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    return result.affectedRows > 0;
  }

  async updateStartedAt(id) {
    const [result] = await this.pool.execute(
      'UPDATE notification_campaigns SET started_at = NOW(), updated_at = NOW() WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  async updateCompletedAt(id) {
    const [result] = await this.pool.execute(
      'UPDATE notification_campaigns SET completed_at = NOW(), updated_at = NOW() WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  async updateMetrics(id, metrics) {
    const { total_recipients, sent_count, delivered_count, failed_count } = metrics;

    const updateFields = [];
    const updateValues = [];

    if (total_recipients !== undefined) {
      updateFields.push('total_recipients = ?');
      updateValues.push(total_recipients);
    }
    if (sent_count !== undefined) {
      updateFields.push('sent_count = ?');
      updateValues.push(sent_count);
    }
    if (delivered_count !== undefined) {
      updateFields.push('delivered_count = ?');
      updateValues.push(delivered_count);
    }
    if (failed_count !== undefined) {
      updateFields.push('failed_count = ?');
      updateValues.push(failed_count);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      const [result] = await this.pool.execute(
        `UPDATE notification_campaigns SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return result.affectedRows > 0;
    }

    return false;
  }

  async getAnalytics(campaignId) {
    // Get analytics data for the campaign
    const [rows] = await this.pool.execute(
      `SELECT DATE(date) as date, metric, SUM(value) as value
       FROM notification_analytics
       WHERE campaign_id = ?
       GROUP BY DATE(date), metric
       ORDER BY date DESC, metric`,
      [campaignId]
    );

    return rows;
  }

  async getOverallStats() {
    const [rows] = await this.pool.execute(
      `SELECT
        COUNT(*) as total_campaigns,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as active_campaigns,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_campaigns,
        SUM(sent_count) as total_notifications_sent,
        SUM(delivered_count) as total_delivered
       FROM notification_campaigns`
    );

    return rows[0];
  }

  async delete(id, deletedBy) {
    // Soft delete by marking as cancelled
    const [result] = await this.pool.execute(
      'UPDATE notification_campaigns SET status = ?, updated_at = NOW() WHERE id = ? AND created_by = ?',
      ['cancelled', id, deletedBy]
    );

    return result.affectedRows > 0;
  }
}