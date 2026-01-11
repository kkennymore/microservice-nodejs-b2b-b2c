# Load Testing with Artillery

Comprehensive load testing suite for the multivendor marketplace platform using Artillery.io. This setup provides realistic traffic simulation, performance monitoring, and scalability validation for all microservices.

## 🧪 Testing Overview

### Test Types
- **Smoke Tests**: Quick validation of basic functionality
- **Load Tests**: Sustained traffic simulation with realistic user patterns
- **Stress Tests**: High-load testing to identify breaking points
- **Spike Tests**: Sudden traffic surges to test autoscaling
- **Soak Tests**: Extended testing to identify memory leaks and degradation

### Test Scenarios
- **Authentication Flow**: User registration, login, token refresh
- **Product Catalog**: Search, browsing, recommendations
- **E-commerce Flow**: Add to cart, checkout, payment processing
- **Real-time Features**: Messaging, notifications, live updates
- **Admin Operations**: Dashboard access, user management, analytics

## 🚀 Quick Start

### Prerequisites
```bash
# Install Artillery globally
npm install -g artillery

# Verify installation
artillery --version
```

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure API endpoints (if not using Docker)
echo "VITE_API_URL=http://localhost:4000" >> .env
```

### Run Basic Tests
```bash
# Make script executable
chmod +x testing/load-tests/scripts/run-tests.sh

# Run smoke test
./testing/load-tests/scripts/run-tests.sh smoke-test

# Run full load test
./testing/load-tests/scripts/run-tests.sh run-all

# Run service-specific test
./testing/load-tests/scripts/run-tests.sh run-service auth
```

## 📊 Test Configuration

### Main Configuration (`artillery-config.yml`)

```yaml
config:
  target: 'http://localhost:4000'
  phases:
    # Warm-up phase
    - duration: 60
      arrivalRate: 5
      name: "Warm-up"

    # Normal load
    - duration: 300
      arrivalRate: 20
      name: "Normal Load"

    # Peak load
    - duration: 120
      arrivalRate: 50
      name: "Peak Load"

    # Stress test
    - duration: 60
      arrivalRate: 100
      name: "Stress Test"
```

### Load Phases Explained
- **Warm-up (60s)**: Gradually ramp up to establish baseline
- **Normal Load (300s)**: Typical production traffic levels
- **Peak Load (120s)**: High traffic periods (sales, events)
- **Stress Test (60s)**: Maximum capacity testing

## 🎯 Service-Specific Scenarios

### Authentication Service
```yaml
scenarios:
  - name: "User Registration"
    weight: 10
  - name: "User Login"
    weight: 30
  - name: "Token Refresh"
    weight: 5
  - name: "Password Reset"
    weight: 8
```

### Products Service
```yaml
scenarios:
  - name: "Get Products List"
    weight: 40
  - name: "Search Products"
    weight: 20
  - name: "Product Recommendations"
    weight: 8
  - name: "Add Product Review"
    weight: 6
```

### Transactions Service
```yaml
scenarios:
  - name: "Process Payment"
    weight: 12
  - name: "Get Transaction History"
    weight: 20
  - name: "Wallet Operations"
    weight: 8
```

### Analytics Service
```yaml
scenarios:
  - name: "Dashboard KPIs"
    weight: 25
  - name: "Real-time Metrics"
    weight: 8
  - name: "Generate Reports"
    weight: 6
```

## 📈 Performance Metrics

### Response Time Targets
- **P95**: < 500ms (95th percentile)
- **P99**: < 1000ms (99th percentile)
- **Average**: < 200ms

### Error Rate Targets
- **HTTP 4xx**: < 1% (client errors)
- **HTTP 5xx**: < 0.1% (server errors)
- **Timeouts**: < 0.01%

### Throughput Targets
- **Requests/Second**: 100+ RPS sustained
- **Concurrent Users**: 1000+ simultaneous
- **Data Transfer**: 10MB/s+ peak

## 🛠️ Advanced Testing Commands

### Custom Load Profiles
```bash
# High burst testing
artillery quick \
  --count 100 \
  --num 10 \
  http://localhost:4000/api/products

# Ramp-up testing
artillery quick \
  --ramp-to 50 \
  --ramp-period 60 \
  http://localhost:4000/health
```

### Distributed Testing
```bash
# Run tests across multiple machines
artillery run \
  --config artillery-config.yml \
  --platform aws:lambda \
  --region us-east-1
```

### Custom Scenarios
```bash
# Test specific user journey
artillery run \
  --config custom-checkout.yml \
  --overrides '{"arrivalRate": 10, "duration": 120}'
```

## 📊 Reporting & Analysis

### Generate HTML Reports
```bash
# Generate report from latest test
./testing/load-tests/scripts/run-tests.sh report

# Generate report from specific file
artillery report testing/load-tests/reports/test-results.json
```

### Key Metrics to Monitor
```json
{
  "http.requests.total": 15000,
  "http.requests.rate": 50,
  "http.response_time.p50": 120,
  "http.response_time.p95": 450,
  "http.response_time.p99": 890,
  "http.codes.200": 14950,
  "http.codes.4xx": 45,
  "http.codes.5xx": 5
}
```

### Performance Analysis
```bash
# Compare test results
./testing/load-tests/scripts/run-tests.sh compare \
  reports/test1.json \
  reports/test2.json

