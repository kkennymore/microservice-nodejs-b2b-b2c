import { ref, computed, readonly } from 'vue'
import type { Product } from '@/types'

export interface Wishlist {
  id: string
  user_id: string
  name: string
  description?: string
  is_public: boolean
  is_default: boolean
  item_count: number
  created_at: string
  updated_at: string
  followers_count?: number
}

export interface WishlistItem {
  id: string
  wishlist_id: string
  product_id: string
  quantity: number
  priority: 'low' | 'medium' | 'high'
  notes?: string
  price_alert: boolean
  alert_price?: number
  added_at: string
  // Product data
  product: Product
}

export interface WishlistShare {
  shareId: string
  shareToken?: string
  shareUrl?: string
  shareType: 'private' | 'public_link' | 'friends'
  expiresAt?: string
}

export interface PriceAlert {
  id: string
  alert_price: number
  triggered_price?: number
  triggered_at?: string
  status: 'active' | 'triggered' | 'expired'
  product: Product
}

export interface AvailabilityAlert {
  id: string
  alert_type: 'back_in_stock' | 'price_drop' | 'new_variant'
  threshold_value?: number
  triggered_at?: string
  is_active: boolean
  product: Product
}

const wishlists = ref<Wishlist[]>([])
const currentWishlist = ref<Wishlist | null>(null)
const wishlistItems = ref<WishlistItem[]>([])
const followedWishlists = ref<Wishlist[]>([])
const priceAlerts = ref<PriceAlert[]>([])
const availabilityAlerts = ref<AvailabilityAlert[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// API base URL
const API_BASE = import.meta.env.VITE_WISHLIST_API_URL || 'http://localhost:3014/api'

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred'
    throw err
  }
}

// Wishlist management
const fetchWishlists = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall('/wishlists')
    wishlists.value = response.data.wishlists
  } catch (err) {
    console.error('Error fetching wishlists:', err)
  } finally {
    isLoading.value = false
  }
}

