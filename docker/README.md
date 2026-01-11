# Docker Compose Orchestration

Complete containerized deployment of the multivendor marketplace platform using Docker Compose. This setup provides a production-ready, scalable microservices architecture with comprehensive monitoring and management capabilities.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │  API Gateway     │    │   Microservices  │
│   (Port 80/443) │◄──►│   (Port 4000)    │◄──►│   (Ports 3001+)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Admin Dashboard │    │   Databases      │    │  Message Queue   │
│  (Port 3000)    │    │ MySQL + Redis    │    │   RabbitMQ        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM available
- 10GB+ free disk space

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables (required)
nano .env
```

### Start Everything
```bash
# Quick start development environment
make quick-start

# Or manually:
make build
make dev
make monitor
```

### Access Points
- **Admin Dashboard**: http://localhost:3000
- **API Gateway**: http://localhost:4000
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **phpMyAdmin**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

## 📋 Services Overview

### Core Services
| Service | Port | Description | Dependencies |
|---------|------|-------------|--------------|
| **nginx** | 80/443 | Reverse proxy & load balancer | All services |
| **gateway** | 4000 | API Gateway with routing & security | MySQL, Redis, RabbitMQ |
| **mysql** | 3306 | Primary database | None |
| **redis** | 6379 | Cache & session storage | None |
| **rabbitmq** | 5672/15672 | Message queue | None |

### Microservices
| Service | Port | Description | Health Check |
|---------|------|-------------|--------------|
| **auth** | 3001 | User authentication | ✅ `/health` |
| **products** | 3002 | Product catalog | ✅ `/health` |
| **transactions** | 3003 | Payments & wallets | ✅ `/health` |
| **messaging** | 3004 | Real-time chat | ✅ `/health` |
| **notifications** | 3005 | Email/SMS/Push | ✅ `/health` |
| **analytics** | 3009 | Business intelligence | ✅ `/health` |
| **shipping** | 3010 | Logistics & delivery | ✅ `/health` |
| **system** | 3008 | Admin management | ✅ `/health` |

### Development Tools
| Service | Port | Description |
|---------|------|-------------|
| **admin-dashboard** | 3000 | React admin interface |
| **phpmyadmin** | 8080 | Database management |
| **redis-commander** | 8081 | Redis management |

## ⚙️ Configuration

### Environment Variables

#### Required
```env
# Database
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_USER=marketplace
MYSQL_PASSWORD=your_secure_db_password
MYSQL_DATABASE=fenap_marketplace

# JWT Security
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars

# Message Queue
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=your_secure_rabbitmq_password
```

#### Optional (Production)
```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Payment Processors
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_CLIENT_ID=your_paypal_client_id

# Shipping Carriers
FEDEX_API_KEY=your_fedex_key
UPS_ACCESS_KEY=your_ups_key

# External Services
REDIS_PASSWORD=your_redis_password
```

### Service-Specific Configuration

Each microservice has its own environment configuration that can be customized in the `docker-compose.yml` file.

## 🛠️ Management Commands

### Basic Operations
```bash
# Start all services
make up

# Start development environment
make dev

# Stop all services
make down

# View service status
make status

# View logs
make logs

# View specific service logs
make logs-gateway
make logs-mysql
```

### Health Monitoring
```bash
# Check all service health
make health

# Monitor services (opens browser tabs)
make monitor
```

### Database Operations
```bash
# Backup database
make db-backup

# Restore from backup
make db-restore-backup_20231201_120000.sql
```

### Maintenance
```bash
# Clean up containers and volumes
make clean

# Emergency stop
make emergency-stop

# Full cleanup (removes everything)
make emergency-clean
```

## 🔧 Development Workflow

### Local Development
```bash
# Install all dependencies
make install

# Run database migrations
make migrate

# Start development environment
make dev

# View logs
make logs
```

### Code Changes
```bash
# Restart specific service after code changes
docker-compose restart auth

# Rebuild service after Dockerfile changes
docker-compose build auth
docker-compose up -d auth
```

### Debugging
```bash
# Enter service container
docker-compose exec gateway sh

