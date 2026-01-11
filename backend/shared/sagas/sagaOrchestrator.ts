// Saga Pattern Implementation for Distributed Transactions
// Ensures data consistency across multiple services

export const SAGA_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  COMPENSATING: 'compensating',
  COMPENSATED: 'compensated'
}

export const STEP_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  COMPENSATING: 'compensating',
  COMPENSATED: 'compensated'
}

// Saga Step Definition
class SagaStep {
  constructor(action, compensation, options = {}) {
    this.action = action
    this.compensation = compensation
    this.options = {
      retry: options.retry || 3,
      timeout: options.timeout || 30000,
      ...options
    }
  }

  // Execute the action
  async execute(context, stepData) {
    return await this.action(context, stepData)
  }

  // Execute compensation
  async compensate(context, stepData) {
    if (this.compensation) {
      return await this.compensation(context, stepData)
    }
  }
}

// Saga Orchestrator
export class SagaOrchestrator {
  constructor(serviceCommunicator) {
    this.serviceCommunicator = serviceCommunicator
    this.activeSagas = new Map()
    this.completedSagas = new Map()
  }

  // Define a new saga
  define(name, steps) {
    const saga = {
      name,
      steps: steps.map(step => new SagaStep(step.action, step.compensation, step.options)),
      state: SAGA_STATES.PENDING,
      context: {},
      currentStep: -1,
      executedSteps: [],
      failedStep: null,
      startedAt: null,
      completedAt: null
    }

    console.log(`📋 Defined saga: ${name} with ${steps.length} steps`)
    return saga
  }

  // Execute a saga
  async execute(saga, initialContext = {}) {
    const sagaId = this.generateSagaId()
    const sagaInstance = {
      ...saga,
      id: sagaId,
      context: { ...initialContext },
      state: SAGA_STATES.RUNNING,
      startedAt: new Date(),
      executedSteps: []
    }

    this.activeSagas.set(sagaId, sagaInstance)

    try {
      console.log(`🚀 Starting saga: ${saga.name} (${sagaId})`)

      // Execute all steps
      for (let i = 0; i < saga.steps.length; i++) {
        const step = saga.steps[i]
        sagaInstance.currentStep = i

        try {
          console.log(`⚙️ Executing step ${i + 1}/${saga.steps.length}: ${saga.name}`)

          const stepResult = await this.executeStep(step, sagaInstance.context)
          sagaInstance.executedSteps.push({
            step: i,
            result: stepResult,
            executedAt: new Date()
          })

          // Update context with step result
          sagaInstance.context = { ...sagaInstance.context, ...stepResult }

        } catch (error) {
          console.error(`❌ Step ${i + 1} failed in saga ${saga.name}:`, error)
          sagaInstance.state = SAGA_STATES.FAILED
          sagaInstance.failedStep = i
          sagaInstance.error = error

          // Start compensation
          await this.compensateSaga(sagaInstance)
          return sagaInstance
        }
      }

      // All steps completed successfully
      sagaInstance.state = SAGA_STATES.COMPLETED
      sagaInstance.completedAt = new Date()

      console.log(`✅ Saga completed: ${saga.name} (${sagaId})`)
      this.moveToCompleted(sagaId, sagaInstance)

      return sagaInstance

    } catch (error) {
      console.error(`💥 Saga execution failed: ${saga.name} (${sagaId})`, error)
      sagaInstance.state = SAGA_STATES.FAILED
      sagaInstance.error = error

      await this.compensateSaga(sagaInstance)
      return sagaInstance
    }
  }