# Export metrics for dashboard
artillery run \
  --config artillery-config.yml \
  --output results.json \
  --metrics-export csv
```

## 🔧 Test Environment Setup

### Docker Compose Testing
```bash
# Start platform with monitoring
make dev

# Run load tests against containers
./testing/load-tests/scripts/run-tests.sh run-all

# Monitor resource usage
docker stats
```

### Kubernetes Testing
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Run distributed load tests
artillery run \
  --config artillery-config.yml \
  --platform k8s \
  --namespace marketplace
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Load Testing
  run: |
    npm install -g artillery
    artillery run --config testing/load-tests/artillery-config.yml
    artillery report --output report.html
```

## 🎪 Test Data Management

### Synthetic Data Generation
```javascript
// Custom data functions in Artillery
function generateUser() {
  return {
    email: `user_${Math.random()}@test.com`,
    name: `Test User ${Math.random()}`,
    password: 'TestPass123!'
  };
}

function generateProduct() {
  return {
    name: `Product ${Math.random()}`,
    price: Math.random() * 100,
    category: ['electronics', 'clothing', 'books'][Math.floor(Math.random() * 3)]
  };
}
```

### Database Seeding
```bash
# Seed test data before running tests
npm run db:seed:test

# Clean up after tests
npm run db:cleanup:test
```

## 🚨 Failure Analysis

### Common Failure Patterns
```json
{
  "slow_responses": {
    "indicators": ["p95 > 1000ms", "p99 > 2000ms"],
    "causes": ["Database queries", "External API calls", "Resource constraints"],
    "solutions": ["Query optimization", "Caching", "Horizontal scaling"]
  },
  "high_error_rates": {
    "indicators": ["4xx > 5%", "5xx > 1%"],
    "causes": ["Input validation", "Service dependencies", "Resource limits"],
    "solutions": ["Error handling", "Circuit breakers", "Rate limiting"]
  },
  "memory_leaks": {
    "indicators": ["RSS growth", "heap usage increase"],
    "causes": ["Unclosed connections", "Event listeners", "Cache growth"],
    "solutions": ["Memory profiling", "Connection pooling", "Cache limits"]
  }
}
```

### Debugging Techniques
```bash
# Enable debug logging
export DEBUG=artillery:*

# Run with verbose output
artillery run --config config.yml --verbose

# Capture network traffic
artillery run --config config.yml --record-har

# Profile Node.js performance
artillery run --config config.yml --profiling
```

## 📈 Scaling & Optimization

### Performance Tuning
```yaml
# Artillery configuration for scaling tests
config:
  target: 'http://localhost:4000'
  phases:
    - duration: 300
      arrivalRate: 10
      name: "Baseline"
    - duration: 300
      arrivalRate: 25
      name: "Moderate Load"
    - duration: 300
      arrivalRate: 50
      name: "High Load"
    - duration: 300
      arrivalRate: 100
      name: "Peak Load"
```

### Resource Monitoring
```bash
# Monitor system resources during tests
watch -n 5 'docker stats && free -h && df -h'

# Application metrics
curl http://localhost:4000/metrics
curl http://localhost:3009/metrics
```

### Database Performance
```sql
-- Monitor database performance
SHOW PROCESSLIST;
SHOW ENGINE INNODB STATUS;
SELECT * FROM performance_schema.events_statements_current;
```

## 🔄 Continuous Testing

### Automated Test Pipeline
```yaml
# .github/workflows/load-test.yml
name: Load Testing
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install Artillery
        run: npm install -g artillery
      - name: Run Load Tests
        run: |
          artillery run --config testing/load-tests/artillery-config.yml --output results.json
      - name: Generate Report
        run: artillery report results.json --output report.html
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: load-test-report
          path: report.html
```

### Performance Regression Detection
```javascript
// Custom expectations for performance baselines
expect: [
  {
    "http.response_time.p95": {
      "lt": 500  // Fail if p95 > 500ms
    }
  },
  {
    "http.error_rate": {
      "lt": 0.01  // Fail if error rate > 1%
    }
  }
]
```

## 📚 Best Practices

### Test Design
1. **Realistic Scenarios**: Model actual user behavior patterns
2. **Progressive Load**: Start low, gradually increase load
3. **Think Time**: Include realistic delays between actions
4. **Data Variation**: Use diverse test data to avoid caching effects

### Environment Consistency
1. **Dedicated Environment**: Use separate test environment
2. **Clean State**: Reset database and cache between tests
3. **Resource Isolation**: Ensure test environment has adequate resources
4. **Network Simulation**: Test with realistic network conditions

### Result Interpretation
1. **Multiple Runs**: Run tests multiple times for statistical significance
2. **Baseline Comparison**: Compare against established performance baselines
3. **Trend Analysis**: Monitor performance trends over time
4. **Root Cause Analysis**: Investigate performance bottlenecks thoroughly

This comprehensive load testing setup ensures your multivendor marketplace platform can handle production traffic loads while maintaining excellent performance and reliability! 🚀📊⚡