const fetchWishlist = async (wishlistId: string, includeItems = true) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall(`/wishlists/${wishlistId}?includeItems=${includeItems}`)
    currentWishlist.value = response.data.wishlist
    wishlistItems.value = response.data.wishlist.items || []
    return response.data.wishlist
  } catch (err) {
    console.error('Error fetching wishlist:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

const createWishlist = async (data: { name?: string; description?: string; isPublic?: boolean }) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall('/wishlists', {
      method: 'POST',
      body: JSON.stringify(data)
    })

    // Refresh wishlists list
    await fetchWishlists()
    return response.data.wishlistId
  } catch (err) {
    console.error('Error creating wishlist:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

const updateWishlist = async (wishlistId: string, data: { name?: string; description?: string; isPublic?: boolean }) => {
  isLoading.value = true
  error.value = null

  try {
    await apiCall(`/wishlists/${wishlistId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })

    // Refresh current wishlist if it's the one being updated
    if (currentWishlist.value?.id === wishlistId) {
      await fetchWishlist(wishlistId)
    }
  } catch (err) {
    console.error('Error updating wishlist:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

const deleteWishlist = async (wishlistId: string) => {
  isLoading.value = true
  error.value = null

  try {
    await apiCall(`/wishlists/${wishlistId}`, {
      method: 'DELETE'
    })

    // Remove from local list
    wishlists.value = wishlists.value.filter(w => w.id !== wishlistId)
    if (currentWishlist.value?.id === wishlistId) {
      currentWishlist.value = null
      wishlistItems.value = []
    }
  } catch (err) {
    console.error('Error deleting wishlist:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Wishlist item management
const addToWishlist = async (wishlistId: string, productId: string, options: {
  quantity?: number
  priority?: 'low' | 'medium' | 'high'
  notes?: string
  priceAlert?: boolean
  alertPrice?: number
} = {}) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall(`/wishlists/${wishlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        productId,
        ...options
      })
    })

    // Refresh wishlist items if current
    if (currentWishlist.value?.id === wishlistId) {
      await fetchWishlist(wishlistId)
    }

    return response.data.itemId
  } catch (err) {
    console.error('Error adding item to wishlist:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

const updateWishlistItem = async (wishlistId: string, itemId: string, updates: {
  quantity?: number
  priority?: 'low' | 'medium' | 'high'
  notes?: string
  priceAlert?: boolean
  alertPrice?: number
}) => {
  isLoading.value = true
  error.value = null

  try {
    await apiCall(`/wishlists/${wishlistId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })

    // Update local item
    const itemIndex = wishlistItems.value.findIndex(item => item.id === itemId)
    if (itemIndex >= 0) {
      wishlistItems.value[itemIndex] = { ...wishlistItems.value[itemIndex], ...updates }
    }
  } catch (err) {
    console.error('Error updating wishlist item:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

const removeFromWishlist = async (wishlistId: string, itemId: string) => {
  isLoading.value = true
  error.value = null

  try {
    await apiCall(`/wishlists/${wishlistId}/items/${itemId}`, {
      method: 'DELETE'
    })

    // Remove from local list
    wishlistItems.value = wishlistItems.value.filter(item => item.id !== itemId)
    if (currentWishlist.value?.id === wishlistId) {
      currentWishlist.value.item_count--
    }
  } catch (err) {
    console.error('Error removing item from wishlist:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Sharing functionality
const shareWishlist = async (wishlistId: string, shareData: {
  shareType: 'private' | 'public_link' | 'friends'
  sharedWith?: string
  expiresAt?: string
}): Promise<WishlistShare> => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall(`/wishlists/${wishlistId}/share`, {
      method: 'POST',
      body: JSON.stringify(shareData)
    })

    return response.data
  } catch (err) {
    console.error('Error sharing wishlist:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

const fetchSharedWishlist = async (shareToken: string) => {
  try {
    const response = await fetch(`${API_BASE}/shared-wishlist/${shareToken}`)
    if (!response.ok) {
      throw new Error('Shared wishlist not found or expired')
    }
    return await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error fetching shared wishlist'
    throw err
  }
}

// Following functionality
const followWishlist = async (wishlistId: string) => {
  try {
    await apiCall(`/wishlists/${wishlistId}/follow`, {
      method: 'POST',
      body: JSON.stringify({ action: 'follow' })
    })

    // Add to followed list
    const wishlist = wishlists.value.find(w => w.id === wishlistId)
    if (wishlist) {
      followedWishlists.value.push(wishlist)
    }
  } catch (err) {
    console.error('Error following wishlist:', err)
    throw err
  }
}

const unfollowWishlist = async (wishlistId: string) => {
  try {
    await apiCall(`/wishlists/${wishlistId}/follow`, {
      method: 'POST',
      body: JSON.stringify({ action: 'unfollow' })
    })

    // Remove from followed list
    followedWishlists.value = followedWishlists.value.filter(w => w.id !== wishlistId)
  } catch (err) {
    console.error('Error unfollowing wishlist:', err)
    throw err
  }
}

const fetchFollowedWishlists = async () => {
  try {
    const response = await apiCall('/wishlists/followed')
    followedWishlists.value = response.data.wishlists
  } catch (err) {
    console.error('Error fetching followed wishlists:', err)
  }
}

const fetchPublicWishlists = async (search?: string, page = 1, limit = 10) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    })

    const response = await fetch(`${API_BASE}/wishlists/public?${params}`)
    if (!response.ok) {
      throw new Error('Failed to fetch public wishlists')
    }

    return await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error fetching public wishlists'
    throw err
  }
}

// Alert management
const createAvailabilityAlert = async (productId: string, alertType: 'back_in_stock' | 'price_drop' | 'new_variant', thresholdValue?: number) => {
  try {
    const response = await apiCall('/alerts/availability', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        alertType,
        thresholdValue
      })
    })

    return response.data.alertId
  } catch (err) {
    console.error('Error creating availability alert:', err)
    throw err
  }
}

const fetchAlerts = async () => {
  try {
    const response = await apiCall('/alerts')
    priceAlerts.value = response.data.priceAlerts
    availabilityAlerts.value = response.data.availabilityAlerts
  } catch (err) {
    console.error('Error fetching alerts:', err)
  }
}

const deleteAlert = async (alertId: string, alertType: 'price' | 'availability') => {
  try {
    await apiCall(`/alerts/${alertId}?alertType=${alertType}`, {
      method: 'DELETE'
    })

    // Remove from local lists
    if (alertType === 'price') {
      priceAlerts.value = priceAlerts.value.filter(a => a.id !== alertId)
    } else {
      availabilityAlerts.value = availabilityAlerts.value.filter(a => a.id !== alertId)
    }
  } catch (err) {
    console.error('Error deleting alert:', err)
    throw err
  }
}

// Computed properties
const defaultWishlist = computed(() => {
  return wishlists.value.find(w => w.is_default) || wishlists.value[0] || null
})

const totalWishlists = computed(() => wishlists.value.length)

const totalWishlistItems = computed(() =>
  wishlists.value.reduce((total, wishlist) => total + wishlist.item_count, 0)
)

const hasWishlists = computed(() => wishlists.value.length > 0)

const isItemInWishlist = (productId: string, wishlistId?: string) => {
  const targetWishlistId = wishlistId || currentWishlist.value?.id
  if (!targetWishlistId) return false

  return wishlistItems.value.some(item =>
    item.product_id === productId && item.wishlist_id === targetWishlistId
  )
}

const getWishlistItem = (productId: string, wishlistId?: string) => {
  const targetWishlistId = wishlistId || currentWishlist.value?.id
  if (!targetWishlistId) return null

  return wishlistItems.value.find(item =>
    item.product_id === productId && item.wishlist_id === targetWishlistId
  )
}

export function useWishlist() {
  return {
    // State
    wishlists: readonly(wishlists),
    currentWishlist: readonly(currentWishlist),
    wishlistItems: readonly(wishlistItems),
    followedWishlists: readonly(followedWishlists),
    priceAlerts: readonly(priceAlerts),
    availabilityAlerts: readonly(availabilityAlerts),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    defaultWishlist,
    totalWishlists,
    totalWishlistItems,
    hasWishlists,

    // Wishlist methods
    fetchWishlists,
    fetchWishlist,
    createWishlist,
    updateWishlist,
    deleteWishlist,

    // Item methods
    addToWishlist,
    updateWishlistItem,
    removeFromWishlist,
    isItemInWishlist,
    getWishlistItem,

    // Sharing methods
    shareWishlist,
    fetchSharedWishlist,

    // Following methods
    followWishlist,
    unfollowWishlist,
    fetchFollowedWishlists,
    fetchPublicWishlists,

    // Alert methods
    createAvailabilityAlert,
    fetchAlerts,
    deleteAlert,

    // Clear error
    clearError: () => { error.value = null }
  }
}