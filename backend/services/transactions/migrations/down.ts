import { getConnection } from '/app/shared/database.js';

async function runMigrations() {
  let connection;
  try {
    connection = await getConnection();

    // Drop trigger first
    await connection.execute('DROP TRIGGER IF EXISTS create_wallet_on_user_insert');

    // Drop tables in reverse order (due to foreign key constraints)
    await connection.execute('DROP TABLE IF EXISTS wallet_transactions');
    await connection.execute('DROP TABLE IF EXISTS subscriptions');
    await connection.execute('DROP TABLE IF EXISTS subscription_plans');
    await connection.execute('DROP TABLE IF EXISTS wallets');
    await connection.execute('DROP TABLE IF EXISTS transactions');

    console.log('✅ Transactions service migrations rolled back successfully');
    console.log('🗑️ Dropped tables: wallet_transactions, subscriptions, subscription_plans, wallets, transactions');
    console.log('🔄 Wallet trigger removed');

  } catch (error) {
    console.error('❌ Migration rollback failed:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

runMigrations();