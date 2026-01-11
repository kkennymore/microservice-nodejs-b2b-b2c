import { WebSocketServer } from 'ws';
import { AnalyticsEventModel } from '@/models/index.js';

class RealTimeProcessor {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.rabbitChannel = null;
    this.eventModel = new AnalyticsEventModel();
    this.isRunning = false;
  }

  async initialize() {
    console.log('⚡ Initializing Real-Time Analytics Processor');

    // Start WebSocket server for real-time dashboard updates
    this.startWebSocketServer();

    this.isRunning = true;
    console.log('⚡ Real-time analytics processor started');
  }

  // Start WebSocket server for real-time dashboard connections
  startWebSocketServer() {
    this.wss = new WebSocketServer({ port: 3010 }); // Different port from analytics service

    this.wss.on('connection', (ws, req) => {
      const clientId = Date.now().toString() + Math.random().toString(36);
      this.clients.set(clientId, { ws, subscribedMetrics: new Set() });

      console.log(`🔌 Dashboard client connected: ${clientId}`);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'subscribe') {
            this.clients.get(clientId).subscribedMetrics.add(data.metric);
            console.log(`📊 Client ${clientId} subscribed to ${data.metric}`);
          } else if (data.type === 'unsubscribe') {
            this.clients.get(clientId).subscribedMetrics.delete(data.metric);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`🔌 Dashboard client disconnected: ${clientId}`);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        clientId,
        timestamp: new Date().toISOString()
      }));
    });

    console.log('🌐 WebSocket server started for real-time dashboard updates');
  }

  // Initialize RabbitMQ event consumers
  async initializeEventConsumers(channel) {
    this.rabbitChannel = channel;

    // Consume analytics events
    await this.setupEventConsumer('analytics_events', this.processAnalyticsEvent.bind(this));
    await this.setupEventConsumer('user_events', this.processUserEvent.bind(this));
    await this.setupEventConsumer('sales_events', this.processSalesEvent.bind(this));
    await this.setupEventConsumer('product_events', this.processProductEvent.bind(this));

    console.log('🐰 Event consumers initialized');
  }

  async setupEventConsumer(queueName, handler) {
    await this.rabbitChannel.assertQueue(queueName, { durable: true });

    this.rabbitChannel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const eventData = JSON.parse(msg.content.toString());
          await handler(eventData);

          this.rabbitChannel.ack(msg);
        } catch (error) {
          console.error(`Event processing error for ${queueName}:`, error);
          this.rabbitChannel.nack(msg, false, false);
        }
      }
    });
  }

  // Process analytics events
  async processAnalyticsEvent(eventData) {
    try {
      // Store event in database
      await this.eventModel.create(eventData);

      // Process real-time metrics
      await this.updateRealtimeMetrics(eventData);

      // Broadcast to subscribed dashboard clients
      this.broadcastToClients('analytics_event', eventData);

      console.log(`📊 Processed analytics event: ${eventData.event_type}`);
    } catch (error) {
      console.error('Analytics event processing error:', error);
    }
  }

  // Process user events
  async processUserEvent(eventData) {
    try {
      // Store user behavior data
      await this.eventModel.create({
        ...eventData,
        event_type: `user_${eventData.action}`
      });

      // Update user engagement metrics
      this.updateUserMetrics(eventData);

      // Broadcast user activity
      this.broadcastToClients('user_activity', {
        userId: eventData.user_id,
        action: eventData.action,
        timestamp: eventData.timestamp
      });

      console.log(`👤 Processed user event: ${eventData.action} for user ${eventData.user_id}`);
    } catch (error) {
      console.error('User event processing error:', error);
    }
  }

  // Process sales events
  async processSalesEvent(eventData) {
    try {
      // Store sales data
      await this.eventModel.create({
        ...eventData,
        event_type: `sales_${eventData.type}`
      });

      // Update sales metrics
      this.updateSalesMetrics(eventData);

      // Broadcast sales updates
      this.broadcastToClients('sales_update', {
        type: eventData.type,
        amount: eventData.amount,
        timestamp: eventData.timestamp
      });

      console.log(`💰 Processed sales event: ${eventData.type} - $${eventData.amount}`);
    } catch (error) {
      console.error('Sales event processing error:', error);
    }
  }

  // Process product events
  async processProductEvent(eventData) {
    try {
      // Store product interaction data
      await this.eventModel.create({
        ...eventData,
        event_type: `product_${eventData.action}`
      });

      // Update product metrics
      this.updateProductMetrics(eventData);

      // Broadcast product updates
      this.broadcastToClients('product_activity', {
        productId: eventData.product_id,
        action: eventData.action,
        userId: eventData.user_id
      });

      console.log(`📦 Processed product event: ${eventData.action} for product ${eventData.product_id}`);
    } catch (error) {
      console.error('Product event processing error:', error);
    }
  }

  // Update real-time metrics
  async updateRealtimeMetrics(eventData) {
    // Update in-memory metrics for fast access
    if (!this.realtimeMetrics) {
      this.realtimeMetrics = {
        totalEvents: 0,
        eventsByType: {},
        activeUsers: new Set(),
        lastUpdated: new Date()
      };
    }

    this.realtimeMetrics.totalEvents++;
    this.realtimeMetrics.eventsByType[eventData.event_type] =
      (this.realtimeMetrics.eventsByType[eventData.event_type] || 0) + 1;

    if (eventData.user_id) {
      this.realtimeMetrics.activeUsers.add(eventData.user_id);
    }

    this.realtimeMetrics.lastUpdated = new Date();
  }

  // Update user engagement metrics
  updateUserMetrics(eventData) {
    // Update user behavior patterns
    // This would typically update a user metrics cache or database
    console.log(`📈 Updated user metrics for user ${eventData.user_id}`);
  }

  // Update sales performance metrics
  updateSalesMetrics(eventData) {
    // Update sales KPIs in real-time
    console.log(`📊 Updated sales metrics: +$${eventData.amount || 0}`);
  }

  // Update product performance metrics
  updateProductMetrics(eventData) {
    // Update product analytics
    console.log(`📈 Updated product metrics for product ${eventData.product_id}`);
  }

  // Broadcast data to WebSocket clients
  broadcastToClients(eventType, data) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });

    let broadcastCount = 0;
    for (const [clientId, client] of this.clients) {
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Check if client is subscribed to this metric
          if (client.subscribedMetrics.has(eventType) || client.subscribedMetrics.has('all')) {
            client.ws.send(message);
            broadcastCount++;
          }
        }
      } catch (error) {
        console.error(`Broadcast error for client ${clientId}:`, error);
      }
    }

    if (broadcastCount > 0) {
      console.log(`📡 Broadcasted ${eventType} to ${broadcastCount} dashboard clients`);
    }
  }

  // Get real-time metrics
  getRealtimeMetrics() {
    return this.realtimeMetrics || {
      totalEvents: 0,
      eventsByType: {},
      activeUsersCount: 0,
      lastUpdated: new Date()
    };
  }

  // Get processor status
  getStatus() {
    return {
      running: this.isRunning,
      websocketClients: this.clients.size,
      rabbitMQConnected: !!this.rabbitChannel,
      realtimeMetrics: this.getRealtimeMetrics()
    };
  }

  // Shutdown gracefully
  async shutdown() {
    console.log('🛑 Shutting down Real-Time Processor...');

    this.isRunning = false;

    // Close WebSocket connections
    if (this.wss) {
      this.wss.clients.forEach(client => {
        client.close();
      });
      this.wss.close();
    }

    // Clear client connections
    this.clients.clear();
  }
}

export default new RealTimeProcessor();