  // Execute a single step with retry logic
  async executeStep(step, context) {
    let lastError = null

    for (let attempt = 0; attempt <= step.options.retry; attempt++) {
      try {
        const result = await this.withTimeout(
          step.execute(context, context),
          step.options.timeout
        )
        return result
      } catch (error) {
        lastError = error
        console.warn(`⚠️ Step retry ${attempt + 1}/${step.options.retry + 1}:`, error.message)

        if (attempt < step.options.retry) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000)
        }
      }
    }

    throw lastError
  }

  // Compensate failed saga
  async compensateSaga(sagaInstance) {
    if (sagaInstance.executedSteps.length === 0) {
      console.log(`ℹ️ No steps to compensate for saga: ${sagaInstance.name}`)
      return
    }

    sagaInstance.state = SAGA_STATES.COMPENSATING
    console.log(`🔄 Starting compensation for saga: ${sagaInstance.name}`)

    // Compensate in reverse order
    const reversedSteps = sagaInstance.executedSteps.slice().reverse()

    for (const executedStep of reversedSteps) {
      try {
        const step = sagaInstance.steps[executedStep.step]
        console.log(`↶ Compensating step ${executedStep.step + 1}: ${sagaInstance.name}`)

        await step.compensate(sagaInstance.context, executedStep.result)

        executedStep.compensatedAt = new Date()
        executedStep.compensationStatus = 'success'

      } catch (error) {
        console.error(`❌ Compensation failed for step ${executedStep.step + 1}:`, error)
        executedStep.compensatedAt = new Date()
        executedStep.compensationStatus = 'failed'
        executedStep.compensationError = error
      }
    }

    sagaInstance.state = SAGA_STATES.COMPENSATED
    sagaInstance.compensatedAt = new Date()
    console.log(`✅ Compensation completed for saga: ${sagaInstance.name}`)
  }

  // Utility functions
  generateSagaId() {
    return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ])
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Get saga status
  getSagaStatus(sagaId) {
    const active = this.activeSagas.get(sagaId)
    if (active) return active

    const completed = this.completedSagas.get(sagaId)
    if (completed) return completed

    return null
  }

  // Get all active sagas
  getActiveSagas() {
    return Array.from(this.activeSagas.values())
  }

  // Get completed sagas
  getCompletedSagas(limit = 100) {
    return Array.from(this.completedSagas.values())
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit)
  }

  // Move completed saga to history
  moveToCompleted(sagaId, sagaInstance) {
    this.activeSagas.delete(sagaId)

    // Keep only recent completed sagas (last 1000)
    if (this.completedSagas.size >= 1000) {
      const oldestKey = this.completedSagas.keys().next().value
      this.completedSagas.delete(oldestKey)
    }

    this.completedSagas.set(sagaId, sagaInstance)
  }

  // Force cleanup old sagas
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - maxAge

    for (const [id, saga] of this.completedSagas) {
      if (saga.completedAt < cutoff) {
        this.completedSagas.delete(id)
      }
    }

    console.log(`🧹 Cleaned up old sagas, ${this.completedSagas.size} remaining`)
  }
}

// Predefined Saga Templates

// Order Processing Saga
export const createOrderProcessingSaga = () => ({
  name: 'order_processing',
  steps: [
    {
      action: async (context) => {
        // 1. Validate order
        const validation = await this.serviceCommunicator.post('products', '/validate-order', context.order)
        if (!validation.valid) {
          throw new Error('Order validation failed')
        }
        return { validation }
      },
      compensation: async (context) => {
        // No compensation needed for validation
      }
    },
    {
      action: async (context) => {
        // 2. Reserve inventory
        const reservation = await this.serviceCommunicator.post('products', '/reserve-inventory', {
          items: context.order.items
        })
        return { reservation }
      },
      compensation: async (context) => {
        // Release reserved inventory
        await this.serviceCommunicator.post('products', '/release-inventory', {
          reservationId: context.reservation.id
        })
      }
    },
    {
      action: async (context) => {
        // 3. Process payment
        const payment = await this.serviceCommunicator.post('transactions', '/process-payment', {
          orderId: context.order.id,
          amount: context.order.total,
          paymentMethod: context.paymentMethod
        })
        return { payment }
      },
      compensation: async (context) => {
        // Refund payment
        await this.serviceCommunicator.post('transactions', '/refund-payment', {
          paymentId: context.payment.id
        })
      }
    },
    {
      action: async (context) => {
        // 4. Create shipment
        const shipment = await this.serviceCommunicator.post('shipping', '/shipments', {
          orderId: context.order.id,
          items: context.order.items,
          shippingAddress: context.shippingAddress
        })
        return { shipment }
      },
      compensation: async (context) => {
        // Cancel shipment
        await this.serviceCommunicator.delete('shipping', `/shipments/${context.shipment.id}`)
      }
    },
    {
      action: async (context) => {
        // 5. Send confirmation notifications
        await this.serviceCommunicator.post('notifications', '/send-order-confirmation', {
          orderId: context.order.id,
          customerEmail: context.customerEmail
        })
        return { notificationSent: true }
      },
      compensation: async (context) => {
        // No compensation needed for notifications
      }
    }
  ]
})

// User Registration Saga
export const createUserRegistrationSaga = () => ({
  name: 'user_registration',
  steps: [
    {
      action: async (context) => {
        // 1. Create user account
        const user = await this.serviceCommunicator.post('auth', '/users', context.userData)
        return { user }
      },
      compensation: async (context) => {
        // Delete user account
        await this.serviceCommunicator.delete('auth', `/users/${context.user.id}`)
      }
    },
    {
      action: async (context) => {
        // 2. Send verification email
        await this.serviceCommunicator.post('notifications', '/send-verification', {
          userId: context.user.id,
          email: context.user.email
        })
        return { verificationSent: true }
      },
      compensation: async (context) => {
        // No compensation needed
      }
    },
    {
      action: async (context) => {
        // 3. Create user profile
        const profile = await this.serviceCommunicator.post('auth', '/profiles', {
          userId: context.user.id,
          profileData: context.profileData
        })
        return { profile }
      },
      compensation: async (context) => {
        // Delete user profile
        await this.serviceCommunicator.delete('auth', `/profiles/${context.profile.id}`)
      }
    }
  ]
})

// Export singleton instance
export const sagaOrchestrator = (serviceCommunicator) => new SagaOrchestrator(serviceCommunicator)