import mysql from 'mysql2/promise';
import config from '/app/shared/config.js';

export class ShippingCarrierModel {
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
      'SELECT * FROM shipping_carriers WHERE is_active = 1 ORDER BY name'
    );
    return rows;
  }

  async getById(id) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM shipping_carriers WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  async getByCode(code) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM shipping_carriers WHERE code = ? AND is_active = 1',
      [code]
    );
    return rows[0];
  }

  async updateCarrierStatus(id, isActive) {
    const [result] = await this.pool.execute(
      'UPDATE shipping_carriers SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [isActive, id]
    );
    return result.affectedRows > 0;
  }
}

export class ShippingRateModel {
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

  async getRatesByZone(carrierId, zoneId, weight = null) {
    let query = `
      SELECT sr.*, sc.name as carrier_name, sc.code as carrier_code, sz.name as zone_name
      FROM shipping_rates sr
      JOIN shipping_carriers sc ON sr.carrier_id = sc.id
      JOIN shipping_zones sz ON sr.zone_id = sz.id
      WHERE sr.carrier_id = ? AND sr.zone_id = ? AND sr.is_active = 1
    `;
    const params = [carrierId, zoneId];

    if (weight !== null) {
      query += ' AND (sr.weight_min <= ? OR sr.weight_min IS NULL) AND (sr.weight_max >= ? OR sr.weight_max IS NULL)';
      params.push(weight, weight);
    }

    query += ' ORDER BY sr.price ASC';

    const [rows] = await this.pool.execute(query, params);
    return rows;
  }

  async getAllRates(filters = {}) {
    let query = `
      SELECT sr.*, sc.name as carrier_name, sc.code as carrier_code, sz.name as zone_name
      FROM shipping_rates sr
      JOIN shipping_carriers sc ON sr.carrier_id = sc.id
      JOIN shipping_zones sz ON sr.zone_id = sz.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.carrier_id) {
      query += ' AND sr.carrier_id = ?';
      params.push(filters.carrier_id);
    }

    if (filters.zone_id) {
      query += ' AND sr.zone_id = ?';
      params.push(filters.zone_id);
    }

    if (filters.is_active !== undefined) {
      query += ' AND sr.is_active = ?';
      params.push(filters.is_active);
    }

    query += ' ORDER BY sr.carrier_id, sr.zone_id, sr.price';

    const [rows] = await this.pool.execute(query, params);
    return rows;
  }

  async createRate(rateData) {
    const {
      carrier_id,
      zone_id,
      service_type,
      service_name,
      weight_min,
      weight_max,
      price,
      currency = 'USD',
      estimated_days_min,
      estimated_days_max
    } = rateData;

    const [result] = await this.pool.execute(
      `INSERT INTO shipping_rates
       (carrier_id, zone_id, service_type, service_name, weight_min, weight_max, price, currency, estimated_days_min, estimated_days_max, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [carrier_id, zone_id, service_type, service_name, weight_min, weight_max, price, currency, estimated_days_min, estimated_days_max]
    );

    return result.insertId;
  }
}

export class ShipmentModel {
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

  async create(shipmentData) {
    const {
      order_id,
      seller_id,
      carrier_id,
      service_type,
      shipping_cost,
      currency = 'USD',
      weight,
      dimensions,
      ship_from,
      ship_to,
      notes
    } = shipmentData;

    const [result] = await this.pool.execute(
      `INSERT INTO shipments
       (order_id, seller_id, carrier_id, service_type, shipping_cost, currency, weight, dimensions, ship_from, ship_to, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [order_id, seller_id, carrier_id, service_type, shipping_cost, currency, weight,
       JSON.stringify(dimensions), JSON.stringify(ship_from), JSON.stringify(ship_to), notes]
    );

    return result.insertId;
  }

  async updateTracking(shipmentId, trackingNumber, labelUrl = null, trackingUrl = null) {
    const [result] = await this.pool.execute(
      `UPDATE shipments
       SET tracking_number = ?, label_url = ?, tracking_url = ?, status = 'label_created', updated_at = NOW()
       WHERE id = ?`,
      [trackingNumber, labelUrl, trackingUrl, shipmentId]
    );

    return result.affectedRows > 0;
  }

  async updateStatus(shipmentId, status, estimatedDeliveryDate = null, actualDeliveryDate = null) {
    const [result] = await this.pool.execute(
      `UPDATE shipments
       SET status = ?, estimated_delivery_date = ?, actual_delivery_date = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, estimatedDeliveryDate, actualDeliveryDate, shipmentId]
    );

