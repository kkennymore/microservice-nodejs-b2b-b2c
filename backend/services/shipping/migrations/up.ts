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

    console.log('✅ Shipping service migrations completed successfully');
    console.log('📋 Created tables: shipping_carriers, shipping_zones, shipping_rates, seller_shipping_settings, shipments, shipment_items, tracking_events, return_shipments');
    console.log('🚚 Default carriers and shipping rates inserted');
    console.log('🌍 Shipping zones configured');

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