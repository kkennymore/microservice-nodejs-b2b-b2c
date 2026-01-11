#!/usr/bin/env bash
#!/bin/bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/.env"
# ---------------DECLARE ALL DOMAIN-------------------------
#    All the domain variables are declared here
# ----------------------------------------------------------
DOMAINS=(
    "$PLIGS_WEB_DOMAIN" 
    "$PLIGS_API_DOMAIN"
)

# -----------------------------------------------------
# the nginx vhost domain conf files to install ssl in
# -----------------------------------------------------
VHOST_CONF_NAME=(
  "$SERVER_NGINX_SSL_PLIGS_FRONTEND"
  "$SERVER_NGINX_SSL_PLIGS_API"
)
# ------------------------------------------------------------
# Defaults / required envs
# ------------------------------------------------------------

WITH_NGINX="${WITH_NGINX:-true}"
RENEW_TIMES_PER_HOURS="${RENEW_TIMES_PER_HOURS:-12}"
EMAIL="${ADMIN_EMAIL:-admin@kxprex.com}"

# ------------------------------------------------------------
# Detect distro (used by both functions)
# ------------------------------------------------------------
if [[ -z "${DISTRO:-}" ]]; then
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    DISTRO="${ID:-}"
  else
    DISTRO="$(uname -s | tr '[:upper:]' '[:lower:]')"
  fi
fi



