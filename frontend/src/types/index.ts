// User and Authentication Types
export interface User {
  id: string
  email: string
  username?: string
  name: string
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
  role?: string
  subscription: SubscriptionPlan
  subscriptionEndDate?: string
  preferences: UserPreferences
}

export interface UserPreferences {
  language: 'en' | 'fr' | 'zh'
  currency: string
  theme: 'light' | 'dark'
  notifications: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
}

// Product Types
export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  currency: string
  images: string[]
  videos?: string[]
  colors?: string[]
  sizes?: string[]
  category: string
  subcategories?: string[]
  tags?: string[]
  rating: number
  reviewCount: number
  likes: number
  inStock: boolean
  inventory: number
  seller: Seller
  createdAt: string
  updatedAt: string
}

export interface Seller {
  id: string
  name: string
  rating: number
  verified: boolean
  avatar?: string
}

// Cart Types
export interface CartItem {
  product: Product
  quantity: number
  selectedColor?: string
  selectedSize?: string
}

export interface CartState {
  items: CartItem[]
  total: number
  currency: string
}

// Subscription Types
export type SubscriptionPlan = 'free' | 'silver' | 'gold' | 'platinum'

export interface SubscriptionFeatures {
  productsPerDay: number
  videoUploads: boolean
  directContact: boolean
  prioritySupport: boolean
  analytics: boolean
  customBranding: boolean
}

export interface SubscriptionState {
  currentPlan: SubscriptionPlan
  features: SubscriptionFeatures
  renewalDate?: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface LoginForm {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

export interface ProductForm {
  name: string
  description: string
  price: number
  category: string
  subcategories?: string[]
  colors?: string[]
  sizes?: string[]
  inventory: number
  images: File[]
  videos?: File[]
}

// Search and Filter Types
export interface SearchFilters {
  query?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  inStock?: boolean
  colors?: string[]
  sizes?: string[]
  sortBy?: 'price' | 'rating' | 'newest' | 'popular'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchState {
  query: string
  filters: SearchFilters
  results: Product[]
  loading: boolean
  pagination: {
    page: number
    total: number
  }
}