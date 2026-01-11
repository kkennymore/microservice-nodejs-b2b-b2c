<template>
  <div class="products-page">
    <div class="container">
      <!-- Page Header -->
      <div class="products-page__header">
        <h1 class="products-page__title">
          {{ category ? `${category} Products` : 'All Products' }}
        </h1>
        <p class="products-page__subtitle">
          Discover amazing products from trusted sellers worldwide
        </p>
      </div>

      <!-- Filters and Search -->
      <ProductFilters
        v-model="filters"
        @update:modelValue="handleFiltersChange"
      />

      <!-- Results Summary -->
      <div class="products-page__results">
        <p class="products-page__count">
          {{ loading ? 'Loading...' : `${pagination.total} products found` }}
        </p>

        <!-- View Toggle -->
        <div class="products-page__view-toggle">
          <button
            :class="['products-page__view-btn', { 'products-page__view-btn--active': viewMode === 'grid' }]"
            @click="viewMode = 'grid'"
            aria-label="Grid view"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            :class="['products-page__view-btn', { 'products-page__view-btn--active': viewMode === 'list' }]"
            @click="viewMode = 'list'"
            aria-label="List view"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Products Grid -->
      <ProductGrid
        :products="products"
        :loading="loading"
        :columns="viewMode === 'grid' ? 4 : 1"
        empty-title="No products found"
        empty-description="Try adjusting your search criteria or browse our featured products."
        show-empty-action
        empty-action-text="Browse All Products"
        @add-to-cart="handleAddToCart"
        @toggle-wishlist="handleToggleWishlist"
        @empty-action="clearFilters"
      />

      <!-- Pagination -->
      <div v-if="!loading && pagination.totalPages > 1" class="products-page__pagination">
        <Button
          variant="outline"
          size="sm"
          :disabled="pagination.page <= 1"
          @click="goToPage(pagination.page - 1)"
        >
          Previous
        </Button>

        <div class="products-page__page-numbers">
          <button
            v-for="page in visiblePages"
            :key="page"
            :class="[
              'products-page__page-btn',
              { 'products-page__page-btn--active': page === pagination.page }
            ]"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          :disabled="pagination.page >= pagination.totalPages"
          @click="goToPage(pagination.page + 1)"
        >
          Next
        </Button>
      </div>

      <!-- Loading More -->
      <div v-if="loadingMore" class="products-page__loading-more">
        <div class="products-page__spinner"></div>
        <span>Loading more products...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSEO } from '@/composables/useSEO'
import { useCurrency } from '@/composables/useCurrency'
import productsAPI from '@/services/productsAPI'
import type { Product, SearchFilters, PaginatedResponse } from '@/types'
import ProductFilters from '@/components/products/ProductFilters.vue'
import ProductGrid from '@/components/products/ProductGrid.vue'
import Button from '@/components/Button.vue'

const route = useRoute()
const router = useRouter()
const { setSEO, generateWebsiteStructuredData } = useSEO()
const { formatCurrency } = useCurrency()

// Reactive state
const products = ref<Product[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const filters = ref<SearchFilters>({
  sortBy: 'newest',
  sortOrder: 'desc'
})
const pagination = ref({
  page: 1,
  limit: 24,
  total: 0,
  totalPages: 0
})
const viewMode = ref<'grid' | 'list'>('grid')

// Computed properties
const category = computed(() => route.query.category as string)
const searchQuery = computed(() => route.query.q as string)

const visiblePages = computed(() => {
  const current = pagination.value.page
  const total = pagination.value.totalPages
  const delta = 2
  const range = []
  const rangeWithDots = []

  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i)
  }

  if (current - delta > 2) {
    rangeWithDots.push(1, '...')
  } else {
    rangeWithDots.push(1)
  }

  rangeWithDots.push(...range)

  if (current + delta < total - 1) {
    rangeWithDots.push('...', total)
  } else if (total > 1) {
    rangeWithDots.push(total)
  }

  return rangeWithDots.filter(item => typeof item === 'number')
})

