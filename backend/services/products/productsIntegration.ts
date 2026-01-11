// Products Service - Inter-Service Communication Integration

import serviceCommunicator from '/app/shared/communication/serviceCommunicator.js'
import { eventPublisher } from '/app/shared/events/eventSystem.js'
import { sagaOrchestrator } from '/app/shared/sagas/sagaOrchestrator.js'

class ProductsServiceIntegration {
  constructor() {
    this.eventPublisher = eventPublisher(serviceCommunicator)
    this.sagaOrchestrator = sagaOrchestrator(serviceCommunicator)
  }

  // Initialize integrations
  async initialize(rabbitmqUrl) {
    try {
      // Initialize service communicator
      await serviceCommunicator.initialize(rabbitmqUrl)

      // Register other services
      serviceCommunicator.registerService('auth', process.env.AUTH_SERVICE_URL || 'http://localhost:3001')
      serviceCommunicator.registerService('transactions', process.env.TRANSACTIONS_SERVICE_URL || 'http://localhost:3003')
      serviceCommunicator.registerService('notifications', process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3005')
      serviceCommunicator.registerService('analytics', process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3009')

      // Subscribe to relevant events
      await this.setupEventSubscriptions()

      console.log('🔗 Products service integrations initialized')
    } catch (error) {
      console.error('❌ Failed to initialize products service integrations:', error)
      throw error
    }
  }

  // Setup event subscriptions
  async setupEventSubscriptions() {
    // Subscribe to user events to update product recommendations
    await serviceCommunicator.subscribeToEvents(['user.created', 'user.updated'], this.handleUserEvent.bind(this))

    // Subscribe to order events to update inventory
    await serviceCommunicator.subscribeToEvents(['order.created', 'order.cancelled'], this.handleOrderEvent.bind(this))

    // Subscribe to payment events for inventory management
    await serviceCommunicator.subscribeToEvents(['payment.processed', 'payment.refunded'], this.handlePaymentEvent.bind(this))
  }

  // Event handlers
  async handleUserEvent(event) {
    try {
      switch (event.type) {
        case 'user.created':
          // Create personalized product recommendations for new user
          await this.createUserRecommendations(event.data.id)
          break

        case 'user.updated':
          // Update user preferences and recommendations
          if (event.data.preferences) {
            await this.updateUserRecommendations(event.data.id, event.data.preferences)
          }
          break
      }
    } catch (error) {
      console.error('Error handling user event:', error)
    }
  }

  async handleOrderEvent(event) {
    try {
      switch (event.type) {
        case 'order.created':
          // Update inventory levels
          await this.updateInventoryFromOrder(event.data)
          break

        case 'order.cancelled':
          // Restore inventory levels
          await this.restoreInventoryFromOrder(event.data)
          break
      }
    } catch (error) {
      console.error('Error handling order event:', error)
    }
  }

  async handlePaymentEvent(event) {
    try {
      switch (event.type) {
        case 'payment.processed':
          // Confirm inventory reduction for successful payments
          await this.confirmInventoryReduction(event.data.orderId)
          break

        case 'payment.refunded':
          // Restore inventory for refunded orders
          await this.restoreInventoryFromRefund(event.data.orderId)
          break
      }
    } catch (error) {
      console.error('Error handling payment event:', error)
    }
  }

  // Business logic methods
  async createUserRecommendations(userId) {
    try {
      // Get popular products for initial recommendations
      const popularProducts = await this.getPopularProducts()

      // Create recommendation record
      await this.saveUserRecommendations(userId, popularProducts)

      console.log(`📊 Created recommendations for user ${userId}`)
    } catch (error) {
      console.error('Error creating user recommendations:', error)
    }
  }

  async updateUserRecommendations(userId, preferences) {
    try {
      // Update recommendations based on user preferences
      const personalizedProducts = await this.getPersonalizedProducts(preferences)

      await this.saveUserRecommendations(userId, personalizedProducts)

      console.log(`📊 Updated recommendations for user ${userId}`)
    } catch (error) {
      console.error('Error updating user recommendations:', error)
    }
  }

  async updateInventoryFromOrder(orderData) {
    try {
      // Reduce inventory for ordered items
      for (const item of orderData.items) {
        await this.reduceProductInventory(item.productId, item.quantity)
      }

      // Publish inventory updated events
      await this.eventPublisher.publishProductEvent('product.inventory_updated', {
        orderId: orderData.id,
        items: orderData.items
      })

      console.log(`📦 Updated inventory for order ${orderData.id}`)
    } catch (error) {
      console.error('Error updating inventory from order:', error)
      throw error
    }
  }

  async restoreInventoryFromOrder(orderData) {
    try {
      // Restore inventory for cancelled order items
      for (const item of orderData.items) {
        await this.restoreProductInventory(item.productId, item.quantity)
      }

      console.log(`🔄 Restored inventory for cancelled order ${orderData.id}`)
    } catch (error) {
      console.error('Error restoring inventory from order:', error)
    }
  }

  async confirmInventoryReduction(orderId) {
    try {
      // Mark inventory reduction as confirmed for successful payments
      await this.markInventoryConfirmed(orderId)

      console.log(`✅ Confirmed inventory reduction for order ${orderId}`)
    } catch (error) {
      console.error('Error confirming inventory reduction:', error)
    }
  }

  async restoreInventoryFromRefund(orderId) {
    try {
      // Restore inventory for refunded orders
      await this.restoreInventoryFromRefundedOrder(orderId)

      console.log(`💸 Restored inventory for refunded order ${orderId}`)
    } catch (error) {
      console.error('Error restoring inventory from refund:', error)
    }
  }

  // Service communication methods
  async validateOrder(orderData) {
    try {
      // Check product availability
      const availability = await this.checkProductAvailability(orderData.items)

      // Check user account status
      const userStatus = await serviceCommunicator.get('auth', `/users/${orderData.userId}/status`)

      // Check payment method validity (if provided)
      let paymentValid = true
      if (orderData.paymentMethodId) {
        const paymentCheck = await serviceCommunicator.get('transactions', `/payment-methods/${orderData.paymentMethodId}`)
        paymentValid = paymentCheck.data.isValid
      }

      return {
        valid: availability.available && userStatus.data.canOrder && paymentValid,
        issues: [
          ...availability.issues,
          ...(userStatus.data.canOrder ? [] : ['User account restrictions']),
          ...(paymentValid ? [] : ['Invalid payment method'])
        ]
      }
    } catch (error) {
      console.error('Error validating order:', error)
      return {
        valid: false,
        issues: ['Order validation service error']
      }
    }
  }

  async reserveInventory(orderData) {
    try {
      // Reserve inventory for order items
      const reservationId = await this.createInventoryReservation(orderData.items)

      return {
        id: reservationId,
        items: orderData.items,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }
    } catch (error) {
      console.error('Error reserving inventory:', error)
      throw error
    }
  }

  async releaseInventory(reservationData) {
    try {
      // Release reserved inventory
      await this.removeInventoryReservation(reservationData.id)

      console.log(`🔓 Released inventory reservation ${reservationData.id}`)
    } catch (error) {
      console.error('Error releasing inventory:', error)
    }
  }

  async getProductRecommendations(userId, options = {}) {
    try {
      // Get personalized recommendations
      const recommendations = await this.generateRecommendations(userId, options)

      return recommendations
    } catch (error) {
      console.error('Error getting product recommendations:', error)
      // Return popular products as fallback
      return await this.getPopularProducts()
    }
  }

  async notifyLowStock(productId, currentStock) {
    try {
      // Get product details
      const product = await this.getProductById(productId)

      // Send notification to admin
      await serviceCommunicator.post('notifications', '/send-admin-alert', {
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `Product "${product.name}" is running low (${currentStock} remaining)`,
        data: { productId, currentStock, productName: product.name }
      })

      // Publish event
      await this.eventPublisher.publishProductEvent('product.low_stock', {
        productId,
        productName: product.name,
        currentStock
      })

      console.log(`📉 Low stock notification sent for product ${productId}`)
    } catch (error) {
      console.error('Error sending low stock notification:', error)
    }
  }

  // Placeholder methods (implement based on your database schema)
  async getPopularProducts() { return [] }
  async saveUserRecommendations(userId, products) { /* implement */ }
  async getPersonalizedProducts(preferences) { return [] }
  async reduceProductInventory(productId, quantity) { /* implement */ }
  async restoreProductInventory(productId, quantity) { /* implement */ }
  async markInventoryConfirmed(orderId) { /* implement */ }
  async restoreInventoryFromRefundedOrder(orderId) { /* implement */ }
  async createInventoryReservation(items) { return 'reservation_' + Date.now() }
  async removeInventoryReservation(reservationId) { /* implement */ }
  async checkProductAvailability(items) { return { available: true, issues: [] } }
  async generateRecommendations(userId, options) { return [] }
  async getProductById(productId) { return { id: productId, name: 'Unknown Product' } }

  // Cleanup
  async close() {
    await serviceCommunicator.close()
  }
}

export default ProductsServiceIntegration