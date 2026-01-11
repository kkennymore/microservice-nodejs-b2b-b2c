#!/usr/bin/env bash
#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/.env"

# database user elevation
grant_full_mysql_privileges() {
  if $WITH_OAAD; then
  source "./backend/.env"

  echo "🔍 Checking MySQL/MariaDB container: ${MYSQL_CONTAINER_NAME}..."

  # 1️⃣ Check if container exists at all
  if ! docker ps -a --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER_NAME}$"; then
    echo "❌ Container '${MYSQL_CONTAINER_NAME}' does not exist. Make sure it's defined in docker-compose.yml."
    return 1
  fi

  # 2️⃣ Start container if it's not running
  if ! docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER_NAME}$"; then
    echo "⚙️  Starting database container '${MYSQL_CONTAINER_NAME}'..."
    docker start "${MYSQL_CONTAINER_NAME}" >/dev/null
  else
    echo "✅ Database container '${MYSQL_CONTAINER_NAME}' is already running."
  fi

  # 3️⃣ Wait for MySQL service to be ready (up to 60 seconds)
  echo "⏳ Waiting for MySQL to be ready..."
  local retries=0
  local max_retries=30
  until docker exec "${MYSQL_CONTAINER_NAME}" mysqladmin ping -uroot -p"${OAAD_DB_PASS}" --silent &>/dev/null; do
    ((retries++))
    if [ "$retries" -ge "$max_retries" ]; then
      echo "❌ MySQL did not become ready after $((max_retries * 2)) seconds."
      return 1
    fi
    sleep 2
  done

  echo "✅ MySQL is up and accepting connections."

  # 4️⃣ Execute the SQL commands
  echo "🔐 Granting FULL privileges to ${OAAD_DB_USER}..."
  docker exec -i "${MYSQL_CONTAINER_NAME}" mysql -uroot -p"${OAAD_DB_PASS}" <<EOF
-- Create user if not exists
CREATE USER IF NOT EXISTS '${OAAD_DB_USER}'@'%' IDENTIFIED BY '${OAAD_DB_PASS}';

-- Grant full privileges
GRANT ALL PRIVILEGES ON *.* TO '${OAAD_DB_USER}'@'%' WITH GRANT OPTION;

-- Apply changes
FLUSH PRIVILEGES;
EOF
fi

if $WITH_KXPREX; then
  source "./backend/.env"
  echo "🔍 Checking MySQL/MariaDB container: ${MYSQL_CONTAINER_NAME}..."

  # 1️⃣ Check if container exists at all
  if ! docker ps -a --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER_NAME}$"; then
    echo "❌ Container '${MYSQL_CONTAINER_NAME}' does not exist. Make sure it's defined in docker-compose.yml."
    return 1
  fi

  # 2️⃣ Start container if it's not running
  if ! docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER_NAME}$"; then
    echo "⚙️  Starting database container '${MYSQL_CONTAINER_NAME}'..."
    docker start "${MYSQL_CONTAINER_NAME}" >/dev/null
  else
    echo "✅ Database container '${MYSQL_CONTAINER_NAME}' is already running."
  fi

  # 3️⃣ Wait for MySQL service to be ready (up to 60 seconds)
  echo "⏳ Waiting for MySQL to be ready..."
  local retries=0
  local max_retries=30
  until docker exec "${MYSQL_CONTAINER_NAME}" mysqladmin ping -uroot -p"${DB_PASSWORD}" --silent &>/dev/null; do
    ((retries++))
    if [ "$retries" -ge "$max_retries" ]; then
      echo "❌ MySQL did not become ready after $((max_retries * 2)) seconds."
      return 1
    fi
    sleep 2
  done

  echo "✅ MySQL is up and accepting connections."

  # 4️⃣ Execute the SQL commands
  echo "🔐 Granting FULL privileges to ${DB_USERNAME}..."
  docker exec -i "${MYSQL_CONTAINER_NAME}" mysql -uroot -p"${DB_PASSWORD}" <<EOF
-- Create user if not exists
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'%' IDENTIFIED BY '${DB_PASSWORD}';

-- Grant full privileges
GRANT ALL PRIVILEGES ON *.* TO '${DB_USERNAME}'@'%' WITH GRANT OPTION;

-- Apply changes
FLUSH PRIVILEGES;
EOF
fi

if [ $? -eq 0 ]; then
    echo "✅ Granted FULL ROOT privileges to '${DB_USERNAME}' successfully."
  else
    echo "⚠️  Failed to grant privileges — check MySQL credentials or container logs."
  fi
}
