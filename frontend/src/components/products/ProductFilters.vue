<template>
  <div class="product-filters">
    <div class="product-filters__search">
      <div class="product-filters__search-input">
        <svg class="product-filters__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search products..."
          class="product-filters__input"
          @input="handleSearchInput"
        />
        <Button
          v-if="searchQuery"
          variant="ghost"
          size="sm"
          @click="clearSearch"
          class="product-filters__clear-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </Button>
      </div>
    </div>

    <div class="product-filters__controls">
      <div class="product-filters__sort">
        <label class="product-filters__label">Sort by:</label>
        <select v-model="sortBy" class="product-filters__select" @change="handleFiltersChange">
          <option value="newest">Newest</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      <Button
        variant="outline"
        size="sm"
        @click="toggleFilters"
        class="product-filters__toggle-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filters
        <span v-if="activeFiltersCount > 0" class="product-filters__filter-count">
          ({{ activeFiltersCount }})
        </span>
      </Button>
    </div>

    <div v-if="showFilters" class="product-filters__panel">
      <div class="product-filters__group">
        <h4 class="product-filters__group-title">Price Range</h4>
        <div class="product-filters__price-range">
          <Input
            v-model="minPrice"
            type="number"
            placeholder="Min price"
            size="sm"
            @input="handlePriceChange"
          />
          <span class="product-filters__price-separator">-</span>
          <Input
            v-model="maxPrice"
            type="number"
            placeholder="Max price"
            size="sm"
            @input="handlePriceChange"
          />
        </div>
      </div>

      <div class="product-filters__group">
        <h4 class="product-filters__group-title">Rating</h4>
        <div class="product-filters__rating-options">
          <label
            v-for="rating in [4, 3, 2, 1]"
            :key="rating"
            class="product-filters__rating-option"
          >
            <input
              type="radio"
              :value="rating"
              v-model="minRating"
              @change="handleFiltersChange"
            />
            <span class="product-filters__rating-stars">
              <svg
                v-for="star in 5"
                :key="star"
                :class="['product-filters__star', { 'product-filters__star--filled': star <= rating }]"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </span>
            & Up
          </label>
        </div>
      </div>

      <div class="product-filters__group">
        <h4 class="product-filters__group-title">Availability</h4>
        <label class="product-filters__checkbox">
          <input
            type="checkbox"
            v-model="inStockOnly"
            @change="handleFiltersChange"
          />
          <span class="product-filters__checkmark"></span>
          In stock only
        </label>
      </div>

      <div class="product-filters__actions">
        <Button variant="outline" size="sm" @click="clearAllFilters">
          Clear All
        </Button>
        <Button variant="primary" size="sm" @click="applyFilters">
          Apply Filters
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import type { SearchFilters } from '@/types'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

interface Props {
  modelValue: SearchFilters
  debounceDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  debounceDelay: 300
})

const emit = defineEmits<{
  'update:modelValue': [filters: SearchFilters]
}>()

const showFilters = ref(false)
const searchQuery = ref('')
const sortBy = ref('newest')
const minPrice = ref('')
const maxPrice = ref('')
const minRating = ref<number | null>(null)
const inStockOnly = ref(false)

// Debounced search
const { debouncedValue: debouncedSearch } = useDebounce(searchQuery, props.debounceDelay)

const activeFiltersCount = computed(() => {
  let count = 0
  if (minPrice.value || maxPrice.value) count++
  if (minRating.value) count++
  if (inStockOnly.value) count++
  return count
})

const handleSearchInput = () => {
  emit('update:modelValue', {
    ...props.modelValue,
    query: debouncedSearch.value
  })
}

const handlePriceChange = () => {
  const filters = { ...props.modelValue }
  if (minPrice.value) {
    filters.minPrice = parseFloat(minPrice.value)
  } else {
    delete filters.minPrice
  }
  if (maxPrice.value) {
    filters.maxPrice = parseFloat(maxPrice.value)
  } else {
    delete filters.maxPrice
  }
  emit('update:modelValue', filters)
}

