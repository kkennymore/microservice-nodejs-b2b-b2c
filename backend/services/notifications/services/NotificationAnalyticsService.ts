import { NotificationAnalyticsModel } from '@/models/index.js';

class NotificationAnalyticsService {
  constructor() {
    this.analyticsModel = new NotificationAnalyticsModel();
    this.metrics = new Map();
    this.startDailyAggregation();
  }

  // Record notification event
  async recordEvent(eventData) {
    try {
      const {
        channel, // 'email', 'sms', 'push', 'whatsapp'
        event_type, // 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'
        user_id,
        campaign_id,
        template_id,
        metadata = {}
      } = eventData;

      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Store in memory for quick access
      const key = `${date}_${channel}_${event_type}_${campaign_id || 'direct'}`;
      if (!this.metrics.has(key)) {
        this.metrics.set(key, 0);
      }
      this.metrics.set(key, this.metrics.get(key) + 1);

      // Store in database
      await this.analyticsModel.create({
        date,
        channel,
        metric: event_type,
        value: 1,
        campaign_id,
        metadata
      });

      // Update campaign metrics if applicable
      if (campaign_id) {
        await this.updateCampaignMetrics(campaign_id, event_type);
      }

      console.log(`📊 Recorded ${event_type} event for ${channel} channel`);
    } catch (error) {
      console.error('Record analytics event error:', error);
    }
  }

  // Update campaign metrics
  async updateCampaignMetrics(campaignId, eventType) {
    try {
      // Import here to avoid circular dependency
      const { NotificationCampaignModel } = await import('../models/index.js');
      const campaignModel = new NotificationCampaignModel();

      const updates = {};
      switch (eventType) {
        case 'sent':
          updates.sent_count = 1; // Increment by 1
          break;
        case 'delivered':
          updates.delivered_count = 1;
          break;
        case 'failed':
          updates.failed_count = 1;
          break;
      }

      if (Object.keys(updates).length > 0) {
        await campaignModel.incrementMetrics(campaignId, updates);
      }
    } catch (error) {
      console.error('Update campaign metrics error:', error);
    }
  }

  // Get analytics for date range
  async getAnalytics(startDate, endDate, channel = null, campaignId = null) {
    try {
      const analytics = await this.analyticsModel.findByDateRange(
        startDate,
        endDate,
        channel,
        campaignId
      );

      // Aggregate results
      const aggregated = this.aggregateAnalytics(analytics);

      return {
        period: { start: startDate, end: endDate },
        channel: channel,
        campaign_id: campaignId,
        metrics: aggregated,
        summary: this.generateSummary(aggregated)
      };
    } catch (error) {
      console.error('Get analytics error:', error);
      throw new Error('Failed to retrieve analytics');
    }
  }

