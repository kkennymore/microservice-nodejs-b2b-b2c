<template>
  <div class="order-review">
    <div class="order-review__header">
      <h2 class="order-review__title">Review Your Order</h2>
      <p class="order-review__subtitle">Please review your order details before placing your order</p>
    </div>

    <!-- Order Items -->
    <div class="order-review__section">
      <h3 class="order-review__section-title">Order Items</h3>

      <div class="order-review__items">
        <div
          v-for="item in cartItems"
          :key="item.id"
          class="order-review__item"
        >
          <div class="order-review__item-image">
            <OptimizedImage
              :src="item.product.images[0] || '/placeholder-product.jpg'"
              :alt="item.product.name"
              class="order-review__item-img"
              :width="60"
              :height="60"
            />
          </div>

          <div class="order-review__item-info">
            <h4 class="order-review__item-name">{{ item.product.name }}</h4>
            <div class="order-review__item-details">
              <span v-if="item.selectedColor" class="order-review__item-variant">
                Color: {{ item.selectedColor }}
              </span>
              <span v-if="item.selectedSize" class="order-review__item-variant">
                Size: {{ item.selectedSize }}
              </span>
              <span class="order-review__item-seller">by {{ item.product.seller.name }}</span>
            </div>
            <div class="order-review__item-price">
              {{ formatCurrency(item.product.price, item.product.currency) }} × {{ item.quantity }}
            </div>
          </div>

          <div class="order-review__item-total">
            {{ formatCurrency(item.product.price * item.quantity, item.product.currency) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Shipping Address -->
    <div class="order-review__section">
      <div class="order-review__section-header">
        <h3 class="order-review__section-title">Shipping Address</h3>
        <Button variant="link" size="sm" @click="$emit('edit-shipping')">
          Edit
        </Button>
      </div>

      <div class="order-review__address">
        <p class="order-review__address-name">{{ shippingAddress.fullName }}</p>
        <p class="order-review__address-line">{{ shippingAddress.address }}</p>
        <p v-if="shippingAddress.apartment" class="order-review__address-line">
          {{ shippingAddress.apartment }}
        </p>
        <p class="order-review__address-line">
          {{ shippingAddress.city }}, {{ shippingAddress.state }} {{ shippingAddress.zipCode }}
        </p>
        <p class="order-review__address-line">{{ shippingAddress.country }}</p>
        <p v-if="shippingAddress.phone" class="order-review__address-line">
          Phone: {{ shippingAddress.phone }}
        </p>
      </div>
    </div>

    <!-- Payment Method -->
    <div class="order-review__section">
      <div class="order-review__section-header">
        <h3 class="order-review__section-title">Payment Method</h3>
        <Button variant="link" size="sm" @click="$emit('edit-payment')">
          Edit
        </Button>
      </div>

      <div class="order-review__payment">
        <div v-if="paymentMethod.method === 'card'" class="order-review__card">
          <div class="order-review__card-info">
            <svg class="order-review__card-icon" viewBox="0 0 24 24" fill="currentColor">
              <rect width="24" height="24" rx="4"/>
              <path d="M4 6h16v2H4z" fill="white"/>
              <path d="M4 10h16v2H4z" fill="white"/>
              <path d="M4 14h8v2H4z" fill="white"/>
            </svg>
            <div>
              <p class="order-review__card-number">
                **** **** **** {{ paymentMethod.cardData?.number?.slice(-4) }}
              </p>
              <p class="order-review__card-expiry">Expires {{ paymentMethod.cardData?.expiry }}</p>
            </div>
          </div>
        </div>

        <div v-else-if="paymentMethod.method === 'paypal'" class="order-review__paypal">
          <svg class="order-review__paypal-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.23 1.527-.727 2.51-1.446 3.287-.76.817-1.53 1.31-2.36 1.31H9.38c-.21 0-.375.166-.318.37l.684 2.52c.07.204.384.37.595.37h2.61c2.483 0 4.43.558 5.48 1.634.906.95 1.222 2.15.882 3.738-.283 1.303-.863 2.224-1.616 2.744-.828.57-1.704.83-2.546.83h-2.52c-.636 0-1.063-.57-1.04-1.2l.388-13.077c.01-.07.044-.13.085-.13h3.72c.66 0 1.25-.054 1.772-.17.404-.09.65-.246.65-.354 0-.05-.043-.08-.104-.08H9.74c-.564 0-1.01.45-1.05 1.005l-.276 9.33c-.007.21-.18.375-.39.375H6.29c-.21 0-.39-.165-.39-.375l-.406-13.59c-.01-.21-.18-.375-.39-.375H.99c-.21 0-.39.165-.39.375L.21 20.6c-.007.21.17.375.38.375h5.51c.21 0 .39-.165.39-.375l.303-10.235c.007-.21.18-.375.39-.375h3.72c.66 0 1.25-.054 1.772-.17.404-.09.65-.246.65-.354 0-.05-.043-.08-.104-.08H7.077c-.564 0-1.01.45-1.05 1.005l-.276 9.33c-.007.21-.18.375-.39.375H3.29c-.21 0-.39-.165-.39-.375l-.406-13.59c-.01-.21-.18-.375-.39-.375H.49c-.21 0-.39.165-.39.375L0 20.85c-.007.21.17.375.38.375h5.51c.21 0 .39-.165.39-.375l.303-10.235z"/>
          </svg>
          <span>PayPal</span>
        </div>

        <div v-else-if="paymentMethod.method === 'digital'" class="order-review__digital">
          <svg class="order-review__digital-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
            <path d="M4 9h16v2H4z" fill="white"/>
          </svg>
          <span>Digital Wallet</span>
        </div>
      </div>
    </div>

    <!-- Order Summary -->
    <div class="order-review__summary">
      <h3 class="order-review__summary-title">Order Summary</h3>

      <div class="order-review__summary-row">
        <span class="order-review__summary-label">Subtotal</span>
        <span class="order-review__summary-value">{{ formatCurrency(subtotal, currency) }}</span>
      </div>

      <div class="order-review__summary-row">
        <span class="order-review__summary-label">Shipping</span>
        <span class="order-review__summary-value">{{ formatCurrency(shipping, currency) }}</span>
      </div>

      <div v-if="tax > 0" class="order-review__summary-row">
        <span class="order-review__summary-label">Tax</span>
        <span class="order-review__summary-value">{{ formatCurrency(tax, currency) }}</span>
      </div>

      <div v-if="discount > 0" class="order-review__summary-row order-review__summary-row--discount">
        <span class="order-review__summary-label">Discount</span>
        <span class="order-review__summary-value">-{{ formatCurrency(discount, currency) }}</span>
      </div>

      <div class="order-review__summary-divider"></div>

      <div class="order-review__summary-row order-review__summary-row--total">
        <span class="order-review__summary-label">Total</span>
        <span class="order-review__summary-value">{{ formatCurrency(total, currency) }}</span>
      </div>
    </div>

    <!-- Terms and Conditions -->
    <div class="order-review__terms">
      <label class="order-review__terms-checkbox">
        <input
          type="checkbox"
          v-model="acceptTerms"
        />
        <span class="order-review__checkmark"></span>
        I agree to the <router-link to="/terms" class="order-review__terms-link">Terms of Service</router-link>
        and <router-link to="/privacy" class="order-review__terms-link">Privacy Policy</router-link>
      </label>
    </div>

    <!-- Actions -->
    <div class="order-review__actions">
      <Button
        variant="outline"
        size="lg"
        @click="$emit('back')"
        class="order-review__back-btn"
      >
        Back to Payment
      </Button>

      <Button
        variant="primary"
        size="lg"
        @click="placeOrder"
        :loading="placingOrder"
        :disabled="!acceptTerms"
        class="order-review__place-order-btn"
      >
        Place Order
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import type { CartItemExtended } from '@/composables/useCart'
import OptimizedImage from '@/components/OptimizedImage.vue'
import Button from '@/components/Button.vue'

interface Props {
  cartItems: CartItemExtended[]
  shippingAddress: any
  paymentMethod: any
  subtotal: number
  shipping: number
  tax: number
  discount: number
  currency: string
}

const props = withDefaults(defineProps<Props>(), {
  shipping: 9.99,
  tax: 0,
  discount: 0
})

const emit = defineEmits<{
  'edit-shipping': []
  'edit-payment': []
  placeOrder: [orderData: any]
  back: []
}>()

const { formatCurrency } = useCurrency()

const acceptTerms = ref(false)
const placingOrder = ref(false)

const total = computed(() => {
  return props.subtotal + props.shipping + props.tax - props.discount
})

const placeOrder = () => {
  if (!acceptTerms.value) return

  placingOrder.value = true

  const orderData = {
    items: props.cartItems,
    shippingAddress: props.shippingAddress,
    paymentMethod: props.paymentMethod,
    summary: {
      subtotal: props.subtotal,
      shipping: props.shipping,
      tax: props.tax,
      discount: props.discount,
      total: total.value
    }
  }

  // Simulate order placement
  setTimeout(() => {
    emit('placeOrder', orderData)
    placingOrder.value = false
  }, 2000)
}
</script>

<style scoped>
.order-review {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}

.order-review__header {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.order-review__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.order-review__subtitle {
  font-size: var(--font-size-base);
  color: var(--text-muted);
  margin: 0;
}

.order-review__section {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
  border-bottom: 1px solid var(--border-color);
}

.order-review__section:last-of-type {
  border-bottom: none;
  margin-bottom: var(--spacing-lg);
}

.order-review__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.order-review__section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}

.order-review__items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.order-review__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-light);
  border-radius: var(--border-radius-md);
}

