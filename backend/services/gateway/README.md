# API Gateway Service

Enterprise-grade API Gateway for the multivendor marketplace microservices architecture.

## Features

### 🔀 Centralized Request Routing
- **Microservice Proxy**: Routes requests to appropriate services based on URL patterns
- **Load Balancing**: Distributes requests across service instances
- **Service Discovery**: Automatic service registration and health monitoring
- **Circuit Breaker**: Prevents cascading failures with intelligent retry logic

### 🔐 Security & Authentication
- **JWT Validation**: Centralized authentication middleware
- **Role-Based Access**: Admin, seller, buyer permission levels
- **Request Sanitization**: Automatic input validation and cleaning
- **Security Headers**: Comprehensive security headers and CORS configuration

### 📊 Monitoring & Logging
- **Request Tracking**: Complete request/response logging with unique IDs
- **Performance Metrics**: Response times, error rates, throughput monitoring
- **Health Checks**: Real-time service health monitoring and alerting
- **Analytics**: Request patterns, user behavior, and system insights

### 🚦 Rate Limiting & Throttling
- **Global Rate Limits**: IP-based request throttling
- **Service-Specific Limits**: Custom limits per service and endpoint
- **User-Based Limits**: Authenticated user rate limiting
- **Dynamic Scaling**: Automatic limit adjustment based on load

### 🔄 Request/Response Transformation
- **API Versioning**: Support for multiple API versions (/api/v1, /api/v2)
- **Content Transformation**: Request/response format conversion
- **Header Injection**: Automatic header addition for downstream services
- **Response Filtering**: Selective data exposure based on user permissions

## Architecture

### Service Routing

The gateway routes requests to microservices based on URL patterns:

```
Gateway (Port 4000)
├── /api/auth/* → Auth Service (Port 3001)
├── /api/products/* → Products Service (Port 3002)
├── /api/transactions/* → Transactions Service (Port 3003)
├── /api/messages/* → Messaging Service (Port 3004)
├── /api/notifications/* → Notifications Service (Port 3005)
├── /api/conversations/* → Messaging Service (Port 3004)
├── /api/files/* → Messaging Service (Port 3004)
├── /api/whatsapp/* → Notifications Service (Port 3005)
├── /api/emails/* → Notifications Service (Port 3005)
├── /api/sms/* → Notifications Service (Port 3005)
├── /api/push/* → Notifications Service (Port 3005)
├── /api/campaigns/* → Notifications Service (Port 3005)
├── /api/notification-analytics/* → Notifications Service (Port 3005)
├── /api/analytics/* → Analytics Service (Port 3009) ⚖️ Load Balanced
├── /api/dashboard/* → Analytics Service (Port 3009) ⚖️ Load Balanced
├── /api/reports/* → Analytics Service (Port 3009) ⚖️ Load Balanced
├── /api/shipping/* → Shipping Service (Port 3010) ⚖️ Load Balanced
└── /api/system/* → System Service (Port 3008) 👑 Admin Only
```

### Request Flow

```
Client Request
    ↓
Gateway Authentication
    ↓
Rate Limiting Check
    ↓
Request Logging
    ↓
Service Discovery
    ↓
Load Balancing
    ↓
Circuit Breaker
    ↓
Proxy to Microservice
    ↓
Response Transformation
    ↓
Response Logging
    ↓
Client Response
```

## Configuration

### Environment Variables

```env
# Gateway Configuration
GATEWAY_PORT=4000
NODE_ENV=production

# Frontend Configuration
FRONTEND_URL=https://yourdomain.com

# Service URLs
AUTH_SERVICE_URL=http://auth-service:3001
PRODUCTS_SERVICE_URL=http://products-service:3002
TRANSACTIONS_SERVICE_URL=http://transactions-service:3003
MESSAGING_SERVICE_URL=http://messaging-service:3004
NOTIFICATIONS_SERVICE_URL=http://notifications-service:3005
ANALYTICS_SERVICE_URL=http://analytics-service:3009
SHIPPING_SERVICE_URL=http://shipping-service:3010
SYSTEM_SERVICE_URL=http://system-service:3008

# Security
JWT_SECRET=your-jwt-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### Rate Limiting Configuration

```javascript
// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: 'Too many requests'
});

// Auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 auth attempts per window
  message: 'Too many auth attempts'
});

// Admin endpoints (moderate)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 admin operations per window
  message: 'Too many admin operations'
});

// Analytics endpoints (analytics-focused)
const analyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 analytics requests per hour
  message: 'Analytics request limit exceeded'
});
```

## API Endpoints

### Gateway Management

```
GET    /health              - Gateway health check
GET    /api/docs            - API documentation
GET    /api/services        - Service discovery
```

### Proxied Endpoints

All microservice endpoints are proxied through the gateway:

```
# Authentication
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh

# Products
GET    /api/products
POST   /api/products
PUT    /api/products/:id

# Transactions
POST   /api/transactions/payment
GET    /api/transactions
GET    /api/transactions/wallet

# Messaging
POST   /api/messages
GET    /api/messages/conversation/:id
POST   /api/conversations

# Notifications
GET    /api/notifications
POST   /api/notifications/send
GET    /api/notification-analytics/dashboard

# Analytics (Load Balanced)
GET    /api/analytics/overview
GET    /api/analytics/sales
GET    /api/analytics/users
GET    /api/analytics/products
GET    /api/dashboard/kpis
GET    /api/dashboard/revenue-chart
GET    /api/reports/sales
GET    /api/reports/users
GET    /api/reports/business

# Shipping (Load Balanced)
POST   /api/shipping/rates
POST   /api/shipping/shipments
GET    /api/shipping/track/:trackingNumber
GET    /api/shipping/carriers

# System Administration (Admin Only)
GET    /api/system/dashboard/summary
GET    /api/system/users
PUT    /api/system/users/:id/status
GET    /api/system/alerts
POST   /api/system/alerts/:id/acknowledge
POST   /api/system/maintenance
GET    /api/system/logs
PUT    /api/system/settings/:key
```

## Security Features

### Authentication Middleware

```javascript
// JWT token validation
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, config.jwt.secret);

req.user = {
  id: decoded.userId,
  email: decoded.email,
  role: decoded.role
};
```

### CORS Configuration

```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-API-Version']
};
```

### Security Headers

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"]
    }
  }
}));
```

## Monitoring & Observability

### Request Logging

Every request is logged with:
- Unique request ID
- Timestamp and duration
- User information
- Request/response details
- Error tracking

### Health Monitoring

```javascript
// Service health checks
GET /api/services
// Returns health status of all microservices

// Individual service health
GET /health
// Gateway health and statistics
```

### Performance Metrics

- Response time tracking
- Error rate monitoring
- Request throughput
- Service availability
- Rate limit violations

## Load Balancing

### Load Balancing Strategies

The gateway supports multiple load balancing strategies for different service types:

#### Round-Robin
- **Used for**: Shipping Service, Dashboard routes
- **Algorithm**: Sequential distribution of requests
- **Best for**: General-purpose load distribution

#### Least Connections
- **Used for**: Analytics Service, Reports routes
- **Algorithm**: Routes to service with fewest active connections
- **Best for**: Resource-intensive operations

#### Weighted Round-Robin
- **Available**: Configurable weights for service instances
- **Use case**: Different instance capacities

#### Random Selection
- **Available**: Random instance selection
- **Use case**: Simple load distribution

### Service Configuration

```javascript
const serviceRoutes = [
  {
    name: 'analytics',
    path: '/api/analytics',
    target: 'http://analytics-service:3009',
    loadBalancing: {
      enabled: true,
      strategy: 'least-connections' // Optimized for analytics queries
    }
  },
  {
    name: 'shipping',
    path: '/api/shipping',
    target: 'http://shipping-service:3010',
    loadBalancing: {
      enabled: true,
      strategy: 'round-robin' // General shipping operations
    }
  },
  {
    name: 'system',
    path: '/api/system',
    target: 'http://system-service:3008',
    loadBalancing: {
      enabled: false // Admin functions remain single instance
    }
  }
];
```

### Health-Based Routing

Services are automatically managed based on health status:

