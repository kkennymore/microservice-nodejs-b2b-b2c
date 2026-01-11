// Data Consistency Manager for Eventual Consistency Patterns

import serviceCommunicator from './communication/serviceCommunicator.js'
import { eventPublisher } from './events/eventSystem.js'

export class DataConsistencyManager {
  constructor() {
    this.consistencyRules = new Map()
    this.pendingOperations = new Map()
    this.retryQueue = []
    this.isProcessingRetries = false
  }

  // Initialize consistency manager
  async initialize() {
    console.log('🔄 Initializing data consistency manager')

    // Setup default consistency rules
    this.setupDefaultConsistencyRules()

    // Start retry processor
    this.startRetryProcessor()
  }

  // Setup default consistency rules
  setupDefaultConsistencyRules() {
    // User data consistency
    this.addConsistencyRule('user_profile_sync', {
      triggerEvents: ['user.updated', 'user.profile.updated'],
      dependentServices: ['auth', 'products', 'transactions'],
      consistencyCheck: this.checkUserDataConsistency.bind(this),
      repairAction: this.repairUserDataConsistency.bind(this),
      timeout: 300000 // 5 minutes
    })

    // Product inventory consistency
    this.addConsistencyRule('product_inventory_sync', {
      triggerEvents: ['product.inventory_updated', 'order.created'],
      dependentServices: ['products', 'transactions'],
      consistencyCheck: this.checkInventoryConsistency.bind(this),
      repairAction: this.repairInventoryConsistency.bind(this),
      timeout: 600000 // 10 minutes
    })

    // Order status consistency
    this.addConsistencyRule('order_status_sync', {
      triggerEvents: ['order.created', 'payment.processed', 'shipment.created'],
      dependentServices: ['transactions', 'shipping', 'notifications'],
      consistencyCheck: this.checkOrderStatusConsistency.bind(this),
      repairAction: this.repairOrderStatusConsistency.bind(this),
      timeout: 900000 // 15 minutes
    })

    console.log(`📋 Set up ${this.consistencyRules.size} consistency rules`)
  }

  // Add a consistency rule
  addConsistencyRule(name, rule) {
    this.consistencyRules.set(name, {
      name,
      ...rule,
      activeChecks: new Map()
    })

    // Subscribe to trigger events
    serviceCommunicator.subscribeToEvents(rule.triggerEvents, (event) => {
      this.handleConsistencyTrigger(name, event)
    })

    console.log(`📝 Added consistency rule: ${name}`)
  }

  // Handle consistency trigger event
  async handleConsistencyTrigger(ruleName, event) {
    const rule = this.consistencyRules.get(ruleName)
    if (!rule) return

    try {
      console.log(`🔍 Checking consistency for ${ruleName} triggered by ${event.type}`)

      // Check if consistency check is already running
      const checkKey = `${ruleName}_${event.data.id || event.id}`
      if (rule.activeChecks.has(checkKey)) {
        console.log(`⏳ Consistency check already running for ${checkKey}`)
        return
      }

      // Start consistency check
      rule.activeChecks.set(checkKey, {
        startedAt: Date.now(),
        event,
        status: 'running'
      })

      const isConsistent = await rule.consistencyCheck(event.data)

      if (!isConsistent) {
        console.warn(`⚠️ Inconsistency detected for ${ruleName}, starting repair`)

        // Add to pending operations for tracking
        this.pendingOperations.set(checkKey, {
          rule: ruleName,
          event,
          startedAt: Date.now(),
          status: 'repairing'
        })

        // Perform repair action
        await rule.repairAction(event.data)

        // Mark as repaired
        this.pendingOperations.get(checkKey).status = 'repaired'
        this.pendingOperations.get(checkKey).repairedAt = Date.now()

        console.log(`✅ Consistency repaired for ${ruleName}`)
      } else {
        console.log(`✅ Consistency maintained for ${ruleName}`)
      }

      // Clean up
      rule.activeChecks.delete(checkKey)

    } catch (error) {
      console.error(`❌ Consistency check failed for ${ruleName}:`, error)

      // Add to retry queue
      this.addToRetryQueue(ruleName, event, error)

      // Clean up active check
      rule.activeChecks.delete(`${ruleName}_${event.data.id || event.id}`)
    }
  }

  // Consistency check implementations
  async checkUserDataConsistency(userData) {
    try {
      // Check if user data is consistent across services
      const [authUser, productsPrefs, transactionsWallet] = await Promise.allSettled([
        serviceCommunicator.get('auth', `/users/${userData.id}`),
        serviceCommunicator.get('products', `/users/${userData.id}/preferences`),
        serviceCommunicator.get('transactions', `/wallets/${userData.id}/balance`)
      ])

      // Basic consistency checks
      const authExists = authUser.status === 'fulfilled' && authUser.value.data
      const productsExists = productsPrefs.status === 'fulfilled'
      const transactionsExists = transactionsWallet.status === 'fulfilled'

      return authExists && productsExists && transactionsExists
    } catch (error) {
      console.error('Error checking user data consistency:', error)
      return false
    }
  }

  async checkInventoryConsistency(orderData) {
    try {
      // Check if inventory levels are consistent after order
      const inventoryChecks = await Promise.allSettled(
        orderData.items.map(item =>
          serviceCommunicator.get('products', `/products/${item.productId}/inventory`)
        )
      )

      // All inventory checks should succeed
      return inventoryChecks.every(check => check.status === 'fulfilled')
    } catch (error) {
      console.error('Error checking inventory consistency:', error)
      return false
    }
  }

