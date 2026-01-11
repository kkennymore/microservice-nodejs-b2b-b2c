import paypal from 'paypal-rest-sdk';
import config from '/app/shared/config.js';

class PayPalService {
  constructor() {
    paypal.configure({
      mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
      client_id: config.payments.paypal.clientId,
      client_secret: config.payments.paypal.clientSecret
    });
  }

  // Create a PayPal payment
  async createPayment(amount, currency = 'USD', description = '', returnUrl, cancelUrl) {
    return new Promise((resolve, reject) => {
      const createPaymentJson = {
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        redirect_urls: {
          return_url: returnUrl,
          cancel_url: cancelUrl
        },
        transactions: [{
          amount: {
            total: amount.toString(),
            currency: currency
          },
          description: description
        }]
      };

      paypal.payment.create(createPaymentJson, (error, payment) => {
        if (error) {
          console.error('PayPal payment creation error:', error);
          reject(new Error('Failed to create PayPal payment'));
        } else {
          // Find approval URL
          const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
          resolve({
            payment_id: payment.id,
            approval_url: approvalUrl ? approvalUrl.href : null,
            status: payment.state
          });
        }
      });
    });
  }

  // Execute a PayPal payment
  async executePayment(paymentId, payerId) {
    return new Promise((resolve, reject) => {
      paypal.payment.execute(paymentId, { payer_id: payerId }, (error, payment) => {
        if (error) {
          console.error('PayPal payment execution error:', error);
          reject(new Error('Failed to execute PayPal payment'));
        } else {
          resolve({
            payment_id: payment.id,
            status: payment.state,
            amount: payment.transactions[0].amount,
            payer_info: payment.payer.payer_info
          });
        }
      });
    });
  }

  // Get payment details
  async getPayment(paymentId) {
    return new Promise((resolve, reject) => {
      paypal.payment.get(paymentId, (error, payment) => {
        if (error) {
          console.error('PayPal payment retrieval error:', error);
          reject(new Error('Failed to retrieve PayPal payment'));
        } else {
          resolve({
            payment_id: payment.id,
            status: payment.state,
            amount: payment.transactions[0].amount,
            create_time: payment.create_time,
            update_time: payment.update_time
          });
        }
      });
    });
  }

  // Create a refund
  async createRefund(paymentId, amount = null) {
    return new Promise((resolve, reject) => {
      // First get the payment to find the sale ID
      paypal.payment.get(paymentId, (error, payment) => {
        if (error) {
          console.error('PayPal payment retrieval for refund error:', error);
          reject(new Error('Failed to retrieve payment for refund'));
          return;
        }

        const saleId = payment.transactions[0].related_resources[0].sale.id;

        const refundData = {};
        if (amount) {
          refundData.amount = {
            total: amount.toString(),
            currency: payment.transactions[0].amount.currency
          };
        }

        paypal.sale.refund(saleId, refundData, (error, refund) => {
          if (error) {
            console.error('PayPal refund creation error:', error);
            reject(new Error('Failed to create PayPal refund'));
          } else {
            resolve({
              refund_id: refund.id,
              status: refund.state,
              amount: refund.amount,
              create_time: refund.create_time
            });
          }
        });
      });
    });
  }

  // Create a billing agreement (for subscriptions)
  async createBillingAgreement(planName, description, returnUrl, cancelUrl) {
    return new Promise((resolve, reject) => {
      const billingPlanAttributes = {
        name: planName,
        description: description,
        type: 'INFINITE',
        payment_definitions: [{
          name: 'Regular Payment',
          type: 'REGULAR',
          frequency: 'MONTH',
          frequency_interval: '1',
          amount: {
            value: '9.99',
            currency: 'USD'
          },
          cycles: '0'
        }],
        merchant_preferences: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          auto_bill_amount: 'YES',
          initial_fail_amount_action: 'CANCEL',
          max_fail_attempts: '3'
        }
      };

      paypal.billingPlan.create(billingPlanAttributes, (error, billingPlan) => {
        if (error) {
          console.error('PayPal billing plan creation error:', error);
          reject(new Error('Failed to create billing plan'));
        } else {
          resolve({
            plan_id: billingPlan.id,
            state: billingPlan.state,
            name: billingPlan.name
          });
        }
      });
    });
  }

  // Create a billing agreement token
  async createBillingAgreementToken(planId) {
    return new Promise((resolve, reject) => {
      paypal.billingAgreement.create(planId, {}, (error, billingAgreement) => {
        if (error) {
          console.error('PayPal billing agreement creation error:', error);
          reject(new Error('Failed to create billing agreement'));
        } else {
          const approvalUrl = billingAgreement.links.find(link => link.rel === 'approval_url');
          resolve({
            token: billingAgreement.token,
            approval_url: approvalUrl ? approvalUrl.href : null
          });
        }
      });
    });
  }

  // Execute billing agreement
  async executeBillingAgreement(token) {
    return new Promise((resolve, reject) => {
      paypal.billingAgreement.execute(token, {}, (error, billingAgreement) => {
        if (error) {
          console.error('PayPal billing agreement execution error:', error);
          reject(new Error('Failed to execute billing agreement'));
        } else {
          resolve({
            agreement_id: billingAgreement.id,
            state: billingAgreement.state,
            plan: billingAgreement.plan
          });
        }
      });
    });
  }

  // Cancel billing agreement
  async cancelBillingAgreement(agreementId) {
    return new Promise((resolve, reject) => {
      const cancelNote = {
        note: 'Subscription cancelled by user'
      };

      paypal.billingAgreement.cancel(agreementId, cancelNote, (error, response) => {
        if (error) {
          console.error('PayPal billing agreement cancellation error:', error);
          reject(new Error('Failed to cancel billing agreement'));
        } else {
          resolve({
            agreement_id: agreementId,
            cancelled: true
          });
        }
      });
    });
  }
}

export default new PayPalService();