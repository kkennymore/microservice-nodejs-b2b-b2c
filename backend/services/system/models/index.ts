import mysql from 'mysql2/promise';
import config from '/app/shared/config.js';

export class SystemSettingsModel {
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

  async getAllSettings() {
    const [rows] = await this.pool.execute(
      'SELECT * FROM system_settings ORDER BY setting_key'
    );
    return rows;
  }

  async getSetting(key) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM system_settings WHERE setting_key = ?',
      [key]
    );

    if (rows[0]) {
      // Parse JSON value based on type
      const setting = rows[0];
      switch (setting.setting_type) {
        case 'json':
        case 'array':
          setting.parsed_value = JSON.parse(setting.setting_value);
          break;
        case 'boolean':
          setting.parsed_value = setting.setting_value === 'true';
          break;
        case 'number':
          setting.parsed_value = parseFloat(setting.setting_value);
          break;
        default:
          setting.parsed_value = setting.setting_value;
      }
    }

    return rows[0];
  }

  async setSetting(key, value, type = 'string', description = '', isSystem = false) {
    // Convert value to string for storage
    let stringValue;
    switch (type) {
      case 'boolean':
        stringValue = value ? 'true' : 'false';
        break;
      case 'json':
      case 'array':
        stringValue = JSON.stringify(value);
        break;
      default:
        stringValue = String(value);
    }

    const [result] = await this.pool.execute(
      `INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       setting_type = VALUES(setting_type),
       description = VALUES(description),
       updated_at = NOW()`,
      [key, stringValue, type, description, isSystem]
    );

    return result.insertId || result.affectedRows;
  }

  async deleteSetting(key) {
    const [result] = await this.pool.execute(
      'DELETE FROM system_settings WHERE setting_key = ? AND is_system = 0',
      [key]
    );

    return result.affectedRows > 0;
  }
}

export class AdminActionLogModel {
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

  async logAction(actionData) {
    const {
      admin_id,
      action_type,
      resource_type,
      resource_id,
      action_description,
      old_values = null,
      new_values = null,
      ip_address,
      user_agent,
      session_id
    } = actionData;

    const [result] = await this.pool.execute(
      `INSERT INTO admin_action_logs
       (admin_id, action_type, resource_type, resource_id, action_description, old_values, new_values, ip_address, user_agent, session_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [admin_id, action_type, resource_type, resource_id, action_description,
       old_values ? JSON.stringify(old_values) : null,
       new_values ? JSON.stringify(new_values) : null,
       ip_address, user_agent, session_id]
    );

    return result.insertId;
  }

  async getActionLogs(filters = {}) {
    let query = `
      SELECT aal.*, u.username as admin_username, u.email as admin_email
      FROM admin_action_logs aal
      JOIN users u ON aal.admin_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.admin_id) {
      query += ' AND aal.admin_id = ?';
      params.push(filters.admin_id);
    }

    if (filters.action_type) {
      query += ' AND aal.action_type = ?';
      params.push(filters.action_type);
    }

    if (filters.resource_type) {
      query += ' AND aal.resource_type = ?';
      params.push(filters.resource_type);
    }

    if (filters.date_from) {
      query += ' AND aal.created_at >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND aal.created_at <= ?';
      params.push(filters.date_to);
    }

    query += ' ORDER BY aal.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const [rows] = await this.pool.execute(query, params);
    return rows;
  }

  async getActionStats(filters = {}) {
    let query = `
      SELECT
        action_type,
        resource_type,
        COUNT(*) as count,
        MAX(created_at) as last_action
      FROM admin_action_logs
      WHERE 1=1
    `;
    const params = [];

    if (filters.date_from) {
      query += ' AND created_at >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND created_at <= ?';
      params.push(filters.date_to);
    }

    query += ' GROUP BY action_type, resource_type ORDER BY count DESC';

    const [rows] = await this.pool.execute(query, params);
    return rows;
  }
}