  // Aggregate analytics data
  aggregateAnalytics(analytics) {
    const aggregated = {};

    for (const record of analytics) {
      const key = `${record.channel}_${record.metric}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          channel: record.channel,
          metric: record.metric,
          total: 0,
          daily_breakdown: {}
        };
      }

      aggregated[key].total += record.value;

      const dateKey = record.date.toISOString().split('T')[0];
      if (!aggregated[key].daily_breakdown[dateKey]) {
        aggregated[key].daily_breakdown[dateKey] = 0;
      }
      aggregated[key].daily_breakdown[dateKey] += record.value;
    }

    return Object.values(aggregated);
  }

  // Generate summary statistics
  generateSummary(aggregated) {
    const summary = {
      total_events: 0,
      by_channel: {},
      by_metric: {},
      delivery_rates: {}
    };

    for (const metric of aggregated) {
      summary.total_events += metric.total;

      // By channel
      if (!summary.by_channel[metric.channel]) {
        summary.by_channel[metric.channel] = 0;
      }
      summary.by_channel[metric.channel] += metric.total;

      // By metric
      if (!summary.by_metric[metric.metric]) {
        summary.by_metric[metric.metric] = 0;
      }
      summary.by_metric[metric.metric] += metric.total;
    }

    // Calculate delivery rates
    const sent = summary.by_metric.sent || 0;
    const delivered = summary.by_metric.delivered || 0;
    const failed = summary.by_metric.failed || 0;

    if (sent > 0) {
      summary.delivery_rates.overall = ((delivered + failed) / sent * 100);
      summary.delivery_rates.success = (delivered / sent * 100);
      summary.delivery_rates.failure = (failed / sent * 100);
    }

    return summary;
  }

  // Get real-time metrics
  getRealTimeMetrics() {
    const metrics = {
      total_events_today: 0,
      by_channel: {},
      recent_events: []
    };

    const today = new Date().toISOString().split('T')[0];

    for (const [key, value] of this.metrics.entries()) {
      if (key.startsWith(today)) {
        metrics.total_events_today += value;

        const [, channel] = key.split('_');
        if (!metrics.by_channel[channel]) {
          metrics.by_channel[channel] = 0;
        }
        metrics.by_channel[channel] += value;
      }
    }

    return metrics;
  }

  // Get performance insights
  async getPerformanceInsights(days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await this.getAnalytics(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const insights = {
        period: `${days} days`,
        recommendations: [],
        trends: {},
        alerts: []
      };

      // Analyze delivery rates
      const deliveryRate = analytics.summary.delivery_rates.success;
      if (deliveryRate < 80) {
        insights.alerts.push({
          type: 'warning',
          message: `Low delivery rate: ${deliveryRate.toFixed(1)}%`,
          suggestion: 'Check provider configuration and content quality'
        });
      }

      // Analyze channel performance
      const channelPerformance = analytics.summary.by_channel;
      const bestChannel = Object.entries(channelPerformance)
        .sort(([,a], [,b]) => b - a)[0];

      if (bestChannel) {
        insights.recommendations.push({
          type: 'info',
          message: `${bestChannel[0]} is your highest performing channel`,
          suggestion: 'Consider increasing usage of this channel'
        });
      }

      // Check for failed notifications
      const failedCount = analytics.summary.by_metric.failed || 0;
      if (failedCount > analytics.summary.total_events * 0.1) {
        insights.alerts.push({
          type: 'error',
          message: `High failure rate: ${failedCount} failed notifications`,
          suggestion: 'Review provider credentials and message content'
        });
      }

      return insights;
    } catch (error) {
      console.error('Get performance insights error:', error);
      throw new Error('Failed to generate performance insights');
    }
  }

  // Export analytics data
  async exportAnalytics(startDate, endDate, format = 'json') {
    try {
      const analytics = await this.getAnalytics(startDate, endDate);

      switch (format) {
        case 'csv':
          return this.convertToCSV(analytics);
        case 'json':
        default:
          return JSON.stringify(analytics, null, 2);
      }
    } catch (error) {
      console.error('Export analytics error:', error);
      throw new Error('Failed to export analytics');
    }
  }

  // Convert analytics to CSV
  convertToCSV(analytics) {
    const headers = ['Date', 'Channel', 'Metric', 'Value'];
    const rows = [headers.join(',')];

    for (const metric of analytics.metrics) {
      for (const [date, value] of Object.entries(metric.daily_breakdown)) {
        rows.push([date, metric.channel, metric.metric, value].join(','));
      }
    }

    return rows.join('\n');
  }

  // Start daily aggregation process
  startDailyAggregation() {
    // Aggregate metrics every hour
    setInterval(() => {
      this.aggregateDailyMetrics();
    }, 60 * 60 * 1000); // Every hour

    // Clean old metrics every day
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000); // Every day

    console.log('📊 Analytics aggregation service started');
  }

  // Aggregate daily metrics
  async aggregateDailyMetrics() {
    try {
      // This would aggregate raw events into daily summaries
      // For now, just log the current metrics count
      console.log(`📊 Current metrics in memory: ${this.metrics.size}`);
    } catch (error) {
      console.error('Aggregate daily metrics error:', error);
    }
  }

  // Clean up old metrics
  async cleanupOldMetrics(daysOld = 90) {
    try {
      await this.analyticsModel.cleanup(daysOld);
      console.log(`🧹 Cleaned up analytics data older than ${daysOld} days`);
    } catch (error) {
      console.error('Cleanup old metrics error:', error);
    }
  }

  // Get dashboard data
  async getDashboardData() {
    try {
      const realTime = this.getRealTimeMetrics();

      // Get last 7 days analytics
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyAnalytics = await this.getAnalytics(
        sevenDaysAgo.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );

      const insights = await this.getPerformanceInsights(7);

      return {
        real_time: realTime,
        weekly: weeklyAnalytics,
        insights: insights,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get dashboard data error:', error);
      throw new Error('Failed to retrieve dashboard data');
    }
  }
}

export default new NotificationAnalyticsService();