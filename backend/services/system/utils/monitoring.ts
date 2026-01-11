// Production-ready monitoring utilities for enterprise services

export class ServiceMonitor {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.activeConnections = 0;
    this.adminActions = {
      user_management: 0,
      system_settings: 0,
      alerts: 0,
      maintenance: 0
    };
  }

  // Record incoming request
  recordRequest(type = 'general') {
    this.requestCount++;
    this.activeConnections++;
  }

  // Record admin action
  recordAdminAction(category) {
    if (this.adminActions[category]) {
      this.adminActions[category]++;
    }
  }

  // Record completed request with response time
  recordResponse(responseTime) {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    this.responseTimes.push(responseTime);

    // Keep only last 1000 response times for memory efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  // Record error
  recordError() {
    this.errorCount++;
  }

  // Get health status
  getHealthStatus() {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      service: this.serviceName,
      status: 'healthy',
      uptime: Math.floor(uptime / 1000), // seconds
      timestamp: new Date().toISOString(),
      metrics: {
        totalRequests: this.requestCount,
        activeConnections: this.activeConnections,
        errorCount: this.errorCount,
        adminActions: this.adminActions,
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount * 100).toFixed(2) : 0
      },
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  // Get detailed metrics
  getDetailedMetrics() {
    const health = this.getHealthStatus();

    return {
      ...health,
      detailed: {
        responseTimePercentiles: this.calculatePercentiles(this.responseTimes),
        requestsPerMinute: this.calculateRequestsPerMinute(),
        adminActivity: this.adminActions,
        memoryUsageMB: {
          rss: Math.round(health.memory.rss / 1024 / 1024),
          heapUsed: Math.round(health.memory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(health.memory.heapTotal / 1024 / 1024),
          external: Math.round(health.memory.external / 1024 / 1024)
        },
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
      }
    };
  }

  calculatePercentiles(times) {
    if (times.length === 0) return { p50: 0, p95: 0, p99: 0 };

    const sorted = [...times].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  calculateRequestsPerMinute() {
    const uptimeMinutes = (Date.now() - this.startTime) / (1000 * 60);
    return uptimeMinutes > 0 ? Math.round(this.requestCount / uptimeMinutes) : 0;
  }
}

// Request timing middleware
export const requestTimer = (monitor) => (req, res, next) => {
  const startTime = Date.now();
  monitor.recordRequest();

  // Track admin actions
  if (req.user && req.user.role === 'admin') {
    if (req.path.includes('/users')) monitor.recordAdminAction('user_management');
    else if (req.path.includes('/settings')) monitor.recordAdminAction('system_settings');
    else if (req.path.includes('/alerts')) monitor.recordAdminAction('alerts');
    else if (req.path.includes('/maintenance')) monitor.recordAdminAction('maintenance');
  }

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    monitor.recordResponse(responseTime);
    originalEnd.apply(this, args);
  };

  next();
};

// Error tracking middleware
export const errorTracker = (monitor) => (error, req, res, next) => {
  monitor.recordError();
  next(error);
};

// Database connection health check
export const checkDatabaseHealth = async (connectionFunction) => {
  try {
    const connection = await connectionFunction();
    if (connection) {
      await connection.ping ? connection.ping() : Promise.resolve();
      connection.release ? connection.release() : null;
      return { status: 'healthy', responseTime: 0 };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: -1
    };
  }
};

// System resource check
export const checkSystemResources = () => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000), // milliseconds
      system: Math.round(cpuUsage.system / 1000), // milliseconds
    },
    uptime: process.uptime(),
    platform: process.platform,
    nodeVersion: process.version,
    pid: process.pid
  };
};