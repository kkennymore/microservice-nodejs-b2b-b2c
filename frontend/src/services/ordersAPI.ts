import api from './authAPI'

// Order types for API responses
export interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  quantity: number
  price: number
  currency: string
  selectedColor?: string
  selectedSize?: string
  sellerName: string
  sellerId: string
}

export interface OrderAddress {
  fullName: string
  email: string
  phone?: string
  address: string
  apartment?: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface OrderTracking {
  status: OrderStatus
  trackingNumber?: string
  carrier?: string
  estimatedDelivery?: string
  trackingUrl?: string
  updates: TrackingUpdate[]
}

export interface TrackingUpdate {
  id: string
  status: OrderStatus
  message: string
  location?: string
  timestamp: string
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'returned'

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  currency: string
  shippingAddress: OrderAddress
  billingAddress?: OrderAddress
  paymentMethod: {
    type: 'card' | 'paypal' | 'digital'
    last4?: string
    brand?: string
  }
  tracking?: OrderTracking
  createdAt: string
  updatedAt: string
  estimatedDelivery?: string
}

export interface OrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  itemCount: number
  total: number
  currency: string
  createdAt: string
  estimatedDelivery?: string
  thumbnailImage?: string
}

export interface OrderFilters {
  status?: OrderStatus
  dateFrom?: string
  dateTo?: string
  search?: string
}

class OrdersAPI {
  // Get user's orders with pagination and filters
  async getOrders(params: {
    page?: number
    limit?: number
    status?: OrderStatus
    dateFrom?: string
    dateTo?: string
    search?: string
  } = {}): Promise<{
    orders: OrderSummary[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await api.get('/orders', { params })
    return response.data.data
  }

  // Get single order details
  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get(`/orders/${orderId}`)
    return response.data.data
  }

  // Get order tracking information
  async getOrderTracking(orderId: string): Promise<OrderTracking> {
    const response = await api.get(`/orders/${orderId}/tracking`)
    return response.data.data
  }

  // Cancel order
  async cancelOrder(orderId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/orders/${orderId}/cancel`, { reason })
    return response.data
  }

  // Request return
  async requestReturn(orderId: string, data: {
    items: Array<{
      itemId: string
      quantity: number
      reason: string
      description?: string
    }>
    returnMethod: 'refund' | 'exchange' | 'store_credit'
  }): Promise<{ success: boolean; message: string; returnId: string }> {
    const response = await api.post(`/orders/${orderId}/return`, data)
    return response.data
  }

  // Get return status
  async getReturnStatus(orderId: string, returnId: string): Promise<{
    id: string
    status: 'pending' | 'approved' | 'rejected' | 'completed'
    items: Array<{
      itemId: string
      quantity: number
      reason: string
      status: 'pending' | 'approved' | 'rejected'
    }>
    createdAt: string
    updatedAt: string
  }> {
    const response = await api.get(`/orders/${orderId}/returns/${returnId}`)
    return response.data.data
  }

  // Download invoice
  async downloadInvoice(orderId: string): Promise<Blob> {
    const response = await api.get(`/orders/${orderId}/invoice`, {
      responseType: 'blob'
    })
    return response.data
  }

  // Reorder items
  async reorder(orderId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/orders/${orderId}/reorder`)
    return response.data
  }

  // Leave review for order items
  async leaveReview(orderId: string, reviews: Array<{
    itemId: string
    rating: number
    comment: string
    images?: File[]
  }>): Promise<{ success: boolean; message: string }> {
    const formData = new FormData()

    reviews.forEach((review, index) => {
      formData.append(`reviews[${index}][itemId]`, review.itemId)
      formData.append(`reviews[${index}][rating]`, review.rating.toString())
      formData.append(`reviews[${index}][comment]`, review.comment)

      if (review.images) {
        review.images.forEach((image, imageIndex) => {
          formData.append(`reviews[${index}][images][${imageIndex}]`, image)
        })
      }
    })

    const response = await api.post(`/orders/${orderId}/reviews`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }

  // Contact seller about order
  async contactSeller(orderId: string, message: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/orders/${orderId}/contact-seller`, { message })
    return response.data
  }

  // Get order statistics
  async getOrderStats(): Promise<{
    totalOrders: number
    totalSpent: number
    currency: string
    averageOrderValue: number
    lastOrderDate?: string
    statusCounts: Record<OrderStatus, number>
  }> {
    const response = await api.get('/orders/stats')
    return response.data.data
  }
}

export const ordersAPI = new OrdersAPI()
export default ordersAPI