<template>
  <div class="cart-page">
    <div class="container">
      <!-- Page Header -->
      <div class="cart-page__header">
        <h1 class="cart-page__title">Shopping Cart</h1>
        <p v-if="totalItems > 0" class="cart-page__subtitle">
          {{ totalItems }} {{ totalItems === 1 ? 'item' : 'items' }} in your cart
        </p>
      </div>

      <!-- Empty Cart State -->
      <div v-if="totalItems === 0" class="cart-page__empty">
        <div class="cart-page__empty-content">
          <svg class="cart-page__empty-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="8" cy="21" r="2"/>
            <circle cx="20" cy="21" r="2"/>
            <path d="M5.67 6H18.33l.27 4.68L21 11.38V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7.62l2.7-1.7L5.67 6z"/>
            <path d="M9 11l3 3 6-6"/>
          </svg>
          <h2 class="cart-page__empty-title">Your cart is empty</h2>
          <p class="cart-page__empty-description">
            Looks like you haven't added anything to your cart yet.
          </p>
          <router-link to="/products">
            <Button variant="primary" size="lg">
              Start Shopping
            </Button>
          </router-link>
        </div>
      </div>

      <!-- Cart Content -->
      <div v-else class="cart-page__content">
        <!-- Cart Items -->
        <div class="cart-page__items">
          <div class="cart-page__items-header">
            <h2 class="cart-page__section-title">Cart Items</h2>
            <Button
              variant="ghost"
              size="sm"
              @click="clearCart"
              class="cart-page__clear-cart"
            >
              Clear Cart
            </Button>
          </div>

          <div class="cart-page__items-list">
            <CartItem
              v-for="item in cartItems"
              :key="item.id"
              :item="item"
              @update-quantity="updateItemQuantity"
              @remove-item="removeItem"
            />
          </div>

          <!-- Continue Shopping -->
          <div class="cart-page__continue-shopping">
            <router-link to="/products">
              <Button variant="outline" size="md">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 12H5"/>
                  <path d="M12 19l-7-7 7-7"/>
                </svg>
                Continue Shopping
              </Button>
            </router-link>
          </div>
        </div>

        <!-- Cart Summary Sidebar -->
        <div class="cart-page__summary">
          <CartSummary
            :subtotal="subtotal"
            :total-items="totalItems"
            :currency="currency"
            :shipping="estimatedShipping"
            :tax="estimatedTax"
            @checkout="proceedToCheckout"
            @continue-shopping="continueShopping"
          />
        </div>
      </div>

      <!-- Recently Viewed Products -->
      <div v-if="totalItems > 0 && recentlyViewed.length > 0" class="cart-page__recently-viewed">
        <h2 class="cart-page__section-title">Recently Viewed</h2>
        <ProductGrid
          :products="recentlyViewed"
          :columns="4"
          @add-to-cart="handleAddToCart"
          @toggle-wishlist="handleToggleWishlist"
        />
      </div>
    </div>

    <!-- Clear Cart Confirmation Modal -->
    <Modal v-model="showClearCartModal" title="Clear Cart">
      <p>Are you sure you want to remove all items from your cart? This action cannot be undone.</p>
      <div class="cart-page__modal-actions">
        <Button variant="outline" @click="showClearCartModal = false">
          Cancel
        </Button>
        <Button variant="danger" @click="confirmClearCart">
          Clear Cart
        </Button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCart } from '@/composables/useCart'
import { useCurrency } from '@/composables/useCurrency'
import type { Product } from '@/types'
import CartItem from '@/components/cart/CartItem.vue'
import CartSummary from '@/components/cart/CartSummary.vue'
import ProductGrid from '@/components/products/ProductGrid.vue'
import Button from '@/components/Button.vue'
import Modal from '@/components/Modal.vue'

const router = useRouter()
const { formatCurrency } = useCurrency()

// Cart composable
const {
  cartItems,
  totalItems,
  subtotal,
  currency,
  updateQuantity,
  removeFromCart,
  clearCart: clearCartItems
} = useCart()

// Local state
const showClearCartModal = ref(false)
const recentlyViewed = ref<Product[]>([])

// Mock recently viewed products (in real app, this would come from a service)
const mockRecentlyViewed = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    price: 79.99,
    originalPrice: 99.99,
    currency: 'USD',
    images: ['/placeholder-product.jpg'],
    rating: 4.5,
    reviewCount: 128,
    inStock: true,
    inventory: 50,
    seller: {
      id: 'seller1',
      name: 'TechStore',
      rating: 4.8,
      verified: true
    }
  },
  {
    id: '2',
    name: 'Smart Watch Series 5',
    price: 299.99,
    currency: 'USD',
    images: ['/placeholder-product.jpg'],
    rating: 4.7,
    reviewCount: 89,
    inStock: true,
    inventory: 25,
    seller: {
      id: 'seller2',
      name: 'GadgetHub',
      rating: 4.6,
      verified: true
    }
  }
]

// Computed properties
const estimatedShipping = ref(9.99) // In real app, calculate based on location/weight
const estimatedTax = ref(0) // In real app, calculate based on location

// Methods
const updateItemQuantity = (itemId: string, quantity: number) => {
  updateQuantity(itemId, quantity)
}

const removeItem = (itemId: string) => {
  removeFromCart(itemId)
}

const clearCart = () => {
  showClearCartModal.value = true
}

const confirmClearCart = () => {
  clearCartItems()
  showClearCartModal.value = false
}

const proceedToCheckout = () => {
  router.push('/checkout')
}

const continueShopping = () => {
  router.push('/products')
}

const handleAddToCart = (product: Product) => {
  // This would use the cart composable to add the product
  console.log('Add to cart from recently viewed:', product)
}

const handleToggleWishlist = (product: Product) => {
  console.log('Toggle wishlist from recently viewed:', product)
}

// Lifecycle
onMounted(() => {
  // Load recently viewed products (mock data for now)
  recentlyViewed.value = mockRecentlyViewed
})
</script>

<style scoped>
.cart-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.cart-page__header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.cart-page__title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.cart-page__subtitle {
  font-size: var(--font-size-lg);
  color: var(--text-muted);
}

.cart-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: var(--spacing-xl);
}

.cart-page__empty-content {
  text-align: center;
  max-width: 400px;
}

.cart-page__empty-icon {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

.cart-page__empty-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-md);
}

.cart-page__empty-description {
  font-size: var(--font-size-base);
  color: var(--text-muted);
  margin-bottom: var(--spacing-xl);
}

.cart-page__content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.cart-page__items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.cart-page__items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cart-page__section-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}

.cart-page__clear-cart {
  color: var(--danger-color);
}

.cart-page__clear-cart:hover {
  background: rgba(220, 53, 69, 0.1);
}

.cart-page__items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.cart-page__continue-shopping {
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.cart-page__summary {
  position: sticky;
  top: var(--spacing-lg);
  height: fit-content;
}

.cart-page__recently-viewed {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.cart-page__modal-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
}

@media (max-width: 1024px) {
  .cart-page__content {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .cart-page__summary {
    position: static;
    order: -1;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .cart-page__title {
    font-size: var(--font-size-2xl);
  }

  .cart-page__items-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .cart-page__clear-cart {
    align-self: flex-end;
  }
}
</style>