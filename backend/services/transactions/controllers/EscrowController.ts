import { EscrowModel, TransactionModel } from '@/models/index.js';

class EscrowController {
  constructor() {
    this.escrowModel = new EscrowModel();
    this.transactionModel = new TransactionModel();
  }

  // Create escrow for a transaction
  async createEscrow(req, res) {
    try {
      const { transaction_id, auto_release_days = 30 } = req.body;

      // Get transaction details
      const transaction = await this.transactionModel.findById(transaction_id);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Check if escrow already exists
      const existingEscrow = await this.escrowModel.findByTransactionId(transaction_id);
      if (existingEscrow) {
        return res.status(400).json({
          success: false,
          message: 'Escrow already exists for this transaction'
        });
      }

      // Calculate auto-release date
      const autoReleaseDate = new Date();
      autoReleaseDate.setDate(autoReleaseDate.getDate() + auto_release_days);

      // For now, we'll need buyer_id and seller_id from somewhere
      // This would typically come from the order/product context
      // For demo purposes, using placeholder values
      const escrowData = {
        transaction_id,
        buyer_id: req.user.id, // Assuming current user is buyer
        seller_id: 2, // This should come from order data
        amount: transaction.amount,
        currency: transaction.currency,
        auto_release_date: autoReleaseDate.toISOString().split('T')[0],
        release_conditions: {
          buyer_confirmation: true,
          auto_release_days
        }
      };

      const escrowId = await this.escrowModel.create(escrowData);

      res.status(201).json({
        success: true,
        message: 'Escrow created successfully',
        data: {
          escrow_id: escrowId,
          amount_held: escrowData.amount,
          auto_release_date: escrowData.auto_release_date
        }
      });
    } catch (error) {
      console.error('Create escrow error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create escrow'
      });
    }
  }

  // Get escrow details
  async getEscrow(req, res) {
    try {
      const { id } = req.params;

      const escrow = await this.escrowModel.findById(id);
      if (!escrow) {
        return res.status(404).json({
          success: false,
          message: 'Escrow not found'
        });
      }

      // Check if user is involved in this escrow
      if (escrow.buyer_id !== req.user.id && escrow.seller_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: escrow
      });
    } catch (error) {
      console.error('Get escrow error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch escrow'
      });
    }
  }

  // Get user's escrows
  async getUserEscrows(req, res) {
    try {
      const userId = req.user.id;
      const escrows = await this.escrowModel.findByUserId(userId);

      res.json({
        success: true,
        data: escrows
      });
    } catch (error) {
      console.error('Get user escrows error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch escrows'
      });
    }
  }

  // Release escrow (buyer confirms receipt)
  async releaseEscrow(req, res) {
    try {
      const { id } = req.params;

      const escrow = await this.escrowModel.findById(id);
      if (!escrow) {
        return res.status(404).json({
          success: false,
          message: 'Escrow not found'
        });
      }

      // Only buyer can release escrow
      if (escrow.buyer_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only buyer can release escrow'
        });
      }

      const result = await this.escrowModel.releaseEscrow(id, req.user.id);

      res.json({
        success: true,
        message: 'Escrow released successfully',
        data: result
      });
    } catch (error) {
      console.error('Release escrow error:', error);

      if (error.message === 'Escrow is not in held status') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to release escrow'
      });
    }
  }

  // Create dispute for escrow
  async createDispute(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const escrow = await this.escrowModel.findById(id);
      if (!escrow) {
        return res.status(404).json({
          success: false,
          message: 'Escrow not found'
        });
      }

      // Only buyer or seller can create dispute
      if (escrow.buyer_id !== req.user.id && escrow.seller_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await this.escrowModel.createDispute(id, reason, req.user.id);

      res.json({
        success: true,
        message: 'Dispute created successfully'
      });
    } catch (error) {
      console.error('Create dispute error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create dispute'
      });
    }
  }

  // Resolve dispute (admin only)
  async resolveDispute(req, res) {
    try {
      const { id } = req.params;
      const { resolution } = req.body; // 'released' or 'refunded'

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      await this.escrowModel.resolveDispute(id, resolution, req.user.id);

      // If resolution is 'refunded', process refund
      if (resolution === 'refunded') {
        await this.escrowModel.refundEscrow(id, 'Dispute resolved in buyer favor', req.user.id);
      } else if (resolution === 'released') {
        await this.escrowModel.releaseEscrow(id, req.user.id);
      }

      res.json({
        success: true,
        message: 'Dispute resolved successfully'
      });
    } catch (error) {
      console.error('Resolve dispute error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve dispute'
      });
    }
  }

  // Auto-release expired escrows (admin/system only)
  async autoReleaseExpired(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const releasedCount = await this.escrowModel.autoReleaseExpired();

      res.json({
        success: true,
        message: `${releasedCount} expired escrows released automatically`
      });
    } catch (error) {
      console.error('Auto-release expired escrows error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-release expired escrows'
      });
    }
  }
}

export default new EscrowController();