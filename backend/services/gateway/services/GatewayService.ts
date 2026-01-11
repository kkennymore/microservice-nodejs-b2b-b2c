import axios from 'axios';
import { serviceRoutes } from '@/config/serviceRoutes.js';

class GatewayService {
  constructor() {
    this.services = new Map();
    this.healthCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    this.loadBalancers = new Map();
    this.requestCounts = new Map();
  }

  async initialize() {
    console.log('🚪 Initializing API Gateway Service');

    // Initialize service registry
    serviceRoutes.forEach(route => {
      this.services.set(route.name, {
        name: route.name,
        target: route.target,
        path: route.path,
        protected: route.protected,
        lastHealthCheck: null,
        healthy: null
      });
    });

    // Start health checking
    this.startHealthChecking();

    console.log(`📋 Registered ${this.services.size} services`);
  }

  // Service discovery
  async discoverServices() {
    const services = [];

    for (const [name, service] of this.services) {
      const health = await this.checkServiceHealth(service.target);
      services.push({
        name,
        url: service.target,
        path: service.path,
        healthy: health.healthy,
        responseTime: health.responseTime,
        lastChecked: health.lastChecked
      });
    }

    return services;
  }

  // Health check for a service
  async checkServiceHealth(serviceUrl) {
    const cacheKey = serviceUrl;
    const cached = this.healthCache.get(cacheKey);

    if (cached && (Date.now() - cached.lastChecked) < this.cacheTimeout) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const response = await axios.get(`${serviceUrl}/health`, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });

      const responseTime = Date.now() - startTime;
      const healthy = response.status === 200;

      const healthData = {
        healthy,
        responseTime,
        lastChecked: Date.now(),
        statusCode: response.status,
        data: response.data
      };

      this.healthCache.set(cacheKey, healthData);
      return healthData;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      const healthData = {
        healthy: false,
        responseTime,
        lastChecked: Date.now(),
        error: error.message
      };

