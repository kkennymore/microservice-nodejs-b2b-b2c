import { ref, computed, readonly } from 'vue'
import type { Product } from '@/types'

export interface SearchFilters {
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  [key: string]: any
}

export interface SearchResult {
  query: string
  processed_query: string
  products: Product[]
  total: number
  page: number
  limit: number
  total_pages: number
  facets: {
    categories: Array<{ key: string; doc_count: number }>
    brands: Array<{ key: string; doc_count: number }>
    price_ranges: Array<{ key: string; from?: number; to?: number; doc_count: number }>
    stats: {
      avg_rating: number
      min_price: number
      max_price: number
    }
  }
  sort_by: string
  from_cache: boolean
}

export interface SearchSuggestion {
  text: string
  type: 'query' | 'product' | 'category' | 'brand'
  reference_id?: string
  count?: number
}

export interface PopularSearch {
  term: string
  search_count: number
  category?: string
  trend_score: number
}

export interface SearchAnalytics {
  period: string
  start_date: Date
  end_date: Date
  analytics: {
    total_queries: number
    unique_queries: number
    zero_result_queries: number
    avg_response_time: number
    total_results_returned: number
  }
  top_queries: Array<{ query_text: string; count: number }>
}

// Search state
const searchResults = ref<SearchResult | null>(null)
const searchSuggestions = ref<SearchSuggestion[]>([])
const popularSearches = ref<PopularSearch[]>([])
const searchAnalytics = ref<SearchAnalytics | null>(null)
const isSearching = ref(false)
const isLoadingSuggestions = ref(false)
const searchError = ref<string | null>(null)
const lastSearchQuery = ref<string>('')

// Current search parameters
const currentQuery = ref('')
const currentFilters = ref<SearchFilters>({})
const currentSortBy = ref('relevance')
const currentPage = ref(1)
const currentLimit = ref(20)

// API base URL
const API_BASE = import.meta.env.VITE_SEARCH_API_URL || 'http://localhost:3015/api'

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (err) {
    searchError.value = err instanceof Error ? err.message : 'Search failed'
    throw err
  }
}

// Main search function
const performSearch = async (options: {
  query?: string
  filters?: SearchFilters
  sortBy?: string
  page?: number
  limit?: number
} = {}) => {
  const {
    query = currentQuery.value,
    filters = currentFilters.value,
    sortBy = currentSortBy.value,
    page = currentPage.value,
    limit = currentLimit.value
  } = options

  // Update current state
  currentQuery.value = query
  currentFilters.value = filters
  currentSortBy.value = sortBy
  currentPage.value = page
  currentLimit.value = limit

  isSearching.value = true
  searchError.value = null

  try {
    const searchPayload = {
      q: query,
      ...filters,
      sortBy,
      page,
      limit
    }

    const response = await apiCall('/search', {
      method: 'POST',
      body: JSON.stringify(searchPayload)
    })

    searchResults.value = response.data
    lastSearchQuery.value = query

    return response.data
  } catch (err) {
    console.error('Search error:', err)
    throw err
  } finally {
    isSearching.value = false
  }
}

// Get autocomplete suggestions
const getAutocompleteSuggestions = async (query: string, limit = 10) => {
  if (!query.trim()) {
    searchSuggestions.value = []
    return []
  }

  isLoadingSuggestions.value = true

  try {
    const response = await apiCall(`/search/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}`)
    searchSuggestions.value = response.data.suggestions
    return response.data.suggestions
  } catch (err) {
    console.error('Autocomplete error:', err)
    searchSuggestions.value = []
    return []
  } finally {
    isLoadingSuggestions.value = false
  }
}

// Get search suggestions
const getSearchSuggestions = async (query?: string, type?: string, limit = 5) => {
  try {
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (type) params.append('type', type)
    params.append('limit', limit.toString())

    const response = await apiCall(`/search/suggestions?${params}`)
    return response.data.suggestions
  } catch (err) {
    console.error('Suggestions error:', err)
    return []
  }
}

// Get related searches
const getRelatedSearches = async (query: string, limit = 5) => {
  try {
    const response = await apiCall(`/search/related/${encodeURIComponent(query)}?limit=${limit}`)
    return response.data.related_searches
  } catch (err) {
    console.error('Related searches error:', err)
    return []
  }
}

