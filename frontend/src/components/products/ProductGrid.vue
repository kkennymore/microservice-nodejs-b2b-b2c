<template>
  <div class="product-grid">
    <div class="product-grid__header" v-if="$slots.header">
      <slot name="header" />
    </div>

    <div class="product-grid__container">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        :show-wishlist="showWishlist"
        @add-to-cart="handleAddToCart"
        @toggle-wishlist="handleToggleWishlist"
      />
    </div>

    <div class="product-grid__loading" v-if="loading">
      <div class="product-grid__skeleton" v-for="i in skeletonCount" :key="i">
        <div class="product-grid__skeleton-image"></div>
        <div class="product-grid__skeleton-content">
          <div class="product-grid__skeleton-line product-grid__skeleton-line--short"></div>
          <div class="product-grid__skeleton-line product-grid__skeleton-line--medium"></div>
          <div class="product-grid__skeleton-line product-grid__skeleton-line--long"></div>
        </div>
      </div>
    </div>

    <div class="product-grid__empty" v-if="!loading && products.length === 0">
      <div class="product-grid__empty-content">
        <svg class="product-grid__empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M20 7l-8-4-8 4v10l8 4 8-4z"/>
          <path d="M16 13l-8-4"/>
          <path d="M16 17l-8-4"/>
          <path d="M12 21V9"/>
        </svg>
        <h3 class="product-grid__empty-title">{{ emptyTitle }}</h3>
        <p class="product-grid__empty-description">{{ emptyDescription }}</p>
        <Button v-if="showEmptyAction" variant="primary" @click="$emit('empty-action')">
          {{ emptyActionText }}
        </Button>
      </div>
    </div>

    <div class="product-grid__footer" v-if="$slots.footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types'
import ProductCard from './ProductCard.vue'
import Button from '@/components/Button.vue'

interface Props {
  products: Product[]
  loading?: boolean
  showWishlist?: boolean
  skeletonCount?: number
  emptyTitle?: string
  emptyDescription?: string
  showEmptyAction?: boolean
  emptyActionText?: string
  columns?: 2 | 3 | 4 | 5 | 6
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showWishlist: true,
  skeletonCount: 8,
  emptyTitle: 'No products found',
  emptyDescription: 'Try adjusting your search or filters to find what you\'re looking for.',
  showEmptyAction: false,
  emptyActionText: 'Browse All Products',
  columns: 4
})

const emit = defineEmits<{
  addToCart: [product: Product]
  toggleWishlist: [product: Product]
  emptyAction: []
}>()

const gridColumns = computed(() => {
  return `repeat(${props.columns}, 1fr)`
})

const handleAddToCart = (product: Product) => {
  emit('addToCart', product)
}

const handleToggleWishlist = (product: Product) => {
  emit('toggleWishlist', product)
}
</script>

<style scoped>
.product-grid {
  width: 100%;
}

.product-grid__header {
  margin-bottom: var(--spacing-xl);
}

.product-grid__container {
  display: grid;
  grid-template-columns: v-bind(gridColumns);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

@media (max-width: 1200px) {
  .product-grid__container {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .product-grid__container {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .product-grid__container {
    grid-template-columns: 1fr;
  }
}

.product-grid__loading {
  display: grid;
  grid-template-columns: v-bind(gridColumns);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

@media (max-width: 1200px) {
  .product-grid__loading {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .product-grid__loading {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .product-grid__loading {
    grid-template-columns: 1fr;
  }
}

.product-grid__skeleton {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.product-grid__skeleton-image {
  aspect-ratio: 1;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.product-grid__skeleton-content {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.product-grid__skeleton-line {
  height: 16px;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--border-radius-sm);
}

.product-grid__skeleton-line--short {
  width: 60%;
}

.product-grid__skeleton-line--medium {
  width: 80%;
}

.product-grid__skeleton-line--long {
  width: 100%;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.product-grid__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: var(--spacing-xl);
}

.product-grid__empty-content {
  text-align: center;
  max-width: 400px;
}

.product-grid__empty-icon {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

.product-grid__empty-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.product-grid__empty-description {
  font-size: var(--font-size-base);
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

.product-grid__footer {
  margin-top: var(--spacing-xl);
}
</style>