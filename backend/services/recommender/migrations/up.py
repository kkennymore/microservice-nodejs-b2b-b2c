#!/usr/bin/env python3
"""
Database Migration Script for Recommender Service
================================================

Runs database migrations for the recommender service.
"""

import os
import sys
import mysql.connector
from mysql.connector import Error as MySQLError
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_db_config():
    """Get database configuration from environment variables"""
    return {
        'host': os.getenv('DB_HOST', 'mysql'),
        'port': int(os.getenv('DB_PORT', 3306)),
        'user': os.getenv('DB_USER', 'marketplace'),
        'password': os.getenv('DB_PASSWORD', 'marketplace123'),
        'database': os.getenv('DB_NAME', 'fenap_marketplace')
    }

def run_migrations():
    """Execute database migrations"""
    connection = None
    try:
        # Connect to database
        config = get_db_config()
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()

        logger.info("Connected to database successfully")

        # Read migration file
        migration_file = os.path.join(os.path.dirname(__file__), 'create_tables.sql')

        if not os.path.exists(migration_file):
            logger.error(f"Migration file not found: {migration_file}")
            return False

        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()

        # Split into individual statements
        statements = []
        current_statement = []

        for line in migration_sql.split('\n'):
            line = line.strip()
            if line and not line.startswith('--'):
                current_statement.append(line)
                if line.endswith(';'):
                    statements.append(' '.join(current_statement))
                    current_statement = []

        # Execute each statement
        for i, statement in enumerate(statements, 1):
            if statement.strip():
                try:
                    logger.info(f"Executing migration statement {i}/{len(statements)}")
                    cursor.execute(statement)
                    connection.commit()
                except MySQLError as e:
                    logger.error(f"Failed to execute statement {i}: {e}")
                    logger.error(f"Statement: {statement[:100]}...")
                    raise

        logger.info("✅ All migration statements executed successfully")

        # Verify tables were created
        cursor.execute("SHOW TABLES LIKE 'user_product_interactions'")
        if cursor.fetchone():
            logger.info("✅ user_product_interactions table created")
        else:
            logger.warning("⚠️ user_product_interactions table not found")

        cursor.execute("SHOW TABLES LIKE 'recommendation_results'")
        if cursor.fetchone():
            logger.info("✅ recommendation_results table created")
        else:
            logger.warning("⚠️ recommendation_results table not found")

        logger.info("🎯 Recommender service database migration completed successfully!")
        return True

    except MySQLError as e:
        logger.error(f"Database error during migration: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during migration: {e}")
        return False
    finally:
        if connection:
            connection.close()
            logger.info("Database connection closed")

if __name__ == "__main__":
    logger.info("🚀 Starting Recommender Service database migration...")

    success = run_migrations()

    if success:
        logger.info("✅ Migration completed successfully")
        sys.exit(0)
    else:
        logger.error("❌ Migration failed")
        sys.exit(1)