// Get popular searches
const getPopularSearches = async (limit = 10, category?: string) => {
  try {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (category) params.append('category', category)

    const response = await apiCall(`/search/popular?${params}`)
    popularSearches.value = response.data.popular_searches
    return response.data.popular_searches
  } catch (err) {
    console.error('Popular searches error:', err)
    popularSearches.value = []
    return []
  }
}

// Get search analytics
const getSearchAnalytics = async (period = '30d') => {
  try {
    const response = await apiCall(`/search/analytics?period=${period}`)
    searchAnalytics.value = response.data
    return response.data
  } catch (err) {
    console.error('Analytics error:', err)
    return null
  }
}

// Spell check
const checkSpelling = async (word: string) => {
  try {
    const response = await apiCall(`/search/spellcheck/${encodeURIComponent(word)}`)
    return response.data
  } catch (err) {
    console.error('Spell check error:', err)
    return null
  }
}

// Update search filters
const updateFilters = (newFilters: Partial<SearchFilters>) => {
  currentFilters.value = { ...currentFilters.value, ...newFilters }
}

// Clear filters
const clearFilters = () => {
  currentFilters.value = {}
}

// Change sort order
const changeSort = (sortBy: string) => {
  currentSortBy.value = sortBy
}

// Go to next/previous page
const goToPage = (page: number) => {
  if (page >= 1 && page <= (searchResults.value?.total_pages || 1)) {
    currentPage.value = page
    return performSearch({ page })
  }
}

// Clear search results
const clearSearch = () => {
  searchResults.value = null
  currentQuery.value = ''
  currentFilters.value = {}
  currentPage.value = 1
  searchError.value = null
}

// Computed properties
const hasResults = computed(() => {
  return searchResults.value && searchResults.value.total > 0
})

const hasMorePages = computed(() => {
  return searchResults.value && currentPage.value < searchResults.value.total_pages
})

const isFirstPage = computed(() => currentPage.value === 1)

const isLastPage = computed(() => {
  return searchResults.value && currentPage.value === searchResults.value.total_pages
})

const resultRange = computed(() => {
  if (!searchResults.value) return null

  const start = (currentPage.value - 1) * currentLimit.value + 1
  const end = Math.min(currentPage.value * currentLimit.value, searchResults.value.total)

  return { start, end, total: searchResults.value.total }
})

const activeFiltersCount = computed(() => {
  return Object.values(currentFilters.value).filter(value =>
    value !== undefined && value !== null && value !== ''
  ).length
})

// Quick search presets
const searchPresets = {
  electronics: { category: 'electronics', sortBy: 'popularity' },
  fashion: { category: 'fashion', sortBy: 'newest' },
  books: { category: 'books', sortBy: 'rating' },
  under50: { maxPrice: 50, sortBy: 'relevance' },
  onSale: { minPrice: 0, sortBy: 'price_asc' }
}

// Apply search preset
const applySearchPreset = (presetName: keyof typeof searchPresets) => {
  const preset = searchPresets[presetName]
  currentFilters.value = { ...preset }
  currentSortBy.value = preset.sortBy || 'relevance'
  currentPage.value = 1
}

export function useSearch() {
  return {
    // State
    searchResults: readonly(searchResults),
    searchSuggestions: readonly(searchSuggestions),
    popularSearches: readonly(popularSearches),
    searchAnalytics: readonly(searchAnalytics),
    isSearching: readonly(isSearching),
    isLoadingSuggestions: readonly(isLoadingSuggestions),
    searchError: readonly(searchError),
    lastSearchQuery: readonly(lastSearchQuery),

    // Current search parameters
    currentQuery: readonly(currentQuery),
    currentFilters: readonly(currentFilters),
    currentSortBy: readonly(currentSortBy),
    currentPage: readonly(currentPage),
    currentLimit: readonly(currentLimit),

    // Computed
    hasResults,
    hasMorePages,
    isFirstPage,
    isLastPage,
    resultRange,
    activeFiltersCount,

    // Methods
    performSearch,
    getAutocompleteSuggestions,
    getSearchSuggestions,
    getRelatedSearches,
    getPopularSearches,
    getSearchAnalytics,
    checkSpelling,
    updateFilters,
    clearFilters,
    changeSort,
    goToPage,
    clearSearch,
    applySearchPreset,

    // Clear error
    clearError: () => { searchError.value = null }
  }
}