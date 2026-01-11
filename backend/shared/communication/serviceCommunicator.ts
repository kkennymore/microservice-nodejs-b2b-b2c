// Service Communicator Interface and Implementation
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CircuitBreaker, CircuitBreakerOptions } from './circuitBreaker';

export interface ServiceCommunicatorConfig {
  serviceUrl: string;
  timeout: number;
  retries: number;
  circuitBreakerThreshold?: number;
  fallbackUrl?: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface ServiceRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export class ServiceCommunicator {
  private config: ServiceCommunicatorConfig;
  private axios: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private services: Map<string, ServiceCommunicatorConfig> = new Map();

  constructor(config: ServiceCommunicatorConfig, axiosInstance?: AxiosInstance) {
    this.config = config;
    this.axios = axiosInstance || axios.create();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreakerThreshold || 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 10000
    });
  }

  // Register a service endpoint
  registerService(name: string, baseUrl: string, options: Partial<ServiceCommunicatorConfig> = {}): void {
    const serviceConfig: ServiceCommunicatorConfig = {
      serviceUrl: baseUrl,
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      circuitBreakerThreshold: options.circuitBreakerThreshold,
      fallbackUrl: options.fallbackUrl
    };
    
    this.services.set(name, serviceConfig);
    console.log(`📋 Registered service: ${name} -> ${baseUrl}`);
  }

  // HTTP communication with circuit breaker
  async callService(serviceName: string, endpoint: string, options: Record<string, any> = {}): Promise<any> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    const { method, data, headers, timeout } = options;
    const url = `${service.serviceUrl}${endpoint}`;

    return this.circuitBreaker.execute(async () => {
      const config: AxiosRequestConfig = {
        method: method || 'GET',
        url,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: timeout || service.timeout,
        validateStatus: () => true // Don't throw on HTTP errors
      };

      const response = await this.axios.request(config);
      
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data,
        statusCode: response.status,
        error: response.status >= 400 ? response.statusText : undefined
      };
    }, { serviceName, endpoint });
  }

  // RESTful service methods
  async get(serviceName: string, endpoint: string, options: Record<string, any> = {}): Promise<any> {
    return this.callService(serviceName, endpoint, { ...options, method: 'GET' });
  }

  async post(serviceName: string, endpoint: string, data: any, options: Record<string, any> = {}): Promise<any> {
    return this.callService(serviceName, endpoint, { ...options, method: 'POST', data });
  }

  async put(serviceName: string, endpoint: string, data: any, options: Record<string, any> = {}): Promise<any> {
    return this.callService(serviceName, endpoint, { ...options, method: 'PUT', data });
  }

  async delete(serviceName: string, endpoint: string, options: Record<string, any> = {}): Promise<any> {
    return this.callService(serviceName, endpoint, { ...options, method: 'DELETE' });
  }

  async patch(serviceName: string, endpoint: string, data: any, options: Record<string, any> = {}): Promise<any> {
    return this.callService(serviceName, endpoint, { ...options, method: 'PATCH', data });
  }

  // Health check method
  async healthCheck(serviceName: string): Promise<ServiceResponse<{ status: string }>> {
    return this.callService(serviceName, '/health');
  }

  // Method to call another service with fallback
  async callWithFallback<T>(
    serviceName: string,
    request: ServiceRequest,
    fallbackData: T
  ): Promise<ServiceResponse<T>> {
    try {
      const response = await this.callService(serviceName, request.endpoint, request);
      
      if (!response.success && this.config.fallbackUrl) {
        // Try fallback service
        const fallbackCommunicator = new ServiceCommunicator({
          ...this.config,
          serviceUrl: this.config.fallbackUrl
        });
        return fallbackCommunicator.callService(serviceName, request.endpoint, request);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        data: fallbackData,
        error: (error as Error).message || 'Service call failed, fallback used'
      };
    }
  }

  // Get service configuration
  getServiceConfig(serviceName: string): ServiceCommunicatorConfig | undefined {
    return this.services.get(serviceName);
  }

  // Remove service registration
  unregisterService(serviceName: string): void {
    this.services.delete(serviceName);
    console.log(`🗑️ Unregistered service: ${serviceName}`);
  }
}