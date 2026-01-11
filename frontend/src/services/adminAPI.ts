import api from './authAPI'

// Admin Dashboard Types
export interface AdminStats {
  totalUsers: number
  totalSellers: number
  totalBuyers: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingProducts: number
  pendingOrders: number
  monthlyRevenue: number
  monthlyOrders: number
  monthlyUsers: number
  activeUsers: number
  conversionRate: number
}

export interface AdminUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: 'buyer' | 'seller' | 'admin'
  status: 'active' | 'inactive' | 'banned'
  avatar?: string
  createdAt: string
  lastLogin?: string
  emailVerified: boolean
  subscriptionPlan?: string
  totalOrders?: number
  totalSpent?: number
}

export interface AdminProduct {
  id: string
  name: string
  description: string
  price: number
  currency: string
  status: 'pending' | 'approved' | 'rejected' | 'featured'
  seller: {
    id: string
    name: string
    email: string
  }
  category: string
  images: string[]
  inventory: number
  createdAt: string
  updatedAt: string
  rejectionReason?: string
}

export interface AdminOrder {
  id: string
  orderNumber: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  customer: {
    id: string
    name: string
    email: string
  }
  seller: {
    id: string
    name: string
    email: string
  }
  items: Array<{
    id: string
    productName: string
    quantity: number
    price: number
    currency: string
  }>
  subtotal: number
  shipping: number
  tax: number
  total: number
  currency: string
  createdAt: string
  updatedAt: string
}

export interface AdminAnalytics {
  revenue: {
    total: number
    monthly: Array<{ month: string; revenue: number }>
    byCategory: Array<{ category: string; revenue: number }>
  }
  orders: {
    total: number
    monthly: Array<{ month: string; orders: number }>
    byStatus: Record<string, number>
  }
  users: {
    total: number
    monthly: Array<{ month: string; users: number }>
    byRole: Record<string, number>
  }
  products: {
    total: number
    byCategory: Array<{ category: string; count: number }>
    topSelling: Array<{
      id: string
      name: string
      sales: number
      revenue: number
    }>
  }
}

export interface AdminSettings {
  platform: {
    name: string
    description: string
    contactEmail: string
    supportPhone?: string
    maintenanceMode: boolean
  }
  commissions: {
    sellerCommission: number // percentage
    paymentProcessingFee: number
    minimumPayout: number
  }
  features: {
    emailVerification: boolean
    socialLogin: boolean
    reviewsEnabled: boolean
    messagingEnabled: boolean
    analyticsEnabled: boolean
  }
  limits: {
    maxProductsPerSeller: number
    maxImagesPerProduct: number
    maxFileSize: number // in MB
  }
}

class AdminAPI {
  // Dashboard Overview
  async getStats(): Promise<AdminStats> {
    const response = await api.get('/admin/stats')
    return response.data.data
  }

  // User Management
  async getUsers(params: {
    page?: number
    limit?: number
    search?: string
    role?: string
    status?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<{
    users: AdminUser[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await api.get('/admin/users', { params })
    return response.data.data
  }

  async getUser(userId: string): Promise<AdminUser> {
    const response = await api.get(`/admin/users/${userId}`)
    return response.data.data
  }

  async updateUser(userId: string, data: Partial<AdminUser>): Promise<AdminUser> {
    const response = await api.put(`/admin/users/${userId}`, data)
    return response.data.data
  }

  async banUser(userId: string, reason: string): Promise<{ success: boolean }> {
    const response = await api.post(`/admin/users/${userId}/ban`, { reason })
    return response.data
  }

  async unbanUser(userId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/admin/users/${userId}/unban`)
    return response.data
  }

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/admin/users/${userId}`)
    return response.data
  }

  // Product Management
  async getProducts(params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    category?: string
    sellerId?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<{
    products: AdminProduct[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await api.get('/admin/products', { params })
    return response.data.data
  }

  async approveProduct(productId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/admin/products/${productId}/approve`)
    return response.data
  }

  async rejectProduct(productId: string, reason: string): Promise<{ success: boolean }> {
    const response = await api.post(`/admin/products/${productId}/reject`, { reason })
    return response.data
  }

  async featureProduct(productId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/admin/products/${productId}/feature`)
    return response.data
  }

  async unfeatureProduct(productId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/admin/products/${productId}/unfeature`)
    return response.data
  }

  async deleteProduct(productId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/admin/products/${productId}`)
    return response.data
  }

  // Order Management
  async getOrders(params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    customerId?: string
    sellerId?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<{
    orders: AdminOrder[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await api.get('/admin/orders', { params })
    return response.data.data
  }

  async getOrder(orderId: string): Promise<AdminOrder> {
    const response = await api.get(`/admin/orders/${orderId}`)
    return response.data.data
  }

  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<{ success: boolean }> {
    const response = await api.put(`/admin/orders/${orderId}/status`, { status, notes })
    return response.data
  }

  async processRefund(orderId: string, amount: number, reason: string): Promise<{ success: boolean }> {
    const response = await api.post(`/admin/orders/${orderId}/refund`, { amount, reason })
    return response.data
  }

  // Analytics
  async getAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<AdminAnalytics> {
    const response = await api.get('/admin/analytics', { params: { period } })
    return response.data.data
  }

  async exportAnalytics(period: '7d' | '30d' | '90d' | '1y', format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await api.get('/admin/analytics/export', {
      params: { period, format },
      responseType: 'blob'
    })
    return response.data
  }

  // Settings
  async getSettings(): Promise<AdminSettings> {
    const response = await api.get('/admin/settings')
    return response.data.data
  }

  async updateSettings(settings: Partial<AdminSettings>): Promise<{ success: boolean }> {
    const response = await api.put('/admin/settings', settings)
    return response.data
  }

  // Content Moderation
  async getReportedContent(params: {
    page?: number
    limit?: number
    type?: 'user' | 'product' | 'message'
    status?: 'pending' | 'resolved'
  } = {}): Promise<{
    reports: Array<{
      id: string
      type: 'user' | 'product' | 'message'
      reportedId: string
      reportedBy: {
        id: string
        name: string
        email: string
      }
      reason: string
      description?: string
      status: 'pending' | 'resolved'
      createdAt: string
      resolvedAt?: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await api.get('/admin/reports', { params })
    return response.data.data
  }

  async resolveReport(reportId: string, action: 'dismiss' | 'ban' | 'remove', notes?: string): Promise<{ success: boolean }> {
    const response = await api.post(`/admin/reports/${reportId}/resolve`, { action, notes })
    return response.data
  }

  // System Maintenance
  async clearCache(): Promise<{ success: boolean }> {
    const response = await api.post('/admin/system/clear-cache')
    return response.data
  }

  async getSystemInfo(): Promise<{
    version: string
    uptime: number
    memoryUsage: {
      used: number
      total: number
      percentage: number
    }
    diskUsage: {
      used: number
      total: number
      percentage: number
    }
    databaseConnections: number
  }> {
    const response = await api.get('/admin/system/info')
    return response.data.data
  }

  async backupDatabase(): Promise<{ success: boolean; downloadUrl: string }> {
    const response = await api.post('/admin/system/backup')
    return response.data
  }
}

export const adminAPI = new AdminAPI()
export default adminAPI