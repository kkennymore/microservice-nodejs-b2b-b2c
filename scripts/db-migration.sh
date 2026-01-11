#!/bin/bash

# Fenap Multivendor Marketplace - Database Migration Script
# Usage: ./app.sh db:up [--service-name]
#        ./app.sh db:down [--service-name]

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/.env"
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if docker and docker-compose are available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not available${NC}"
    exit 1
fi

# Dynamically discover services with migrations
discover_services() {
    local services_dir="$ROOT_DIR/backend/services"
    local services=()

    if [ -d "$services_dir" ]; then
        for dir in "$services_dir"/*/; do
            if [ -d "$dir" ]; then
                service_name=$(basename "$dir")
                # Check if service has migrations directory and up.js file
                if [ -d "$dir/migrations" ] && [ -f "$dir/migrations/up.js" ]; then
                    services+=("$service_name")
                fi
            fi
        done
    fi

    # Sort services for consistent order
    printf '%s\n' "${services[@]}" | sort
}

# Get services dynamically
SERVICES=($(discover_services))

# Function to print usage
usage() {
    echo "Usage: $0 db:up [--service-name]"
    echo "       $0 db:down [--service-name]"
    echo ""
    echo "Commands:"
    echo "  db:up         Run migrations for all services or specific service"
    echo "  db:down       Rollback migrations for all services or specific service"
    echo "  db:watermark  Enable watermark feature for auth service"
    echo "  status        Show status of all services"
    echo "  help          Show this help message"
    echo ""
    echo "Available Services:"
    for service in "${SERVICES[@]}"; do
        echo "  --$service"
    done
    echo ""
    echo "Examples:"
    echo "  $0 db:up                    # Run all migrations"
    echo "  $0 db:up --auth             # Run auth migrations only"
    echo "  $0 db:down --products       # Rollback products migrations"
    echo "  $0 db:down                  # Rollback all migrations"
    exit 1
}

# Function to check if service is running
check_service() {
    local service=$1
    if ! docker compose ps $service | grep -q "Up"; then
        echo -e "${YELLOW}⚠️  Service '$service' is not running - skipping migration${NC}"
        return 1
    fi
    return 0
}

# Function to run migration for a specific service
run_migration() {
    local action=$1
    local service=$2

    echo -e "${BLUE}🔄 Running $action for $service service...${NC}"

    if ! check_service $service; then
        return 0
    fi

    # Run base migration with timeout
    if [ "$action" = "up" ]; then
        timeout 300 docker exec marketplace-$service node migrations/up.js
    else
        timeout 300 docker exec marketplace-$service node migrations/down.js
    fi

    # Run additional migrations if they exist
    case $service in
        "auth")
            if [ "$action" = "up" ]; then
                timeout 120 docker exec marketplace-$service node migrations/add_watermark_feature.js 2>/dev/null || echo -e "${YELLOW}⚠️  Watermark feature already exists - skipping${NC}"
            else
                timeout 120 docker exec marketplace-$service node migrations/add_watermark_feature_down.js 2>/dev/null || true
            fi
            ;;
        "products")
            if [ "$action" = "up" ]; then
                timeout 120 docker exec marketplace-$service node migrations/enhance_products_001.js 2>/dev/null || echo -e "${YELLOW}⚠️  Product enhancements already exist - skipping${NC}"
            else
                timeout 120 docker exec marketplace-$service node migrations/enhance_products_001_down.js 2>/dev/null || true
            fi
            ;;
        # Add more special cases here as needed
    esac

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $action completed successfully for $service${NC}"
        return 0
    else
        echo -e "${RED}❌ $action failed for $service${NC}"
        return 1
    fi
}

# Function to run migrations for all services
run_all_migrations() {
    local action=$1
    local action_name=$([ "$action" = "up" ] && echo "migrations" || echo "rollback")

    echo -e "${YELLOW}🚀 Running $action_name for all services...${NC}"
    echo ""

    local failed_services=()

    for service in "${SERVICES[@]}"; do
        if run_migration "$action" "$service"; then
            echo ""
        else
            failed_services+=("$service")
            echo ""
        fi
    done

    if [ ${#failed_services[@]} -eq 0 ]; then
        echo -e "${GREEN}🎉 All $action_name completed successfully!${NC}"
    else
        echo -e "${RED}❌ Some $action_name failed: ${failed_services[*]}${NC}"
        exit 1
    fi
}

# Main script logic
if [ $# -lt 1 ]; then
    usage
fi

COMMAND=$1
shift

case $COMMAND in
    "db:up")
        if [ $# -eq 0 ]; then
            run_all_migrations "up"
        else
            SERVICE=$(echo $1 | sed 's/--//')
            # Check if service is in the discovered services
            if [[ " ${SERVICES[*]} " =~ " $SERVICE " ]]; then
                run_migration "up" "$SERVICE"
            else
                echo -e "${RED}❌ Unknown service: $SERVICE${NC}"
                usage
            fi
        fi
        ;;
    "db:down")
        if [ $# -eq 0 ]; then
            echo -e "${YELLOW}⚠️  Rolling back all migrations...${NC}"
            run_all_migrations "down"
        else
            SERVICE=$(echo $1 | sed 's/--//')
            # Check if service is in the discovered services
            if [[ " ${SERVICES[*]} " =~ " $SERVICE " ]]; then
                echo -e "${YELLOW}⚠️  Rolling back migrations for $SERVICE...${NC}"
                run_migration "down" "$SERVICE"
            else
                echo -e "${RED}❌ Unknown service: $SERVICE${NC}"
                usage
            fi
        fi
        ;;
    "db:watermark")
        echo -e "${BLUE}🔄 Enabling watermark feature for auth service...${NC}"
        if check_service "auth"; then
            docker exec marketplace-auth node migrations/add_watermark_feature.js
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Watermark feature enabled successfully${NC}"
                echo -e "${YELLOW}💡 Watermark settings can be configured per seller in the user_business table${NC}"
            else
                echo -e "${RED}❌ Failed to enable watermark feature${NC}"
                exit 1
            fi
        fi
        ;;
    "help"|"-h"|"--help")
        usage
        ;;
    "status")
        echo -e "${BLUE}📊 Checking status of all services...${NC}"
        echo ""
        docker compose ps --format "table {{.Name}}\t{{.Service}}\t{{.Status}}\t{{.Ports}}"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
        usage
        ;;
esac