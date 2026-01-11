#!/usr/bin/env bash
#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/.env"

cat > /etc/nginx/vhosts/$SERVER_NGINX_SSL_PLIGS_API <<EOF
server {
    listen 80;
    server_name $PLIGS_API_DOMAIN;
    # Common proxy headers
    proxy_set_header Host              \$host;
    proxy_set_header X-Real-IP         \$remote_addr;
    proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;

    # -----------------------
    # SYSTEM SERVICE (9012)
    # -----------------------
    location /system/ {
        proxy_pass http://127.0.0.1:9012/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # AUTH SERVICE (9001)
    # -----------------------
    location /auth/ {
        proxy_pass http://127.0.0.1:9001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # PRODUCTS SERVICE (9002)
    # -----------------------
    location /products/ {
        proxy_pass http://127.0.0.1:9002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # TRANSACTIONS SERVICE (9003)
    # -----------------------
    location /transactions/ {
        proxy_pass http://127.0.0.1:9003/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # MESSAGING SERVICE (9004)
    # -----------------------
    location /messaging/ {
        proxy_pass http://127.0.0.1:9004/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # NOTIFICATIONS SERVICE (9005)
    # -----------------------
    location /notifications/ {
        proxy_pass http://127.0.0.1:9005/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # ADVERTISING SERVICE (9006)
    # -----------------------
    location /advertising/ {
        proxy_pass http://127.0.0.1:9006/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # TICKETING SERVICE (9007)
    # -----------------------
    location /ticketing/ {
        proxy_pass http://127.0.0.1:9007/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # REVIEWS SERVICE (9008)
    # -----------------------
    location /reviews/ {
        proxy_pass http://127.0.0.1:9008/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # PROMOTIONS SERVICE (9009)
    # -----------------------
    location /promotions/ {
        proxy_pass http://127.0.0.1:9009/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # SHIPPING SERVICE (9010)
    # -----------------------
    location /shipping/ {
        proxy_pass http://127.0.0.1:9010/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # RECOMMENDER SERVICE (9011)
    # -----------------------
    location /recommender/ {
        proxy_pass http://127.0.0.1:9011/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # ANALYTICS SERVICE (9013)
    # -----------------------
    location /analytics/ {
        proxy_pass http://127.0.0.1:9013/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # WISHLIST SERVICE (9014)
    # -----------------------
    location /wishlist/ {
        proxy_pass http://127.0.0.1:9014/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # SEARCH SERVICE (9015)
    # -----------------------
    location /search/ {
        proxy_pass http://127.0.0.1:9015/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # SEO SERVICE (9016)
    # -----------------------
    location /seo/ {
        proxy_pass http://127.0.0.1:9016/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # LOYALTY SERVICE (9017)
    # -----------------------
    location /loyalty/ {
        proxy_pass http://127.0.0.1:9017/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # SOCIAL SERVICE (9018)
    # -----------------------
    location /social/ {
        proxy_pass http://127.0.0.1:9018/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # ENHANCED ANALYTICS SERVICE (9019)
    # -----------------------
    location /enhanced-analytics/ {
        proxy_pass http://127.0.0.1:9019/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }

    # -----------------------
    # GATEWAY SERVICE (9000)
    # -----------------------
    location /gateway/ {
        proxy_pass http://127.0.0.1:9000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;

        # When the backend is unreachable or returns an error,
        # serve the default HTML page.
        error_page 502 503 504 /fallback.html;
    }
}
EOF

cat >/etc/nginx/vhosts/$SERVER_NGINX_SSL_PLIGS_FRONTEND <<EOF
server {
  listen 80;
  server_name ${PLIGS_WEB_DOMAIN};
  root $ROOT_DIR/frontend/dist;
  index index.php index.html index.htm;

  location / {
    try_files \$uri \$uri/ /index.html?\$query_string;
    # serve the default HTML page.
    error_page 502 503 504 /fallback.html;
  }

  # -------------------------------
  # Fallback page definition
  # -------------------------------
  location = /fallback.html {
      root /var/www/html;
      internal;  # prevent direct access
  }
  location ~* \.(jpg|jpeg|png|gif|webp|json|css|js|ico|svg|woff2?)\$ {
    access_log off;
    log_not_found off;
    expires 30d;
    add_header Cache-Control "public, no-transform";
    try_files \$uri =404;
  }
}
EOF

echo "Nginx Server Config files generated successfully.."