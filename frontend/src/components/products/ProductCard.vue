<template>
  <div class="product-card" @click="handleCardClick">
    <div class="product-card__image-container">
      <OptimizedImage
        :src="product.images[0] || '/placeholder-product.jpg'"
        :alt="product.name"
        class="product-card__image"
        :width="300"
        :height="300"
      />
      <div v-if="product.originalPrice && product.originalPrice > product.price" class="product-card__badge product-card__badge--sale">
        {{ Math.round((1 - product.price / product.originalPrice) * 100) }}% OFF
      </div>
      <div v-if="!product.inStock" class="product-card__badge product-card__badge--out-of-stock">
        Out of Stock
      </div>
      <button
        class="product-card__wishlist-btn"
        @click.stop="toggleWishlist"
        :class="{ 'product-card__wishlist-btn--active': isInWishlist }"
        aria-label="Add to wishlist"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>

    <div class="product-card__content">
      <div class="product-card__seller">
        <img
          v-if="product.seller.avatar"
          :src="product.seller.avatar"
          :alt="product.seller.name"
          class="product-card__seller-avatar"
        />
        <span class="product-card__seller-name">{{ product.seller.name }}</span>
        <svg v-if="product.seller.verified" class="product-card__verified-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>

      <h3 class="product-card__title">{{ product.name }}</h3>

      <div class="product-card__rating">
        <div class="product-card__stars">
          <svg
            v-for="star in 5"
            :key="star"
            :class="['product-card__star', { 'product-card__star--filled': star <= Math.floor(product.rating) }]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <span class="product-card__rating-text">
          {{ product.rating.toFixed(1) }} ({{ product.reviewCount }})
        </span>
      </div>

      <div class="product-card__price">
        <span class="product-card__current-price">
          {{ formatCurrency(product.price, product.currency) }}
        </span>
        <span v-if="product.originalPrice && product.originalPrice > product.price" class="product-card__original-price">
          {{ formatCurrency(product.originalPrice, product.currency) }}
        </span>
      </div>

      <div v-if="product.colors && product.colors.length > 0" class="product-card__colors">
        <span class="product-card__colors-label">Colors:</span>
        <div class="product-card__color-options">
          <div
            v-for="color in product.colors.slice(0, 4)"
            :key="color"
            class="product-card__color-option"
            :style="{ backgroundColor: color }"
          ></div>
          <span v-if="product.colors.length > 4" class="product-card__color-more">+{{ product.colors.length - 4 }}</span>
        </div>
      </div>

      <div class="product-card__actions">
        <Button
          v-if="product.inStock"
          variant="primary"
          size="sm"
          @click.stop="addToCart"
          :loading="addingToCart"
        >
          Add to Cart
        </Button>
        <Button
          v-else
          variant="outline"
          size="sm"
          disabled
        >
          Out of Stock
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrency } from '@/composables/useCurrency'
import type { Product } from '@/types'
import Button from '@/components/Button.vue'
import OptimizedImage from '@/components/OptimizedImage.vue'

interface Props {
  product: Product
  showWishlist?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showWishlist: true
})

const emit = defineEmits<{
  addToCart: [product: Product]
  toggleWishlist: [product: Product]
}>()

const router = useRouter()
const { formatCurrency } = useCurrency()

// Local state for wishlist (would be managed globally in a real app)
const isInWishlist = ref(false)
const addingToCart = ref(false)

const handleCardClick = () => {
  router.push(`/product/${props.product.id}`)
}

const addToCart = () => {
  addingToCart.value = true
  emit('addToCart', props.product)
  // Reset loading state after a short delay
  setTimeout(() => {
    addingToCart.value = false
  }, 1000)
}

const toggleWishlist = () => {
  isInWishlist.value = !isInWishlist.value
  emit('toggleWishlist', props.product)
}
</script>

<style scoped>
.product-card {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all var(--transition-fast);
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.product-card__image-container {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.product-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-fast);
}

.product-card:hover .product-card__image {
  transform: scale(1.05);
}

.product-card__badge {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  padding: calc(var(--spacing-xs) / 2) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.product-card__badge--sale {
  background: var(--danger-color);
  color: var(--text-light);
}

.product-card__badge--out-of-stock {
  background: var(--text-muted);
  color: var(--text-light);
}

.product-card__wishlist-btn {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  backdrop-filter: blur(10px);
}

.product-card__wishlist-btn:hover {
  background: var(--bg-white);
  transform: scale(1.1);
}

.product-card__wishlist-btn--active {
  color: var(--danger-color);
}

.product-card__content {
  padding: var(--spacing-md);
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.product-card__seller {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.product-card__seller-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.product-card__verified-icon {
  color: var(--success-color);
}

.product-card__title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-dark);
  line-height: 1.3;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card__rating {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.product-card__stars {
  display: flex;
  gap: 2px;
}

.product-card__star {
  color: var(--text-muted);
}

.product-card__star--filled {
  color: #ffc107;
}

.product-card__rating-text {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.product-card__price {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xs);
}

.product-card__current-price {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text-dark);
}

.product-card__original-price {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  text-decoration: line-through;
}

.product-card__colors {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.product-card__color-options {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.product-card__color-option {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
}

.product-card__color-more {
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.product-card__actions {
  margin-top: auto;
  padding-top: var(--spacing-sm);
}
</style>