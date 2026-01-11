#!/bin/bash

# MySQL startup script - runs every time MySQL container starts
# Ensures marketplace database and user are always available

# Only run if MySQL is ready
if mysqladmin ping -h"localhost" -P"3306" --silent 2>/dev/null; then
    echo "🔧 Running MySQL marketplace setup..."

    # Get environment variables
    MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpassword}"
    MYSQL_DATABASE="${MYSQL_DATABASE:-fenap_marketplace}"
    MYSQL_USER="${MYSQL_USER:-marketplace}"
    MYSQL_PASSWORD="${MYSQL_PASSWORD:-marketplace123}"

    # Run the setup
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << EOF 2>/dev/null
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
GRANT RELOAD, PROCESS, SHOW DATABASES ON *.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
EOF

    echo "✅ MySQL marketplace setup complete"
else
    echo "⚠️  MySQL not ready, skipping marketplace setup"
fi