  async checkOrderStatusConsistency(orderData) {
    try {
      // Check if order status is consistent across services
      const [transactionStatus, shippingStatus] = await Promise.allSettled([
        serviceCommunicator.get('transactions', `/orders/${orderData.id}/status`),
        serviceCommunicator.get('shipping', `/orders/${orderData.id}/shipping-status`)
      ])

      const transactionOk = transactionStatus.status === 'fulfilled'
      const shippingOk = shippingStatus.status === 'fulfilled'

      return transactionOk && shippingOk
    } catch (error) {
      console.error('Error checking order status consistency:', error)
      return false
    }
  }

  // Repair action implementations
  async repairUserDataConsistency(userData) {
    try {
      // Sync user data across services
      const authUser = await serviceCommunicator.get('auth', `/users/${userData.id}`)

      if (authUser.data) {
        // Sync to products service
        await serviceCommunicator.post('products', `/users/${userData.id}/sync`, authUser.data)

        // Sync to transactions service
        await serviceCommunicator.post('transactions', `/users/${userData.id}/sync`, authUser.data)
      }

      console.log(`🔄 Repaired user data consistency for user ${userData.id}`)
    } catch (error) {
      console.error('Error repairing user data consistency:', error)
      throw error
    }
  }

  async repairInventoryConsistency(orderData) {
    try {
      // Resync inventory levels
      await serviceCommunicator.post('products', '/inventory/sync', {
        orderId: orderData.id,
        items: orderData.items
      })

      console.log(`🔄 Repaired inventory consistency for order ${orderData.id}`)
    } catch (error) {
      console.error('Error repairing inventory consistency:', error)
      throw error
    }
  }

  async repairOrderStatusConsistency(orderData) {
    try {
      // Sync order status across services
      const transactionOrder = await serviceCommunicator.get('transactions', `/orders/${orderData.id}`)

      if (transactionOrder.data) {
        // Sync to shipping service
        await serviceCommunicator.post('shipping', `/orders/${orderData.id}/sync-status`, transactionOrder.data)

        // Sync to notifications service
        await serviceCommunicator.post('notifications', `/orders/${orderData.id}/sync-status`, transactionOrder.data)
      }

      console.log(`🔄 Repaired order status consistency for order ${orderData.id}`)
    } catch (error) {
      console.error('Error repairing order status consistency:', error)
      throw error
    }
  }

  // Retry queue management
  addToRetryQueue(ruleName, event, error) {
    this.retryQueue.push({
      ruleName,
      event,
      error,
      retryCount: 0,
      nextRetry: Date.now() + 30000 // 30 seconds
    })
  }

  async startRetryProcessor() {
    setInterval(async () => {
      if (this.isProcessingRetries || this.retryQueue.length === 0) return

      this.isProcessingRetries = true

      const now = Date.now()
      const readyRetries = this.retryQueue.filter(item => item.nextRetry <= now)

      for (const retryItem of readyRetries) {
        try {
          await this.handleConsistencyTrigger(retryItem.ruleName, retryItem.event)

          // Remove from queue on success
          const index = this.retryQueue.indexOf(retryItem)
          if (index > -1) {
            this.retryQueue.splice(index, 1)
          }

          console.log(`✅ Retry successful for ${retryItem.ruleName}`)
        } catch (error) {
          retryItem.retryCount++
          retryItem.error = error

          if (retryItem.retryCount >= 5) {
            // Max retries reached
            console.error(`🚨 Max retries reached for ${retryItem.ruleName}:`, error)

            // Remove from queue and alert
            const index = this.retryQueue.indexOf(retryItem)
            if (index > -1) {
              this.retryQueue.splice(index, 1)
            }

            await this.alertConsistencyFailure(retryItem)
          } else {
            // Schedule next retry with exponential backoff
            retryItem.nextRetry = Date.now() + Math.pow(2, retryItem.retryCount) * 60000 // minutes
            console.warn(`⏰ Scheduled retry ${retryItem.retryCount + 1} for ${retryItem.ruleName}`)
          }
        }
      }

      this.isProcessingRetries = false
    }, 30000) // Check every 30 seconds

    console.log('🔄 Consistency retry processor started')
  }

  async alertConsistencyFailure(retryItem) {
    try {
      await serviceCommunicator.post('system', '/alerts', {
        alert_type: 'critical',
        alert_title: 'Data Consistency Failure',
        alert_message: `Failed to maintain data consistency for ${retryItem.ruleName} after maximum retries`,
        source_service: 'consistency-manager',
        severity_level: 4,
        alert_data: {
          rule: retryItem.ruleName,
          event: retryItem.event,
          error: retryItem.error.message,
          retryCount: retryItem.retryCount
        }
      })
    } catch (error) {
      console.error('Failed to send consistency failure alert:', error)
    }
  }

  // Monitoring and reporting
  getConsistencyStatus() {
    const rules = {}
    let totalChecks = 0
    let failedChecks = 0

    for (const [ruleName, rule] of this.consistencyRules) {
      const activeChecks = rule.activeChecks.size
      totalChecks += activeChecks

      rules[ruleName] = {
        activeChecks,
        pendingOperations: Array.from(this.pendingOperations.values())
          .filter(op => op.rule === ruleName).length
      }
    }

    failedChecks = this.retryQueue.length

    return {
      rules,
      totalChecks,
      failedChecks,
      retryQueueLength: this.retryQueue.length,
      successRate: totalChecks > 0 ? ((totalChecks - failedChecks) / totalChecks * 100).toFixed(2) : 100
    }
  }

  // Cleanup old operations
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - maxAge

    // Clean up completed operations
    for (const [key, operation] of this.pendingOperations) {
      if (operation.repairedAt && operation.repairedAt < cutoff) {
        this.pendingOperations.delete(key)
      }
    }

    console.log(`🧹 Cleaned up ${this.pendingOperations.size} old consistency operations`)
  }
}

// Export singleton instance
export const dataConsistencyManager = new DataConsistencyManager()
export default dataConsistencyManager