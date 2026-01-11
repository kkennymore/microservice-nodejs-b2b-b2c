import { NotificationCampaignModel } from '@/models/index.js';
import NotificationQueueService from '@/NotificationQueueService.js';

class NotificationCampaignService {
  constructor() {
    this.campaignModel = new NotificationCampaignModel();
    this.campaigns = new Map();
    this.startCampaignScheduler();
  }

  // Create a new notification campaign
  async createCampaign(campaignData) {
    try {
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

      const campaignId = await this.campaignModel.create({
        name,
        description,
        type,
        template_id,
        target_criteria,
        content,
        scheduled_at,
        created_by
      });

      // Schedule campaign if scheduled_at is provided
      if (scheduled_at) {
        this.scheduleCampaign(campaignId, new Date(scheduled_at));
      }

      console.log(`📢 Created notification campaign: ${name} (${campaignId})`);

      return campaignId;
    } catch (error) {
      console.error('Create campaign error:', error);
      throw new Error('Failed to create notification campaign');
    }
  }

  // Start a campaign
  async startCampaign(campaignId) {
    try {
      const campaign = await this.campaignModel.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        throw new Error('Campaign cannot be started');
      }

      // Update campaign status
      await this.campaignModel.updateStatus(campaignId, 'running');
      await this.campaignModel.updateStartedAt(campaignId);

      // Get target users based on criteria
      const targetUsers = await this.getTargetUsers(campaign.target_criteria);

      // Queue notifications for each user
      let queuedCount = 0;
      for (const user of targetUsers) {
        try {
          await NotificationQueueService.queueNotification({
            userId: user.id,
            type: campaign.type,
            title: campaign.content.title,
            message: campaign.content.message,
            data: campaign.content.data || {},
            campaignId,
            channels: [campaign.type],
            immediate: false
          });
          queuedCount++;
        } catch (error) {
          console.error(`Failed to queue notification for user ${user.id}:`, error);
        }
      }

      // Update campaign metrics
      await this.campaignModel.updateMetrics(campaignId, {
        total_recipients: targetUsers.length,
        sent_count: queuedCount
      });

      console.log(`🚀 Started campaign ${campaign.name}: ${queuedCount}/${targetUsers.length} notifications queued`);

      return {
        campaign_id: campaignId,
        total_recipients: targetUsers.length,
        queued_count: queuedCount
      };
    } catch (error) {
      console.error('Start campaign error:', error);
      throw error;
    }
  }

  // Get target users based on criteria
  async getTargetUsers(criteria) {
    try {
      // This is a simplified implementation
      // In production, you'd have complex user segmentation logic

      let query = 'SELECT id, email, phone FROM users WHERE is_active = TRUE';
      const params = [];

      // Apply filters based on criteria
      if (criteria.user_type) {
        query += ' AND role = ?';
        params.push(criteria.user_type);
      }

      if (criteria.registration_date_after) {
        query += ' AND created_at >= ?';
        params.push(criteria.registration_date_after);
      }

      if (criteria.registration_date_before) {
        query += ' AND created_at <= ?';
        params.push(criteria.registration_date_before);
      }

      if (criteria.last_login_after) {
        query += ' AND last_login_at >= ?';
        params.push(criteria.last_login_after);
      }

      // Add limit for testing (remove in production)
      query += ' LIMIT 100';

      const [users] = await this.campaignModel.pool.execute(query, params);
      return users;
    } catch (error) {
      console.error('Get target users error:', error);
      return [];
    }
  }

  // Schedule a campaign for future execution
  scheduleCampaign(campaignId, scheduledTime) {
    const delay = scheduledTime.getTime() - Date.now();

    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.startCampaign(campaignId);
        } catch (error) {
          console.error(`Failed to start scheduled campaign ${campaignId}:`, error);
        }
      }, delay);

      this.campaigns.set(campaignId, { scheduledTime, timeoutId: null });
      console.log(`⏰ Scheduled campaign ${campaignId} for ${scheduledTime.toISOString()}`);
    }
  }

  // Cancel a scheduled campaign
  async cancelCampaign(campaignId) {
    try {
      const campaign = await this.campaignModel.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status === 'scheduled') {
        await this.campaignModel.updateStatus(campaignId, 'cancelled');
      } else if (campaign.status === 'running') {
        await this.campaignModel.updateStatus(campaignId, 'cancelled');
        // Note: Running campaigns cannot be fully cancelled once started
      }

      // Remove from scheduled campaigns
      if (this.campaigns.has(campaignId)) {
        this.campaigns.delete(campaignId);
      }

      console.log(`❌ Cancelled campaign: ${campaign.name} (${campaignId})`);
    } catch (error) {
      console.error('Cancel campaign error:', error);
      throw error;
    }
  }

  // Get campaign analytics
  async getCampaignAnalytics(campaignId) {
    try {
      const campaign = await this.campaignModel.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get delivery metrics from notification analytics
      const analytics = await this.campaignModel.getAnalytics(campaignId);

      return {
        campaign: campaign,
        analytics: analytics,
        performance: {
          delivery_rate: campaign.total_recipients > 0 ?
            (campaign.delivered_count / campaign.total_recipients * 100) : 0,
          success_rate: campaign.sent_count > 0 ?
            (campaign.delivered_count / campaign.sent_count * 100) : 0
        }
      };
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      throw error;
    }
  }

  // Update campaign metrics (called by notification processors)
  async updateCampaignMetrics(campaignId, metrics) {
    try {
      await this.campaignModel.updateMetrics(campaignId, metrics);

      // Check if campaign is complete
      const campaign = await this.campaignModel.findById(campaignId);
      if (campaign && campaign.sent_count >= campaign.total_recipients) {
        await this.campaignModel.updateStatus(campaignId, 'completed');
        await this.campaignModel.updateCompletedAt(campaignId);
        console.log(`✅ Completed campaign: ${campaign.name} (${campaignId})`);
      }
    } catch (error) {
      console.error('Update campaign metrics error:', error);
    }
  }

  // Start the campaign scheduler
  startCampaignScheduler() {
    // Check for scheduled campaigns every minute
    setInterval(async () => {
      try {
        const scheduledCampaigns = await this.campaignModel.findScheduled();

        for (const campaign of scheduledCampaigns) {
          if (!this.campaigns.has(campaign.id)) {
            this.scheduleCampaign(campaign.id, new Date(campaign.scheduled_at));
          }
        }
      } catch (error) {
        console.error('Campaign scheduler error:', error);
      }
    }, 60000); // Check every minute

    console.log('📅 Campaign scheduler started');
  }

  // Get campaign statistics
  async getCampaignStats() {
    try {
      const stats = await this.campaignModel.getOverallStats();

      return {
        total_campaigns: stats.total_campaigns,
        active_campaigns: stats.active_campaigns,
        completed_campaigns: stats.completed_campaigns,
        total_notifications_sent: stats.total_notifications_sent,
        total_delivered: stats.total_delivered,
        average_delivery_rate: stats.total_notifications_sent > 0 ?
          (stats.total_delivered / stats.total_notifications_sent * 100) : 0
      };
    } catch (error) {
      console.error('Get campaign stats error:', error);
      throw error;
    }
  }
}

export default new NotificationCampaignService();