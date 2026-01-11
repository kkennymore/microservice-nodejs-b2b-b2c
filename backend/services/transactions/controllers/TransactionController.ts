import { TransactionModel } from '@/models/index.js';
import PaymentService from '@/services/PaymentService.js';

class TransactionController {
  constructor() {
    this.transactionModel = new TransactionModel();
  }

  // Create a new transaction
  async createTransaction(req, res) {
    try {
      const userId = req.user.id;
      const transactionData = {
        user_id: userId,
        ...req.body
      };

      const transactionId = await this.transactionModel.create(transactionData);

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: { transaction_id: transactionId }
      });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create transaction'
      });
    }
  }

  // Get transaction by ID
  async getTransaction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const transaction = await this.transactionModel.findById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Check if user owns this transaction (unless admin)
      if (transaction.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction'
      });
    }
  }

  // Get user's transactions
  async getUserTransactions(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const transactions = await this.transactionModel.findByUserId(userId, limit, offset);
      const total = await this.transactionModel.getTotalByUserId(userId);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get user transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transactions'
      });
    }
  }

  // Update transaction status (admin only)
  async updateTransactionStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, metadata } = req.body;

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      await this.transactionModel.updateStatus(id, status, metadata);

      res.json({
        success: true,
        message: 'Transaction status updated successfully'
      });
    } catch (error) {
      console.error('Update transaction status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update transaction status'
      });
    }
  }

  // Process a payment
  async processPayment(req, res) {
    try {
      const userId = req.user.id;
      const { gateway, amount, currency = 'USD', payment_data = {} } = req.body;

      if (!gateway || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid gateway and amount are required'
        });
      }

      // Process payment through gateway
      const paymentResult = await PaymentService.processPayment(gateway, amount, currency, payment_data);

      // Create transaction record
      const transactionData = {
        user_id: userId,
        type: 'payment',
        amount,
        currency,
        payment_method: gateway,
        external_transaction_id: paymentResult.transaction_id,
        status: paymentResult.status === 'completed' ? 'completed' : 'pending',
        description: `Payment via ${gateway}`,
        metadata: {
          gateway_response: paymentResult,
          payment_data
        }
      };

      const transactionId = await this.transactionModel.create(transactionData);

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          transaction_id: transactionId,
          payment_result: paymentResult
        }
      });
    } catch (error) {
      console.error('Process payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment'
      });
    }
  }

  // Confirm PayPal payment
  async confirmPayPalPayment(req, res) {
    try {
      const { payment_id, payer_id } = req.body;

      if (!payment_id || !payer_id) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID and Payer ID are required'
        });
      }

      const confirmation = await PaymentService.confirmPayPalPayment(payment_id, payer_id);

      // Update transaction status
      await this.transactionModel.updateStatus(payment_id, confirmation.status, {
        confirmation_details: confirmation
      });

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: confirmation
      });
    } catch (error) {
      console.error('Confirm PayPal payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment'
      });
    }
  }

  // Process refund
  async processRefund(req, res) {
    try {
      const { transaction_id, amount, reason } = req.body;

      if (!transaction_id) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID is required'
        });
      }

      // Get original transaction
      const transaction = await this.transactionModel.findById(transaction_id);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Check if user owns this transaction (unless admin)
      if (transaction.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Process refund
      const refundResult = await PaymentService.processRefund(
        transaction.payment_method,
        transaction.external_transaction_id,
        amount
      );

      // Create refund transaction record
      const refundTransactionData = {
        user_id: transaction.user_id,
        type: 'refund',
        amount: refundResult.amount || transaction.amount,
        currency: transaction.currency,
        payment_method: transaction.payment_method,
        external_transaction_id: refundResult.refund_id,
        status: 'completed',
        description: `Refund for transaction ${transaction_id}: ${reason || 'Customer request'}`,
        metadata: {
          original_transaction_id: transaction_id,
          refund_details: refundResult,
          reason
        }
      };

      const refundTransactionId = await this.transactionModel.create(refundTransactionData);

      // Update original transaction status
      await this.transactionModel.updateStatus(transaction_id, 'refunded', {
        refund_transaction_id: refundTransactionId,
        refund_details: refundResult
      });

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refund_transaction_id: refundTransactionId,
          refund_details: refundResult
        }
      });
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund'
      });
    }
  }

  // Get transaction statistics (admin only)
  async getTransactionStats(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // This would typically involve complex queries
      // For now, return basic stats
      res.json({
        success: true,
        data: {
          total_transactions: 0,
          total_volume: 0,
          pending_transactions: 0,
          completed_transactions: 0
        }
      });
    } catch (error) {
      console.error('Get transaction stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction statistics'
      });
    }
  }
}

export default new TransactionController();