import api from './authAPI'

// Product types for API responses
export interface ProductReview {
  id: string
  userId: string
  userName: string
  rating: number
  comment: string
  images?: string[]
  createdAt: string
  updatedAt: string
}

export interface ProductDetails extends Product {
  reviews: ProductReview[]
  reviewsCount: number
  averageRating: number
  similarProducts?: Product[]
  recommendedProducts?: Product[]
}

// Import Product from types
import type { Product, SearchFilters, PaginatedResponse } from '@/types'

class ProductsAPI {
  // Get products with filters and pagination
  async getProducts(filters: SearchFilters & {
    page?: number
    limit?: number
  } = {}): Promise<PaginatedResponse<Product>> {
    const response = await api.get('/products', { params: filters })
    return response.data.data
  }

  // Get single product details
  async getProduct(id: string): Promise<ProductDetails> {
    const response = await api.get(`/products/${id}`)
    return response.data.data
  }

  // Search products
  async searchProducts(query: string, filters: Partial<SearchFilters> = {}): Promise<PaginatedResponse<Product>> {
    const response = await api.get('/products/search', {
      params: { q: query, ...filters }
    })
    return response.data.data
  }

  // Get products by category
  async getProductsByCategory(category: string, filters: Partial<SearchFilters> = {}): Promise<PaginatedResponse<Product>> {
    const response = await api.get(`/products/category/${category}`, { params: filters })
    return response.data.data
  }

  // Get featured/trending products
  async getFeaturedProducts(limit: number = 12): Promise<Product[]> {
    const response = await api.get('/products/featured', { params: { limit } })
    return response.data.data
  }

  // Get similar products
  async getSimilarProducts(productId: string, limit: number = 6): Promise<Product[]> {
    const response = await api.get(`/products/${productId}/similar`, { params: { limit } })
    return response.data.data
  }

  // Add product review
  async addReview(productId: string, review: {
    rating: number
    comment: string
    images?: File[]
  }): Promise<{ success: boolean; message: string }> {
    const formData = new FormData()
    formData.append('rating', review.rating.toString())
    formData.append('comment', review.comment)

    if (review.images) {
      review.images.forEach((image, index) => {
        formData.append(`images[${index}]`, image)
      })
    }

    const response = await api.post(`/products/${productId}/reviews`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }

  // Get product reviews
  async getProductReviews(productId: string, page: number = 1, limit: number = 10): Promise<PaginatedResponse<ProductReview>> {
    const response = await api.get(`/products/${productId}/reviews`, {
      params: { page, limit }
    })
    return response.data.data
  }

  // Upload product images (for sellers)
  async uploadProductImages(images: File[]): Promise<{ urls: string[] }> {
    const formData = new FormData()
    images.forEach((image, index) => {
      formData.append(`images[${index}]`, image)
    })

    const response = await api.post('/products/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.data
  }

  // Get categories
  async getCategories(): Promise<{ id: string; name: string; count: number }[]> {
    const response = await api.get('/products/categories')
    return response.data.data
  }

  // Get trending products
  async getTrendingProducts(period: 'day' | 'week' | 'month' = 'week', limit: number = 12): Promise<Product[]> {
    const response = await api.get('/products/trending', {
      params: { period, limit }
    })
    return response.data.data
  }

  // Get new arrivals
  async getNewArrivals(limit: number = 12): Promise<Product[]> {
    const response = await api.get('/products/new-arrivals', { params: { limit } })
    return response.data.data
  }

  // Get products on sale
  async getSaleProducts(limit: number = 12): Promise<Product[]> {
    const response = await api.get('/products/sale', { params: { limit } })
    return response.data.data
  }
}

export const productsAPI = new ProductsAPI()
export default productsAPI