export class UserManagementModel {
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

  async getUserManagementData(userId = null) {
    let query = `
      SELECT
        um.*,
        u.username,
        u.email,
        u.role,
        u.created_at as user_created_at,
        u.last_login_at,
        up.first_name,
        up.last_name,
        up.phone,
        up.city,
        up.country
      FROM user_management um
      JOIN users u ON um.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
    `;

    const params = [];
    if (userId) {
      query += ' WHERE um.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY um.created_at DESC';

    const [rows] = await this.pool.execute(query, params);
    return rows;
  }

  async updateUserStatus(userId, statusData) {
    const {
      account_status,
      suspension_reason,
      ban_reason,
      admin_notes
    } = statusData;

    const [result] = await this.pool.execute(
      `INSERT INTO user_management
       (user_id, account_status, suspension_reason, ban_reason, admin_notes, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
       account_status = VALUES(account_status),
       suspension_reason = VALUES(suspension_reason),
       ban_reason = VALUES(ban_reason),
       admin_notes = VALUES(admin_notes),
       updated_at = NOW()`,
      [userId, account_status, suspension_reason, ban_reason, admin_notes]
    );

    return result.affectedRows > 0;
  }

  async flagUser(userId, reason) {
    const [result] = await this.pool.execute(
      `INSERT INTO user_management
       (user_id, risk_score, flagged_at, flagged_reason, updated_at)
       VALUES (?, 0.8, NOW(), ?, NOW())
       ON DUPLICATE KEY UPDATE
       risk_score = 0.8,
       flagged_at = NOW(),
       flagged_reason = VALUES(flagged_reason),
       updated_at = NOW()`,
      [userId, reason]
    );

    return result.affectedRows > 0;
  }

  async getFlaggedUsers() {
    const [rows] = await this.pool.execute(
      `SELECT
        um.*,
        u.username,
        u.email,
        u.created_at as user_created_at
      FROM user_management um
      JOIN users u ON um.user_id = u.id
      WHERE um.flagged_at IS NOT NULL
      ORDER BY um.flagged_at DESC`
    );

    return rows;
  }

  async getUserStats() {
    const [rows] = await this.pool.execute(
      `SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN account_status = 'active' THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN account_status = 'suspended' THEN 1 ELSE 0 END) as suspended_users,
        SUM(CASE WHEN account_status = 'banned' THEN 1 ELSE 0 END) as banned_users,
        SUM(CASE WHEN flagged_at IS NOT NULL THEN 1 ELSE 0 END) as flagged_users,
        AVG(risk_score) as avg_risk_score
      FROM user_management`
    );

    return rows[0];
  }
}

export class SystemAlertModel {
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

