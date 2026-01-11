import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  User,
  Product,
  CartItem,
  SubscriptionPlan,
  SubscriptionFeatures,
  SearchFilters,
  ProductForm
} from '@/types'

// Auth Store
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const isAuthenticated = computed(() => !!user.value)

  const login = async (email: string, password: string) => {
    loading.value = true
    try {
      // API call to login
      // const response = await api.login({ email, password })
      // user.value = response.data.user
      console.log('Login:', email, password)
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    // Clear local storage, redirect, etc.
  }

  const updatePreferences = (preferences: Partial<User['preferences']>) => {
    if (user.value) {
      user.value.preferences = { ...user.value.preferences, ...preferences }
      // API call to update preferences
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updatePreferences
  }
})

// Cart Store
export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const currency = ref('USD')

  const total = computed(() =>
    items.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  )

  const itemCount = computed(() =>
    items.value.reduce((count, item) => count + item.quantity, 0)
  )

  const addItem = (product: Product, quantity = 1, options?: { color?: string; size?: string }) => {
    const existingIndex = items.value.findIndex(item =>
      item.product.id === product.id &&
      item.selectedColor === options?.color &&
      item.selectedSize === options?.size
    )

    if (existingIndex >= 0) {
      items.value[existingIndex].quantity += quantity
    } else {
      items.value.push({
        product,
        quantity,
        selectedColor: options?.color,
        selectedSize: options?.size
      })
    }
  }

  const removeItem = (productId: string, options?: { color?: string; size?: string }) => {
    const index = items.value.findIndex(item =>
      item.product.id === productId &&
      item.selectedColor === options?.color &&
      item.selectedSize === options?.size
    )
    if (index >= 0) {
      items.value.splice(index, 1)
    }
  }

  const updateQuantity = (productId: string, quantity: number, options?: { color?: string; size?: string }) => {
    const item = items.value.find(item =>
      item.product.id === productId &&
      item.selectedColor === options?.color &&
      item.selectedSize === options?.size
    )
    if (item) {
      item.quantity = Math.max(0, quantity)
      if (item.quantity === 0) {
        removeItem(productId, options)
      }
    }
  }

  const clearCart = () => {
    items.value = []
  }

  return {
    items,
    currency,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart
  }
})

// Product Store
export const useProductStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const featuredProducts = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchProducts = async (filters?: SearchFilters) => {
    loading.value = true
    error.value = null
    try {
      // API call to fetch products
      // const response = await api.getProducts(filters)
      // products.value = response.data
      console.log('Fetching products with filters:', filters)
    } catch (err) {
      error.value = 'Failed to fetch products'
      console.error('Fetch products error:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchProductById = async (id: string): Promise<Product | null> => {
    try {
      // const response = await api.getProduct(id)
      // return response.data
      console.log('Fetching product:', id)
      return null
    } catch (err) {
      console.error('Fetch product error:', err)
      return null
    }
  }

  const createProduct = async (productData: ProductForm) => {
    try {
      // const response = await api.createProduct(productData)
      // return response.data
      console.log('Creating product:', productData)
    } catch (err) {
      console.error('Create product error:', err)
      throw err
    }
  }

  return {
    products,
    featuredProducts,
    loading,
    error,
    fetchProducts,
    fetchProductById,
    createProduct
  }
})

// Subscription Store
export const useSubscriptionStore = defineStore('subscription', () => {
  const currentPlan = ref<SubscriptionPlan>('free')
  const features = ref<SubscriptionFeatures>({
    productsPerDay: 1,
    videoUploads: false,
    directContact: false,
    prioritySupport: false,
    analytics: false,
    customBranding: false
  })

  const plans = {
    free: {
      name: 'Free',
      price: 0,
      features: {
        productsPerDay: 1,
        videoUploads: false,
        directContact: false,
        prioritySupport: false,
        analytics: false,
        customBranding: false
      }
    },
    silver: {
      name: 'Silver',
      price: 29.99,
      features: {
        productsPerDay: 10,
        videoUploads: true,
        directContact: false,
        prioritySupport: false,
        analytics: true,
        customBranding: false
      }
    },
    gold: {
      name: 'Gold',
      price: 59.99,
      features: {
        productsPerDay: 50,
        videoUploads: true,
        directContact: true,
        prioritySupport: true,
        analytics: true,
        customBranding: false
      }
    },
    platinum: {
      name: 'Platinum',
      price: 99.99,
      features: {
        productsPerDay: -1, // unlimited
        videoUploads: true,
        directContact: true,
        prioritySupport: true,
        analytics: true,
        customBranding: true
      }
    }
  }

  const upgrade = async (plan: SubscriptionPlan) => {
    try {
      // API call to upgrade subscription
      // const response = await api.upgradeSubscription(plan)
      currentPlan.value = plan
      features.value = plans[plan].features
      console.log('Upgraded to plan:', plan)
    } catch (err) {
      console.error('Upgrade failed:', err)
      throw err
    }
  }

  const canUseFeature = (feature: keyof SubscriptionFeatures): boolean => {
    return features.value[feature]
  }

  return {
    currentPlan,
    features,
    plans,
    upgrade,
    canUseFeature
  }
})

// Search Store
export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const filters = ref<SearchFilters>({})
  const results = ref<Product[]>([])
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    total: 0,
    limit: 20
  })

  const search = async (searchQuery: string, searchFilters?: SearchFilters) => {
    loading.value = true
    query.value = searchQuery
    filters.value = { ...filters.value, ...searchFilters }

    try {
      // API call to search products
      // const response = await api.searchProducts(searchQuery, filters.value)
      // results.value = response.data.data
      // pagination.value = response.data.pagination
      console.log('Searching:', searchQuery, filters.value)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      loading.value = false
    }
  }

  const clearSearch = () => {
    query.value = ''
    filters.value = {}
    results.value = []
    pagination.value = { page: 1, total: 0, limit: 20 }
  }

  return {
    query,
    filters,
    results,
    loading,
    pagination,
    search,
    clearSearch
  }
})