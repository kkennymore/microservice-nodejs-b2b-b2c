<template>
  <div class="checkout-page">
    <div class="container">
      <!-- Redirect if cart is empty -->
      <div v-if="totalItems === 0 && !loading" class="checkout-page__empty">
        <div class="checkout-page__empty-content">
          <h2>Your cart is empty</h2>
          <p>Add some items to your cart before checking out.</p>
          <router-link to="/products">
            <Button variant="primary" size="lg">Continue Shopping</Button>
          </router-link>
        </div>
      </div>

      <!-- Checkout Process -->
      <div v-else class="checkout-page__content">
        <!-- Progress Steps -->
        <CheckoutSteps
          :current-step="currentStep"
          :completed-steps="completedSteps"
        />

        <!-- Step Content -->
        <div class="checkout-page__step-content">
          <!-- Shipping Step -->
          <ShippingForm
            v-if="currentStep === 'shipping'"
            v-model="shippingData"
            @submit="handleShippingSubmit"
          />

          <!-- Payment Step -->
          <PaymentForm
            v-if="currentStep === 'payment'"
            v-model="paymentData"
            :shipping-address="shippingData"
            @submit="handlePaymentSubmit"
            @back="goToShipping"
          />

          <!-- Review Step -->
          <OrderReview
            v-if="currentStep === 'review'"
            :cart-items="cartItems"
            :shipping-address="shippingData"
            :payment-method="paymentData"
            :subtotal="subtotal"
            :shipping="shipping"
            :tax="tax"
            :discount="discount"
            :currency="currency"
            @edit-shipping="goToShipping"
            @edit-payment="goToPayment"
            @place-order="handlePlaceOrder"
            @back="goToPayment"
          />
        </div>

        <!-- Order Success Modal -->
        <Modal v-model="showSuccessModal" title="Order Placed Successfully!">
          <div class="checkout-page__success-content">
            <div class="checkout-page__success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke="#10b981"/>
                <path d="M9 12l2 2 4-4" stroke="#10b981" stroke-width="2"/>
              </svg>
            </div>
            <h3 class="checkout-page__success-title">Thank you for your order!</h3>
            <p class="checkout-page__success-message">
              Your order has been placed successfully. You'll receive an email confirmation shortly.
            </p>
            <div class="checkout-page__order-info">
              <p><strong>Order ID:</strong> {{ orderId }}</p>
              <p><strong>Estimated Delivery:</strong> 3-5 business days</p>
            </div>
          </div>

          <div class="checkout-page__success-actions">
            <router-link to="/orders">
              <Button variant="outline">View Order</Button>
            </router-link>
            <router-link to="/products">
              <Button variant="primary">Continue Shopping</Button>
            </router-link>
          </div>
        </Modal>

        <!-- Loading Overlay -->
        <div v-if="placingOrder" class="checkout-page__loading-overlay">
          <div class="checkout-page__loading-content">
            <div class="checkout-page__spinner"></div>
            <h3>Processing your order...</h3>
            <p>Please don't close this window.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCart } from '@/composables/useCart'
import { useCurrency } from '@/composables/useCurrency'
import CheckoutSteps from '@/components/checkout/CheckoutSteps.vue'
import ShippingForm from '@/components/checkout/ShippingForm.vue'
import PaymentForm from '@/components/checkout/PaymentForm.vue'
import OrderReview from '@/components/checkout/OrderReview.vue'
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
  clearCart
} = useCart()

// Checkout state
const currentStep = ref<'shipping' | 'payment' | 'review'>('shipping')
const completedSteps = ref<string[]>([])
const loading = ref(true)
const placingOrder = ref(false)
const showSuccessModal = ref(false)
const orderId = ref('')

// Form data
const shippingData = ref({
  email: '',
  phone: '',
  fullName: '',
  country: 'US',
  address: '',
  apartment: '',
  city: '',
  state: '',
  zipCode: '',
  saveAddress: false
})

const paymentData = ref({
  method: 'card',
  cardData: {
    number: '',
    expiry: '',
    cvv: '',
    billingAddress: '',
    billingCity: '',
    billingZip: ''
  }
})

// Computed properties
const shipping = ref(9.99)
const tax = ref(0)
const discount = ref(0)

// Methods
const goToShipping = () => {
  currentStep.value = 'shipping'
}

const goToPayment = () => {
  currentStep.value = 'payment'
}

const goToReview = () => {
  currentStep.value = 'review'
}

const handleShippingSubmit = (data: any) => {
  shippingData.value = data
  completedSteps.value = ['shipping']
  goToPayment()
}

const handlePaymentSubmit = (data: any) => {
  paymentData.value = data
  completedSteps.value = ['shipping', 'payment']
  goToReview()
}

const handlePlaceOrder = async (orderData: any) => {
  placingOrder.value = true

  try {
    // Simulate API call to place order
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Generate order ID
    orderId.value = 'ORD-' + Date.now()

    // Clear cart
    clearCart()

    // Show success modal
    showSuccessModal.value = true

  } catch (error) {
    console.error('Error placing order:', error)
    // Handle error (show error message)
  } finally {
    placingOrder.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Check if cart is empty
  if (totalItems.value === 0) {
    loading.value = false
    return
  }

  // Pre-fill shipping data from user profile if available
  // In a real app, this would come from user state/store
  loading.value = false
})
</script>

<style scoped>
.checkout-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.checkout-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.checkout-page__empty-content {
  text-align: center;
}

.checkout-page__empty-content h2 {
  color: var(--text-dark);
  margin-bottom: var(--spacing-md);
}

.checkout-page__empty-content p {
  color: var(--text-muted);
  margin-bottom: var(--spacing-xl);
}

.checkout-page__content {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-xl);
  max-width: 800px;
  margin: 0 auto;
}

.checkout-page__step-content {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
}

.checkout-page__success-content {
  text-align: center;
  padding: var(--spacing-lg) 0;
}

.checkout-page__success-icon {
  margin-bottom: var(--spacing-lg);
}

.checkout-page__success-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-md);
}

.checkout-page__success-message {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}

.checkout-page__order-info {
  background: var(--bg-light);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-xl);
}

.checkout-page__order-info p {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
}

.checkout-page__order-info p:last-child {
  margin-bottom: 0;
}

.checkout-page__success-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.checkout-page__loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.checkout-page__loading-content {
  background: var(--bg-white);
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-lg);
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.checkout-page__spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-lg) auto;
}

.checkout-page__loading-content h3 {
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.checkout-page__loading-content p {
  color: var(--text-muted);
  margin: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .checkout-page__content {
    gap: var(--spacing-lg);
  }

  .checkout-page__step-content {
    margin: 0 calc(-1 * var(--spacing-lg));
  }

  .checkout-page__success-actions {
    flex-direction: column;
  }
}
</style>