- **Healthy Services**: Included in load balancing rotation
- **Unhealthy Services**: Automatically removed from rotation
- **Recovery**: Services restored when health checks pass
- **Monitoring**: Continuous health checking every 60 seconds

### Load Balancing Implementation

```javascript
class LoadBalancer {
  // Select service instance based on strategy
  selectInstance(service, strategy) {
    const healthyInstances = service.instances.filter(inst => inst.healthy);

    switch (strategy) {
      case 'round-robin':
        return this.roundRobinSelect(healthyInstances, service.name);
      case 'least-connections':
        return this.leastConnectionsSelect(healthyInstances);
      case 'weighted-round-robin':
        return this.weightedRoundRobinSelect(healthyInstances);
      default:
        return healthyInstances[0]?.url || service.target;
    }
  }

  // Track active connections for least-connections balancing
  trackRequest(serviceUrl, increment = true) {
    const current = this.requestCounts.get(serviceUrl) || 0;
    this.requestCounts.set(serviceUrl, increment ? current + 1 : Math.max(0, current - 1));
  }
}
```

## Circuit Breaker Pattern

### Implementation

```javascript
class CircuitBreaker {
  constructor() {
    this.failureThreshold = 5;
    this.recoveryTimeout = 60000;
    this.state = 'closed'; // closed, open, half-open
  }

  async execute(operation) {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}
```

## Request Transformation

### Header Injection

```javascript
// Add gateway headers to downstream requests
proxyReq.setHeader('X-Gateway', 'true');
proxyReq.setHeader('X-API-Version', req.apiVersion);
proxyReq.setHeader('X-User-ID', req.user?.id);
proxyReq.setHeader('X-Client-IP', req.ip);
```

### Response Filtering

```javascript
// Filter sensitive data based on user role
if (req.user.role !== 'admin') {
  delete response.user.ssn;
  delete response.user.internalNotes;
}
```

## Error Handling

### Centralized Error Responses

```javascript
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const requestId = req.requestId;

  res.status(statusCode).json({
    success: false,
    message: err.message,
    requestId,
    timestamp: new Date().toISOString()
  });
};
```

### Error Types

- **Authentication Errors**: Invalid/expired tokens
- **Authorization Errors**: Insufficient permissions
- **Rate Limiting**: Request throttling
- **Service Errors**: Downstream service failures
- **Validation Errors**: Input validation failures

## Deployment

### Docker Configuration

```yaml
gateway:
  build: ./backend/services/gateway
  ports:
    - "4000:4000"
  environment:
    - NODE_ENV=production
    - GATEWAY_PORT=4000
  depends_on:
    - auth-service
    - products-service
    - transactions-service
    - messaging-service
    - notifications-service
    - analytics-service
    - shipping-service
    - system-service
```

### Kubernetes Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
spec:
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gateway-service
            port:
              number: 4000
```

## Usage Examples

### Frontend Integration

```javascript
// API calls go through gateway
const response = await fetch('/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Gateway handles:
// - Authentication validation
// - Rate limiting
// - Request logging
// - Service routing
// - Response transformation
```

### Service Communication

```javascript
// Services can call each other through gateway
const userData = await fetch('http://gateway:4000/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${serviceToken}`
  }
});
```

## Production Considerations

### Scalability
- **Horizontal Scaling**: Multiple gateway instances behind load balancer
- **Redis Integration**: Shared rate limiting and session storage
- **Database Connection Pooling**: Efficient database connections
- **Caching**: Response caching for improved performance

### Security
- **SSL/TLS**: HTTPS enforcement
- **API Keys**: Service-to-service authentication
- **IP Whitelisting**: Restrict access to trusted networks
- **DDoS Protection**: Integration with CDN/WAF services

### Monitoring
- **ELK Stack**: Centralized logging and analysis
- **Prometheus/Grafana**: Metrics collection and visualization
- **Alert Manager**: Automated alerting for issues
- **APM Tools**: Application performance monitoring

### Compliance
- **GDPR**: Data protection and privacy compliance
- **Audit Logging**: Complete request/response audit trails
- **Data Retention**: Configurable log retention policies
- **Anonymization**: PII data masking in logs

This API Gateway provides a robust, scalable, and secure entry point for your entire microservices ecosystem! 🚪🔐📊