    return result.affectedRows > 0;
  }

  async getById(id) {
    const [rows] = await this.pool.execute(
      `SELECT s.*, sc.name as carrier_name, sc.code as carrier_code, sc.tracking_url as carrier_tracking_url
       FROM shipments s
       JOIN shipping_carriers sc ON s.carrier_id = sc.id
       WHERE s.id = ?`,
      [id]
    );

    if (rows[0]) {
      rows[0].ship_from = JSON.parse(rows[0].ship_from || '{}');
      rows[0].ship_to = JSON.parse(rows[0].ship_to || '{}');
      rows[0].dimensions = JSON.parse(rows[0].dimensions || '{}');
    }

    return rows[0];
  }

  async getByTrackingNumber(trackingNumber) {
    const [rows] = await this.pool.execute(
      `SELECT s.*, sc.name as carrier_name, sc.code as carrier_code, sc.tracking_url as carrier_tracking_url
       FROM shipments s
       JOIN shipping_carriers sc ON s.carrier_id = sc.id
       WHERE s.tracking_number = ?`,
      [trackingNumber]
    );

    if (rows[0]) {
      rows[0].ship_from = JSON.parse(rows[0].ship_from || '{}');
      rows[0].ship_to = JSON.parse(rows[0].ship_to || '{}');
      rows[0].dimensions = JSON.parse(rows[0].dimensions || '{}');
    }

    return rows[0];
  }

  async getByOrderId(orderId) {
    const [rows] = await this.pool.execute(
      `SELECT s.*, sc.name as carrier_name, sc.code as carrier_code
       FROM shipments s
       JOIN shipping_carriers sc ON s.carrier_id = sc.id
       WHERE s.order_id = ?
       ORDER BY s.created_at DESC`,
      [orderId]
    );

    return rows.map(row => ({
      ...row,
      ship_from: JSON.parse(row.ship_from || '{}'),
      ship_to: JSON.parse(row.ship_to || '{}'),
      dimensions: JSON.parse(row.dimensions || '{}')
    }));
  }

  async getBySeller(sellerId, filters = {}) {
    let query = `
      SELECT s.*, sc.name as carrier_name, sc.code as carrier_code,
             COUNT(si.id) as item_count
       FROM shipments s
       JOIN shipping_carriers sc ON s.carrier_id = sc.id
       LEFT JOIN shipment_items si ON s.id = si.shipment_id
       WHERE s.seller_id = ?
    `;
    const params = [sellerId];

    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }

    if (filters.date_from) {
      query += ' AND s.created_at >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND s.created_at <= ?';
      params.push(filters.date_to);
    }

    query += ' GROUP BY s.id ORDER BY s.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const [rows] = await this.pool.execute(query, params);

    return rows.map(row => ({
      ...row,
      ship_from: JSON.parse(row.ship_from || '{}'),
      ship_to: JSON.parse(row.ship_to || '{}'),
      dimensions: JSON.parse(row.dimensions || '{}')
    }));
  }
}

export class TrackingEventModel {
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
      shipment_id,
      tracking_number,
      event_type,
      event_description,
      location,
      city,
      state,
      country,
      postal_code,
      event_date,
      carrier_event_data = {}
    } = eventData;

    const [result] = await this.pool.execute(
      `INSERT INTO tracking_events
       (shipment_id, tracking_number, event_type, event_description, location, city, state, country, postal_code, event_date, carrier_event_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [shipment_id, tracking_number, event_type, event_description, location, city, state, country, postal_code, event_date, JSON.stringify(carrier_event_data)]
    );

    return result.insertId;
  }

  async getByShipmentId(shipmentId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM tracking_events WHERE shipment_id = ? ORDER BY event_date DESC',
      [shipmentId]
    );

    return rows.map(row => ({
      ...row,
      carrier_event_data: JSON.parse(row.carrier_event_data || '{}')
    }));
  }

  async getByTrackingNumber(trackingNumber) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM tracking_events WHERE tracking_number = ? ORDER BY event_date DESC',
      [trackingNumber]
    );

    return rows.map(row => ({
      ...row,
      carrier_event_data: JSON.parse(row.carrier_event_data || '{}')
    }));
  }

  async getLatestEvent(trackingNumber) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM tracking_events WHERE tracking_number = ? ORDER BY event_date DESC LIMIT 1',
      [trackingNumber]
    );

    if (rows[0]) {
      rows[0].carrier_event_data = JSON.parse(rows[0].carrier_event_data || '{}');
    }

    return rows[0];
  }
}

export class SellerShippingSettingsModel {
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

  async getBySellerId(sellerId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM seller_shipping_settings WHERE seller_id = ?',
      [sellerId]
    );

    if (rows[0]) {
      rows[0].customs_info = JSON.parse(rows[0].customs_info || '{}');
    }

    return rows[0];
  }

  async createOrUpdate(sellerId, settings) {
    const {
      default_carrier_id,
      free_shipping_threshold,
      handling_time_days,
      return_policy,
      customs_info
    } = settings;

    const [result] = await this.pool.execute(
      `INSERT INTO seller_shipping_settings
       (seller_id, default_carrier_id, free_shipping_threshold, handling_time_days, return_policy, customs_info, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       default_carrier_id = VALUES(default_carrier_id),
       free_shipping_threshold = VALUES(free_shipping_threshold),
       handling_time_days = VALUES(handling_time_days),
       return_policy = VALUES(return_policy),
       customs_info = VALUES(customs_info),
       updated_at = NOW()`,
      [sellerId, default_carrier_id, free_shipping_threshold, handling_time_days, return_policy, JSON.stringify(customs_info)]
    );

    return result.insertId || result.affectedRows;
  }
}