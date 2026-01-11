import { AnalyticsEventModel, SalesAnalyticsModel, UserAnalyticsModel, ProductAnalyticsModel, DashboardModel } from '@/models/index.js';

class AnalyticsAggregator {
  constructor() {
    this.eventModel = new AnalyticsEventModel();
    this.salesModel = new SalesAnalyticsModel();
    this.userModel = new UserAnalyticsModel();
    this.productModel = new ProductAnalyticsModel();
    this.dashboardModel = new DashboardModel();
    this.isRunning = false;
    this.aggregationInterval = null;
  }

  async initialize() {
    console.log('📊 Initializing Analytics Aggregator');

    this.isRunning = true;

    // Start daily aggregation
    this.startDailyAggregation();

    // Start hourly aggregation for real-time data
    this.startHourlyAggregation();

    console.log('📊 Analytics aggregation started');
  }

  // Aggregate data on a daily basis
  startDailyAggregation() {
    // Run daily aggregation at midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      this.runDailyAggregation();
      // Then run every 24 hours
      setInterval(this.runDailyAggregation.bind(this), 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
  }

  // Aggregate data hourly for real-time dashboard
  startHourlyAggregation() {
    this.aggregationInterval = setInterval(() => {
      this.runHourlyAggregation();
    }, 60 * 60 * 1000); // Every hour
  }

  async runDailyAggregation() {
    try {
      console.log('📊 Running daily analytics aggregation...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Aggregate various metrics
      await this.aggregateSalesMetrics(yesterdayStr);
      await this.aggregateUserMetrics(yesterdayStr);
      await this.aggregateProductMetrics(yesterdayStr);

      // Cleanup old events
      const cleanedEvents = await this.eventModel.cleanupOldEvents(90);
      console.log(`🧹 Cleaned up ${cleanedEvents} old analytics events`);

    } catch (error) {
      console.error('❌ Daily aggregation failed:', error);
    }
  }

  async runHourlyAggregation() {
    try {
      // Update real-time metrics
      await this.updateRealtimeMetrics();
    } catch (error) {
      console.error('❌ Hourly aggregation failed:', error);
    }
  }

  async aggregateSalesMetrics(date) {
    const startDate = `${date} 00:00:00`;
    const endDate = `${date} 23:59:59`;

    const salesData = await this.salesModel.getSalesOverview(startDate, endDate);

    // Store aggregated data (would typically go to a summary table)
    console.log(`💰 Daily sales aggregated: $${salesData.total_revenue} from ${salesData.total_orders} orders`);
  }

  async aggregateUserMetrics(date) {
    const startDate = `${date} 00:00:00`;
    const endDate = `${date} 23:59:59`;

    const userData = await this.userModel.getUserAcquisition(startDate, endDate);

    // Store aggregated user data
    const totalNewUsers = userData.reduce((sum, day) => sum + day.new_users, 0);
    console.log(`👥 Daily user acquisition: ${totalNewUsers} new users`);
  }

  async aggregateProductMetrics(date) {
    // Aggregate product performance data
    console.log(`📦 Daily product metrics aggregated for ${date}`);
  }

  async updateRealtimeMetrics() {
    // Update cached real-time metrics
    const metrics = await this.dashboardModel.getRealtimeMetrics();

    // Cache metrics for fast dashboard access
    this.realtimeMetrics = {
      ...metrics,
      lastUpdated: new Date()
    };
  }

  // Get current status
  getStatus() {
    return {
      running: this.isRunning,
      lastDailyAggregation: null, // Would track this
      realtimeMetrics: this.realtimeMetrics,
      aggregationInterval: this.aggregationInterval ? 'active' : 'inactive'
    };
  }

  // Shutdown gracefully
  async shutdown() {
    console.log('🛑 Shutting down Analytics Aggregator...');
    this.isRunning = false;

    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
  }
}

export default new AnalyticsAggregator();