<template>
  <div class="search-results-page">
    <div class="container">
      <!-- Search Header -->
      <div class="search-results__header">
        <div class="search-results__query">
          <h1 class="search-results__title">
            {{ searchResults ? `Search results for "${lastSearchQuery}"` : 'Search Results' }}
          </h1>
          <p v-if="resultRange" class="search-results__summary">
            Showing {{ resultRange.start }}-{{ resultRange.end }} of {{ resultRange.total }} results
          </p>
        </div>

        <!-- Search Input -->
        <div class="search-results__search-bar">
          <div class="search-input-wrapper">
            <input
              v-model="searchInput"
              @keyup.enter="performNewSearch"
              type="text"
              class="search-input"
              placeholder="Search for products..."
              :disabled="isSearching"
            />
            <button
              @click="performNewSearch"
              class="search-btn"
              :disabled="isSearching || !searchInput.trim()"
            >
              <svg v-if="!isSearching" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <div v-else class="search-spinner"></div>
            </button>
          </div>

          <!-- Autocomplete Suggestions -->
          <div v-if="showSuggestions && searchSuggestions.length > 0" class="autocomplete-dropdown">
            <div
              v-for="suggestion in searchSuggestions"
              :key="suggestion.text"
              @click="selectSuggestion(suggestion)"
              class="autocomplete-item"
            >
              <div class="autocomplete-item__content">
                <span class="autocomplete-item__text">{{ suggestion.text }}</span>
                <span class="autocomplete-item__type">{{ suggestion.type }}</span>
              </div>
              <span v-if="suggestion.count" class="autocomplete-item__count">
                {{ suggestion.count }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="search-results__content">
        <!-- Filters Sidebar -->
        <aside class="search-filters">
          <div class="search-filters__header">
            <h3 class="search-filters__title">Filters</h3>
            <button
              v-if="activeFiltersCount > 0"
              @click="clearFilters"
              class="clear-filters-btn"
            >
              Clear All
            </button>
          </div>

          <!-- Categories -->
          <div v-if="searchResults?.facets.categories.length" class="filter-group">
            <h4 class="filter-group__title">Categories</h4>
            <div class="filter-options">
              <label
                v-for="category in searchResults.facets.categories.slice(0, 10)"
                :key="category.key"
                class="filter-option"
              >
                <input
                  v-model="selectedFilters.category"
                  :value="category.key"
                  type="radio"
                  name="category"
                  class="filter-checkbox"
                />
                <span class="filter-label">
                  {{ category.key }}
                  <span class="filter-count">({{ category.doc_count }})</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Brands -->
          <div v-if="searchResults?.facets.brands.length" class="filter-group">
            <h4 class="filter-group__title">Brands</h4>
            <div class="filter-options">
              <label
                v-for="brand in searchResults.facets.brands.slice(0, 10)"
                :key="brand.key"
                class="filter-option"
              >
                <input
                  v-model="selectedFilters.brand"
                  :value="brand.key"
                  type="radio"
                  name="brand"
                  class="filter-checkbox"
                />
                <span class="filter-label">
                  {{ brand.key }}
                  <span class="filter-count">({{ brand.doc_count }})</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Price Range -->
          <div class="filter-group">
            <h4 class="filter-group__title">Price Range</h4>
            <div class="price-range">
              <div class="price-inputs">
                <input
                  v-model.number="selectedFilters.minPrice"
                  type="number"
                  placeholder="Min"
                  class="price-input"
                  min="0"
                  step="0.01"
                />
                <span class="price-separator">-</span>
                <input
                  v-model.number="selectedFilters.maxPrice"
                  type="number"
                  placeholder="Max"
                  class="price-input"
                  min="0"
                  step="0.01"
                />
              </div>
              <button
                @click="applyPriceFilter"
                class="apply-price-btn"
                :disabled="!selectedFilters.minPrice && !selectedFilters.maxPrice"
              >
                Apply
              </button>
            </div>
          </div>

          <!-- In Stock Only -->
          <div class="filter-group">
            <label class="filter-option">
              <input
                v-model="selectedFilters.inStock"
                type="checkbox"
                class="filter-checkbox"
              />
              <span class="filter-label">In Stock Only</span>
            </label>
          </div>

          <!-- Active Filters -->
          <div v-if="activeFiltersCount > 0" class="active-filters">
            <h4 class="active-filters__title">Active Filters</h4>
            <div class="active-filters__list">
              <span
                v-if="selectedFilters.category"
                class="active-filter"
                @click="removeFilter('category')"
              >
                Category: {{ selectedFilters.category }}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </span>
              <span
                v-if="selectedFilters.brand"
                class="active-filter"
                @click="removeFilter('brand')"
              >
                Brand: {{ selectedFilters.brand }}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </span>
              <span
                v-if="selectedFilters.minPrice || selectedFilters.maxPrice"
                class="active-filter"
                @click="removePriceFilter"
              >
                Price: {{ selectedFilters.minPrice || 0 }} - {{ selectedFilters.maxPrice || '∞' }}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </span>
              <span
                v-if="selectedFilters.inStock"
                class="active-filter"
                @click="removeFilter('inStock')"
              >
                In Stock Only
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </span>
            </div>
          </div>
        </aside>

        <!-- Results Area -->
        <main class="search-results-main">
          <!-- Sort and View Controls -->
          <div class="search-controls">
            <div class="sort-controls">
              <label class="sort-label">Sort by:</label>
              <select v-model="selectedSortBy" @change="applySorting" class="sort-select">
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="rating">Highest Rated</option>
                <option value="popularity">Most Popular</option>
              </select>
            </div>

            <div class="view-controls">
              <button
                :class="['view-btn', { 'view-btn--active': viewMode === 'grid' }]"
                @click="viewMode = 'grid'"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </button>
              <button
                :class="['view-btn', { 'view-btn--active': viewMode === 'list' }]"
                @click="viewMode = 'list'"
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

          <!-- Loading State -->
          <div v-if="isSearching && !searchResults" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Searching...</p>
          </div>

          <!-- No Results -->
          <div v-else-if="!isSearching && !hasResults" class="no-results">
            <div class="no-results__icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
            <h3 class="no-results__title">No results found</h3>
            <p class="no-results__message">
              Try adjusting your search terms or filters
            </p>

            <!-- Suggestions -->
            <div v-if="popularSearches.length > 0" class="search-suggestions">
              <h4>Popular searches:</h4>
              <div class="suggestion-tags">
                <button
                  v-for="search in popularSearches.slice(0, 5)"
                  :key="search.term"
                  @click="performNewSearch(search.term)"
                  class="suggestion-tag"
                >
                  {{ search.term }}
                </button>
              </div>
            </div>
          </div>

          <!-- Results -->
          <div v-else-if="hasResults" :class="['results-grid', `results-grid--${viewMode}`]">
            <ProductCard
              v-for="product in searchResults.products"
              :key="product.id"
              :product="product"
              :show-score="showRelevanceScore"
              :relevance-score="product.relevance_score"
            />
          </div>

          <!-- Pagination -->
          <div v-if="hasResults && searchResults.total_pages > 1" class="pagination">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="isFirstPage"
              class="pagination-btn pagination-btn--prev"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              Previous
            </button>

            <div class="pagination-numbers">
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="goToPage(page)"
                :class="['pagination-number', { 'pagination-number--active': page === currentPage }]"
              >
                {{ page }}
              </button>
            </div>

            <button
              @click="goToPage(currentPage + 1)"
              :disabled="isLastPage"
              class="pagination-btn pagination-btn--next"
            >
              Next
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          </div>

          <!-- Related Searches -->
          <div v-if="hasResults && relatedSearches.length > 0" class="related-searches">
            <h4 class="related-searches__title">Related searches:</h4>
            <div class="related-searches__list">
              <button
                v-for="related in relatedSearches"
                :key="related.recommended_query"
                @click="performNewSearch(related.recommended_query)"
                class="related-search-btn"
              >
                {{ related.recommended_query }}
              </button>
            </div>
          </div>
        </main>
      </div>

      <!-- Error Message -->
      <div v-if="searchError" class="error-message">
        <p>{{ searchError }}</p>
        <button @click="clearError" class="error-message__close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearch } from '@/composables/useSearch'
import ProductCard from '@/components/products/ProductCard.vue'

const route = useRoute()
const router = useRouter()

const {
  searchResults,
  searchSuggestions,
  popularSearches,
  isSearching,
  searchError,
  lastSearchQuery,
  currentQuery,
  currentFilters,
  currentSortBy,
  currentPage,
  hasResults,
  hasMorePages,
  isFirstPage,
  isLastPage,
  resultRange,
  activeFiltersCount,
  performSearch,
  getAutocompleteSuggestions,
  getPopularSearches,
  getRelatedSearches,
  updateFilters,
  clearFilters,
  changeSort,
  goToPage,
  clearError
} = useSearch()

// Local state
const searchInput = ref('')
const selectedFilters = ref({
  category: '',
  brand: '',
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
  inStock: false
})
const selectedSortBy = ref('relevance')
const viewMode = ref<'grid' | 'list'>('grid')
const showSuggestions = ref(false)
const showRelevanceScore = ref(false)
const relatedSearches = ref<Array<{ recommended_query: string; confidence_score: number }>>([])

// Watch for route changes to sync search state
watch(() => route.query, (query) => {
  if (query.q) {
    searchInput.value = query.q as string
    performNewSearch(query.q as string)
  }
  if (query.category) selectedFilters.value.category = query.category as string
  if (query.brand) selectedFilters.value.brand = query.brand as string
  if (query.sort) selectedSortBy.value = query.sort as string
  if (query.page) goToPage(parseInt(query.page as string))
}, { immediate: true })

// Computed properties
const visiblePages = computed(() => {
  if (!searchResults.value) return []

  const total = searchResults.value.total_pages
  const current = currentPage.value
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

  return rangeWithDots.filter(item => typeof item === 'number') as number[]
})

// Methods
const performNewSearch = async (query?: string) => {
  const searchQuery = query || searchInput.value.trim()
  if (!searchQuery) return

  try {
    // Update URL
    router.push({
      path: '/search',
      query: {
        q: searchQuery,
        ...selectedFilters.value,
        sort: selectedSortBy.value
      }
    })

    await performSearch({
      query: searchQuery,
      filters: selectedFilters.value,
      sortBy: selectedSortBy.value,
      page: 1
    })

    // Get related searches
    relatedSearches.value = await getRelatedSearches(searchQuery)

    showSuggestions.value = false
  } catch (error) {
    console.error('Search failed:', error)
  }
}

const selectSuggestion = (suggestion: any) => {
  searchInput.value = suggestion.text
  performNewSearch(suggestion.text)
}

const applyPriceFilter = () => {
  updateFilters(selectedFilters.value)
  performNewSearch()
}

const applySorting = () => {
  changeSort(selectedSortBy.value)
  performNewSearch()
}

const removeFilter = (filterKey: string) => {
  if (filterKey === 'category') selectedFilters.value.category = ''
  if (filterKey === 'brand') selectedFilters.value.brand = ''
  if (filterKey === 'inStock') selectedFilters.value.inStock = false

  updateFilters(selectedFilters.value)
  performNewSearch()
}

const removePriceFilter = () => {
  selectedFilters.value.minPrice = undefined
  selectedFilters.value.maxPrice = undefined
  updateFilters(selectedFilters.value)
  performNewSearch()
}

// Autocomplete functionality
watch(searchInput, async (newValue) => {
  if (newValue && newValue.length > 2) {
    await getAutocompleteSuggestions(newValue)
    showSuggestions.value = true
  } else {
    showSuggestions.value = false
  }
})

// Initialize
onMounted(async () => {
  await getPopularSearches()

  // If we have a query in the URL, perform search
  if (route.query.q) {
    searchInput.value = route.query.q as string
    await performNewSearch()
  }
})
</script>

<style scoped>
.search-results-page {
  padding: 2rem 0;
  min-height: 100vh;
  background: var(--bg-secondary);
}

.search-results__header {
  margin-bottom: 2rem;
}

.search-results__query {
  margin-bottom: 2rem;
}

.search-results__title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.search-results__summary {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0;
}

.search-results__search-bar {
  position: relative;
  max-width: 600px;
}

.search-input-wrapper {
  display: flex;
  position: relative;
}

.search-input {
  flex: 1;
  padding: 1rem 1rem 1rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 12px 0 0 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1.1rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--primary-color);
}

