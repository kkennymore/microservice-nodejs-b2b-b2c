#!/bin/bash

# MySQL startup script that runs on every container start
# This ensures the marketplace user and database are always available

set -e

# Always run on startup to ensure user exists
if mysqladmin ping -h"localhost" -P"3306" --silent 2>/dev/null; then
    echo "🔧 Running MySQL marketplace initialization..."

    # Wait for MySQL to be ready
    echo "⏳ Waiting for MySQL to be fully ready..."
    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if mysqladmin ping -h"localhost" -P"3306" --silent 2>/dev/null; then
            echo "✅ MySQL is ready!"
            break
        fi

        echo "   MySQL not ready yet (attempt $((attempt + 1))/$max_attempts), waiting..."
        sleep 3
        attempt=$((attempt + 1))
    done

    if [ $attempt -eq $max_attempts ]; then
        echo "❌ MySQL failed to start after $max_attempts attempts"
        exit 1
    fi

    # Set MySQL credentials from environment variables
    MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpassword}"
    MYSQL_DATABASE="${MYSQL_DATABASE:-fenap_marketplace}"
    MYSQL_USER="${MYSQL_USER:-marketplace}"
    MYSQL_PASSWORD="${MYSQL_PASSWORD:-marketplace123}"

    echo "📊 Setting up database and user..."

    # Connect to MySQL and execute setup commands
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << EOF
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user if it doesn't exist
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';

-- Grant additional global privileges (similar to root but limited)
GRANT RELOAD, PROCESS, SHOW DATABASES, REPLICATION CLIENT ON *.* TO '${MYSQL_USER}'@'%';

-- Grant SUPER privilege for advanced operations
GRANT SUPER ON *.* TO '${MYSQL_USER}'@'%';

-- Grant system user privileges for event scheduler, etc.
GRANT SYSTEM_USER ON *.* TO '${MYSQL_USER}'@'%';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show created user for verification
SELECT User, Host FROM mysql.user WHERE User = '${MYSQL_USER}';
EOF

    echo "🎉 MySQL marketplace setup completed successfully!"
    echo "   Database: ${MYSQL_DATABASE}"
    echo "   User: ${MYSQL_USER}"
    echo "   Password: ${MYSQL_PASSWORD}"

else
    echo "ℹ️  MySQL not ready, skipping marketplace setup."
fi