      this.healthCache.set(cacheKey, healthData);
      return healthData;
    }
  }

  // Get overall service health
  getServiceHealth() {
    const health = {};

    for (const [name, service] of this.services) {
      const cachedHealth = this.healthCache.get(service.target);
      health[name] = {
        healthy: cachedHealth?.healthy || false,
        target: service.target,
        lastChecked: cachedHealth?.lastChecked || null,
        responseTime: cachedHealth?.responseTime || null
      };
    }

    return health;
  }

  // Start periodic health checking
  startHealthChecking() {
    setInterval(async () => {
      console.log('🔍 Running service health checks...');

      for (const [name, service] of this.services) {
        try {
          const health = await this.checkServiceHealth(service.target);

          if (!health.healthy && service.healthy !== false) {
            console.warn(`⚠️ Service ${name} is unhealthy: ${service.target}`);
          } else if (health.healthy && service.healthy === false) {
            console.log(`✅ Service ${name} is back healthy: ${service.target}`);
          }

          service.healthy = health.healthy;
          service.lastHealthCheck = health.lastChecked;

        } catch (error) {
          console.error(`❌ Health check failed for ${name}:`, error.message);
          service.healthy = false;
        }
      }
    }, 60000); // Check every minute

    console.log('🏥 Health checking service started');
  }

  // Load balancing with multiple strategies
  getServiceInstance(serviceName, strategy = 'round-robin') {
    const service = this.services.get(serviceName);
    if (!service) return null;

    // If service has multiple instances, use load balancing
    if (service.instances && service.instances.length > 1) {
      return this.selectInstance(service, strategy);
    }

    // Single instance
    return service.target;
  }

  // Select instance based on load balancing strategy
  selectInstance(service, strategy) {
    const healthyInstances = service.instances.filter(instance => instance.healthy);

    if (healthyInstances.length === 0) {
      // Fallback to first instance if all are unhealthy
      return service.instances[0].url;
    }

    switch (strategy) {
      case 'round-robin':
        return this.roundRobinSelect(healthyInstances, service.name);

      case 'least-connections':
        return this.leastConnectionsSelect(healthyInstances);

      case 'weighted-round-robin':
        return this.weightedRoundRobinSelect(healthyInstances);

      case 'random':
        return this.randomSelect(healthyInstances);

      default:
        return this.roundRobinSelect(healthyInstances, service.name);
    }
  }

  // Round-robin load balancing
  roundRobinSelect(instances, serviceName) {
    if (!this.loadBalancers.has(serviceName)) {
      this.loadBalancers.set(serviceName, { current: 0 });
    }

    const balancer = this.loadBalancers.get(serviceName);
    const instance = instances[balancer.current % instances.length];
    balancer.current = (balancer.current + 1) % instances.length;

    return instance.url;
  }

  // Least connections load balancing
  leastConnectionsSelect(instances) {
    return instances.reduce((selected, current) => {
      const selectedConnections = this.requestCounts.get(selected.url) || 0;
      const currentConnections = this.requestCounts.get(current.url) || 0;
      return currentConnections < selectedConnections ? current : selected;
    }).url;
  }

  // Weighted round-robin (based on health score)
  weightedRoundRobinSelect(instances) {
    const totalWeight = instances.reduce((sum, instance) => sum + (instance.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const instance of instances) {
      random -= (instance.weight || 1);
      if (random <= 0) {
        return instance.url;
      }
    }

    return instances[0].url; // Fallback
  }

  // Random load balancing
  randomSelect(instances) {
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex].url;
  }

  // Register service instances for load balancing
  registerServiceInstances(serviceName, instances) {
    const service = this.services.get(serviceName);
    if (service) {
      service.instances = instances.map(instance => ({
        url: instance.url,
        weight: instance.weight || 1,
        healthy: true
      }));
      console.log(`⚖️ Registered ${instances.length} instances for ${serviceName}`);
    }
  }

  // Update instance health
  updateInstanceHealth(serviceName, instanceUrl, healthy) {
    const service = this.services.get(serviceName);
    if (service && service.instances) {
      const instance = service.instances.find(inst => inst.url === instanceUrl);
      if (instance) {
        instance.healthy = healthy;
        console.log(`🏥 ${serviceName} instance ${instanceUrl} health: ${healthy ? 'healthy' : 'unhealthy'}`);
      }
    }
  }

  // Track active requests for least-connections balancing
  trackRequest(serviceUrl, increment = true) {
    const current = this.requestCounts.get(serviceUrl) || 0;
    this.requestCounts.set(serviceUrl, increment ? current + 1 : Math.max(0, current - 1));
  }

  // Circuit breaker pattern (basic implementation)
  async executeWithCircuitBreaker(serviceUrl, operation, options = {}) {
    const {
      timeout = 5000,
      retries = 2,
      circuitBreakerThreshold = 5
    } = options;

    const circuitKey = serviceUrl;
    if (!this.circuitBreaker) {
      this.circuitBreaker = new Map();
    }

    const circuit = this.circuitBreaker.get(circuitKey) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' // closed, open, half-open
    };

    // Check circuit breaker state
    if (circuit.state === 'open') {
      const timeSinceLastFailure = Date.now() - circuit.lastFailure;
      if (timeSinceLastFailure < 60000) { // 1 minute timeout
        throw new Error('Circuit breaker is open');
      }
      circuit.state = 'half-open';
    }

    try {
      const result = await operation();
      circuit.failures = 0;
      circuit.state = 'closed';
      this.circuitBreaker.set(circuitKey, circuit);
      return result;

    } catch (error) {
      circuit.failures++;
      circuit.lastFailure = Date.now();

      if (circuit.failures >= circuitBreakerThreshold) {
        circuit.state = 'open';
        console.warn(`🔌 Circuit breaker opened for ${serviceUrl}`);
      }

      this.circuitBreaker.set(circuitKey, circuit);
      throw error;
    }
  }

  // API rate limiting statistics
  getRateLimitStats() {
    // This would integrate with Redis or in-memory store
    // for tracking rate limits across the gateway
    return {
      totalRequests: 0,
      blockedRequests: 0,
      activeLimits: {}
    };
  }

  // Clean up resources
  async shutdown() {
    console.log('🛑 Gateway service shutting down...');

    // Clear caches
    this.healthCache.clear();
    this.services.clear();

    // Close any connections if needed
    if (this.circuitBreaker) {
      this.circuitBreaker.clear();
    }
  }

  // Get gateway statistics
  getStats() {
    const totalServices = this.services.size;
    const healthyServices = Array.from(this.services.values()).filter(s => s.healthy).length;

    return {
      totalServices,
      healthyServices,
      unhealthyServices: totalServices - healthyServices,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      rateLimitStats: this.getRateLimitStats()
    };
  }

  // Reload service configuration
  async reloadConfiguration() {
    console.log('🔄 Reloading gateway configuration...');

    // Clear existing services
    this.services.clear();

    // Reinitialize with new configuration
    await this.initialize();

    console.log('✅ Gateway configuration reloaded');
  }
}

export default GatewayService;