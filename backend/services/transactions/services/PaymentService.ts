import StripeService from '@/StripeService.js';
import PayPalService from '@/PayPalService.js';

class PaymentService {
  constructor() {
    this.providers = {
      stripe: StripeService,
      paypal: PayPalService
    };
  }

  // Process a payment using the specified gateway
  async processPayment(gateway, amount, currency = 'USD', paymentData = {}) {
    try {
      const provider = this.providers[gateway.toLowerCase()];

      if (!provider) {
        throw new Error(`Unsupported payment gateway: ${gateway}`);
      }

      switch (gateway.toLowerCase()) {
        case 'stripe':
          return await this._processStripePayment(amount, currency, paymentData);
        case 'paypal':
          return await this._processPayPalPayment(amount, currency, paymentData);
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  // Process Stripe payment
  async _processStripePayment(amount, currency, paymentData) {
    const { payment_method_id, customer_id, confirm = true } = paymentData;

    // Create payment intent
    const paymentIntent = await StripeService.createPaymentIntent(amount, currency, {
      payment_method_id,
      customer_id
    });

    // Confirm payment if requested
    if (confirm && payment_method_id) {
      const confirmation = await StripeService.confirmPaymentIntent(paymentIntent.payment_intent_id);
      return {
        gateway: 'stripe',
        status: confirmation.status,
        transaction_id: paymentIntent.payment_intent_id,
        amount: confirmation.amount,
        currency: confirmation.currency
      };
    }

    return {
      gateway: 'stripe',
      status: 'pending',
      client_secret: paymentIntent.client_secret,
      transaction_id: paymentIntent.payment_intent_id,
      amount: amount,
      currency: currency
    };
  }

  // Process PayPal payment
  async _processPayPalPayment(amount, currency, paymentData) {
    const { description, return_url, cancel_url } = paymentData;

    const payment = await PayPalService.createPayment(
      amount,
      currency,
      description || 'Marketplace Purchase',
      return_url,
      cancel_url
    );

    return {
      gateway: 'paypal',
      status: 'pending',
      approval_url: payment.approval_url,
      transaction_id: payment.payment_id,
      amount: amount,
      currency: currency
    };
  }

  // Confirm PayPal payment
  async confirmPayPalPayment(paymentId, payerId) {
    const result = await PayPalService.executePayment(paymentId, payerId);

    return {
      gateway: 'paypal',
      status: result.status === 'approved' ? 'completed' : 'failed',
      transaction_id: result.payment_id,
      amount: parseFloat(result.amount.total),
      currency: result.amount.currency,
      payer_info: result.payer_info
    };
  }

  // Process refund
  async processRefund(gateway, transactionId, amount = null) {
    try {
      switch (gateway.toLowerCase()) {
        case 'stripe':
          return await StripeService.createRefund(transactionId, amount);
        case 'paypal':
          return await PayPalService.createRefund(transactionId, amount);
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }

  // Get payment status
  async getPaymentStatus(gateway, transactionId) {
    try {
      switch (gateway.toLowerCase()) {
        case 'stripe':
          const stripePayment = await StripeService.getPaymentIntent(transactionId);
          return {
            gateway: 'stripe',
            status: stripePayment.status,
            amount: stripePayment.amount,
            currency: stripePayment.currency,
            created: stripePayment.created
          };
        case 'paypal':
          const paypalPayment = await PayPalService.getPayment(transactionId);
          return {
            gateway: 'paypal',
            status: paypalPayment.status,
            amount: parseFloat(paypalPayment.amount.total),
            currency: paypalPayment.amount.currency,
            created: paypalPayment.create_time
          };
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
    } catch (error) {
      console.error('Payment status retrieval error:', error);
      throw error;
    }
  }

  // Create subscription
  async createSubscription(gateway, customerId, planData) {
    try {
      switch (gateway.toLowerCase()) {
        case 'stripe':
          // For Stripe, we need a price ID
          const { price_id, metadata } = planData;
          return await StripeService.createSubscription(customerId, price_id, metadata);
        case 'paypal':
          // For PayPal, we need plan details
          const { plan_name, description, return_url, cancel_url } = planData;
          const plan = await PayPalService.createBillingAgreement(plan_name, description, return_url, cancel_url);
          return plan;
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
    } catch (error) {
      console.error('Subscription creation error:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(gateway, subscriptionId) {
    try {
      switch (gateway.toLowerCase()) {
        case 'stripe':
          return await StripeService.cancelSubscription(subscriptionId);
        case 'paypal':
          return await PayPalService.cancelBillingAgreement(subscriptionId);
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      throw error;
    }
  }

  // Validate webhook signature
  async validateWebhook(gateway, rawBody, signature, webhookSecret = null) {
    try {
      switch (gateway.toLowerCase()) {
        case 'stripe':
          return await StripeService.handleWebhookEvent(rawBody, signature);
        case 'paypal':
          // PayPal webhook validation would be implemented here
          return { valid: true, data: rawBody };
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
    } catch (error) {
      console.error('Webhook validation error:', error);
      throw error;
    }
  }
}

export default new PaymentService();