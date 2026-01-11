<template>
  <div class="cart-item">
    <div class="cart-item__image">
      <OptimizedImage
        :src="item.product.images[0] || '/placeholder-product.jpg'"
        :alt="item.product.name"
        class="cart-item__img"
        :width="80"
        :height="80"
      />
    </div>

    <div class="cart-item__content">
      <div class="cart-item__info">
        <router-link :to="`/product/${item.product.id}`" class="cart-item__title">
          {{ item.product.name }}
        </router-link>

        <div class="cart-item__seller">
          <span>by {{ item.product.seller.name }}</span>
          <svg v-if="item.product.seller.verified" class="cart-item__verified-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>

        <div v-if="item.selectedColor || item.selectedSize" class="cart-item__variants">
          <span v-if="item.selectedColor" class="cart-item__variant">
            Color: <span class="cart-item__variant-value">{{ item.selectedColor }}</span>
          </span>
          <span v-if="item.selectedSize" class="cart-item__variant">
            Size: <span class="cart-item__variant-value">{{ item.selectedSize }}</span>
          </span>
        </div>

        <div class="cart-item__price">
          {{ formatCurrency(item.product.price, item.product.currency) }}
        </div>
      </div>

      <div class="cart-item__actions">
        <div class="cart-item__quantity">
          <button
            class="cart-item__quantity-btn"
            @click="decrementQuantity"
            :disabled="item.quantity <= 1"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <input
            v-model.number="localQuantity"
            type="number"
            min="1"
            :max="item.product.inventory"
            class="cart-item__quantity-input"
            @change="updateQuantity"
          />
          <button
            class="cart-item__quantity-btn"
            @click="incrementQuantity"
            :disabled="item.quantity >= item.product.inventory"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          class="cart-item__remove-btn"
          @click="removeItem"
          aria-label="Remove item from cart"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="cart-item__total">
      {{ formatCurrency(item.product.price * item.quantity, item.product.currency) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import type { CartItemExtended } from '@/composables/useCart'
import OptimizedImage from '@/components/OptimizedImage.vue'

interface Props {
  item: CartItemExtended
}

const props = defineProps<Props>()

const emit = defineEmits<{
  updateQuantity: [itemId: string, quantity: number]
  removeItem: [itemId: string]
}>()

const { formatCurrency } = useCurrency()
const localQuantity = ref(props.item.quantity)

// Watch for external changes to quantity
watch(() => props.item.quantity, (newQuantity) => {
  localQuantity.value = newQuantity
})

const incrementQuantity = () => {
  if (localQuantity.value < props.item.product.inventory) {
    localQuantity.value++
    updateQuantity()
  }
}

const decrementQuantity = () => {
  if (localQuantity.value > 1) {
    localQuantity.value--
    updateQuantity()
  }
}

const updateQuantity = () => {
  emit('updateQuantity', props.item.id, localQuantity.value)
}

const removeItem = () => {
  emit('removeItem', props.item.id)
}
</script>

<style scoped>
.cart-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-fast);
}

.cart-item:hover {
  box-shadow: var(--shadow-md);
}

.cart-item__image {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.cart-item__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item__content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.cart-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.cart-item__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-dark);
  text-decoration: none;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cart-item__title:hover {
  color: var(--primary-color);
}

.cart-item__seller {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.cart-item__verified-icon {
  color: var(--success-color);
}

.cart-item__variants {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.cart-item__variant-value {
  font-weight: 500;
  color: var(--text-dark);
}

.cart-item__price {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-dark);
}

.cart-item__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.cart-item__quantity {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.cart-item__quantity-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-white);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-base);
  font-weight: 600;
}

.cart-item__quantity-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.cart-item__quantity-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cart-item__quantity-input {
  width: 50px;
  height: 28px;
  text-align: center;
  border: 1px solid var(--border-color);
  border-left: none;
  border-right: none;
  background: var(--bg-white);
  font-size: var(--font-size-sm);
}

.cart-item__remove-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-white);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-muted);
}

.cart-item__remove-btn:hover {
  border-color: var(--danger-color);
  color: var(--danger-color);
  background: rgba(220, 53, 69, 0.1);
}

.cart-item__total {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text-dark);
  text-align: right;
  min-width: 100px;
}

@media (max-width: 768px) {
  .cart-item {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .cart-item__content {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .cart-item__actions {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .cart-item__total {
    text-align: left;
    font-size: var(--font-size-base);
  }
}

@media (max-width: 480px) {
  .cart-item__quantity {
    flex: 1;
  }

  .cart-item__remove-btn {
    flex-shrink: 0;
  }
}
</style>