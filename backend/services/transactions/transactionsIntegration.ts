// Transactions Service - Inter-Service Communication Integration

import serviceCommunicator from '/app/shared/communication/serviceCommunicator.js'
import { eventPublisher } from '/app/shared/events/eventSystem.js'
import { sagaOrchestrator, createOrderProcessingSaga } from '/app/shared/sagas/sagaOrchestrator.js'

class TransactionsServiceIntegration {
  constructor() {
    this.eventPublisher = eventPublisher(serviceCommunicator)
    this.sagaOrchestrator = sagaOrchestrator(serviceCommunicator)
    this.orderProcessingSaga = createOrderProcessingSaga()
  }

  // Initialize integrations
  async initialize(rabbitmqUrl) {
    try {
      // Initialize service communicator
      await serviceCommunicator.initialize(rabbitmqUrl)

      // Register other services
      serviceCommunicator.registerService('auth', process.env.AUTH_SERVICE_URL || 'http://localhost:3001')
      serviceCommunicator.registerService('products', process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3002')
      serviceCommunicator.registerService('notifications', process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3005')
      serviceCommunicator.registerService('shipping', process.env.SHIPPING_SERVICE_URL || 'http://localhost:3010')
      serviceCommunicator.registerService('analytics', process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3009')

      // Subscribe to relevant events
      await this.setupEventSubscriptions()

      console.log('🔗 Transactions service integrations initialized')
    } catch (error) {
      console.error('❌ Failed to initialize transactions service integrations:', error)
      throw error
    }
  }

  // Setup event subscriptions
  async setupEventSubscriptions() {
    // Subscribe to product events for inventory updates
    await serviceCommunicator.subscribeToEvents(['product.inventory_updated'], this.handleProductEvent.bind(this))

    // Subscribe to shipping events for order completion
    await serviceCommunicator.subscribeToEvents(['shipment.delivered', 'shipment.failed'], this.handleShippingEvent.bind(this))

    // Subscribe to user events for wallet management
    await serviceCommunicator.subscribeToEvents(['user.created'], this.handleUserEvent.bind(this))
  }

  // Event handlers
  async handleProductEvent(event) {
    try {
      switch (event.type) {
        case 'product.inventory_updated':
          // Update order status when inventory is confirmed
          await this.updateOrderFromInventory(event.data)
          break
      }
    } catch (error) {
      console.error('Error handling product event:', error)
    }
  }

  async handleShippingEvent(event) {
    try {
      switch (event.type) {
        case 'shipment.delivered':
          // Complete order when shipment is delivered
          await this.completeOrderFromShipment(event.data)
          break

        case 'shipment.failed':
          // Handle failed shipments
          await this.handleFailedShipment(event.data)
          break
      }
    } catch (error) {
      console.error('Error handling shipping event:', error)
    }
  }

  async handleUserEvent(event) {
    try {
      switch (event.type) {
        case 'user.created':
          // Create wallet for new user
          await this.createUserWallet(event.data.id)
          break
      }
    } catch (error) {
      console.error('Error handling user event:', error)
    }
  }

  // Order processing with saga pattern
  async processOrder(orderData) {
    try {
      console.log(`🛒 Processing order ${orderData.id} with saga pattern`)

      // Define saga context
      const sagaContext = {
        order: orderData,
        customerEmail: orderData.customerEmail,
        paymentMethod: orderData.paymentMethod,
        shippingAddress: orderData.shippingAddress
      }

      // Execute saga
      const result = await this.sagaOrchestrator.execute(this.orderProcessingSaga, sagaContext)

      if (result.state === 'completed') {
        console.log(`✅ Order ${orderData.id} processed successfully`)

        // Publish order completed event
        await this.eventPublisher.publishOrderEvent('order.completed', {
          id: orderData.id,
          total: orderData.total,
          items: orderData.items,
          customerId: orderData.customerId
        })

        return { success: true, orderId: orderData.id }
      } else {
        console.error(`❌ Order ${orderData.id} processing failed:`, result.error)

        // Publish order failed event
        await this.eventPublisher.publishOrderEvent('order.failed', {
          id: orderData.id,
          error: result.error.message,
          failedStep: result.failedStep
        })

        return { success: false, error: result.error.message }
      }
    } catch (error) {
      console.error(`💥 Order processing error for ${orderData.id}:`, error)
      return { success: false, error: error.message }
    }
  }

  // Payment processing
  async processPayment(orderId, paymentData) {
    try {
      // Process payment with external gateway
      const paymentResult = await this.processExternalPayment(paymentData)

      if (paymentResult.success) {
        // Create transaction record
        const transaction = await this.createTransactionRecord({
          orderId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentMethod: paymentData.method,
          externalTransactionId: paymentResult.transactionId,
          status: 'completed'
        })

        // Update wallet if payment method is wallet
        if (paymentData.method === 'wallet') {
          await this.updateWalletBalance(paymentData.userId, -paymentData.amount)
        }

        // Publish payment processed event
        await this.eventPublisher.publishOrderEvent('payment.processed', {
          orderId,
          transactionId: transaction.id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          method: paymentData.method
        })

        return { success: true, transaction }
      } else {
        // Create failed transaction record
        await this.createTransactionRecord({
          orderId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentMethod: paymentData.method,
          status: 'failed',
          errorMessage: paymentResult.error
        })

        // Publish payment failed event
        await this.eventPublisher.publishOrderEvent('payment.failed', {
          orderId,
          amount: paymentData.amount,
          error: paymentResult.error
        })

        return { success: false, error: paymentResult.error }
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      return { success: false, error: error.message }
    }
  }

  // Refund processing
  async processRefund(orderId, refundData) {
    try {
      // Get original transaction
      const originalTransaction = await this.getTransactionByOrderId(orderId)

      if (!originalTransaction) {
        throw new Error('Original transaction not found')
      }

      // Process refund with external gateway
      const refundResult = await this.processExternalRefund(originalTransaction, refundData)

      if (refundResult.success) {
        // Create refund transaction record
        const refundTransaction = await this.createTransactionRecord({
          orderId,
          amount: -refundData.amount, // Negative amount for refunds
          currency: refundData.currency,
          paymentMethod: originalTransaction.paymentMethod,
          externalTransactionId: refundResult.refundId,
          status: 'completed',
          type: 'refund'
        })

        // Restore wallet balance if applicable
        if (originalTransaction.paymentMethod === 'wallet') {
          await this.updateWalletBalance(originalTransaction.userId, refundData.amount)
        }

        // Publish refund processed event
        await this.eventPublisher.publishOrderEvent('payment.refunded', {
          orderId,
          refundId: refundTransaction.id,
          originalTransactionId: originalTransaction.id,
          amount: refundData.amount,
          reason: refundData.reason
        })

        return { success: true, refund: refundTransaction }
      } else {
        return { success: false, error: refundResult.error }
      }
    } catch (error) {
      console.error('Refund processing error:', error)
      return { success: false, error: error.message }
    }
  }

  // Wallet management
  async createUserWallet(userId) {
    try {
      await this.initializeWallet(userId)
      console.log(`💰 Created wallet for user ${userId}`)
    } catch (error) {
      console.error('Error creating user wallet:', error)
    }
  }

  async getWalletBalance(userId) {
    try {
      return await serviceCommunicator.get('transactions', `/wallets/${userId}/balance`)
    } catch (error) {
      console.error('Error getting wallet balance:', error)
      return { balance: 0, currency: 'USD' }
    }
  }

  async addToWallet(userId, amount, description) {
    try {
      const result = await serviceCommunicator.post('transactions', '/wallet/deposit', {
        userId,
        amount,
        description
      })

      await this.eventPublisher.publishOrderEvent('wallet.deposit', {
        userId,
        amount,
        balance: result.data.newBalance
      })

      return result
    } catch (error) {
      console.error('Error adding to wallet:', error)
      throw error
    }
  }

  // Business logic methods
  async updateOrderFromInventory(inventoryData) {
    try {
      // Update order status when inventory is confirmed
      await this.updateOrderStatus(inventoryData.orderId, 'inventory_confirmed')

      console.log(`📦 Order ${inventoryData.orderId} inventory confirmed`)
    } catch (error) {
      console.error('Error updating order from inventory:', error)
    }
  }

  async completeOrderFromShipment(shipmentData) {
    try {
      // Complete order when shipment is delivered
      await this.updateOrderStatus(shipmentData.orderId, 'delivered')

      // Send delivery confirmation
      await serviceCommunicator.post('notifications', '/send-delivery-confirmation', {
        orderId: shipmentData.orderId,
        trackingNumber: shipmentData.trackingNumber
      })

      console.log(`📦 Order ${shipmentData.orderId} marked as delivered`)
    } catch (error) {
      console.error('Error completing order from shipment:', error)
    }
  }

  async handleFailedShipment(shipmentData) {
    try {
      // Handle failed shipment - could trigger refund or alternative shipping
      await this.updateOrderStatus(shipmentData.orderId, 'shipment_failed')

      // Notify customer
      await serviceCommunicator.post('notifications', '/send-shipment-failure', {
        orderId: shipmentData.orderId,
        reason: shipmentData.failureReason
      })

      console.log(`❌ Order ${shipmentData.orderId} shipment failed`)
    } catch (error) {
      console.error('Error handling failed shipment:', error)
    }
  }

  // Service communication helpers
  async validatePaymentMethod(userId, paymentMethodId) {
    try {
      const result = await serviceCommunicator.get('transactions', `/payment-methods/${paymentMethodId}`)
      return result.data.userId === userId && result.data.isValid
    } catch (error) {
      console.error('Error validating payment method:', error)
      return false
    }
  }

  async getUserSubscriptionStatus(userId) {
    try {
      const result = await serviceCommunicator.get('transactions', `/subscriptions/user/${userId}/status`)
      return result.data
    } catch (error) {
      console.error('Error getting user subscription status:', error)
      return { hasActiveSubscription: false }
    }
  }

  // Placeholder methods (implement based on your database schema)
  async processExternalPayment(paymentData) {
    // Implement actual payment gateway integration
    return { success: true, transactionId: 'txn_' + Date.now() }
  }

  async processExternalRefund(transaction, refundData) {
    // Implement actual refund processing
    return { success: true, refundId: 'ref_' + Date.now() }
  }

  async createTransactionRecord(data) {
    // Implement transaction record creation
    return { id: 'txn_' + Date.now(), ...data }
  }

  async updateWalletBalance(userId, amount) {
    // Implement wallet balance update
    console.log(`💰 Updated wallet for user ${userId} by ${amount}`)
  }

  async getTransactionByOrderId(orderId) {
    // Implement transaction lookup
    return { id: 'txn_123', userId: 'user_123', paymentMethod: 'card' }
  }

  async updateOrderStatus(orderId, status) {
    // Implement order status update
    console.log(`📋 Updated order ${orderId} status to ${status}`)
  }

  async initializeWallet(userId) {
    // Implement wallet initialization
    console.log(`💰 Initialized wallet for user ${userId}`)
  }

  // Cleanup
  async close() {
    await serviceCommunicator.close()
  }
}

export default TransactionsServiceIntegration