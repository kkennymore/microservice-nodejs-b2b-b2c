import mysql from 'mysql2/promise';
import config from '/app/shared/config.js';

export class TicketModel {
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

  async create(ticketData) {
    const {
      title,
      description,
      priority = 'medium',
      category = 'other',
      subcategory,
      customer_id,
      customer_email,
      customer_name,
      department = 'general',
      source = 'web',
      tags = [],
      custom_fields = {}
    } = ticketData;

    // Generate ticket number
    const ticketNumber = await this.generateTicketNumber();

    const [result] = await this.pool.execute(
      `INSERT INTO support_tickets
       (ticket_number, title, description, priority, category, subcategory, customer_id, customer_email, customer_name, department, source, tags, custom_fields, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [ticketNumber, title, description, priority, category, subcategory, customer_id, customer_email, customer_name, department, source, JSON.stringify(tags), JSON.stringify(custom_fields)]
    );

    return { id: result.insertId, ticketNumber };
  }

  async getById(id, userId = null, userRole = null) {
    let query = `
      SELECT st.*,
             u_assigned.username as assigned_agent_name,
             u_customer.username as customer_username
      FROM support_tickets st
      LEFT JOIN users u_assigned ON st.assigned_to = u_assigned.id
      LEFT JOIN users u_customer ON st.customer_id = u_customer.id
      WHERE st.id = ?
    `;

    // Apply access control
    if (userRole !== 'admin') {
      if (userRole === 'agent') {
        query += ' AND (st.customer_id = ? OR st.assigned_to = ?)';
      } else {
        // Customer can only see their own tickets
        query += ' AND st.customer_id = ?';
      }
    }

    const params = [id];
    if (userRole !== 'admin') {
      params.push(userId, userId);
    }

    const [rows] = await this.pool.execute(query, params);

    if (rows[0]) {
      // Parse JSON fields
      rows[0].tags = JSON.parse(rows[0].tags || '[]');
      rows[0].custom_fields = JSON.parse(rows[0].custom_fields || '{}');
    }

    return rows[0];
  }

  async getTickets(filters = {}, userId = null, userRole = null) {
    let query = `
      SELECT st.*,
             u_assigned.username as assigned_agent_name,
             u_customer.username as customer_username,
             COUNT(tm.id) as message_count,
             MAX(tm.created_at) as last_message_at
      FROM support_tickets st
      LEFT JOIN users u_assigned ON st.assigned_to = u_assigned.id
      LEFT JOIN users u_customer ON st.customer_id = u_customer.id
      LEFT JOIN ticket_messages tm ON st.id = tm.ticket_id
    `;

    const params = [];
    const conditions = [];

    // Apply access control
    if (userRole !== 'admin') {
      if (userRole === 'agent') {
        conditions.push('(st.customer_id = ? OR st.assigned_to = ?)');
        params.push(userId, userId);
      } else {
        // Customer can only see their own tickets
        conditions.push('st.customer_id = ?');
        params.push(userId);
      }
    }

    // Apply filters
    if (filters.status) {
      conditions.push('st.status = ?');
      params.push(filters.status);
    }

    if (filters.priority) {
      conditions.push('st.priority = ?');
      params.push(filters.priority);
    }

    if (filters.category) {
      conditions.push('st.category = ?');
      params.push(filters.category);
    }

    if (filters.assigned_to) {
      conditions.push('st.assigned_to = ?');
      params.push(filters.assigned_to);
    }

    if (filters.customer_id) {
      conditions.push('st.customer_id = ?');
      params.push(filters.customer_id);
    }

    if (filters.department) {
      conditions.push('st.department = ?');
      params.push(filters.department);
    }

    if (filters.search) {
      conditions.push('(st.title LIKE ? OR st.description LIKE ? OR st.ticket_number LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY st.id ORDER BY st.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const [rows] = await this.pool.execute(query, params);

    return rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      custom_fields: JSON.parse(row.custom_fields || '{}')
    }));
  }

  async updateTicket(id, updateData) {
    const {
      status,
      priority,
      category,
      subcategory,
      assigned_to,
      department,
      resolved_at,
      closed_at,
      sla_deadline,
      tags,
      custom_fields
    } = updateData;

    const updateFields = [];
    const params = [];

    if (status !== undefined) {
      updateFields.push('status = ?');
      params.push(status);
    }

    if (priority !== undefined) {
      updateFields.push('priority = ?');
      params.push(priority);
    }

    if (category !== undefined) {
      updateFields.push('category = ?');
      params.push(category);
    }

    if (subcategory !== undefined) {
      updateFields.push('subcategory = ?');
      params.push(subcategory);
    }

    if (assigned_to !== undefined) {
      updateFields.push('assigned_to = ?');
      params.push(assigned_to);
    }

    if (department !== undefined) {
      updateFields.push('department = ?');
      params.push(department);
    }

    if (resolved_at !== undefined) {
      updateFields.push('resolved_at = ?');
      params.push(resolved_at);
    }

    if (closed_at !== undefined) {
      updateFields.push('closed_at = ?');
      params.push(closed_at);
    }

    if (sla_deadline !== undefined) {
      updateFields.push('sla_deadline = ?');
      params.push(sla_deadline);
    }

    if (tags !== undefined) {
      updateFields.push('tags = ?');
      params.push(JSON.stringify(tags));
    }

    if (custom_fields !== undefined) {
      updateFields.push('custom_fields = ?');
      params.push(JSON.stringify(custom_fields));
    }

    if (updateFields.length === 0) {
      return false;
    }

    updateFields.push('updated_at = NOW()');

    const query = `UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = ?`;
    params.push(id);

    const [result] = await this.pool.execute(query, params);
    return result.affectedRows > 0;
  }

  async deleteTicket(id) {
    const [result] = await this.pool.execute(
      'DELETE FROM support_tickets WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  async getTicketStats(filters = {}) {
    let query = `
      SELECT
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tickets,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_tickets,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_tickets,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_tickets,
        AVG(CASE WHEN resolution_time_hours IS NOT NULL THEN resolution_time_hours END) as avg_resolution_time,
        SUM(CASE WHEN sla_breached = 1 THEN 1 ELSE 0 END) as sla_breaches
      FROM support_tickets
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

    const [rows] = await this.pool.execute(query, params);
    return rows[0];
  }

  async generateTicketNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Get the next sequence number for today
    const dateStr = `${year}${month}${day}`;
    const [rows] = await this.pool.execute(
      "SELECT COUNT(*) as count FROM support_tickets WHERE DATE(created_at) = CURDATE()"
    );

    const sequence = String(rows[0].count + 1).padStart(4, '0');
    return `TCK-${dateStr}-${sequence}`;
  }