const handleFiltersChange = () => {
  const filters: SearchFilters = {
    ...props.modelValue,
    sortBy: sortBy.value as any,
    sortOrder: sortBy.value.includes('low') ? 'asc' : sortBy.value.includes('high') ? 'desc' : 'desc'
  }

  if (minRating.value) {
    filters.rating = minRating.value
  } else {
    delete filters.rating
  }

  if (inStockOnly.value) {
    filters.inStock = true
  } else {
    delete filters.inStock
  }

  emit('update:modelValue', filters)
}

const clearSearch = () => {
  searchQuery.value = ''
  emit('update:modelValue', {
    ...props.modelValue,
    query: undefined
  })
}

const clearAllFilters = () => {
  searchQuery.value = ''
  sortBy.value = 'newest'
  minPrice.value = ''
  maxPrice.value = ''
  minRating.value = null
  inStockOnly.value = false

  emit('update:modelValue', {
    sortBy: 'newest',
    sortOrder: 'desc'
  })
}

const applyFilters = () => {
  handleFiltersChange()
  showFilters.value = false
}

const toggleFilters = () => {
  showFilters.value = !showFilters.value
}

// Sync with external changes
watch(() => props.modelValue, (newFilters) => {
  if (newFilters.query !== undefined) {
    searchQuery.value = newFilters.query || ''
  }
  if (newFilters.sortBy) {
    sortBy.value = newFilters.sortBy
  }
  if (newFilters.minPrice !== undefined) {
    minPrice.value = newFilters.minPrice?.toString() || ''
  }
  if (newFilters.maxPrice !== undefined) {
    maxPrice.value = newFilters.maxPrice?.toString() || ''
  }
  if (newFilters.rating !== undefined) {
    minRating.value = newFilters.rating
  }
  if (newFilters.inStock !== undefined) {
    inStockOnly.value = newFilters.inStock
  }
}, { immediate: true })
</script>

<style scoped>
.product-filters {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-xl);
}

.product-filters__search {
  margin-bottom: var(--spacing-lg);
}

.product-filters__search-input {
  position: relative;
  display: flex;
  align-items: center;
}

.product-filters__search-icon {
  position: absolute;
  left: var(--spacing-md);
  color: var(--text-muted);
  z-index: 1;
}

.product-filters__input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) calc(var(--spacing-md) + 24px);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  background: var(--bg-light);
  transition: border-color var(--transition-fast);
}

.product-filters__input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.product-filters__clear-btn {
  position: absolute;
  right: var(--spacing-xs);
  color: var(--text-muted);
}

.product-filters__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.product-filters__sort {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.product-filters__label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-dark);
}

.product-filters__select {
  padding: calc(var(--spacing-xs) / 2) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  background: var(--bg-white);
  cursor: pointer;
}

.product-filters__toggle-btn {
  position: relative;
}

.product-filters__filter-count {
  background: var(--primary-color);
  color: var(--text-light);
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: var(--spacing-xs);
}

.product-filters__panel {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.product-filters__group {
  margin-bottom: var(--spacing-lg);
}

.product-filters__group-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-md);
}

.product-filters__price-range {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.product-filters__price-separator {
  color: var(--text-muted);
  font-weight: 500;
}

.product-filters__rating-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.product-filters__rating-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.product-filters__rating-stars {
  display: flex;
  gap: 2px;
}

.product-filters__star {
  color: var(--text-muted);
}

.product-filters__star--filled {
  color: #ffc107;
}

.product-filters__checkbox {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.product-filters__checkmark {
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  position: relative;
  background: var(--bg-white);
}

.product-filters__checkbox input:checked + .product-filters__checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: bold;
}

.product-filters__actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .product-filters__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .product-filters__sort {
    justify-content: space-between;
  }

  .product-filters__actions {
    flex-direction: column;
  }
}
</style>