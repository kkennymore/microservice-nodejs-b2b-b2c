import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores'

export const useSocket = () => {
  const authStore = useAuthStore()
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    if (socket.value?.connected) return

    socket.value = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      auth: {
        token: localStorage.getItem('authToken')
      }
    })

    socket.value.on('connect', () => {
      console.log('Connected to server')
      isConnected.value = true
      reconnectAttempts.value = 0

      // Join user room if authenticated
      if (authStore.isAuthenticated) {
        socket.value?.emit('join', authStore.user?.id)
      }
    })

    socket.value.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason)
      isConnected.value = false
    })

    socket.value.on('connect_error', (error) => {
      console.error('Connection error:', error)
      reconnectAttempts.value++

      if (reconnectAttempts.value >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
      }
    })

    // Product-related events
    socket.value.on('product_liked', (data) => {
      console.log('Product liked:', data)
      // Handle product like notification
    })

    socket.value.on('new_review', (data) => {
      console.log('New review:', data)
      // Handle new review notification
    })

    socket.value.on('new_contact_request', (data) => {
      console.log('New contact request:', data)
      // Handle contact request notification
    })

    socket.value.on('offer_update', (data) => {
      console.log('Offer update:', data)
      // Handle offer update
    })

    // Search events
    socket.value.on('search_results', (data) => {
      console.log('Search results:', data)
      // Handle real-time search results
    })
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }

  // Product interactions
  const likeProduct = (productId: string) => {
    if (socket.value && authStore.isAuthenticated) {
      socket.value.emit('like_product', {
        productId,
        userId: authStore.user?.id
      })
    }
  }

  const addReview = (productId: string, rating: number, comment: string, sellerId: string) => {
    if (socket.value && authStore.isAuthenticated) {
      socket.value.emit('add_review', {
        productId,
        userId: authStore.user?.id,
        rating,
        comment,
        sellerId
      })
    }
  }

  const contactSeller = (productId: string, sellerId: string, message: string, contactMethod: string = 'message') => {
    if (socket.value && authStore.isAuthenticated) {
      socket.value.emit('contact_seller', {
        productId,
        buyerId: authStore.user?.id,
        sellerId,
        message,
        contactMethod
      })
    }
  }

  const joinProductRoom = (productId: string) => {
    if (socket.value) {
      socket.value.emit('join_product', productId)
    }
  }

  const leaveProductRoom = (productId: string) => {
    if (socket.value) {
      socket.value.emit('leave_product', productId)
    }
  }

  const viewProduct = (productId: string) => {
    if (socket.value && authStore.isAuthenticated) {
      socket.value.emit('view_product', {
        productId,
        userId: authStore.user?.id
      })
    }
  }

  const searchProducts = (query: string, filters?: any) => {
    if (socket.value) {
      socket.value.emit('search_products', {
        query,
        filters,
        userId: authStore.isAuthenticated ? authStore.user?.id : null
      })
    }
  }

  // Lifecycle
  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected: readonly(isConnected),
    connect,
    disconnect,
    likeProduct,
    addReview,
    contactSeller,
    joinProductRoom,
    leaveProductRoom,
    viewProduct,
    searchProducts
  }
}