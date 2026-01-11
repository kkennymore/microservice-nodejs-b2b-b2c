import mysql from 'mysql2/promise';
import config from '/app/shared/config.js';

export class AnalyticsEventModel {
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

  async create(eventData) {
    const {
      event_type,
      user_id,
      session_id,
      event_data = {},
      ip_address,
      user_agent,
      referrer,
      timestamp = new Date()
    } = eventData;

    const [result] = await this.pool.execute(
      `INSERT INTO analytics_events (event_type, user_id, session_id, event_data, ip_address, user_agent, referrer, timestamp, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [event_type, user_id, session_id, JSON.stringify(event_data), ip_address, user_agent, referrer, timestamp]
    );

    return result.insertId;
  }

  async getEventsByDateRange(startDate, endDate, eventType = null, userId = null) {
    let query = 'SELECT * FROM analytics_events WHERE timestamp BETWEEN ? AND ?';
    const params = [startDate, endDate];

    if (eventType) {
      query += ' AND event_type = ?';
      params.push(eventType);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY timestamp DESC';

    const [rows] = await this.pool.execute(query, params);
    return rows.map(row => ({
      ...row,
      event_data: JSON.parse(row.event_data || '{}')
    }));
  }

  async getEventStats(startDate, endDate) {
    const [rows] = await this.pool.execute(
      `SELECT
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions
       FROM analytics_events
       WHERE timestamp BETWEEN ? AND ?
       GROUP BY event_type
       ORDER BY count DESC`,
      [startDate, endDate]
    );

    return rows;
  }

  async cleanupOldEvents(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const [result] = await this.pool.execute(
      'DELETE FROM analytics_events WHERE timestamp < ?',
      [cutoffDate]
    );

    return result.affectedRows;
  }
}

export class SalesAnalyticsModel {
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

  async getSalesOverview(startDate, endDate) {
    const [rows] = await this.pool.execute(
      `SELECT
        COUNT(DISTINCT t.id) as total_orders,
        SUM(t.amount) as total_revenue,
        AVG(t.amount) as average_order_value,
        COUNT(DISTINCT t.user_id) as unique_customers
       FROM transactions t
       WHERE t.type = 'payment'
       AND t.status = 'completed'
       AND t.created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    return rows[0];
  }

  async getSalesByPeriod(startDate, endDate, groupBy = 'day') {
    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00:00';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const [rows] = await this.pool.execute(
      `SELECT
        DATE_FORMAT(t.created_at, ?) as period,
        COUNT(*) as orders,
        SUM(t.amount) as revenue,
        AVG(t.amount) as avg_order_value
       FROM transactions t
       WHERE t.type = 'payment'
       AND t.status = 'completed'
       AND t.created_at BETWEEN ? AND ?
       GROUP BY period
       ORDER BY period`,
      [dateFormat, startDate, endDate]
    );

    return rows;
  }

  async getTopProducts(startDate, endDate, limit = 10) {
    // This would require order/product relationship tables
    // For now, return placeholder data
    return [];
  }

  async getRevenueByCategory(startDate, endDate) {
    // This would require product category relationships
    // For now, return placeholder data
    return [];
  }

  async getCustomerLifetimeValue() {
    const [rows] = await this.pool.execute(
      `SELECT
        t.user_id,
        COUNT(t.id) as total_orders,
        SUM(t.amount) as total_spent,
        AVG(t.amount) as avg_order_value,
        MAX(t.created_at) as last_order_date,
        MIN(t.created_at) as first_order_date,
        DATEDIFF(NOW(), MIN(t.created_at)) as customer_age_days
       FROM transactions t
       WHERE t.type = 'payment' AND t.status = 'completed'
       GROUP BY t.user_id
       HAVING total_orders > 0
       ORDER BY total_spent DESC
       LIMIT 100`
    );

    return rows.map(row => ({
      ...row,
      lifetime_value: parseFloat(row.total_spent),
      avg_order_value: parseFloat(row.avg_order_value)
    }));
  }
}

export class UserAnalyticsModel {
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

