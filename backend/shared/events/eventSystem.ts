// Event Definitions and Handlers for Inter-Service Communication

// Event Types
export const EVENT_TYPES = {
  // User Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',

  // Product Events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_VIEWED: 'product.viewed',
  PRODUCT_PURCHASED: 'product.purchased',
  PRODUCT_RESTOCKED: 'product.restocked',

  // Order/Transaction Events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',
  PAYMENT_PROCESSED: 'payment.processed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Shipping Events
  SHIPMENT_CREATED: 'shipment.created',
  SHIPMENT_UPDATED: 'shipment.updated',
  SHIPMENT_DELIVERED: 'shipment.delivered',
  SHIPMENT_FAILED: 'shipment.failed',
  TRACKING_UPDATED: 'tracking.updated',

  // Notification Events
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  EMAIL_BOUNCED: 'email.bounced',

  // System Events
  SYSTEM_ALERT: 'system.alert',
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_BACKUP: 'system.backup',

  // Analytics Events
  ANALYTICS_EVENT: 'analytics.event',
  PERFORMANCE_METRIC: 'performance.metric'
}

// Event Handlers Registry
class EventHandlers {
  constructor() {
    this.handlers = new Map()
  }

  // Register event handler
  register(eventType, handler, options = {}) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }

    this.handlers.get(eventType).push({
      handler,
      options: {
        priority: options.priority || 0,
        async: options.async !== false,
        retry: options.retry || 0,
        ...options
      }
    })

    // Sort by priority (higher priority first)
    this.handlers.get(eventType).sort((a, b) => b.options.priority - a.options.priority)

    console.log(`📝 Registered handler for event: ${eventType}`)
  }

  // Get handlers for event type
  getHandlers(eventType) {
    return this.handlers.get(eventType) || []
  }

  // Remove handler
  unregister(eventType, handler) {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      const index = handlers.findIndex(h => h.handler === handler)
      if (index > -1) {
        handlers.splice(index, 1)
        console.log(`🗑️ Unregistered handler for event: ${eventType}`)
      }
    }
  }

  // Clear all handlers
  clear() {
    this.handlers.clear()
    console.log('🧹 Cleared all event handlers')
  }
}

// Export singleton instance
export const eventHandlers = new EventHandlers()

// Event Processor
export class EventProcessor {
  constructor(serviceCommunicator) {
    this.serviceCommunicator = serviceCommunicator
    this.processingQueue = []
    this.isProcessing = false
  }

  // Process incoming event
  async processEvent(event) {
    try {
      console.log(`⚙️ Processing event: ${event.type} (${event.id})`)

      const handlers = eventHandlers.getHandlers(event.type)

      if (handlers.length === 0) {
        console.log(`⚠️ No handlers registered for event: ${event.type}`)
        return
      }

      // Process handlers
      for (const { handler, options } of handlers) {
        try {
          if (options.async) {
            // Process asynchronously
            setImmediate(async () => {
              await this.executeHandler(handler, event, options)
            })
          } else {
            // Process synchronously
            await this.executeHandler(handler, event, options)
          }
        } catch (error) {
          console.error(`❌ Handler error for ${event.type}:`, error)

          if (options.retry > 0) {
            // Add to retry queue
            this.addToRetryQueue(handler, event, options, error)
          }
        }
      }

    } catch (error) {
      console.error(`❌ Event processing error for ${event.type}:`, error)
      throw error
    }
  }

  // Execute handler with retry logic
  async executeHandler(handler, event, options) {
    let lastError = null

    for (let attempt = 0; attempt <= options.retry; attempt++) {
      try {
        await handler(event, { serviceCommunicator: this.serviceCommunicator })
        return // Success
      } catch (error) {
        lastError = error
        console.warn(`⚠️ Handler retry ${attempt + 1}/${options.retry + 1} for ${event.type}:`, error.message)

        if (attempt < options.retry) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000)
        }
      }
    }

    throw lastError
  }

  // Add failed handler to retry queue
  addToRetryQueue(handler, event, options, error) {
    const retryItem = {
      handler,
      event,
      options,
      error,
      retryCount: 0,
      nextRetry: Date.now() + 5000 // 5 seconds
    }

    this.processingQueue.push(retryItem)
    this.processRetryQueue()
  }

  // Process retry queue
  async processRetryQueue() {
    if (this.isProcessing) return

    this.isProcessing = true

    while (this.processingQueue.length > 0) {
      const item = this.processingQueue[0]

      if (Date.now() < item.nextRetry) {
        // Not ready for retry yet
        break
      }

      try {
        await this.executeHandler(item.handler, item.event, item.options)
        this.processingQueue.shift() // Remove from queue
        console.log(`✅ Retry successful for ${item.event.type}`)
      } catch (error) {
        item.retryCount++
        item.error = error

        if (item.retryCount >= item.options.retry) {
          // Max retries reached
          console.error(`🚨 Max retries reached for ${item.event.type}:`, error)
          this.processingQueue.shift() // Remove from queue
        } else {
          // Schedule next retry
          item.nextRetry = Date.now() + Math.pow(2, item.retryCount) * 1000
          console.warn(`⏰ Scheduled retry ${item.retryCount + 1} for ${item.event.type}`)
        }
      }
    }

    this.isProcessing = false
  }

  // Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Event Publisher Helper
export class EventPublisher {
  constructor(serviceCommunicator) {
    this.serviceCommunicator = serviceCommunicator
  }

  // Publish user events
  async publishUserEvent(eventType, userData, metadata = {}) {
    await this.serviceCommunicator.publishEvent(eventType, userData, {
      source: 'user-service',
      metadata: {
        userId: userData.id,
        ...metadata
      }
    })
  }

  // Publish product events
  async publishProductEvent(eventType, productData, metadata = {}) {
    await this.serviceCommunicator.publishEvent(eventType, productData, {
      source: 'products-service',
      metadata: {
        productId: productData.id,
        ...metadata
      }
    })
  }

  // Publish order events
  async publishOrderEvent(eventType, orderData, metadata = {}) {
    await this.serviceCommunicator.publishEvent(eventType, orderData, {
      source: 'transactions-service',
      metadata: {
        orderId: orderData.id,
        ...metadata
      }
    })
  }

  // Publish shipping events
  async publishShippingEvent(eventType, shipmentData, metadata = {}) {
    await this.serviceCommunicator.publishEvent(eventType, shipmentData, {
      source: 'shipping-service',
      metadata: {
        shipmentId: shipmentData.id,
        ...metadata
      }
    })
  }

  // Publish system events
  async publishSystemEvent(eventType, systemData, metadata = {}) {
    await this.serviceCommunicator.publishEvent(eventType, systemData, {
      source: 'system-service',
      metadata
    })
  }
}

// Create instances
export const eventProcessor = new EventProcessor()
export const eventPublisher = (serviceCommunicator) => new EventPublisher(serviceCommunicator)