.order-review__item-image {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.order-review__item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-review__item-info {
  flex: 1;
}

.order-review__item-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.order-review__item-details {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: var(--spacing-xs);
}

.order-review__item-variant {
  padding: 2px var(--spacing-xs);
  background: var(--bg-white);
  border-radius: var(--border-radius-sm);
}

.order-review__item-seller {
  font-style: italic;
}

.order-review__item-price {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-review__item-total {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-dark);
}

.order-review__address,
.order-review__payment {
  padding: var(--spacing-lg);
  background: var(--bg-light);
  border-radius: var(--border-radius-md);
}

.order-review__address-name {
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.order-review__address-line {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}

.order-review__card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.order-review__card-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.order-review__card-icon {
  width: 40px;
  height: 24px;
  color: var(--primary-color);
}

.order-review__card-number {
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 2px;
}

.order-review__card-expiry {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-review__paypal,
.order-review__digital {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-weight: 600;
  color: var(--text-dark);
}

.order-review__paypal-icon {
  width: 80px;
  height: 24px;
  color: #0070ba;
}

.order-review__digital-icon {
  width: 32px;
  height: 24px;
  color: var(--primary-color);
}

.order-review__summary {
  background: var(--bg-light);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.order-review__summary-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-lg);
}

.order-review__summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.order-review__summary-label {
  font-size: var(--font-size-base);
  color: var(--text-muted);
}

.order-review__summary-value {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-dark);
}

.order-review__summary-row--discount .order-review__summary-value {
  color: var(--success-color);
}

.order-review__summary-row--total {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.order-review__summary-row--total .order-review__summary-label,
.order-review__summary-row--total .order-review__summary-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text-dark);
}

.order-review__summary-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--spacing-md) 0;
}

.order-review__terms {
  margin-bottom: var(--spacing-xl);
}

.order-review__terms-checkbox {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-dark);
  line-height: 1.5;
}

.order-review__checkmark {
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  position: relative;
  background: var(--bg-white);
  margin-top: 2px;
  flex-shrink: 0;
}

.order-review__terms-checkbox input:checked + .order-review__checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: bold;
}

.order-review__terms-link {
  color: var(--primary-color);
  text-decoration: none;
}

.order-review__terms-link:hover {
  text-decoration: underline;
}

.order-review__actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: space-between;
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.order-review__back-btn,
.order-review__place-order-btn {
  flex: 1;
  max-width: 200px;
}

@media (max-width: 768px) {
  .order-review {
    padding: var(--spacing-lg);
  }

  .order-review__item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .order-review__item-info {
    width: 100%;
  }

  .order-review__item-total {
    align-self: flex-end;
  }

  .order-review__section-header {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: flex-start;
  }

  .order-review__actions {
    flex-direction: column;
  }

  .order-review__back-btn,
  .order-review__place-order-btn {
    max-width: none;
  }
}
</style>