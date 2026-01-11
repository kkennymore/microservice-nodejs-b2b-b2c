import axios from 'axios';
import { SystemAlertModel, PerformanceMetricsModel } from '@/models/index.js';

export class SystemMonitorService {
  constructor() {
    this.alertModel = new SystemAlertModel();
    this.metricsModel = new PerformanceMetricsModel();
    this.services = [
      { name: 'api-gateway', url: 'http://localhost:4000/health', port: 4000 },
      { name: 'auth-service', url: 'http://localhost:3001/health', port: 3001 },
      { name: 'products-service', url: 'http://localhost:3002/health', port: 3002 },
      { name: 'transactions-service', url: 'http://localhost:3003/health', port: 3003 },
      { name: 'messaging-service', url: 'http://localhost:3004/health', port: 3004 },
      { name: 'notifications-service', url: 'http://localhost:3005/health', port: 3005 },
      { name: 'analytics-service', url: 'http://localhost:3009/health', port: 3009 },
      { name: 'shipping-service', url: 'http://localhost:3010/health', port: 3010 }
    ];
  }

  async checkAllServices() {
    const results = {
      timestamp: new Date().toISOString(),
      overall_status: 'healthy',
      services: []
    };

    for (const service of this.services) {
      try {
        const startTime = Date.now();
        const response = await axios.get(service.url, {
          timeout: 5000,
          headers: { 'User-Agent': 'System-Monitor' }
        });

        const responseTime = Date.now() - startTime;
        const status = response.data.status === 'healthy' ? 'healthy' : 'degraded';

        results.services.push({
          name: service.name,
          status,
          response_time: responseTime,
          port: service.port,
          uptime: response.data.uptime || 0,
          version: response.data.version || 'unknown'
        });

        // Record performance metric
        await this.metricsModel.recordMetric(
          service.name,
          'response_time',
          responseTime,
          'ms',
          { endpoint: '/health' }
        );

        // Create alert if service is unhealthy
        if (status !== 'healthy') {
          await this.alertModel.createAlert({
            alert_type: 'warning',
            alert_title: `${service.name} Service Degradation`,
            alert_message: `${service.name} is reporting ${status} status`,
            source_service: 'system-monitor',
            source_component: 'health-check',
            severity_level: status === 'unhealthy' ? 3 : 2,
            alert_data: {
              service: service.name,
              status,
              response_time: responseTime,
              port: service.port
            }
          });
        }

      } catch (error) {
        results.services.push({
          name: service.name,
          status: 'unhealthy',
          error: error.code || error.message,
          port: service.port
        });

        results.overall_status = 'degraded';

        // Create critical alert for unhealthy services
        await this.alertModel.createAlert({
          alert_type: 'critical',
          alert_title: `${service.name} Service Down`,
          alert_message: `${service.name} is not responding: ${error.message}`,
          source_service: 'system-monitor',
          source_component: 'health-check',
          severity_level: 4,
          alert_data: {
            service: service.name,
            error: error.message,
            port: service.port
          }
        });
      }
    }

    // Determine overall status
    const unhealthyCount = results.services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = results.services.filter(s => s.status === 'degraded').length;

    if (unhealthyCount > 0) {
      results.overall_status = 'critical';
    } else if (degradedCount > 0) {
      results.overall_status = 'degraded';
    }

    return results;
  }

  async getServiceMetrics(serviceName = null, hours = 24) {
    try {
      const metrics = await this.metricsModel.getMetrics(serviceName, null, hours);
      const summary = await this.metricsModel.getMetricsSummary(hours);

      return {
        success: true,
        data: {
          detailed: metrics,
          summary,
          time_range: `${hours} hours`
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async recordSystemMetric(metricType, value, metadata = {}) {
    try {
      await this.metricsModel.recordMetric('system', metricType, value, null, metadata);
      return { success: true };
    } catch (error) {
      console.error('Failed to record system metric:', error);
      return { success: false, message: error.message };
    }
  }

  async checkDatabaseHealth() {
    // This would be implemented to check database connectivity
    // For now, return a placeholder
    return {
      status: 'healthy',
      response_time: 5,
      connections: 10
    };
  }

  async checkExternalServices() {
    const externalServices = [
      { name: 'redis', check: () => this.checkRedisHealth() },
      { name: 'rabbitmq', check: () => this.checkRabbitMQHealth() },
      { name: 'email', check: () => this.checkEmailHealth() }
    ];

    const results = [];

    for (const service of externalServices) {
      try {
        const result = await service.check();
        results.push({
          name: service.name,
          ...result
        });
      } catch (error) {
        results.push({
          name: service.name,
          status: 'unhealthy',
          error: error.message
        });
      }
    }

    return results;
  }

  async checkRedisHealth() {
    // Placeholder for Redis health check
    return { status: 'healthy', response_time: 2 };
  }

  async checkRabbitMQHealth() {
    // Placeholder for RabbitMQ health check
    return { status: 'healthy', response_time: 3 };
  }

  async checkEmailHealth() {
    // Placeholder for email service health check
    return { status: 'healthy', response_time: 10 };
  }

  async getSystemOverview() {
    try {
      const [serviceHealth, alerts, metrics] = await Promise.all([
        this.checkAllServices(),
        this.alertModel.getActiveAlerts(),
        this.getServiceMetrics(null, 1) // Last hour
      ]);

      return {
        success: true,
        data: {
          service_health: serviceHealth,
          active_alerts: alerts,
          recent_metrics: metrics.data,
          system_load: process.cpuUsage(),
          memory_usage: process.memoryUsage(),
          uptime: process.uptime()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}