// Methods
const fetchProducts = async (page = 1, append = false) => {
  try {
    if (!append) {
      loading.value = true
    } else {
      loadingMore.value = true
    }

    const params = {
      ...filters.value,
      page,
      limit: pagination.value.limit,
      category: category.value
    }

    const response: PaginatedResponse<Product> = await productsAPI.getProducts(params)

    if (append) {
      products.value.push(...response.data)
    } else {
      products.value = response.data
    }

    pagination.value = response.pagination

    // Update URL query params
    const query = { ...route.query }
    if (filters.value.query) query.q = filters.value.query
    if (filters.value.category) query.category = filters.value.category
    if (page > 1) query.page = page.toString()

    router.replace({ query })

  } catch (error) {
    console.error('Error fetching products:', error)
    // Handle error (show toast notification)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const handleFiltersChange = (newFilters: SearchFilters) => {
  filters.value = newFilters
  fetchProducts(1)
}

const clearFilters = () => {
  filters.value = {
    sortBy: 'newest',
    sortOrder: 'desc'
  }
  router.replace({ query: {} })
  fetchProducts(1)
}

const goToPage = (page: number) => {
  fetchProducts(page)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleAddToCart = (product: Product) => {
  // Implement cart functionality
  console.log('Add to cart:', product)
  // This would typically emit an event or use a global cart store
}

const handleToggleWishlist = (product: Product) => {
  // Implement wishlist functionality
  console.log('Toggle wishlist:', product)
  // This would typically update a wishlist store
}

// Lifecycle
onMounted(() => {
  // Initialize filters from URL query
  if (searchQuery.value) {
    filters.value.query = searchQuery.value
  }
  if (route.query.page) {
    pagination.value.page = parseInt(route.query.page as string, 10)
  }
  if (route.query.sortBy) {
    filters.value.sortBy = route.query.sortBy as any
  }

  fetchProducts(pagination.value.page)

  // Set SEO
  setSEO({
    title: category.value ? `${category.value} Products - Multivendor Marketplace` : 'Products - Multivendor Marketplace',
    description: 'Browse our extensive collection of products from trusted sellers worldwide. Find exactly what you need with our advanced search and filtering options.',
    url: window.location.href,
    structuredData: generateWebsiteStructuredData()
  })
})

// Watch for route changes (back/forward navigation)
watch(() => route.query, (newQuery) => {
  if (newQuery.q !== searchQuery.value || newQuery.category !== category.value) {
    filters.value.query = newQuery.q as string
    fetchProducts(1)
  }
})

// Cleanup
onUnmounted(() => {
  // Cleanup if needed
})
</script>

<style scoped>
.products-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.products-page__header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.products-page__title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.products-page__subtitle {
  font-size: var(--font-size-lg);
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
}

.products-page__results {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.products-page__count {
  font-size: var(--font-size-base);
  color: var(--text-muted);
  margin: 0;
}

.products-page__view-toggle {
  display: flex;
  gap: var(--spacing-xs);
}

.products-page__view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  background: var(--bg-white);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-muted);
}

.products-page__view-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.products-page__view-btn--active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-light);
}

.products-page__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.products-page__page-numbers {
  display: flex;
  gap: var(--spacing-xs);
}

.products-page__page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  background: var(--bg-white);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-dark);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.products-page__page-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.products-page__page-btn--active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-light);
}

.products-page__loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  color: var(--text-muted);
}

.products-page__spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
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

  .products-page__title {
    font-size: var(--font-size-2xl);
  }

  .products-page__results {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .products-page__view-toggle {
    justify-content: center;
  }

  .products-page__pagination {
    flex-wrap: wrap;
  }

  .products-page__page-numbers {
    order: -1;
    width: 100%;
    justify-content: center;
  }
}
</style>