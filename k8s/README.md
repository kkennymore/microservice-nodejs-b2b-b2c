# Multivendor Marketplace - Kubernetes Deployment

This directory contains the complete Kubernetes manifests for deploying the multivendor marketplace platform to production.

## 📁 Directory Structure

```
k8s/
├── base/                          # Base Kubernetes manifests
│   ├── namespace.yaml            # Namespace definition
│   ├── configmap.yaml            # Application configuration
│   ├── secret.yaml               # Sensitive configuration
│   ├── persistent-volumes.yaml   # PVC definitions
│   ├── mysql.yaml                # MySQL database deployment
│   ├── mysql-init.yaml           # Database initialization
│   ├── redis.yaml                # Redis cache deployment
│   ├── redis-config.yaml         # Redis configuration
│   ├── rabbitmq.yaml             # RabbitMQ message queue
│   ├── rabbitmq-config.yaml      # RabbitMQ configuration
│   ├── gateway.yaml              # API Gateway deployment
│   ├── auth.yaml                 # Authentication service
│   ├── products.yaml             # Products service
│   ├── transactions.yaml         # Transactions service
│   ├── messaging.yaml            # Messaging service
│   ├── notifications.yaml        # Notifications service
│   ├── advertising.yaml          # Advertising service
│   ├── ticketing.yaml            # Ticketing service
│   ├── system.yaml               # System management service
│   ├── analytics.yaml            # Analytics service
│   ├── shipping.yaml             # Shipping service
│   ├── admin-dashboard.yaml      # Admin dashboard
│   ├── ingress.yaml              # External access routing
│   └── kustomization.yaml        # Base kustomization
├── overlays/                     # Environment-specific overlays
│   ├── development/              # Development environment
│   │   ├── kustomization.yaml
│   │   ├── replica-counts.yaml
│   │   └── resource-limits.yaml
│   ├── staging/                  # Staging environment
│   │   ├── kustomization.yaml
│   │   └── staging-config.yaml
│   └── production/               # Production environment
│       ├── kustomization.yaml
│       ├── production-security.yaml
│       └── production-scaling.yaml
```

## 🚀 Quick Start

### Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured
- Kustomize installed
- cert-manager (for SSL certificates)
- NGINX Ingress Controller
- Storage class for persistent volumes

### Deploy to Development

```bash
# Deploy to development environment
kubectl apply -k k8s/overlays/development/

# Check deployment status
kubectl get pods -n marketplace-dev
kubectl get services -n marketplace-dev
kubectl get ingress -n marketplace-dev
```

### Deploy to Production

```bash
# Deploy to production environment
kubectl apply -k k8s/overlays/production/

# Check deployment status
kubectl get pods -n marketplace
kubectl get services -n marketplace
kubectl get ingress -n marketplace
```

## 🏗️ Architecture

### Services Overview

| Service | Port | Purpose | Replicas (Prod) |
|---------|------|---------|-----------------|
| Gateway | 4000 | API routing & load balancing | 5-20 |
| Auth | 3001 | Authentication & authorization | 2 |
| Products | 3002 | Product catalog & inventory | 3-10 |
| Transactions | 3003 | Payment processing | 3-12 |
| Messaging | 3004 | Real-time chat | 3 |
| Notifications | 3005 | Multi-channel notifications | 3 |
| Advertising | 3006 | Campaign management | 2 |
| Ticketing | 3007 | Customer support | 2 |
| System | 3008 | Admin management | 2 |
| Analytics | 3009 | Business intelligence | 2-8 |
| Shipping | 3010 | Logistics & delivery | 2 |

### Infrastructure Components

- **MySQL 8.0**: Primary database with persistent storage
- **Redis 7**: Caching and session storage
- **RabbitMQ 3.12**: Message queuing with management interface
- **NGINX Ingress**: External traffic routing with SSL termination
- **cert-manager**: Automatic SSL certificate management

## ⚙️ Configuration

### Environment Variables

All configuration is managed through ConfigMaps and Secrets:

- `marketplace-config`: Application settings
- `marketplace-secrets`: Sensitive data (API keys, passwords)

