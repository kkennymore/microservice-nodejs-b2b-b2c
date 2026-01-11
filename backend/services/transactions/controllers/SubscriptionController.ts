import { SubscriptionModel, SubscriptionPlanModel, TransactionModel } from '@/models/index.js';
import PaymentService from '@/services/PaymentService.js';

class SubscriptionController {
  constructor() {
    this.subscriptionModel = new SubscriptionModel();
    this.subscriptionPlanModel = new SubscriptionPlanModel();
  }

  // Get all available subscription plans
  async getPlans(req, res) {
    try {
      const plans = await this.subscriptionPlanModel.findAll();

      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription plans'
      });
    }
  }

  // Get user's current subscription
  async getCurrentSubscription(req, res) {
    try {
      const userId = req.user.id;

      const subscription = await this.subscriptionModel.findActiveByUserId(userId);

      res.json({
        success: true,
        data: subscription || null
      });
    } catch (error) {
      console.error('Get current subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch current subscription'
      });
    }
  }

  // Subscribe to a plan
  async subscribe(req, res) {
    try {
      const userId = req.user.id;
      const { plan_id, payment_method, payment_data = {} } = req.body;

      // Check if user already has an active subscription
      const existingSubscription = await this.subscriptionModel.findActiveByUserId(userId);
      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          message: 'User already has an active subscription'
        });
      }

      // Get plan details
      const plan = await this.subscriptionPlanModel.findById(plan_id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }

      // Process payment first
      const paymentResult = await PaymentService.processPayment(
        payment_method,
        plan.price,
        plan.currency,
        payment_data
      );

      if (paymentResult.status !== 'completed' && paymentResult.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Payment failed'
        });
      }

      // Calculate subscription end date
      const startDate = new Date();
      let endDate = new Date(startDate);

      if (plan.interval_type === 'month') {
        endDate.setMonth(endDate.getMonth() + plan.interval_count);
      } else if (plan.interval_type === 'year') {
        endDate.setFullYear(endDate.getFullYear() + plan.interval_count);
      }

      // Create transaction record for subscription payment
      const transactionModel = new TransactionModel();
      const transactionData = {
        user_id: userId,
        type: 'subscription',
        amount: plan.price,
        currency: plan.currency,
        payment_method,
        external_transaction_id: paymentResult.transaction_id,
        status: paymentResult.status === 'completed' ? 'completed' : 'pending',
        description: `Subscription to ${plan.name}`,
        metadata: {
          plan_id,
          subscription_type: 'new',
          payment_result: paymentResult
        }
      };

      const transactionId = await transactionModel.create(transactionData);

      // Create subscription
      const subscriptionData = {
        user_id: userId,
        plan_id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        metadata: {
          transaction_id: transactionId,
          payment_method,
          plan_name: plan.name,
          plan_price: plan.price,
          payment_result: paymentResult
        }
      };

      const subscriptionId = await this.subscriptionModel.create(subscriptionData);

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: {
          subscription_id: subscriptionId,
          transaction_id: transactionId,
          plan: plan,
          payment_result: paymentResult,
          start_date: subscriptionData.start_date,
          end_date: subscriptionData.end_date
        }
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription'
      });
    }
  }

  // Cancel subscription
  async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;

      const subscription = await this.subscriptionModel.findActiveByUserId(userId);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No active subscription found'
        });
      }

      await this.subscriptionModel.updateStatus(subscription.id, 'cancelled');

      res.json({
        success: true,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel subscription'
      });
    }
  }

  // Renew subscription
  async renewSubscription(req, res) {
    try {
      const userId = req.user.id;

      const subscription = await this.subscriptionModel.findActiveByUserId(userId);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No active subscription found'
        });
      }

      // Get plan details to calculate new end date
      const plan = await this.subscriptionPlanModel.findById(subscription.plan_id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }

      // Calculate new end date from current end date
      let newEndDate = new Date(subscription.end_date);

      if (plan.interval_type === 'month') {
        newEndDate.setMonth(newEndDate.getMonth() + plan.interval_count);
      } else if (plan.interval_type === 'year') {
        newEndDate.setFullYear(newEndDate.getFullYear() + plan.interval_count);
      }

      await this.subscriptionModel.renew(subscription.id, newEndDate.toISOString().split('T')[0]);

      res.json({
        success: true,
        message: 'Subscription renewed successfully',
        data: {
          new_end_date: newEndDate.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Renew subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to renew subscription'
      });
    }
  }

  // Update subscription (admin only)
  async updateSubscription(req, res) {
    try {
      const { id } = req.params;
      const { status, end_date } = req.body;

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      if (status) {
        await this.subscriptionModel.updateStatus(id, status);
      }

      if (end_date) {
        await this.subscriptionModel.renew(id, end_date);
      }

      res.json({
        success: true,
        message: 'Subscription updated successfully'
      });
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subscription'
      });
    }
  }

  // Get all subscriptions (admin only)
  async getAllSubscriptions(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // This would require a more complex query to get all subscriptions with user details
      // For now, return empty array
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      console.error('Get all subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriptions'
      });
    }
  }
}

export default new SubscriptionController();