import mysql from 'mysql2/promise';
import config from '/app/shared/config.js';

export class TransactionModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(transactionData) {
    const {
      user_id,
      type, // 'payment', 'refund', 'withdrawal', 'deposit'
      amount,
      currency = 'USD',
      payment_method,
      external_transaction_id,
      status = 'pending',
      description,
      metadata = {}
    } = transactionData;

    const query = `
      INSERT INTO transactions (
        user_id, type, amount, currency, payment_method,
        external_transaction_id, status, description, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      user_id, type, amount, currency, payment_method,
      external_transaction_id, status, description, JSON.stringify(metadata)
    ];

    const [result] = await this.pool.execute(query, values);
    return result.insertId;
  }

  async findById(id) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  async findByUserId(userId, limit = 50, offset = 0) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    return rows;
  }

  async updateStatus(id, status, metadata = {}) {
    const query = `
      UPDATE transactions
      SET status = ?, metadata = JSON_MERGE_PATCH(metadata, ?), updated_at = NOW()
      WHERE id = ?
    `;
    await this.pool.execute(query, [status, JSON.stringify(metadata), id]);
  }

  async getTotalByUserId(userId) {
    const [rows] = await this.pool.execute(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
      [userId]
    );
    return rows[0].total;
  }
}

export class WalletModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(userId) {
    const query = `
      INSERT INTO wallets (user_id, balance, currency, created_at, updated_at)
      VALUES (?, 0, 'USD', NOW(), NOW())
    `;
    const [result] = await this.pool.execute(query, [userId]);
    return result.insertId;
  }

  async findByUserId(userId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM wallets WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  async updateBalance(userId, amount, operation = 'credit') {
    // Use a transaction to ensure atomicity
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get current balance
      const [walletRows] = await connection.execute(
        'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (walletRows.length === 0) {
        throw new Error('Wallet not found');
      }

      const currentBalance = parseFloat(walletRows[0].balance);
      let newBalance;

      if (operation === 'credit') {
        newBalance = currentBalance + parseFloat(amount);
      } else if (operation === 'debit') {
        if (currentBalance < parseFloat(amount)) {
          throw new Error('Insufficient funds');
        }
        newBalance = currentBalance - parseFloat(amount);
      } else {
        throw new Error('Invalid operation');
      }

      // Update balance
      await connection.execute(
        'UPDATE wallets SET balance = ?, updated_at = NOW() WHERE user_id = ?',
        [newBalance, userId]
      );

      await connection.commit();
      return newBalance;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export class WalletTransactionModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(walletTransactionData) {
    const {
      wallet_id,
      transaction_id,
      amount,
      type, // 'credit', 'debit'
      description,
      balance_before,
      balance_after
    } = walletTransactionData;

    const query = `
      INSERT INTO wallet_transactions (
        wallet_id, transaction_id, amount, type, description,
        balance_before, balance_after, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      wallet_id, transaction_id, amount, type, description,
      balance_before, balance_after
    ];

    const [result] = await this.pool.execute(query, values);
    return result.insertId;
  }

  async findByWalletId(walletId, limit = 50, offset = 0) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [walletId, limit, offset]
    );
    return rows;
  }
}

export class SubscriptionModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(subscriptionData) {
    const {
      user_id,
      plan_id,
      status = 'active',
      start_date = new Date(),
      end_date,
      auto_renew = true,
      metadata = {}
    } = subscriptionData;

    const query = `
      INSERT INTO subscriptions (
        user_id, plan_id, status, start_date, end_date,
        auto_renew, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      user_id, plan_id, status, start_date, end_date,
      auto_renew, JSON.stringify(metadata)
    ];

    const [result] = await this.pool.execute(query, values);
    return result.insertId;
  }

  async findActiveByUserId(userId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active" AND end_date > NOW()',
      [userId]
    );
    return rows[0];
  }

  async updateStatus(id, status) {
    await this.pool.execute(
      'UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
  }

  async renew(id, newEndDate) {
    await this.pool.execute(
      'UPDATE subscriptions SET end_date = ?, updated_at = NOW() WHERE id = ?',
      [newEndDate, id]
    );
  }
}

export class SubscriptionPlanModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async findAll() {
    const [rows] = await this.pool.execute(
      'SELECT * FROM subscription_plans WHERE active = 1 ORDER BY price ASC'
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM subscription_plans WHERE id = ? AND active = 1',
      [id]
    );
    return rows[0];
  }
}

export class EscrowModel {
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async create(escrowData) {
    const {
      transaction_id,
      buyer_id,
      seller_id,
      amount,
      currency = 'USD',
      auto_release_date,
      release_conditions = {}
    } = escrowData;

    const query = `
      INSERT INTO escrow (
        transaction_id, buyer_id, seller_id, amount, currency,
        auto_release_date, release_conditions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      transaction_id, buyer_id, seller_id, amount, currency,
      auto_release_date, JSON.stringify(release_conditions)
    ];

