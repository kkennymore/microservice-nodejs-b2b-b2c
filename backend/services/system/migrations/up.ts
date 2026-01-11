import { getConnection } from '/app/shared/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  let connection;
  try {
    connection = await getConnection();

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'create_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }

    console.log('✅ System service migrations completed successfully');
    console.log('📋 Created tables: system_settings, admin_action_logs, system_maintenance, user_management, system_alerts, api_rate_limits, system_performance_metrics, admin_notification_preferences');
    console.log('⚙️ Default system settings inserted');
    console.log('📝 Admin action logging initialized');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

runMigrations();