<template>
  <div class="cart-summary">
    <h3 class="cart-summary__title">Order Summary</h3>

    <div class="cart-summary__content">
      <div class="cart-summary__row">
        <span class="cart-summary__label">Subtotal ({{ totalItems }} items)</span>
        <span class="cart-summary__value">{{ formatCurrency(subtotal, currency) }}</span>
      </div>

      <div v-if="shipping > 0" class="cart-summary__row">
        <span class="cart-summary__label">Shipping</span>
        <span class="cart-summary__value">{{ formatCurrency(shipping, currency) }}</span>
      </div>

      <div v-if="tax > 0" class="cart-summary__row">
        <span class="cart-summary__label">Tax</span>
        <span class="cart-summary__value">{{ formatCurrency(tax, currency) }}</span>
      </div>

      <div v-if="discount > 0" class="cart-summary__row cart-summary__row--discount">
        <span class="cart-summary__label">Discount</span>
        <span class="cart-summary__value">-{{ formatCurrency(discount, currency) }}</span>
      </div>

      <div class="cart-summary__divider"></div>

      <div class="cart-summary__row cart-summary__row--total">
        <span class="cart-summary__label">Total</span>
        <span class="cart-summary__value">{{ formatCurrency(total, currency) }}</span>
      </div>
    </div>

    <div class="cart-summary__actions">
      <Button
        variant="primary"
        size="lg"
        @click="$emit('checkout')"
        :disabled="totalItems === 0"
        class="cart-summary__checkout-btn"
      >
        Proceed to Checkout
      </Button>

      <Button
        variant="outline"
        size="lg"
        @click="$emit('continue-shopping')"
        class="cart-summary__continue-btn"
      >
        Continue Shopping
      </Button>
    </div>

    <!-- Promo Code Section -->
    <div class="cart-summary__promo">
      <div class="cart-summary__promo-input">
        <Input
          v-model="promoCode"
          placeholder="Enter promo code"
          size="sm"
          @keyup.enter="applyPromoCode"
        />
        <Button
          variant="outline"
          size="sm"
          @click="applyPromoCode"
          :loading="applyingPromo"
          :disabled="!promoCode.trim()"
        >
          Apply
        </Button>
      </div>

      <div v-if="appliedPromo" class="cart-summary__applied-promo">
        <span class="cart-summary__promo-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          {{ appliedPromo.code }} applied
        </span>
        <button
          class="cart-summary__remove-promo"
          @click="removePromoCode"
          aria-label="Remove promo code"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Security Badges -->
    <div class="cart-summary__security">
      <div class="cart-summary__security-item">
        <svg class="cart-summary__security-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <circle cx="12" cy="16" r="1"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span class="cart-summary__security-text">Secure Checkout</span>
      </div>

      <div class="cart-summary__security-item">
        <svg class="cart-summary__security-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        <span class="cart-summary__security-text">SSL Encrypted</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

interface Props {
  subtotal: number
  totalItems: number
  currency: string
  shipping?: number
  tax?: number
  discount?: number
}

const props = withDefaults(defineProps<Props>(), {
  shipping: 0,
  tax: 0,
  discount: 0
})

const emit = defineEmits<{
  checkout: []
  'continue-shopping': []
}>()

const { formatCurrency } = useCurrency()

// Promo code state
const promoCode = ref('')
const appliedPromo = ref<{ code: string; discount: number } | null>(null)
const applyingPromo = ref(false)

// Computed
const total = computed(() => {
  return props.subtotal + props.shipping + props.tax - props.discount - (appliedPromo.value?.discount || 0)
})

// Methods
const applyPromoCode = async () => {
  if (!promoCode.value.trim()) return

  applyingPromo.value = true

  try {
    // In a real app, this would call an API
    // For now, simulate a promo code check
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (promoCode.value.toUpperCase() === 'SAVE10') {
      appliedPromo.value = {
        code: promoCode.value.toUpperCase(),
        discount: Math.min(props.subtotal * 0.1, 50) // 10% off or max $50
      }
      promoCode.value = ''
    } else {
      // Show error (in real app, use toast notification)
      console.log('Invalid promo code')
    }
  } catch (error) {
    console.error('Error applying promo code:', error)
  } finally {
    applyingPromo.value = false
  }
}

const removePromoCode = () => {
  appliedPromo.value = null
}
</script>

<style scoped>
.cart-summary {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  height: fit-content;
  position: sticky;
  top: var(--spacing-lg);
}

.cart-summary__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-lg);
}

.cart-summary__content {
  margin-bottom: var(--spacing-lg);
}

.cart-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.cart-summary__label {
  font-size: var(--font-size-base);
  color: var(--text-muted);
}

.cart-summary__value {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-dark);
}

.cart-summary__row--discount .cart-summary__value {
  color: var(--success-color);
}

.cart-summary__row--total {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.cart-summary__row--total .cart-summary__label,
.cart-summary__row--total .cart-summary__value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text-dark);
}

.cart-summary__divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--spacing-md) 0;
}

.cart-summary__actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.cart-summary__checkout-btn {
  width: 100%;
}

.cart-summary__continue-btn {
  width: 100%;
}

.cart-summary__promo {
  margin-bottom: var(--spacing-lg);
}

.cart-summary__promo-input {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.cart-summary__applied-promo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--success-light);
  border: 1px solid var(--success-color);
  border-radius: var(--border-radius-sm);
}

.cart-summary__promo-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--success-dark);
  font-weight: 500;
}

.cart-summary__remove-promo {
  background: none;
  border: none;
  font-size: var(--font-size-lg);
  cursor: pointer;
  color: var(--success-dark);
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color var(--transition-fast);
}

.cart-summary__remove-promo:hover {
  background: rgba(40, 167, 69, 0.1);
}

.cart-summary__security {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.cart-summary__security-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.cart-summary__security-icon {
  color: var(--success-color);
  flex-shrink: 0;
}

.cart-summary__security-text {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .cart-summary {
    position: static;
    order: -1;
  }

  .cart-summary__actions {
    flex-direction: column-reverse;
  }

  .cart-summary__continue-btn {
    order: -1;
  }
}
</style>