  async getUserAcquisition(startDate, endDate) {
    const [rows] = await this.pool.execute(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d') as date,
        COUNT(*) as new_users,
        role
       FROM users
       WHERE created_at BETWEEN ? AND ?
       GROUP BY date, role
       ORDER BY date`,
      [startDate, endDate]
    );

    return rows;
  }

  async getUserRetention(retentionDays = 30) {
    const [rows] = await this.pool.execute(
      `SELECT
        COUNT(DISTINCT CASE WHEN DATEDIFF(NOW(), created_at) <= ? THEN id END) as active_users,
        COUNT(DISTINCT CASE WHEN DATEDIFF(NOW(), last_login_at) <= ? THEN id END) as recently_active,
        COUNT(*) as total_users
       FROM users
       WHERE is_active = TRUE`,
      [retentionDays, retentionDays]
    );

    const data = rows[0];
    return {
      total_users: data.total_users,
      active_users: data.active_users,
      recently_active: data.recently_active,
      retention_rate: data.total_users > 0 ? (data.recently_active / data.total_users * 100) : 0
    };
  }

  async getUserEngagement(startDate, endDate) {
    // Combine data from multiple sources
    const [loginData] = await this.pool.execute(
      `SELECT
        DATE_FORMAT(last_login_at, '%Y-%m-%d') as date,
        COUNT(*) as daily_active_users
       FROM users
       WHERE last_login_at BETWEEN ? AND ?
       GROUP BY date
       ORDER BY date`,
      [startDate, endDate]
    );

    return {
      daily_active_users: loginData,
      // Additional engagement metrics would come from analytics events
      page_views: [],
      session_duration: [],
      bounce_rate: 0
    };
  }

  async getUserSegmentation() {
    const [rows] = await this.pool.execute(
      `SELECT
        role,
        COUNT(*) as count,
        AVG(DATEDIFF(NOW(), created_at)) as avg_account_age_days
       FROM users
       WHERE is_active = TRUE
       GROUP BY role`
    );

    return rows;
  }

  async getGeographicDistribution() {
    const [rows] = await this.pool.execute(
      `SELECT
        COALESCE(NULLIF(city, ''), 'Unknown') as city,
        COALESCE(NULLIF(country, ''), 'Unknown') as country,
        COUNT(*) as user_count
       FROM user_profiles
       WHERE city IS NOT NULL OR country IS NOT NULL
       GROUP BY city, country
       ORDER BY user_count DESC
       LIMIT 20`
    );

    return rows;
  }
}

export class ProductAnalyticsModel {
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

  async getProductPerformance(startDate, endDate) {
    // This would require product view/order tracking tables
    // For now, return basic product statistics
    const [rows] = await this.pool.execute(
      `SELECT
        'sample_product' as product_name,
        100 as views,
        10 as orders,
        500.00 as revenue,
        50.00 as avg_price
       FROM dual
       WHERE 1=0` // Return empty for now
    );

    return rows;
  }

  async getCategoryPerformance(startDate, endDate) {
    // This would require category relationships
    return [];
  }

  async getInventoryAnalytics() {
    // This would require inventory tracking
    return {
      total_products: 0,
      low_stock_items: 0,
      out_of_stock_items: 0,
      average_stock_level: 0
    };
  }

  async getConversionFunnel(startDate, endDate) {
    // This would require detailed event tracking
    return {
      product_views: 0,
      add_to_cart: 0,
      checkout_started: 0,
      orders_completed: 0,
      conversion_rate: 0
    };
  }
}

export class DashboardModel {
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

  async getKPIs(startDate, endDate) {
    // Get key performance indicators
    const salesModel = new SalesAnalyticsModel();
    const userModel = new UserAnalyticsModel();

    const [sales, users] = await Promise.all([
      salesModel.getSalesOverview(startDate, endDate),
      userModel.getUserRetention()
    ]);

    return {
      total_revenue: parseFloat(sales.total_revenue || 0),
      total_orders: parseInt(sales.total_orders || 0),
      average_order_value: parseFloat(sales.average_order_value || 0),
      unique_customers: parseInt(sales.unique_customers || 0),
      user_retention_rate: users.retention_rate,
      total_users: users.total_users
    };
  }

  async getRevenueChart(startDate, endDate, groupBy = 'day') {
    const salesModel = new SalesAnalyticsModel();
    return await salesModel.getSalesByPeriod(startDate, endDate, groupBy);
  }

  async getTopMetrics() {
    // Get top products, categories, users, etc.
    return {
      top_products: [],
      top_categories: [],
      top_customers: [],
      trending_products: []
    };
  }

  async getRealtimeMetrics() {
    // Get real-time data for dashboard
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [recentOrders] = await this.pool.execute(
      `SELECT COUNT(*) as recent_orders
       FROM transactions
       WHERE type = 'payment'
       AND status = 'completed'
       AND created_at >= ?`,
      [oneHourAgo]
    );

    return {
      active_users: 0, // Would come from session tracking
      recent_orders: recentOrders[0].recent_orders,
      pending_notifications: 0, // Would come from notifications service
      system_load: process.cpuUsage()
    };
  }
}