.search-btn {
  padding: 0 1.5rem;
  background: var(--primary-color);
  color: white;
  border: 2px solid var(--primary-color);
  border-left: none;
  border-radius: 0 12px 12px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.search-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.autocomplete-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.autocomplete-item:hover {
  background: var(--bg-secondary);
}

.autocomplete-item__content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.autocomplete-item__text {
  font-weight: 500;
  color: var(--text-primary);
}

.autocomplete-item__type {
  font-size: 0.8rem;
  color: var(--text-muted);
  background: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  text-transform: capitalize;
}

.autocomplete-item__count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.search-results__content {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
}

.search-filters {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 2rem;
}

.search-filters__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.search-filters__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.clear-filters-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
}

.filter-group {
  margin-bottom: 2rem;
}

.filter-group__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem 0;
}

.filter-checkbox {
  width: 18px;
  height: 18px;
  margin: 0;
}

.filter-label {
  font-size: 0.9rem;
  color: var(--text-primary);
  flex: 1;
}

.filter-count {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.price-range {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.price-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.price-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.price-separator {
  color: var(--text-secondary);
  font-weight: 500;
}

.apply-price-btn {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.apply-price-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.apply-price-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.active-filters {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color-light);
}

.active-filters__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.active-filters__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.active-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--primary-color);
  color: white;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.active-filter:hover {
  background: var(--primary-dark);
}

.search-results-main {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.search-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sort-label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.sort-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.view-controls {
  display: flex;
  gap: 0.5rem;
}

.view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn:hover {
  border-color: var(--primary-color);
  color: var(--text-primary);
}

.view-btn--active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.loading-state,
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.no-results__icon {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.no-results__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.no-results__message {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.search-suggestions {
  margin-top: 2rem;
}

.search-suggestions h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.suggestion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.suggestion-tag {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-tag:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.results-grid {
  display: grid;
  gap: 1.5rem;
}

.results-grid--grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.results-grid--list {
  grid-template-columns: 1fr;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-numbers {
  display: flex;
  gap: 0.25rem;
}

.pagination-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-number:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination-number--active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.related-searches {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.related-searches__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.related-searches__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.related-search-btn {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.related-search-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.error-message {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: var(--error-color);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
}

.error-message__close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.error-message__close:hover {
  opacity: 1;
}

/* Responsive design */
@media (max-width: 1024px) {
  .search-results__content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .search-filters {
    position: static;
  }
}

@media (max-width: 768px) {
  .search-results__title {
    font-size: 1.5rem;
  }

  .search-controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .sort-controls {
    justify-content: center;
  }

  .view-controls {
    justify-content: center;
  }

  .results-grid--grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .pagination {
    flex-wrap: wrap;
  }

  .related-searches__list {
    justify-content: center;
  }
}
</style>