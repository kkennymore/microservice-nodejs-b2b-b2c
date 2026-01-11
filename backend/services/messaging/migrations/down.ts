import { getConnection } from '/app/shared/database.js';

async function runMigrations() {
  let connection;
  try {
    connection = await getConnection();

    // Drop tables in reverse order (due to foreign key constraints)
    await connection.execute('DROP TABLE IF EXISTS typing_indicators');
    await connection.execute('DROP TABLE IF EXISTS message_attachments');
    await connection.execute('DROP TABLE IF EXISTS message_reads');
    await connection.execute('DROP TABLE IF EXISTS messages');
    await connection.execute('DROP TABLE IF EXISTS conversation_participants');
    await connection.execute('DROP TABLE IF EXISTS conversations');

    console.log('✅ Messaging service migrations rolled back successfully');
    console.log('🗑️ Dropped tables: typing_indicators, message_attachments, message_reads, messages, conversation_participants, conversations');

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