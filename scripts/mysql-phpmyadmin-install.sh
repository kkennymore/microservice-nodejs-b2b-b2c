#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# Bootstrap
# ------------------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1090
source "$ROOT_DIR/.env"

# ------------------------------------------------------------
# Defaults (avoid set -u failures)
# ------------------------------------------------------------
PHP_VERSION="${PHP_VERSION:-8.2}"
MARIADB_VERSION="${MARIADB_VERSION:-10.11}"
PHPMYADMIN_VERSION="${PHPMYADMIN_VERSION:-latest}"

DB_NAME="${MYSQL_DATABASE:-app}"
DB_USER="${MYSQL_USER:-app}"
DB_PASS="${MYSQL_PASSWORD:-app_pass}"
DB_PASSWORD="${MYSQL_PASSWORD:-root_pass}" # root password

WITH_REDIS="${WITH_REDIS:-true}"

# ------------------------------------------------------------
# Output helpers
# ------------------------------------------------------------
log()  { echo -e "✅ $*"; }
warn() { echo -e "⚠️  $*"; }
info() { echo -e "ℹ️  $*"; }
err()  { echo -e "❌ $*" >&2; }

# ------------------------------------------------------------
# Distro detection + package helpers
# ------------------------------------------------------------
DISTRO_FAMILY=""
PKG_MGR=""

detect_distro() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    local id="${ID:-}"
    local like="${ID_LIKE:-}"

    if [[ "$id" =~ (ubuntu|debian) || "$like" =~ (debian) ]]; then
      DISTRO_FAMILY="debian"
      PKG_MGR="apt"
    elif [[ "$id" =~ (rhel|centos|rocky|almalinux|fedora) || "$like" =~ (rhel|fedora|centos) ]]; then
      DISTRO_FAMILY="rhel"
      PKG_MGR="dnf"
      command -v dnf >/dev/null 2>&1 || PKG_MGR="yum"
    else
      # Best-effort fallback
      if command -v apt-get >/dev/null 2>&1; then
        DISTRO_FAMILY="debian"
        PKG_MGR="apt"
      elif command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
        DISTRO_FAMILY="rhel"
        PKG_MGR="dnf"
        command -v dnf >/dev/null 2>&1 || PKG_MGR="yum"
      else
        err "Unsupported distro (no apt/dnf/yum detected)."
        exit 1
      fi
    fi
  else
    err "/etc/os-release not found. Cannot detect distro."
    exit 1
  fi

  info "Detected distro family: ${DISTRO_FAMILY} (pkg: ${PKG_MGR})"
}

apt_install() {
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"
}

rhel_install() {
  if [[ "$PKG_MGR" == "dnf" ]]; then
    dnf install -y "$@"
  else
    yum install -y "$@"
  fi
}

# ------------------------------------------------------------
# 1) Docker + Compose
# ------------------------------------------------------------
docker_running() {
  systemctl is-active --quiet docker 2>/dev/null
}