  async checkSLABreach(ticketId) {
    const [rows] = await this.pool.execute(
      `SELECT
        TIMESTAMPDIFF(MINUTE, created_at, NOW()) as age_minutes,
        TIMESTAMPDIFF(MINUTE, created_at, first_response_at) as response_time,
        sla_policies.first_response_minutes,
        sla_policies.resolution_hours * 60 as resolution_minutes
      FROM support_tickets st
      JOIN sla_policies ON st.category = sla_policies.category AND st.priority = sla_policies.priority
      WHERE st.id = ? AND sla_policies.is_active = 1`,
      [ticketId]
    );

    if (rows[0]) {
      const { age_minutes, response_time, first_response_minutes, resolution_minutes } = rows[0];

      return {
        response_sla_breached: response_time > first_response_minutes,
        resolution_sla_breached: age_minutes > resolution_minutes,
        current_age_minutes: age_minutes,
        response_time_minutes: response_time,
        sla_response_minutes: first_response_minutes,
        sla_resolution_minutes: resolution_minutes
      };
    }

    return null;
  }
}

export class TicketMessageModel {
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

  async create(messageData) {
    const {
      ticket_id,
      author_id,
      author_type = 'customer',
      message_type = 'message',
      content,
      attachments = [],
      is_internal = false
    } = messageData;

    const [result] = await this.pool.execute(
      `INSERT INTO ticket_messages
       (ticket_id, author_id, author_type, message_type, content, attachments, is_internal, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [ticket_id, author_id, author_type, message_type, content, JSON.stringify(attachments), is_internal]
    );

    // Update ticket's first response time if this is the first agent response
    if (author_type === 'agent' && message_type === 'message') {
      await this.pool.execute(
        `UPDATE support_tickets
         SET first_response_at = COALESCE(first_response_at, NOW()),
             updated_at = NOW()
         WHERE id = ? AND first_response_at IS NULL`,
        [ticket_id]
      );
    }

    // Update ticket's updated_at timestamp
    await this.pool.execute(
      'UPDATE support_tickets SET updated_at = NOW() WHERE id = ?',
      [ticket_id]
    );

    return result.insertId;
  }

  async getByTicketId(ticketId, includeInternal = false) {
    const query = `
      SELECT tm.*,
             u.username as author_name,
             u.email as author_email
      FROM ticket_messages tm
      JOIN users u ON tm.author_id = u.id
      WHERE tm.ticket_id = ? ${includeInternal ? '' : 'AND tm.is_internal = 0'}
      ORDER BY tm.created_at ASC
    `;

    const [rows] = await this.pool.execute(query, [ticketId]);

    return rows.map(row => ({
      ...row,
      attachments: JSON.parse(row.attachments || '[]')
    }));
  }

  async getMessageById(id) {
    const [rows] = await this.pool.execute(
      `SELECT tm.*,
              u.username as author_name,
              u.email as author_email
       FROM ticket_messages tm
       JOIN users u ON tm.author_id = u.id
       WHERE tm.id = ?`,
      [id]
    );

    if (rows[0]) {
      rows[0].attachments = JSON.parse(rows[0].attachments || '[]');
    }

    return rows[0];
  }

  async updateMessage(id, updateData) {
    const { content, attachments, is_internal } = updateData;

    const updateFields = [];
    const params = [];

    if (content !== undefined) {
      updateFields.push('content = ?');
      params.push(content);
    }

    if (attachments !== undefined) {
      updateFields.push('attachments = ?');
      params.push(JSON.stringify(attachments));
    }

    if (is_internal !== undefined) {
      updateFields.push('is_internal = ?');
      params.push(is_internal);
    }

    if (updateFields.length === 0) {
      return false;
    }

    updateFields.push('updated_at = NOW()');

    const query = `UPDATE ticket_messages SET ${updateFields.join(', ')} WHERE id = ?`;
    params.push(id);

    const [result] = await this.pool.execute(query, params);
    return result.affectedRows > 0;
  }

  async deleteMessage(id) {
    const [result] = await this.pool.execute(
      'DELETE FROM ticket_messages WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }
}

export class TicketTemplateModel {
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

  async getAllActive() {
    const [rows] = await this.pool.execute(
      'SELECT * FROM ticket_templates WHERE is_active = 1 ORDER BY category, name'
    );

    return rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]')
    }));
  }

  async getByCategory(category) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM ticket_templates WHERE category = ? AND is_active = 1 ORDER BY name',
      [category]
    );

    return rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]')
    }));
  }

  async getById(id) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM ticket_templates WHERE id = ? AND is_active = 1',
      [id]
    );

    if (rows[0]) {
      rows[0].tags = JSON.parse(rows[0].tags || '[]');
    }

    return rows[0];
  }

  async create(templateData) {
    const {
      name,
      category,
      title_template,
      content_template,
      priority = 'medium',
      department = 'general',
      tags = [],
      created_by
    } = templateData;

    const [result] = await this.pool.execute(
      `INSERT INTO ticket_templates
       (name, category, title_template, content_template, priority, department, tags, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [name, category, title_template, content_template, priority, department, JSON.stringify(tags), created_by]
    );

    return result.insertId;
  }

  async update(id, updateData) {
    const {
      name,
      category,
      title_template,
      content_template,
      priority,
      department,
      tags,
      is_active
    } = updateData;

    const updateFields = [];
    const params = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }

    if (category !== undefined) {
      updateFields.push('category = ?');
      params.push(category);
    }

    if (title_template !== undefined) {
      updateFields.push('title_template = ?');
      params.push(title_template);
    }

    if (content_template !== undefined) {
      updateFields.push('content_template = ?');
      params.push(content_template);
    }

    if (priority !== undefined) {
      updateFields.push('priority = ?');
      params.push(priority);
    }

    if (department !== undefined) {
      updateFields.push('department = ?');
      params.push(department);
    }

    if (tags !== undefined) {
      updateFields.push('tags = ?');
      params.push(JSON.stringify(tags));
    }

    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return false;
    }

