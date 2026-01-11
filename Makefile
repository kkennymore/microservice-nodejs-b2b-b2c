# Marketplace Platform Docker Compose Management
.PHONY: help build up down restart logs clean dev prod status health backup restore

# Default target
help: ## Show this help message
	@echo "Marketplace Platform Docker Compose Management"
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Build all services
build: ## Build all Docker images
	docker compose build --parallel

# Start all services
start: up ## Alias for up - start all services

up: ## Start all services
	docker compose up -d
	@echo "Services starting... This may take a few minutes."
	@echo "Use 'make logs' to follow the startup process."
	@echo "Use 'make health' to check service health."

# Start services with development overrides
dev: ## Start services in development mode (with volume mounts)
	docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
	@echo "Development environment starting..."
	@echo "Admin Dashboard: http://localhost:3000"
	@echo "API Gateway: http://localhost:4000"
	@echo "RabbitMQ Management: http://localhost:15672 (admin/admin123)"
	@echo "phpMyAdmin: http://localhost:8080"
	@echo "Redis Commander: http://localhost:8081"

# Stop all services
down: ## Stop all services
	docker compose down

# Restart all services
restart: ## Restart all services
	docker compose restart

# View logs
logs: ## View logs from all services
	docker compose logs -f

# View logs from specific service
logs-%: ## View logs from specific service (e.g., make logs-gateway)
	docker compose logs -f $*

# Check service health
health: ## Check health of all services
	@echo "Checking service health..."
	@docker compose ps
	@echo ""
	@echo "Health checks:"
	@docker compose exec gateway curl -s http://localhost:4000/health | jq . 2>/dev/null || echo "Gateway: Unhealthy"
	@docker compose exec mysql mysqladmin ping -h localhost 2>/dev/null && echo "MySQL: Healthy" || echo "MySQL: Unhealthy"
	@docker compose exec redis redis-cli ping 2>/dev/null | grep -q PONG && echo "Redis: Healthy" || echo "Redis: Unhealthy"
	@docker compose exec rabbitmq rabbitmq-diagnostics ping 2>/dev/null && echo "RabbitMQ: Healthy" || echo "RabbitMQ: Unhealthy"

# Show service status
status: ## Show status of all services
	docker compose ps

# Clean up
clean: ## Remove all containers, volumes, and images
	docker compose down -v --remove-orphans
	docker system prune -f
	docker volume prune -f

# Database operations
db-backup: ## Backup database
	@echo "Backing up database..."
	docker compose exec mysql mysqldump -u ${MYSQL_USER:-marketplace} -p${MYSQL_PASSWORD:-marketplace123} ${MYSQL_DATABASE:-fenap_marketplace} > backup_$(shell date +%Y%m%d_%H%M%S).sql

db-restore-%: ## Restore database from backup file (e.g., make db-restore-backup_20231201_120000.sql)
	@echo "Restoring database from $**..."
	docker compose exec -T mysql mysql -u ${MYSQL_USER:-marketplace} -p${MYSQL_PASSWORD:-marketplace123} ${MYSQL_DATABASE:-fenap_marketplace} < $*

# Development helpers
install: ## Install dependencies for all services
	@echo "Installing dependencies..."
	@for service in gateway auth products transactions messaging notifications analytics shipping system ticketing; do \
		echo "Installing $$service..."; \
		if [ -d "backend/services/$$service" ] && [ -f "backend/services/$$service/package.json" ]; then \
			cd backend/services/$$service && npm install 2>/dev/null && cd ../../../ || echo "Warning: Failed to install $$service"; \
		else \
			echo "Skipping $$service (not found or missing package.json)"; \
		fi; \
	done
	@echo "Installing recommender service..."
	@if [ -d "backend/services/recommender" ] && [ -f "backend/services/recommender/requirements.txt" ]; then \
		cd backend/services/recommender && pip install -r requirements.txt 2>/dev/null && cd ../../../ || echo "Warning: Failed to install recommender"; \
	fi
	@echo "Installing admin dashboard..."
	@if [ -d "frontend/admin-dashboard" ] && [ -f "frontend/admin-dashboard/package.json" ]; then \
		cd frontend/admin-dashboard && npm install 2>/dev/null && cd ../../ || echo "Warning: Failed to install admin dashboard"; \
	fi

migrate: ## Run database migrations for all services
	@echo "Running database migrations..."
	@for service in auth products transactions messaging notifications analytics shipping system; do \
		echo "Migrating $$service..."; \
		cd backend/services/$$service && npm run db:up && cd ../../../; \
	done

seed: ## Seed database with sample data
	@echo "Seeding database..."
	# Add seeding commands here

# Production deployment
prod-up: ## Start services in production mode
	docker compose -f docker-compose.yml up -d --scale gateway=3 --scale analytics=2

prod-down: ## Stop production services
	docker compose -f docker-compose.yml down

# Monitoring
monitor: ## Open monitoring dashboards
	@echo "Monitoring URLs:"
	@echo "RabbitMQ Management: http://localhost:15672 (admin/admin123)"
	@echo "phpMyAdmin: http://localhost:8080"
	@echo "Redis Commander: http://localhost:8081"
	@echo "API Health: http://localhost:4000/health"

# Quick start for development
quick-start: clean build dev monitor ## Quick start development environment
	@echo "Quick start complete!"
	@echo "Wait a few minutes for all services to be ready."
	@echo "Then visit: http://localhost:3000 (Admin Dashboard)"

# Emergency commands
emergency-stop: ## Emergency stop all services
	docker compose down --timeout 10
	docker compose kill

emergency-clean: ## Emergency clean (removes everything)
	docker compose down -v --remove-orphans --timeout 10
	docker system prune -f --volumes