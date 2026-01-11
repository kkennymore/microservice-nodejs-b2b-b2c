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
    const rawStatements = migrationSQL.split(';');
    console.log('Split result length:', rawStatements.length);
    console.log('First few splits:', rawStatements.slice(0,3).map(s => s.substring(0,50)));
    const statements = rawStatements
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 5 && (stmt.includes('CREATE') || stmt.includes('INSERT') || stmt.includes('ALTER')));

    console.log('Raw SQL length:', migrationSQL.length);
    console.log('Number of statements:', statements.length);
    if (statements.length > 0) {
      console.log('First statement:', statements[0].substring(0, 100));
    }
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        try {
          await connection.execute(statement);
        } catch (error) {
          console.error('Error executing statement:', error.message);
          throw error;
        }
      }
    }

    console.log('✅ Analytics service migrations completed successfully');
    console.log('📋 Created tables: analytics_events, sales_analytics, user_analytics, product_analytics, dashboard_cache, analytics_reports, realtime_metrics');
    console.log('👁️ Created views: user_engagement_summary');
    console.log('📊 Sample analytics events inserted');

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