import { WalletModel, WalletTransactionModel } from '@/models/index.js';

class WalletController {
  constructor() {
    this.walletModel = new WalletModel();
    this.walletTransactionModel = new WalletTransactionModel();
  }

  // Get user's wallet
  async getWallet(req, res) {
    try {
      const userId = req.user.id;

      let wallet = await this.walletModel.findByUserId(userId);

      // Create wallet if it doesn't exist
      if (!wallet) {
        const walletId = await this.walletModel.create(userId);
        wallet = await this.walletModel.findByUserId(userId);
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet'
      });
    }
  }

  // Credit wallet (add money)
  async creditWallet(req, res) {
    try {
      const userId = req.user.id;
      const { amount, description, transaction_id } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      let wallet = await this.walletModel.findByUserId(userId);
      if (!wallet) {
        const walletId = await this.walletModel.create(userId);
        wallet = await this.walletModel.findByUserId(userId);
      }

      const balanceBefore = parseFloat(wallet.balance);
      const newBalance = await this.walletModel.updateBalance(userId, amount, 'credit');

      // Record wallet transaction
      await this.walletTransactionModel.create({
        wallet_id: wallet.id,
        transaction_id,
        amount,
        type: 'credit',
        description: description || 'Wallet credit',
        balance_before: balanceBefore,
        balance_after: newBalance
      });

      res.json({
        success: true,
        message: 'Wallet credited successfully',
        data: {
          new_balance: newBalance,
          credited_amount: amount
        }
      });
    } catch (error) {
      console.error('Credit wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to credit wallet'
      });
    }
  }

  // Debit wallet (subtract money)
  async debitWallet(req, res) {
    try {
      const userId = req.user.id;
      const { amount, description, transaction_id } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      const wallet = await this.walletModel.findByUserId(userId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const balanceBefore = parseFloat(wallet.balance);
      const newBalance = await this.walletModel.updateBalance(userId, amount, 'debit');

      // Record wallet transaction
      await this.walletTransactionModel.create({
        wallet_id: wallet.id,
        transaction_id,
        amount,
        type: 'debit',
        description: description || 'Wallet debit',
        balance_before: balanceBefore,
        balance_after: newBalance
      });

      res.json({
        success: true,
        message: 'Wallet debited successfully',
        data: {
          new_balance: newBalance,
          debited_amount: amount
        }
      });
    } catch (error) {
      console.error('Debit wallet error:', error);

      if (error.message === 'Insufficient funds') {
        return res.status(400).json({
          success: false,
          message: 'Insufficient funds'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to debit wallet'
      });
    }
  }

  // Get wallet transaction history
  async getWalletTransactions(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const wallet = await this.walletModel.findByUserId(userId);
      if (!wallet) {
        return res.json({
          success: true,
          data: {
            transactions: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0
            }
          }
        });
      }

      const transactions = await this.walletTransactionModel.findByWalletId(
        wallet.id,
        limit,
        offset
      );

      // For now, we'll assume total count, in production you'd want to count properly
      const total = 100; // This should be calculated from DB

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
      console.error('Get wallet transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet transactions'
      });
    }
  }

  // Transfer money between users (future feature)
  async transferMoney(req, res) {
    try {
      const fromUserId = req.user.id;
      const { to_user_id, amount, description } = req.body;

      // This would require additional logic for transfers
      res.status(501).json({
        success: false,
        message: 'Transfer feature not implemented yet'
      });
    } catch (error) {
      console.error('Transfer money error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to transfer money'
      });
    }
  }
}

export default new WalletController();