# View service logs
docker-compose logs -f gateway

# Check service health
curl http://localhost:4000/health
```

## 📊 Monitoring & Observability

### Health Checks
All services include comprehensive health checks:
- HTTP endpoint availability
- Database connectivity
- External service dependencies
- Resource utilization

### Logging
- Centralized logging to stdout/stderr
- Structured JSON logs for production
- Request/response logging with correlation IDs
- Error tracking with stack traces

### Metrics
- Request/response times
- Error rates and success rates
- Database connection pools
- Cache hit/miss ratios
- Queue depths and processing rates

## 🗄️ Data Persistence

### Volumes
```yaml
volumes:
  mysql_data:      # Database files
  redis_data:      # Cache data
  rabbitmq_data:   # Message queue data
  uploads_data:    # File uploads
```

### Backup Strategy
```bash
# Automated backups (add to cron)
0 2 * * * make db-backup

# Manual backup
make db-backup

# Restore from backup
make db-restore-backup_filename.sql
```

## 🔒 Security Features

### Network Security
- Service isolation with Docker networks
- No inter-service communication bypass
- External access only through Nginx proxy

### Authentication & Authorization
- JWT token validation on all APIs
- Role-based access control
- Request rate limiting per service
- API key support for external integrations

### Data Protection
- Database credentials in environment variables
- Encrypted connections where supported
- Secure headers and CORS policies
- Input validation and sanitization

## 🚀 Production Deployment

### Production Configuration
```bash
# Use production docker-compose
docker-compose -f docker-compose.yml up -d

# Scale services for high availability
docker-compose up -d --scale gateway=3 --scale analytics=2

# Use external load balancer
# Configure nginx upstream for multiple instances
```

### SSL/TLS Setup
```bash
# Add SSL certificates to docker/nginx/ssl/
# Update nginx configuration for HTTPS
# Configure certbot for automatic renewal
```

### High Availability
```yaml
# Multiple instances
gateway:
  deploy:
    replicas: 3
    restart_policy:
      condition: on-failure

# Load balancing
nginx:
  upstream gateway_backend:
    - gateway:4000
    - gateway2:4000
    - gateway3:4000
```

## 🔍 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check logs
make logs

# Check resource availability
docker system df

# Restart specific service
docker-compose restart gateway
```

#### Database Connection Issues
```bash
# Check MySQL status
docker-compose exec mysql mysqladmin ping

# Check MySQL logs
docker-compose logs mysql

# Reset database
make clean && make up
```

#### Service Health Check Failures
```bash
# Manual health check
curl http://localhost:4000/health

# Check service dependencies
docker-compose exec gateway cat /etc/hosts

# Restart unhealthy service
docker-compose restart gateway
```

### Performance Issues
```bash
# Check resource usage
docker stats

# Monitor service metrics
curl http://localhost:4000/metrics

# Scale services
docker-compose up -d --scale gateway=2
```

## 📚 Advanced Configuration

### Custom Networking
```yaml
networks:
  marketplace:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
```

### Resource Limits
```yaml
services:
  gateway:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Service Discovery
```yaml
# Consul or etcd integration for dynamic service discovery
# Automatic service registration and deregistration
# Health check integration
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.yml pull
          docker-compose -f docker-compose.yml up -d
          docker-compose -f docker-compose.yml exec gateway npm run migrate
```

### Blue-Green Deployment
```bash
# Create blue environment
docker-compose -p blue up -d

# Switch nginx to blue
# Run tests
# Switch traffic to blue
# Shutdown green
```

## 📞 Support & Maintenance

### Regular Maintenance
```bash
# Weekly tasks
make db-backup
docker system prune -f
docker-compose restart

# Monthly tasks
make clean
make build
make up
```

### Monitoring Alerts
- Set up alerts for service downtime
- Monitor resource usage trends
- Track error rates and performance metrics
- Regular security updates

This Docker Compose orchestration provides a complete, production-ready deployment of the multivendor marketplace platform with enterprise-grade reliability, security, and scalability! 🐳⚖️🚀