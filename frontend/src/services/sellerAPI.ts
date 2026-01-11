import api from './authAPI'

// Seller Dashboard API
export interface SellerStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  averageRating: number
}

export interface SellerProduct {
  id: string
  name: string
  sku?: string
  price: number
  stock: number
  status: 'active' | 'inactive' | 'pending'
  sales?: number
  rating?: number
  images: string[]
  category: string
  createdAt: string
}

export interface SellerOrder {
  id: string
  customerName: string
  status: string
  total: number
  createdAt: string
}

export interface SellerAnalytics {
  salesData: Array<{
    date: string
    revenue: number
    orders: number
  }>
  topProducts: Array<{
    id: string
    name: string
    sales: number
  }>
}

export interface SellerCustomer {
  id: string
  firstName: string
  lastName: string
  email: string
  createdAt: string
}

class SellerAPI {
  // Dashboard Overview
  async getDashboardOverview(): Promise<SellerStats> {
    const response = await api.get('/seller/dashboard/overview')
    return response.data.data
  }

  // Products Management
  async getProducts(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    category?: string
    sortBy?: string
  }): Promise<{
    products: SellerProduct[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await api.get('/seller/products', { params })
    return response.data.data
  }

  // Orders Management
  async getOrders(params?: {
    page?: number
    limit?: number
    status?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<{
    orders: SellerOrder[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await api.get('/seller/orders', { params })
    return response.data.data
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await api.put(`/seller/orders/${orderId}/status`, { status })
  }

  // Analytics
  async getAnalytics(period: string = '30d'): Promise<SellerAnalytics> {
    const response = await api.get('/seller/analytics', { params: { period } })
    return response.data.data
  }

  // Customers
  async getCustomers(params?: {
    page?: number
    limit?: number
  }): Promise<{
    customers: SellerCustomer[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await api.get('/seller/customers', { params })
    return response.data.data
  }
}

export const sellerAPI = new SellerAPI()
export default sellerAPI