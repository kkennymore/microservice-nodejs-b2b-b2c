import { getConnection } from '/app/shared/database.js';

async function runMigrations() {
  let connection;
  try {
    connection = await getConnection();

    // Drop tables in reverse order (due to foreign key constraints)
    await connection.execute('DROP TABLE IF EXISTS notification_templates');
    await connection.execute('DROP TABLE IF EXISTS notification_preferences');
    await connection.execute('DROP TABLE IF EXISTS push_tokens');
    await connection.execute('DROP TABLE IF EXISTS sms_logs');
    await connection.execute('DROP TABLE IF EXISTS email_logs');
    await connection.execute('DROP TABLE IF EXISTS notifications');

    console.log('✅ Notifications service migrations rolled back successfully');
    console.log('🗑️ Dropped tables: notification_templates, notification_preferences, push_tokens, sms_logs, email_logs, notifications');

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