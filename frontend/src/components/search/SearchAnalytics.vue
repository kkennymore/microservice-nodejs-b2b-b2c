<template>
  <div class="search-analytics">
    <div class="analytics-header">
      <h3 class="analytics-title">Search Analytics</h3>
      <div class="analytics-controls">
        <select v-model="selectedPeriod" @change="loadAnalytics" class="period-select">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
        <button @click="loadAnalytics" class="refresh-btn" :disabled="isLoading">
          <svg v-if="!isLoading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23,4 23,10 17,10"/>
            <polyline points="1,20 1,14 7,14"/>
            <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4l-4.64,4.36A9,9,0,0,1,3.51,15"/>
          </svg>
          <div v-else class="spinner"></div>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading analytics...</p>
    </div>

    <div v-else-if="analytics" class="analytics-content">
      <!-- Overview Cards -->
      <div class="analytics-cards">
        <div class="analytics-card">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatNumber(analytics.analytics.total_queries) }}</div>
            <div class="card-label">Total Queries</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatNumber(analytics.analytics.unique_queries) }}</div>
            <div class="card-label">Unique Queries</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatNumber(analytics.analytics.zero_result_queries) }}</div>
            <div class="card-label">No Results</div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatTime(analytics.analytics.avg_response_time) }}</div>
            <div class="card-label">Avg Response</div>
          </div>
        </div>
      </div>

      <!-- Top Search Terms -->
      <div class="analytics-section">
        <h4 class="section-title">Top Search Terms</h4>
        <div class="top-terms">
          <div
            v-for="(term, index) in analytics.top_queries"
            :key="term.query_text"
            class="term-item"
          >
            <div class="term-rank">{{ index + 1 }}</div>
            <div class="term-content">
              <div class="term-text">{{ term.query_text }}</div>
              <div class="term-count">{{ formatNumber(term.count) }} searches</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Conversion Rate -->
      <div v-if="analytics.analytics.total_results_returned > 0" class="analytics-section">
        <h4 class="section-title">Performance Metrics</h4>
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">Results per Query</div>
            <div class="metric-value">
              {{ (analytics.analytics.total_results_returned / analytics.analytics.total_queries).toFixed(1) }}
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Success Rate</div>
            <div class="metric-value">
              {{ (((analytics.analytics.total_queries - analytics.analytics.zero_result_queries) / analytics.analytics.total_queries) * 100).toFixed(1) }}%
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Query Diversity</div>
            <div class="metric-value">
              {{ ((analytics.analytics.unique_queries / analytics.analytics.total_queries) * 100).toFixed(1) }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!isLoading" class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <h4>No analytics data available</h4>
      <p>Data will appear as users perform searches</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSearch } from '@/composables/useSearch'

const { getSearchAnalytics } = useSearch()

const selectedPeriod = ref('30d')
const isLoading = ref(false)
const analytics = ref<any>(null)

// Methods
const loadAnalytics = async () => {
  isLoading.value = true
  try {
    analytics.value = await getSearchAnalytics(selectedPeriod.value)
  } catch (error) {
    console.error('Failed to load analytics:', error)
  } finally {
    isLoading.value = false
  }
}

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatTime = (ms: number) => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  } else {
    return `${(ms / 1000).toFixed(2)}s`
  }
}

// Initialize
onMounted(() => {
  loadAnalytics()
})
</script>

<style scoped>
.search-analytics {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.analytics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.analytics-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.analytics-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.period-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}

.empty-icon {
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.empty-state h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
}

.analytics-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.analytics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.analytics-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.card-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: var(--primary-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.card-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.analytics-section {
  padding: 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.top-terms {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.term-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
}

.term-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.term-content {
  flex: 1;
}

.term-text {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.term-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.metric-item {
  text-align: center;
  padding: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
}

.metric-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* Responsive design */
@media (max-width: 768px) {
  .analytics-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .analytics-controls {
    justify-content: center;
  }

  .analytics-cards {
    grid-template-columns: 1fr;
  }

  .analytics-card {
    padding: 0.75rem;
  }

  .card-icon {
    width: 32px;
    height: 32px;
  }

  .card-value {
    font-size: 1.25rem;
  }

  .top-terms {
    gap: 0.5rem;
  }

  .term-item {
    padding: 0.5rem;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>