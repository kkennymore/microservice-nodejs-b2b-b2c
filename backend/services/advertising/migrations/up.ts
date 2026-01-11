import { getConnection } from '@/../../shared/database.js';
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

    console.log('✅ Advertising service migrations completed successfully');
    console.log('📋 Created tables: advertising_campaigns, campaign_ads, ad_placements, campaign_placements, ad_impressions, ad_clicks, ad_conversions, ad_budgets');
    console.log('📍 Default ad placements inserted');
    console.log('📢 Advertising campaign system ready');

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