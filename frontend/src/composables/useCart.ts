import { ref, computed, watch, readonly } from 'vue'
import type { Product, CartItem } from '@/types'

export interface CartItemExtended extends CartItem {
  id: string // Unique cart item ID
  addedAt: string
}

const cartItems = ref<CartItemExtended[]>([])
const isLoading = ref(false)

// Load cart from localStorage on initialization
const loadCart = () => {
  try {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      cartItems.value = JSON.parse(savedCart)
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error)
  }
}

// Save cart to localStorage
const saveCart = () => {
  try {
    localStorage.setItem('cart', JSON.stringify(cartItems.value))
  } catch (error) {
    console.error('Error saving cart to localStorage:', error)
  }
}

// Watch for changes and save automatically
watch(cartItems, saveCart, { deep: true })

// Computed properties
const totalItems = computed(() => {
  return cartItems.value.reduce((total, item) => total + item.quantity, 0)
})

const subtotal = computed(() => {
  return cartItems.value.reduce((total, item) => {
    return total + (item.product.price * item.quantity)
  }, 0)
})

const total = computed(() => {
  // Add shipping, tax, etc. in a real app
  return subtotal.value
})

const currency = computed(() => {
  return cartItems.value[0]?.product.currency || 'USD'
})

// Methods
const addToCart = (product: Product, quantity = 1, selectedColor?: string, selectedSize?: string) => {
  const existingItemIndex = cartItems.value.findIndex(item =>
    item.product.id === product.id &&
    item.selectedColor === selectedColor &&
    item.selectedSize === selectedSize
  )

  if (existingItemIndex >= 0) {
    // Update quantity if item already exists
    cartItems.value[existingItemIndex].quantity += quantity
  } else {
    // Add new item
    const newItem: CartItemExtended = {
      id: `${product.id}-${selectedColor || ''}-${selectedSize || ''}-${Date.now()}`,
      product,
      quantity,
      selectedColor,
      selectedSize,
      addedAt: new Date().toISOString()
    }
    cartItems.value.push(newItem)
  }
}

const removeFromCart = (itemId: string) => {
  const index = cartItems.value.findIndex(item => item.id === itemId)
  if (index >= 0) {
    cartItems.value.splice(index, 1)
  }
}

const updateQuantity = (itemId: string, quantity: number) => {
  const item = cartItems.value.find(item => item.id === itemId)
  if (item) {
    if (quantity <= 0) {
      removeFromCart(itemId)
    } else {
      item.quantity = Math.min(quantity, item.product.inventory)
    }
  }
}

const clearCart = () => {
  cartItems.value = []
}

const isInCart = (productId: string, selectedColor?: string, selectedSize?: string) => {
  return cartItems.value.some(item =>
    item.product.id === productId &&
    item.selectedColor === selectedColor &&
    item.selectedSize === selectedSize
  )
}

const getCartItem = (productId: string, selectedColor?: string, selectedSize?: string) => {
  return cartItems.value.find(item =>
    item.product.id === productId &&
    item.selectedColor === selectedColor &&
    item.selectedSize === selectedSize
  )
}

// Initialize cart on first use
loadCart()

export function useCart() {
  return {
    // State
    cartItems: readonly(cartItems),
    isLoading: readonly(isLoading),

    // Computed
    totalItems,
    subtotal,
    total,
    currency,

    // Methods
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
    getCartItem
  }
}