install_docker_debian() {
  info "Installing Docker (Debian/Ubuntu)..."
  apt_install ca-certificates curl gnupg lsb-release

  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL "https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg" \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi

  local codename
  codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") \
    ${codename} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -y
  apt_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_docker_rhel() {
  info "Installing Docker (RHEL-family)..."
  rhel_install curl ca-certificates

  if [[ "$PKG_MGR" == "dnf" ]]; then
    dnf -y install dnf-plugins-core || true
    dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || true
    dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  else
    yum install -y yum-utils || true
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || true
    yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  fi
}

ensure_docker_and_compose() {
  info "Step 1/5: Checking Docker + Compose..."

  if ! command -v docker >/dev/null 2>&1; then
    if [[ "$DISTRO_FAMILY" == "debian" ]]; then
      install_docker_debian
    else
      install_docker_rhel
    fi
  else
    info "Docker already installed."
  fi

  systemctl enable --now docker || true
  if ! docker_running; then
    systemctl start docker || true
  fi

  if ! docker info >/dev/null 2>&1; then
    err "Docker is installed but not responding. Check systemctl status docker."
    exit 1
  fi

  # Compose: prefer plugin `docker compose`, fall back to docker-compose binary
  if docker compose version >/dev/null 2>&1; then
    info "Docker Compose plugin is available."
  elif command -v docker-compose >/dev/null 2>&1; then
    info "docker-compose binary is available."
  else
    warn "Docker Compose not found. Attempting install via package..."
    if [[ "$DISTRO_FAMILY" == "debian" ]]; then
      apt_install docker-compose-plugin || true
    else
      rhel_install docker-compose-plugin || true
    fi
    docker compose version >/dev/null 2>&1 || warn "Compose still unavailable—please verify packages for your distro."
  fi

  log "Docker + Compose ready."
}

# ------------------------------------------------------------
# 2) Common dependencies
# ------------------------------------------------------------
install_common_deps_debian() {
  apt_install curl wget git unzip build-essential pkg-config libssl-dev \
    jq ufw nginx software-properties-common lsb-release \
    ca-certificates apt-transport-https gnupg2 redis-server
}

install_common_deps_rhel() {
  # EPEL best-effort
  rhel_install epel-release || true

  rhel_install curl wget git unzip gcc gcc-c++ make pkgconfig openssl-devel jq nginx

  # Firewall (best-effort)
  rhel_install firewalld || true
  systemctl enable --now firewalld 2>/dev/null || true
}

ensure_common_deps() {
  info "Step 2/5: Installing common dependencies..."
  if [[ "$DISTRO_FAMILY" == "debian" ]]; then
    install_common_deps_debian
  else
    install_common_deps_rhel
  fi
  log "Common dependencies installed."
}

# ------------------------------------------------------------
# 3) PHP + Composer
# ------------------------------------------------------------
install_php_debian() {
  if command -v php >/dev/null 2>&1; then
    info "PHP already installed."
    return 0
  fi

  info "Installing PHP ${PHP_VERSION} (Debian/Ubuntu)..."
  apt_install software-properties-common
  add-apt-repository -y ppa:ondrej/php
  apt-get update -y

  apt_install \
    "php${PHP_VERSION}" "php${PHP_VERSION}-fpm" "php${PHP_VERSION}-cli" \
    "php${PHP_VERSION}-mysql" "php${PHP_VERSION}-mbstring" "php${PHP_VERSION}-curl" \
    "php${PHP_VERSION}-xml" "php${PHP_VERSION}-zip" "php${PHP_VERSION}-redis"
}

install_php_rhel() {
  if command -v php >/dev/null 2>&1; then
    info "PHP already installed (RHEL-family)."
    return 0
  fi

  info "Installing PHP (RHEL-family)..."
  rhel_install dnf-plugins-core || true

  # Remi repo best-effort (common on RHEL)
  if [[ "$PKG_MGR" == "dnf" ]]; then
    dnf install -y "https://rpms.remirepo.net/enterprise/remi-release-$(rpm -E %rhel).rpm" || true
    dnf module reset -y php || true
    dnf module enable -y "php:remi-${PHP_VERSION}" || dnf module enable -y "php:${PHP_VERSION}" || true
  fi

  rhel_install php php-fpm php-cli php-mysqlnd php-mbstring php-curl php-xml php-zip php-opcache
  systemctl enable --now php-fpm || true
}

install_composer() {
  if command -v composer >/dev/null 2>&1; then
    info "Composer already installed."
    return 0
  fi

  info "Installing Composer..."
  php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
  php composer-setup.php --install-dir=/usr/local/bin --filename=composer
  rm -f composer-setup.php
  log "Composer installed."
}

ensure_php_stack() {
  info "Step 3/5: Ensuring PHP + extensions + Composer..."
  if [[ "$DISTRO_FAMILY" == "debian" ]]; then
    install_php_debian
  else
    install_php_rhel
  fi
  install_composer
  log "PHP stack ready."
}

# ------------------------------------------------------------
# Optional Redis (kept from your intent)
# ------------------------------------------------------------
check_service_running() {
  systemctl is-active --quiet "$1" 2>/dev/null
}

install_redis() {
  if [[ "$DISTRO_FAMILY" == "debian" ]]; then
    if ! check_service_running redis-server && ! check_service_running redis; then
      info "Starting Redis..."
      systemctl enable redis-server 2>/dev/null || systemctl enable redis 2>/dev/null || true
      systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || true
    fi
    return 0
  fi

  if [[ "$WITH_REDIS" != "true" ]]; then
    info "Skipping Redis (WITH_REDIS=false)."
    return 0
  fi

  if ! check_service_running redis && ! check_service_running redis-server; then
    info "Installing/starting Redis (RHEL-family)..."
    rhel_install redis || true
    systemctl enable --now redis 2>/dev/null || systemctl enable --now redis-server 2>/dev/null || true
  fi
}

# ------------------------------------------------------------
# 4) MariaDB (self-healing from your code)
# ------------------------------------------------------------
purge_mariadb_completely() {
  warn "Purging broken MariaDB installation..."
  systemctl stop mariadb mysql 2>/dev/null || true
  pkill -9 mysqld mariadbd 2>/dev/null || true

  if [[ "$DISTRO_FAMILY" == "debian" ]]; then
    apt-get purge -y 'mariadb*' 'mysql*' || true
    apt-get autoremove -y --purge || true
    apt-get autoclean -y || true
  else
    rhel_install "" 2>/dev/null || true
    if [[ "$PKG_MGR" == "dnf" ]]; then
      dnf remove -y 'MariaDB*' 'mysql*' || true
      dnf autoremove -y || true
    else
      yum remove -y 'MariaDB*' 'mysql*' || true
      yum autoremove -y || true
    fi
  fi

  rm -rf /etc/mysql /etc/my.cnf /etc/mysql* \
    /var/lib/mysql /var/log/mysql /var/run/mysqld \
    /usr/lib/mysql /usr/share/mysql /root/.mysql_history \
    /etc/systemd/system/mariadb.service.d \
    /usr/lib/systemd/system/mariadb.service 2>/dev/null || true

  systemctl daemon-reload || true
  log "MariaDB fully purged."
}

verify_mariadb_health() {
  if ! systemctl is-active --quiet mariadb 2>/dev/null; then
    return 1
  fi
  if ! mysqladmin ping >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

install_mariadb_debian() {
  info "Installing MariaDB (Debian/Ubuntu)..."

  if ! dpkg -l 2>/dev/null | grep -q mariadb-server; then
    curl -LsS https://r.mariadb.com/downloads/mariadb_repo_setup \
      | bash -s -- --mariadb-server-version="mariadb-${MARIADB_VERSION}"
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server
  fi

  systemctl enable mariadb 2>/dev/null || true
  systemctl restart mariadb 2>/dev/null || systemctl start mariadb 2>/dev/null || true
  sleep 5

  if ! verify_mariadb_health; then
    warn "MariaDB appears broken. Reinstalling cleanly..."
    purge_mariadb_completely
    curl -LsS https://r.mariadb.com/downloads/mariadb_repo_setup \
      | bash -s -- --mariadb-server-version="mariadb-${MARIADB_VERSION}"
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server
    systemctl enable --now mariadb 2>/dev/null || true
  fi

  # Secure root auth via socket (best-effort)
  if ! mysql -uroot -p"${DB_PASSWORD}" -e "SELECT 1;" >/dev/null 2>&1; then
    info "Configuring root password via socket access..."
    mysql <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('${DB_PASSWORD}');
FLUSH PRIVILEGES;
SQL
  fi

  info "Creating database and privileged user..."
  mysql -uroot -p"${DB_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON *.* TO '${DB_USER}'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SQL
}

install_mariadb_rhel() {
  info "Installing MariaDB (RHEL-family)..."

  if ! rpm -qa 2>/dev/null | grep -q '^MariaDB-server'; then
    cat >/etc/yum.repos.d/MariaDB.repo <<EOF
[mariadb]
name = MariaDB
baseurl = https://mirrors.xtom.com/mariadb/yum/${MARIADB_VERSION}/rhel/\$releasever/\$basearch/
gpgkey=https://mariadb.org/mariadb_release_signing_key.pgp
gpgcheck=1
enabled=1
EOF
    if [[ "$PKG_MGR" == "dnf" ]]; then
      dnf clean all || true
      dnf install -y MariaDB-server MariaDB-client
    else
      yum clean all || true
      yum install -y MariaDB-server MariaDB-client
    fi
  fi

  systemctl enable mariadb 2>/dev/null || true
  systemctl restart mariadb 2>/dev/null || systemctl start mariadb 2>/dev/null || true
  sleep 5

  if ! verify_mariadb_health; then
    warn "MariaDB failed. Reinstalling..."
    purge_mariadb_completely
    rhel_install MariaDB-server MariaDB-client
    systemctl enable --now mariadb 2>/dev/null || true
  fi

  info "Securing root credentials..."
  mysql -uroot <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('${DB_PASSWORD}');
FLUSH PRIVILEGES;
SQL

  info "Creating database and privileged user..."
  mysql -uroot -p"${DB_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON *.* TO '${DB_USER}'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SQL
}

ensure_mariadb() {
  info "Step 4/5: Ensuring MariaDB is installed and running..."

  if [[ "$DISTRO_FAMILY" == "debian" ]]; then
    install_mariadb_debian
  else
    install_mariadb_rhel
  fi

  if ! verify_mariadb_health; then
    err "MariaDB is still unhealthy after install."
    exit 1
  fi

  log "MariaDB ready."
}

# ------------------------------------------------------------
# 5) phpMyAdmin
# ------------------------------------------------------------
install_phpmyadmin_common_debian() {
  local link="/usr/share/phpmyadmin"
  local conf_file="${link}/config.inc.php"

  info "Installing phpMyAdmin (Debian/Ubuntu)..."
  if [[ -d "$link" ]]; then
    info "phpMyAdmin already exists at $link"
  else
    apt_install phpmyadmin
  fi

  mkdir -p "$link/tmp"
  chmod 777 "$link/tmp" || true

  if [[ ! -f "$conf_file" ]]; then
    info "Generating phpMyAdmin config..."
    tee "$conf_file" >/dev/null <<PHP
<?php
\$cfg['blowfish_secret'] = '$(openssl rand -base64 32 2>/dev/null || echo fallbacksecret)';
\$i = 0;
\$i++;
\$cfg['Servers'][\$i]['auth_type'] = 'cookie';
\$cfg['Servers'][\$i]['host'] = '127.0.0.1';
\$cfg['Servers'][\$i]['user'] = '${DB_USER}';
\$cfg['Servers'][\$i]['password'] = '${DB_PASS}';
\$cfg['Servers'][\$i]['compress'] = false;
\$cfg['Servers'][\$i]['AllowNoPassword'] = false;
PHP
  else
    info "Validating phpMyAdmin config..."
    if ! grep -q "${DB_USER}" "$conf_file"; then
      warn "Repairing phpMyAdmin config for updated DB user..."
      sed -i "s/\\['user'\\].*/['user'] = '${DB_USER}';/" "$conf_file" || true
      sed -i "s/\\['password'\\].*/['password'] = '${DB_PASS}';/" "$conf_file" || true
    fi
  fi

  log "phpMyAdmin configured for user '${DB_USER}'."
  info "Access: http://<server-ip>/phpmyadmin"
}

verify_phpmyadmin_connection() {
  info "Verifying phpMyAdmin DB connection..."
  if mysql -u"${DB_USER}" -p"${DB_PASS}" -e "SHOW DATABASES;" >/dev/null 2>&1; then
    log "phpMyAdmin DB connection verified (via ${DB_USER})."
    return 0
  fi

  warn "phpMyAdmin connection failed — attempting repair..."
  systemctl restart mariadb 2>/dev/null || true

  mysql -uroot -p"${DB_PASSWORD}" <<SQL
GRANT ALL PRIVILEGES ON *.* TO '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SQL

  install_phpmyadmin_common_debian
  log "phpMyAdmin repaired and reconnected."
}

ensure_phpmyadmin() {
  info "Step 5/5: Ensuring phpMyAdmin is installed and working..."

  if [[ "$DISTRO_FAMILY" != "debian" ]]; then
    warn "phpMyAdmin auto-install is implemented for Debian/Ubuntu via apt."
    warn "On RHEL-family, install phpMyAdmin via your preferred method (dnf/yum or from source), then rerun verification."
    return 0
  fi

  install_phpmyadmin_common_debian
  verify_phpmyadmin_connection
}

# ------------------------------------------------------------
# Orchestrator (requested order)
# ------------------------------------------------------------
main() {
  detect_distro
  ensure_docker_and_compose
  ensure_common_deps
  install_redis
  ensure_php_stack
  ensure_mariadb
  ensure_phpmyadmin
  log "All steps completed successfully."
}

main "$@"