  async createAlert(alertData) {
    const {
      alert_type,
      alert_title,
      alert_message,
      source_service,
      source_component,
      severity_level = 1,
      alert_data = {},
      auto_resolve = false
    } = alertData;

    const [result] = await this.pool.execute(
      `INSERT INTO system_alerts
       (alert_type, alert_title, alert_message, source_service, source_component, severity_level, alert_data, auto_resolve, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [alert_type, alert_title, alert_message, source_service, source_component, severity_level, JSON.stringify(alert_data), auto_resolve]
    );

    return result.insertId;
  }

  async getActiveAlerts() {
    const [rows] = await this.pool.execute(
      `SELECT sa.*, u1.username as acknowledged_by_name, u2.username as resolved_by_name
       FROM system_alerts sa
       LEFT JOIN users u1 ON sa.acknowledged_by = u1.id
       LEFT JOIN users u2 ON sa.resolved_by = u2.id
       WHERE sa.status IN ('active', 'acknowledged')
       ORDER BY sa.severity_level DESC, sa.created_at DESC`
    );

    return rows.map(row => ({
      ...row,
      alert_data: JSON.parse(row.alert_data || '{}')
    }));
  }

  async acknowledgeAlert(alertId, adminId) {
    const [result] = await this.pool.execute(
      `UPDATE system_alerts
       SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = NOW(), updated_at = NOW()
       WHERE id = ? AND status = 'active'`,
      [adminId, alertId]
    );

    return result.affectedRows > 0;
  }

  async resolveAlert(alertId, adminId) {
    const [result] = await this.pool.execute(
      `UPDATE system_alerts
       SET status = 'resolved', resolved_by = ?, resolved_at = NOW(), updated_at = NOW()
       WHERE id = ? AND status IN ('active', 'acknowledged')`,
      [adminId, alertId]
    );

    return result.affectedRows > 0;
  }

  async getAlertStats() {
    const [rows] = await this.pool.execute(
      `SELECT
        alert_type,
        status,
        severity_level,
        COUNT(*) as count
      FROM system_alerts
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY alert_type, status, severity_level
      ORDER BY severity_level DESC, count DESC`
    );

    return rows;
  }
}

export class SystemMaintenanceModel {
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

  async createMaintenance(maintenanceData) {
    const {
      maintenance_type,
      title,
      description,
      scheduled_start,
      scheduled_end,
      affected_services,
      created_by
    } = maintenanceData;

    const [result] = await this.pool.execute(
      `INSERT INTO system_maintenance
       (maintenance_type, title, description, scheduled_start, scheduled_end, affected_services, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [maintenance_type, title, description, scheduled_start, scheduled_end, JSON.stringify(affected_services), created_by]
    );

    return result.insertId;
  }

  async getUpcomingMaintenance() {
    const [rows] = await this.pool.execute(
      `SELECT sm.*, u.username as created_by_name
       FROM system_maintenance sm
       JOIN users u ON sm.created_by = u.id
       WHERE sm.scheduled_start > NOW()
       AND sm.status = 'scheduled'
       ORDER BY sm.scheduled_start ASC`
    );

    return rows.map(row => ({
      ...row,
      affected_services: JSON.parse(row.affected_services || '[]')
    }));
  }

  async startMaintenance(maintenanceId) {
    const [result] = await this.pool.execute(
      `UPDATE system_maintenance
       SET status = 'in_progress', actual_start = NOW(), updated_at = NOW()
       WHERE id = ? AND status = 'scheduled'`,
      [maintenanceId]
    );

    return result.affectedRows > 0;
  }

  async completeMaintenance(maintenanceId) {
    const [result] = await this.pool.execute(
      `UPDATE system_maintenance
       SET status = 'completed', actual_end = NOW(), updated_at = NOW()
       WHERE id = ? AND status = 'in_progress'`,
      [maintenanceId]
    );

    return result.affectedRows > 0;
  }
}

export class PerformanceMetricsModel {
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

  async recordMetric(serviceName, metricType, value, unit = null, metadata = {}) {
    const [result] = await this.pool.execute(
      `INSERT INTO system_performance_metrics
       (service_name, metric_type, metric_value, metric_unit, metadata, recorded_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [serviceName, metricType, value, unit, JSON.stringify(metadata)]
    );

    return result.insertId;
  }

  async getMetrics(serviceName = null, metricType = null, hours = 24) {
    let query = `
      SELECT *
      FROM system_performance_metrics
      WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
    `;
    const params = [hours];

    if (serviceName) {
      query += ' AND service_name = ?';
      params.push(serviceName);
    }

    if (metricType) {
      query += ' AND metric_type = ?';
      params.push(metricType);
    }

    query += ' ORDER BY recorded_at DESC';

    const [rows] = await this.pool.execute(query, params);

    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async getMetricsSummary(hours = 24) {
    const [rows] = await this.pool.execute(
      `SELECT
        service_name,
        metric_type,
        COUNT(*) as count,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        STDDEV(metric_value) as std_dev
      FROM system_performance_metrics
      WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      GROUP BY service_name, metric_type
      ORDER BY service_name, metric_type`,
      [hours]
    );

    return rows;
  }
}