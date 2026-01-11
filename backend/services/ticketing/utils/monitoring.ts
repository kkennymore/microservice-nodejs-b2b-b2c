// Monitoring utilities for Ticketing Service

export class ServiceMonitor {
  constructor(serviceName) {
    this.serviceName = serviceName
    this.startTime = Date.now()
    this.requestCount = 0
    this.errorCount = 0
    this.responseTimes = []
    this.activeConnections = 0
    this.ticketMetrics = {
      created: 0,
      resolved: 0,
      escalated: 0,
      sla_breaches: 0
    }
  }

  recordRequest() {
    this.requestCount++
    this.activeConnections++
  }

  recordResponse(responseTime) {
    this.activeConnections = Math.max(0, this.activeConnections - 1)
    this.responseTimes.push(responseTime)

    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000)
    }
  }

  recordError() {
    this.errorCount++
  }

  recordTicketMetric(metric, count = 1) {
    if (this.ticketMetrics[metric] !== undefined) {
      this.ticketMetrics[metric] += count
    }
  }

  getHealthStatus() {
    const uptime = Date.now() - this.startTime
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0

    return {
      service: this.serviceName,
      status: 'healthy',
      uptime: Math.floor(uptime / 1000),
      timestamp: new Date().toISOString(),
      metrics: {
        totalRequests: this.requestCount,
        activeConnections: this.activeConnections,
        errorCount: this.errorCount,
        tickets: this.ticketMetrics,
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount * 100).toFixed(2) : 0
      },
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    }
  }

  getDetailedMetrics() {
    const health = this.getHealthStatus()

    return {
      ...health,
      detailed: {
        responseTimePercentiles: this.calculatePercentiles(this.responseTimes),
        requestsPerMinute: this.calculateRequestsPerMinute(),
        ticketResolutionRate: this.calculateTicketResolutionRate(),
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
    }
  }

  calculatePercentiles(times) {
    if (times.length === 0) return { p50: 0, p95: 0, p99: 0 }

    const sorted = [...times].sort((a, b) => a - b)
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  calculateRequestsPerMinute() {
    const uptimeMinutes = (Date.now() - this.startTime) / (1000 * 60)
    return uptimeMinutes > 0 ? Math.round(this.requestCount / uptimeMinutes) : 0
  }

  calculateTicketResolutionRate() {
    const totalTickets = this.ticketMetrics.created
    const resolvedTickets = this.ticketMetrics.resolved
    return totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(2) : 0
  }
}

export const requestTimer = (monitor) => (req, res, next) => {
  const startTime = Date.now()
  monitor.recordRequest()

  const originalEnd = res.end
  res.end = function(...args) {
    const responseTime = Date.now() - startTime
    monitor.recordResponse(responseTime)
    originalEnd.apply(this, args)
  }

  next()
}

export const errorTracker = (monitor) => (error, req, res, next) => {
  monitor.recordError()
  next(error)
}

export const checkDatabaseHealth = async (connectionFunction) => {
  try {
    const connection = await connectionFunction()
    if (connection) {
      await connection.ping ? connection.ping() : Promise.resolve()
      connection.release ? connection.release() : null
      return { status: 'healthy', responseTime: 0 }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: -1
    }
  }
}