### Scaling Configuration

Horizontal Pod Autoscaling is configured for:

- **Gateway**: CPU 60%, Memory 70% (5-20 replicas)
- **Products**: CPU 70% (3-10 replicas)
- **Transactions**: CPU 65% (3-12 replicas)
- **Analytics**: CPU 75%, Memory 80% (2-8 replicas)

## 🔒 Security Features

### Production Security

- **Network Policies**: Restrict inter-service communication
- **Pod Security Policies**: Enforce security contexts
- **SSL/TLS**: Automatic certificate management
- **Secrets Management**: Sensitive data in Kubernetes secrets
- **RBAC**: Role-based access control

### Authentication & Authorization

- JWT-based authentication with refresh tokens
- Role-based permissions (buyer/seller/admin)
- API rate limiting and request validation

## 📊 Monitoring & Observability

### Health Checks

All services include:
- **Liveness Probes**: Container health monitoring
- **Readiness Probes**: Traffic routing decisions
- **Startup Probes**: Initial application startup

### Metrics & Logging

- Resource utilization monitoring
- Application performance metrics
- Centralized logging with correlation IDs
- Distributed tracing support

## 🔄 Deployment Strategies

### Blue-Green Deployment

```bash
# Deploy new version
kubectl apply -k k8s/overlays/production/ --prune

# Verify deployment
kubectl rollout status deployment/gateway -n marketplace

# Switch traffic (if using service mesh)
kubectl apply -f blue-green-switch.yaml
```

### Rolling Updates

```bash
# Update with zero downtime
kubectl set image deployment/gateway gateway=marketplace/gateway:v1.1.0 -n marketplace
kubectl rollout status deployment/gateway -n marketplace
```

## 🛠️ Maintenance

### Database Backups

```bash
# Create database backup
kubectl exec -n marketplace deployment/mysql -- mysqldump -u marketplace -p fenap_marketplace > backup.sql

# Restore from backup
kubectl exec -n marketplace -i deployment/mysql -- mysql -u marketplace -p fenap_marketplace < backup.sql
```

### Log Aggregation

```bash
# View service logs
kubectl logs -f deployment/gateway -n marketplace

# View all service logs
kubectl logs -l app.kubernetes.io/name=marketplace -n marketplace --tail=100
```

### Scaling Operations

```bash
# Manual scaling
kubectl scale deployment products --replicas=5 -n marketplace

# Check HPA status
kubectl get hpa -n marketplace
```

## 🚨 Troubleshooting

### Common Issues

1. **Pods not starting**: Check resource limits and node capacity
2. **Service unreachable**: Verify service selectors and network policies
3. **Database connection failed**: Check PVC status and database credentials
4. **Ingress not working**: Verify ingress class and SSL certificates

### Debug Commands

```bash
# Check pod status
kubectl get pods -n marketplace
kubectl describe pod <pod-name> -n marketplace

# Check service endpoints
kubectl get endpoints -n marketplace

# Check ingress status
kubectl describe ingress marketplace-ingress -n marketplace

# View logs
kubectl logs -f deployment/<service-name> -n marketplace

# Exec into pod
kubectl exec -it deployment/<service-name> -n marketplace -- /bin/sh
```

## 📈 Performance Optimization

### Resource Optimization

- **Right-sizing**: Monitor and adjust resource requests/limits
- **HPA Tuning**: Optimize scaling thresholds based on load patterns
- **Database Optimization**: Connection pooling and query optimization

### Caching Strategy

- **Redis**: Session storage, API response caching
- **CDN**: Static asset delivery (future enhancement)
- **Database Query Caching**: Frequently accessed data

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Kubernetes
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Configure kubectl
      uses: azure/k8s-set-context@v1
    - name: Deploy to production
      run: kubectl apply -k k8s/overlays/production/
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kubectl.docs.kubernetes.io/references/kustomize/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)

## 🤝 Contributing

1. Test changes in development environment first
2. Update documentation for configuration changes
3. Follow Kubernetes best practices
4. Ensure security compliance for production changes

---

**🎉 Your multivendor marketplace is now ready for production deployment!**