# ------------------------------------------------------------
# Nginx vhosts & reverse proxies (prod layout)
# ------------------------------------------------------------
configure_nginx_structure() {
  echo "🌐 Configuring production-grade Nginx (HTTP + STREAM/TCP/UDP) layout..."

  # Detect distro if not already set
  if [[ -z "${DISTRO:-}" ]]; then
    if [[ -f /etc/os-release ]]; then
      . /etc/os-release
      DISTRO="${ID}"
    else
      DISTRO="$(uname -s | tr '[:upper:]' '[:lower:]')"
    fi
  fi

  # Install Nginx with stream support
  if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" ]]; then
    apt-get update -y
    apt-get install -y nginx-full python3-certbot-nginx
  else
    if ${WITH_NGINX:-true}; then
      dnf install -y nginx nginx-mod-stream python3-certbot-nginx || yum install -y nginx nginx-mod-stream python3-certbot-nginx
    else
      echo "ℹ️ Skipping nginx install (use --with-nginx)."
      return 0
    fi
  fi

  local nginx_conf="/etc/nginx/nginx.conf"
  local backup="/etc/nginx/nginx.bak_conf"

  # Detect proper system user
  if id nginx &>/dev/null; then
    NGINX_USER="nginx"
  elif id www-data &>/dev/null; then
    NGINX_USER="www-data"
  else
    NGINX_USER="root"
  fi

  # Detect stream module file
  local STREAM_MODULE_PATH="/usr/lib/nginx/modules/ngx_stream_module.so"
  if [[ -f "$STREAM_MODULE_PATH" ]]; then
    STREAM_LOAD_LINE="load_module modules/ngx_stream_module.so;"
  else
    STREAM_LOAD_LINE="# load_module modules/ngx_stream_module.so;  # Stream module not found"
  fi

  mkdir -p /etc/nginx/{vhosts,conf.d,stream.d}
  mkdir -p /var/log/nginx

  # Back up nginx.conf once only
  if [[ -f "$nginx_conf" && ! -f "$backup" ]]; then
    cp -a "$nginx_conf" "$backup"
    echo "🗄️  Backed up original nginx.conf to: $backup"
  else
    echo "ℹ️  Existing backup found or nginx.conf missing — skipping new backup."
  fi

  # Write production-ready nginx.conf
  cat > "$nginx_conf" <<NGINXCONF
# ============================================
# NGINX production base (HTTP + STREAM/TCP/UDP)
# ============================================

$STREAM_LOAD_LINE

user  $NGINX_USER;
worker_processes  auto;

error_log  /var/log/nginx/error.log warn;
pid        /run/nginx.pid;

events {
    worker_connections  10240;
    multi_accept        on;
}

# -------------------------------
# STREAM (Layer 4: TCP / UDP / RTP)
# -------------------------------
stream {
    log_format stream_main '\$remote_addr [\$time_local] '
                           '\$protocol \$status \$bytes_sent \$bytes_received '
                           '\$session_time \$upstream_addr';
    access_log /var/log/nginx/stream-access.log stream_main;
    error_log  /var/log/nginx/stream-error.log;

    # Sensible defaults
    proxy_connect_timeout  10s;
    proxy_timeout          3600s;

    # Include all L4 proxies (SIP, RTP, etc.)
    include /etc/nginx/stream.d/*.conf;
}

# --------------
# HTTP (Layer 7)
# --------------
http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for" '
                    '\$request_time \$upstream_response_time';
    access_log  /var/log/nginx/access.log  main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65s;
    keepalive_requests 1000;
    types_hash_max_size 4096;
    server_tokens off;

    client_max_body_size 100m;
    client_body_timeout 60s;
    send_timeout 60s;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
      text/plain text/css text/javascript
      application/javascript application/json
      application/xml application/rss+xml
      application/vnd.ms-fontobject application/x-font-ttf
      font/opentype image/svg+xml;

    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_connect_timeout 60s;

    map \$http_upgrade \$connection_upgrade {
        default upgrade;
        '' close;
    }

    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/vhosts/*.conf;
}
NGINXCONF

  chown -R $NGINX_USER:$NGINX_USER /var/log/nginx || true

  if nginx -t; then
    echo "✅ nginx.conf validated successfully."
    systemctl enable --now nginx
    systemctl reload nginx || systemctl restart nginx
    echo "🚀 Nginx reloaded successfully."
    echo "   Drop *.conf files into:"
    echo "   - /etc/nginx/vhosts/   (HTTP)"
    echo "   - /etc/nginx/stream.d/ (TCP/UDP)"
    echo "   Then run: sudo nginx -t && sudo systemctl reload nginx"
  else
    echo "❌ nginx config test failed. Rolling back..."
    [[ -f "$backup" ]] && cp -a "$backup" "$nginx_conf"
    nginx -t || true
    return 1
  fi
}

# ------------------------------------------------------------
# TLS / Certbot
# ------------------------------------------------------------
# ------------------------------------------------------------
# TLS / Certbot (ONLY targeted vhosts)
# ------------------------------------------------------------
install_tls() {
  echo "🔐 Installing TLS for selected Nginx configs only..."

  # Ensure certbot exists
  if ! command -v certbot >/dev/null 2>&1; then
    if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" ]]; then
      apt-get update -y
      apt-get install -y certbot python3-certbot-nginx
    else
      dnf install -y certbot python3-certbot-nginx \
        || yum install -y certbot python3-certbot-nginx
    fi
  fi

  local ANY_CHANGED=0

  for CONF_NAME in "${VHOST_CONF_NAME[@]}"; do
    [[ -z "$CONF_NAME" ]] && continue

    echo "🔎 Processing config: $CONF_NAME"

    # Search for the config file
    CONF_FILE=""
    for dir in /etc/nginx/vhosts /etc/nginx/conf.d /etc/nginx/stream.d; do
      if [[ -f "$dir/$CONF_NAME" ]]; then
        CONF_FILE="$dir/$CONF_NAME"
        break
      fi
    done

    if [[ -z "$CONF_FILE" ]]; then
      echo "⚠️  Config file not found for: $CONF_NAME — skipping"
      continue
    fi

    # Extract server_name(s)
    DOMAINS_FOUND=()
    while read -r domain; do
      [[ -n "$domain" ]] && DOMAINS_FOUND+=("$domain")
    done < <(
      grep -E "^\s*server_name\s+" "$CONF_FILE" \
        | sed 's/.*server_name\s\+//' \
        | sed 's/;//' \
        | tr ' ' '\n'
    )

    if [[ "${#DOMAINS_FOUND[@]}" -eq 0 ]]; then
      echo "⚠️  No server_name found in $CONF_FILE — skipping"
      continue
    fi

    echo "🌐 Domains detected: ${DOMAINS_FOUND[*]}"

    # Install / re-install certs per domain
    for DOMAIN in "${DOMAINS_FOUND[@]}"; do
      echo "🔐 Installing SSL for $DOMAIN (from $CONF_NAME)..."

      if certbot certificates 2>/dev/null | grep -q "Domains:.*$DOMAIN"; then
        certbot install \
          --cert-name "$DOMAIN" \
          --nginx \
          --redirect \
          -q \
          && ANY_CHANGED=1 || true
      else
        certbot certonly \
          --nginx \
          --non-interactive \
          --agree-tos \
          --email "$EMAIL" \
          -d "$DOMAIN" \
          && ANY_CHANGED=1 || true
      fi
    done
  done

  # Reload nginx only if something changed
  if [[ "$ANY_CHANGED" -eq 1 ]]; then
    echo "🔁 Reloading Nginx..."
    nginx -t && systemctl reload nginx
  fi

  # Cron renewal (still safe)
  if command -v crontab >/dev/null 2>&1; then
    (
      crontab -l 2>/dev/null | grep -v "$(basename "$0")" || true
      echo "0 */$RENEW_TIMES_PER_HOURS * * * /usr/bin/env bash $0 >> /var/log/install_tls_cron.log 2>&1"
    ) | crontab -
  fi

  echo "✅ TLS installation completed for selected vhosts only."
}