    const [result] = await this.pool.execute(query, values);
    return result.insertId;
  }

  async findById(id) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM escrow WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  async findByTransactionId(transactionId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM escrow WHERE transaction_id = ?',
      [transactionId]
    );
    return rows[0];
  }

  async findByUserId(userId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM escrow WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC',
      [userId, userId]
    );
    return rows;
  }

  async releaseEscrow(id, releasedBy) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get escrow details
      const [escrowRows] = await connection.execute(
        'SELECT * FROM escrow WHERE id = ? FOR UPDATE',
        [id]
      );

      if (escrowRows.length === 0) {
        throw new Error('Escrow not found');
      }

      const escrow = escrowRows[0];

      if (escrow.status !== 'held') {
        throw new Error('Escrow is not in held status');
      }

      // Update escrow status
      await connection.execute(
        'UPDATE escrow SET status = ?, updated_at = NOW() WHERE id = ?',
        ['released', id]
      );

      // Credit seller's wallet
      const [walletRows] = await connection.execute(
        'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [escrow.seller_id]
      );

      let currentBalance = 0;
      if (walletRows.length > 0) {
        currentBalance = parseFloat(walletRows[0].balance);
      }

      const newBalance = currentBalance + parseFloat(escrow.amount);

      await connection.execute(
        'UPDATE wallets SET balance = ?, updated_at = NOW() WHERE user_id = ?',
        [newBalance, escrow.seller_id]
      );

      // Record wallet transaction
      await connection.execute(
        `
        INSERT INTO wallet_transactions (
          wallet_id, transaction_id, amount, type, description,
          balance_before, balance_after, created_at
        ) VALUES (
          (SELECT id FROM wallets WHERE user_id = ?),
          ?, ?, 'credit', ?, ?, ?, NOW()
        )
        `,
        [
          escrow.seller_id,
          escrow.transaction_id,
          escrow.amount,
          `Escrow released for transaction ${escrow.transaction_id}`,
          currentBalance,
          newBalance
        ]
      );

      await connection.commit();

      return {
        escrow_id: id,
        amount_released: escrow.amount,
        seller_new_balance: newBalance
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async refundEscrow(id, reason, refundedBy) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get escrow details
      const [escrowRows] = await connection.execute(
        'SELECT * FROM escrow WHERE id = ? FOR UPDATE',
        [id]
      );

      if (escrowRows.length === 0) {
        throw new Error('Escrow not found');
      }

      const escrow = escrowRows[0];

      if (escrow.status !== 'held') {
        throw new Error('Escrow is not in held status');
      }

      // Update escrow status
      await connection.execute(
        'UPDATE escrow SET status = ?, dispute_reason = ?, updated_at = NOW() WHERE id = ?',
        ['refunded', reason, id]
      );

      // Credit buyer's wallet
      const [walletRows] = await connection.execute(
        'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [escrow.buyer_id]
      );

      let currentBalance = 0;
      if (walletRows.length > 0) {
        currentBalance = parseFloat(walletRows[0].balance);
      }

      const newBalance = currentBalance + parseFloat(escrow.amount);

      await connection.execute(
        'UPDATE wallets SET balance = ?, updated_at = NOW() WHERE user_id = ?',
        [newBalance, escrow.buyer_id]
      );

      // Record wallet transaction
      await connection.execute(
        `
        INSERT INTO wallet_transactions (
          wallet_id, transaction_id, amount, type, description,
          balance_before, balance_after, created_at
        ) VALUES (
          (SELECT id FROM wallets WHERE user_id = ?),
          ?, ?, 'credit', ?, ?, ?, NOW()
        )
        `,
        [
          escrow.buyer_id,
          escrow.transaction_id,
          escrow.amount,
          `Escrow refunded: ${reason}`,
          currentBalance,
          newBalance
        ]
      );

      await connection.commit();

      return {
        escrow_id: id,
        amount_refunded: escrow.amount,
        buyer_new_balance: newBalance
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createDispute(id, reason, createdBy) {
    await this.pool.execute(
      'UPDATE escrow SET status = ?, dispute_reason = ?, updated_at = NOW() WHERE id = ?',
      ['disputed', reason, id]
    );
  }

  async resolveDispute(id, resolution, resolvedBy) {
    await this.pool.execute(
      'UPDATE escrow SET status = ?, dispute_resolved_at = NOW(), updated_at = NOW() WHERE id = ?',
      [resolution, id]
    );
  }

  // Auto-release expired escrows (to be called by a cron job)
  async autoReleaseExpired() {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Find expired escrows
      const [expiredEscrows] = await connection.execute(
        'SELECT * FROM escrow WHERE status = ? AND auto_release_date <= CURDATE()',
        ['held']
      );

      for (const escrow of expiredEscrows) {
        // Release the escrow
        await this.releaseEscrow(escrow.id, 'system');
      }

      await connection.commit();

      return expiredEscrows.length;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}