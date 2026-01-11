#!/bin/bash
set -e

# ------------------------------------------------------------
# Bootstrap
# ------------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ------------------------------------------------------------
# Help / Usage
# ------------------------------------------------------------

usage() {
cat <<EOF
${BLUE}Pligs Application CLI${NC}
────────────────────────────────────────────────────────────

${GREEN}USAGE${NC}
  ./app <command> [arguments]

  ./app help
  ./app -h
  ./app --help


${GREEN}AVAILABLE COMMANDS${NC}
────────────────────────────────────────────────────────────

${YELLOW}1) migrate  — Database migrations${NC}
SYNTAX
  ./app migrate <db:command> [--service]

DB COMMANDS
  db:up        Apply all pending migrations
  db:down      Roll back the latest migrations
  db:reset     Reset database (down + up)

EXAMPLES
  ./app migrate db:up
  ./app migrate db:up --auth


${YELLOW}2) push  — Deploy / push code${NC}
  ./app push


${YELLOW}3) privilege  — Database root privileges${NC}
  ./app privilege


${YELLOW}4) nginx:restart  — Reconfigure Nginx${NC}
  ./app nginx:restart


${YELLOW}5) ssl:install  — SSL / TLS certificates${NC}
  ./app ssl:install


${YELLOW}6) system:install — Core system packages${NC}
  ./app system:install


${YELLOW}7) Docker commands${NC}
  ./app docker:up
  ./app docker:down
  ./app docker:clean


${YELLOW}8) Git commands${NC}
  ./app git:push "commit message"


${YELLOW}9) Kubernetes (Minikube) commands${NC}
────────────────────────────────────────────────────────────

CLUSTER
  ./app k8:up
  ./app k8:down
  ./app k8:restart

SERVICE OPERATIONS
  ./app k8:logs --auth
  ./app k8:status [--auth]
  ./app k8:scale --auth=3
  ./app k8:describe --auth
  ./app k8:exec --auth
  ./app k8:port-forward --auth=8080:80

OBSERVABILITY
  ./app k8:top --auth
  ./app k8:health --auth

DATABASE
  ./app k8:psql --auth


${YELLOW}10) help${NC}
  ./app help
────────────────────────────────────────────────────────────
EOF
exit 0
}

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

require_script() {
    local script="$1"
    if [[ ! -f "$script" ]]; then
        echo -e "${RED}❌ Script not found:${NC} $script"
        exit 1
    fi
}

# ------------------------------------------------------------
# Kubernetes Dispatcher
# ------------------------------------------------------------

run_k8() {
    K8_SCRIPT="$ROOT_DIR/scripts/k8-setup.sh"
    require_script "$K8_SCRIPT"
    exec bash "$K8_SCRIPT" "$@"
}

# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

main() {
    [[ $# -eq 0 ]] && usage

    COMMAND="$1"
    shift

    case "$COMMAND" in
        help|-h|--help)
            usage
            ;;

        migrate)
            MIGRATION_SCRIPT="$ROOT_DIR/scripts/db-migration.sh"
            require_script "$MIGRATION_SCRIPT"
            source "$MIGRATION_SCRIPT" "$@"
            ;;

        push)
            require_script "$ROOT_DIR/scripts/push.sh"
            exec bash "$ROOT_DIR/scripts/push.sh"
            ;;

        privilege)
            require_script "$ROOT_DIR/scripts/db-root-privilege.sh"
            exec bash "$ROOT_DIR/scripts/db-root-privilege.sh"
            ;;

        nginx:restart)
            require_script "$ROOT_DIR/scripts/nginx-tls-ssl.sh"
            source "$ROOT_DIR/scripts/nginx-tls-ssl.sh"
            configure_nginx_structure
            ;;

        nginx:gen)
            source "$ROOT_DIR/scripts/nginx-gen-server-conf.sh"
            ;;

        ssl:install)
            require_script "$ROOT_DIR/scripts/nginx-tls-ssl.sh"
            source "$ROOT_DIR/scripts/nginx-tls-ssl.sh"
            install_tls
            ;;

        system:install)
            source "$ROOT_DIR/scripts/mysql-phpmyadmin-install.sh"
            ;;

        docker:up)
            docker build -t fenap-shared-local "./backend/shared"
            docker compose up --build -d
            ;;

        docker:down)
            docker compose down
            ;;

        docker:clean)
            docker system prune -a
            ;;

        git:push)
            [[ $# -lt 1 ]] && echo "❌ Commit message required" && exit 1
            git add "$ROOT_DIR"
            git commit -m "$*"
            git push
            ;;

        # ----------------------------------------------------
        # Kubernetes commands (delegated)
        # ----------------------------------------------------

        k8:*)
            run_k8 "$COMMAND" "$@"
            ;;

        *)
            echo -e "${RED}❌ Unknown command:${NC} $COMMAND"
            usage
            ;;
    esac
}

main "$@"