    updateFields.push('updated_at = NOW()');

    const query = `UPDATE ticket_templates SET ${updateFields.join(', ')} WHERE id = ?`;
    params.push(id);

    const [result] = await this.pool.execute(query, params);
    return result.affectedRows > 0;
  }

  async delete(id) {
    const [result] = await this.pool.execute(
      'UPDATE ticket_templates SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }
}

export class AgentWorkloadModel {
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

  async getAgentWorkload(agentId) {
    const [rows] = await this.pool.execute(
      `SELECT aw.*,
              COUNT(st.id) as actual_active_tickets
       FROM agent_workload aw
       LEFT JOIN support_tickets st ON aw.agent_id = st.assigned_to
         AND st.status IN ('open', 'in_progress')
       WHERE aw.agent_id = ?
       GROUP BY aw.agent_id`,
      [agentId]
    );

    if (rows[0]) {
      rows[0].specializations = JSON.parse(rows[0].specializations || '[]');
      // Update the actual count
      await this.pool.execute(
        'UPDATE agent_workload SET active_tickets = ? WHERE agent_id = ?',
        [rows[0].actual_active_tickets, agentId]
      );
    }

    return rows[0];
  }

  async getAvailableAgents(department = null, category = null) {
    let query = `
      SELECT aw.*,
             u.username,
             u.email,
             COUNT(st.id) as current_tickets
      FROM agent_workload aw
      JOIN users u ON aw.agent_id = u.id
      LEFT JOIN support_tickets st ON aw.agent_id = st.assigned_to
        AND st.status IN ('open', 'in_progress')
      WHERE aw.is_available = 1
    `;

    const params = [];
    const conditions = [];

    if (department) {
      conditions.push('aw.specializations LIKE ?');
      params.push(`%"department":"${department}"%`);
    }

    if (category) {
      conditions.push('aw.specializations LIKE ?');
      params.push(`%"categories":["${category}"]%`);
    }

    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' OR ') + ')';
    }

    query += `
      GROUP BY aw.agent_id
      HAVING current_tickets < aw.max_capacity
      ORDER BY (aw.max_capacity - current_tickets) DESC, aw.last_updated ASC
    `;

    const [rows] = await this.pool.execute(query, params);

    return rows.map(row => ({
      ...row,
      specializations: JSON.parse(row.specializations || '[]'),
      capacity_remaining: row.max_capacity - row.current_tickets
    }));
  }

  async updateWorkload(agentId, updateData) {
    const {
      active_tickets,
      max_capacity,
      specializations,
      is_available
    } = updateData;

    const updateFields = [];
    const params = [];

    if (active_tickets !== undefined) {
      updateFields.push('active_tickets = ?');
      params.push(active_tickets);
    }

    if (max_capacity !== undefined) {
      updateFields.push('max_capacity = ?');
      params.push(max_capacity);
    }

    if (specializations !== undefined) {
      updateFields.push('specializations = ?');
      params.push(JSON.stringify(specializations));
    }

    if (is_available !== undefined) {
      updateFields.push('is_available = ?');
      params.push(is_available);
    }

    if (updateFields.length === 0) {
      return false;
    }

    updateFields.push('last_updated = NOW()');

    const query = `INSERT INTO agent_workload (agent_id, ${updateFields.join(', ').replace(/ = \?/g, '')})
                   VALUES (?, ${'?'.repeat(updateFields.length).split('').join(', ')})
                   ON DUPLICATE KEY UPDATE ${updateFields.join(', ')}`;

    const allParams = [agentId, ...params.slice(0, -1), ...params]; // Handle INSERT and UPDATE params

    const [result] = await this.pool.execute(query, allParams);
    return result.affectedRows > 0;
  }

  async getWorkloadStats() {
    const [rows] = await this.pool.execute(
      `SELECT
        COUNT(*) as total_agents,
        SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as available_agents,
        AVG(max_capacity) as avg_capacity,
        SUM(active_tickets) as total_active_tickets,
        SUM(max_capacity) as total_capacity,
        AVG(CASE WHEN active_tickets > 0 THEN active_tickets ELSE NULL END) as avg_workload
      FROM agent_workload`
    );

    return rows[0];
  }
}