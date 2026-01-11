import Stripe from 'stripe';
import config from '/app/shared/config.js';

class StripeService {
  constructor() {
    this.stripe = new Stripe(config.payments.stripe.secretKey);
  }

  // Create a payment intent for one-time payments
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          ...metadata,
          service: 'transactions'
        }
      });

      return {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      };
    } catch (error) {
      console.error('Stripe payment intent creation error:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  // Confirm a payment intent
  async confirmPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);

      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        payment_method: paymentIntent.payment_method
      };
    } catch (error) {
      console.error('Stripe payment confirmation error:', error);
      throw new Error('Failed to confirm payment');
    }
  }

  // Retrieve payment intent details
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        created: paymentIntent.created
      };
    } catch (error) {
      console.error('Stripe payment intent retrieval error:', error);
      throw new Error('Failed to retrieve payment intent');
    }
  }

  // Create a customer
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          service: 'transactions'
        }
      });

      return {
        customer_id: customer.id,
        email: customer.email,
        name: customer.name
      };
    } catch (error) {
      console.error('Stripe customer creation error:', error);
      throw new Error('Failed to create customer');
    }
  }

  // Create a subscription
  async createSubscription(customerId, priceId, metadata = {}) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId
        }],
        metadata: {
          ...metadata,
          service: 'transactions'
        }
      });

      return {
        subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        customer: subscription.customer
      };
    } catch (error) {
      console.error('Stripe subscription creation error:', error);
      throw new Error('Failed to create subscription');
    }
  }

  // Cancel a subscription
  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });

      return {
        subscription_id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end
      };
    } catch (error) {
      console.error('Stripe subscription cancellation error:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  // Handle webhook events
  async handleWebhookEvent(rawBody, signature) {
    try {
      const endpointSecret = config.payments.stripe.webhookSecret;
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);

      return {
        type: event.type,
        data: event.data.object,
        event_id: event.id
      };
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      throw new Error('Webhook signature verification failed');
    }
  }

  // Create a refund
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refundData = {
        payment_intent: paymentIntentId
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);

      return {
        refund_id: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
        currency: refund.currency
      };
    } catch (error) {
      console.error('Stripe refund creation error:', error);
      throw new Error('Failed to create refund');
    }
  }
}

export default new StripeService();