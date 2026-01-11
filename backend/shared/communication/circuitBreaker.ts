// Circuit Breaker Pattern Implementation
// Provides fault tolerance for inter-service communication

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringPeriod?: number;
}

export interface CircuitState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure: number;
}

export class CircuitBreaker {
  private failureThreshold: number;
  private recoveryTimeout: number;
  private monitoringPeriod: number;
  private circuits: Map<string, CircuitState> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds

    this.circuits = new Map();
    this.monitoringIntervals = new Map();
  }

  // Execute operation with circuit breaker protection
  async execute(operation: () => Promise<any>, context: Record<string, any> = {}): Promise<any> {
    const key = this.getCircuitKey(context);
    const circuit = this.getCircuit(key);

    // Check circuit state
    if (circuit.state === 'open') {
      if (Date.now() - circuit.lastFailure < this.recoveryTimeout) {
        throw new Error(`Circuit breaker is OPEN for ${key}`);
      } else {
        // Try half-open state
        circuit.state = 'half-open';
        console.log(`🔄 Circuit breaker HALF-OPEN for ${key}`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(key, circuit);
      return result;
    } catch (error) {
      this.recordFailure(key, circuit);
      throw error;
    }
  }

  private getCircuitKey(context: Record<string, any>): string {
    return JSON.stringify(context);
  }

  private getCircuit(key: string): CircuitState {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        state: 'closed',
        failureCount: 0,
        lastFailure: 0
      });
    }
    return this.circuits.get(key)!;
  }

  private recordSuccess(key: string, circuit: CircuitState): void {
    circuit.state = 'closed';
    circuit.failureCount = 0;
    circuit.lastFailure = 0;
    this.circuits.set(key, circuit);
  }

  private recordFailure(key: string, circuit: CircuitState): void {
    circuit.failureCount++;
    circuit.lastFailure = Date.now();

    if (circuit.failureCount >= this.failureThreshold) {
      circuit.state = 'open';
      console.log(`⚡ Circuit breaker OPEN for ${key}`);
    }

    this.circuits.set(key, circuit);
  }

  // Get circuit state for monitoring
  getState(context: Record<string, any>): CircuitState {
    const key = this.getCircuitKey(context);
    return this.getCircuit(key);
  }

  // Reset all circuits
  resetAll(): void {
    this.circuits.clear();
    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals.clear();
  }
}