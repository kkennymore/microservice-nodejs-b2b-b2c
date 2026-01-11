<template>
  <div class="seo-dashboard">
    <div class="dashboard-header">
      <h2 class="dashboard-title">SEO Management</h2>
      <p class="dashboard-subtitle">Optimize your content for search engines</p>
    </div>

    <div class="dashboard-content">
      <!-- SEO Overview Cards -->
      <div class="overview-cards">
        <div class="overview-card">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-value">{{ overviewStats.totalPages }}</div>
            <div class="card-label">Pages Optimized</div>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-value">{{ overviewStats.avgScore }}%</div>
            <div class="card-label">Avg SEO Score</div>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-value">{{ overviewStats.indexedPages }}</div>
            <div class="card-label">Indexed Pages</div>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-value">{{ overviewStats.pendingAlerts }}</div>
            <div class="card-label">SEO Alerts</div>
          </div>
        </div>
      </div>

      <!-- Main Content Tabs -->
      <div class="dashboard-tabs">
        <div class="tabs-header">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-button', { 'tab-button--active': activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="tab-content">
          <!-- Page Optimization Tab -->
          <div v-if="activeTab === 'pages'" class="tab-panel">
            <div class="panel-header">
              <h3>Page Optimization</h3>
              <div class="panel-actions">
                <select v-model="selectedEntityType" @change="loadPages" class="entity-select">
                  <option value="page">Pages</option>
                  <option value="product">Products</option>
                  <option value="category">Categories</option>
                  <option value="brand">Brands</option>
                </select>
              </div>
            </div>

            <div class="pages-list">
              <div
                v-for="page in pages"
                :key="page.id"
                class="page-item"
                @click="editPageSEO(page)"
              >
                <div class="page-info">
                  <h4 class="page-title">{{ page.title || 'Untitled Page' }}</h4>
                  <p class="page-url">{{ page.url_path }}</p>
                  <div class="page-meta">
                    <span class="meta-score" :class="getScoreClass(page.seo_score)">
                      SEO: {{ page.seo_score || 0 }}/100
                    </span>
                    <span class="meta-status" :class="page.is_active ? 'status-active' : 'status-inactive'">
                      {{ page.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>
                <div class="page-actions">
                  <button class="action-btn action-btn--edit" @click.stop="editPageSEO(page)">
                    Edit SEO
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sitemap Management Tab -->
          <div v-if="activeTab === 'sitemap'" class="tab-panel">
            <div class="panel-header">
              <h3>Sitemap Management</h3>
              <div class="panel-actions">
                <button @click="generateSitemaps" :disabled="isGenerating" class="btn btn--primary">
                  {{ isGenerating ? 'Generating...' : 'Generate Sitemaps' }}
                </button>
              </div>
            </div>

            <div class="sitemap-info">
              <div v-for="sitemap in sitemaps" :key="sitemap.id" class="sitemap-item">
                <div class="sitemap-details">
                  <h4>{{ sitemap.sitemap_type }}</h4>
                  <p>{{ sitemap.total_urls }} URLs</p>
                  <small>Last generated: {{ formatDate(sitemap.last_generated) }}</small>
                </div>
                <div class="sitemap-status">
                  <span :class="sitemap.is_active ? 'status-active' : 'status-inactive'">
                    {{ sitemap.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Redirect Management Tab -->
          <div v-if="activeTab === 'redirects'" class="tab-panel">
            <div class="panel-header">
              <h3>Redirect Management</h3>
              <div class="panel-actions">
                <button @click="showCreateRedirect = true" class="btn btn--primary">
                  Add Redirect
                </button>
              </div>
            </div>

            <div class="redirects-list">
              <div
                v-for="redirect in redirects"
                :key="redirect.id"
                class="redirect-item"
              >
                <div class="redirect-info">
                  <div class="redirect-urls">
                    <span class="redirect-from">{{ redirect.old_url }}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                    <span class="redirect-to">{{ redirect.new_url }}</span>
                  </div>
                  <div class="redirect-meta">
                    <span class="redirect-type">{{ redirect.redirect_type }}</span>
                    <span class="redirect-count">{{ redirect.redirect_count }} uses</span>
                  </div>
                </div>
                <div class="redirect-actions">
                  <button @click="deleteRedirect(redirect.id)" class="action-btn action-btn--delete">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Analytics Tab -->
          <div v-if="activeTab === 'analytics'" class="tab-panel">
            <div class="panel-header">
              <h3>SEO Analytics</h3>
              <div class="panel-actions">
                <select v-model="analyticsPeriod" @change="loadAnalytics" class="period-select">
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>

            <div v-if="analytics" class="analytics-content">
              <div class="analytics-chart">
                <!-- Placeholder for chart - would use a charting library -->
                <div class="chart-placeholder">
                  <svg width="400" height="200" viewBox="0 0 400 200">
                    <path d="M0,100 Q100,50 200,100 T400,100" stroke="#3B82F6" stroke-width="2" fill="none"/>
                    <circle cx="200" cy="100" r="4" fill="#3B82F6"/>
                    <circle cx="250" cy="80" r="4" fill="#3B82F6"/>
                    <circle cx="300" cy="120" r="4" fill="#3B82F6"/>
                  </svg>
                  <p>SEO Performance Trend</p>
                </div>
              </div>

              <div class="analytics-metrics">
                <div class="metric-item">
                  <div class="metric-label">Avg. SEO Score</div>
                  <div class="metric-value">{{ analytics.avgScore || 0 }}%</div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">Pages Indexed</div>
                  <div class="metric-value">{{ analytics.indexedPages || 0 }}</div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">Organic Traffic</div>
                  <div class="metric-value">{{ analytics.organicTraffic || 0 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Redirect Modal -->
    <div v-if="showCreateRedirect" class="modal-overlay" @click.self="showCreateRedirect = false">
      <div class="modal">
        <div class="modal__header">
          <h3>Create Redirect</h3>
          <button @click="showCreateRedirect = false" class="modal-close">×</button>
        </div>
        <div class="modal__body">
          <form @submit.prevent="createNewRedirect">
            <div class="form-group">
              <label class="form-label">Old URL</label>
              <input
                v-model="redirectForm.oldUrl"
                type="url"
                class="form-input"
                placeholder="e.g., /old-page"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">New URL</label>
              <input
                v-model="redirectForm.newUrl"
                type="url"
                class="form-input"
                placeholder="e.g., /new-page"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Redirect Type</label>
              <select v-model="redirectForm.type" class="form-select">
                <option value="301">301 (Permanent)</option>
                <option value="302">302 (Temporary)</option>
              </select>
            </div>
            <div class="modal__actions">
              <button type="button" @click="showCreateRedirect = false" class="btn btn--outline">
                Cancel
              </button>
              <button type="submit" class="btn btn--primary">
                Create Redirect
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSEO } from '@/composables/useSEO'

const { getSEOAnalytics, generateSitemaps, createRedirect } = useSEO()

// State
const activeTab = ref('pages')
const selectedEntityType = ref('page')
const analyticsPeriod = ref('30d')
const showCreateRedirect = ref(false)
const isGenerating = ref(false)

const tabs = [
  { id: 'pages', label: 'Page Optimization' },
  { id: 'sitemap', label: 'Sitemaps' },
  { id: 'redirects', label: 'Redirects' },
  { id: 'analytics', label: 'Analytics' }
]

// Mock data - in real app, this would come from API
const overviewStats = ref({
  totalPages: 1250,
  avgScore: 78,
  indexedPages: 1150,
  pendingAlerts: 3
})

const pages = ref([
  {
    id: '1',
    title: 'Wireless Headphones',
    url_path: '/product/wireless-headphones',
    seo_score: 85,
    is_active: true
  },
  {
    id: '2',
    title: 'Electronics Category',
    url_path: '/category/electronics',
    seo_score: 92,
    is_active: true
  }
])

const sitemaps = ref([
  {
    id: '1',
    sitemap_type: 'Products',
    total_urls: 5000,
    last_generated: new Date(),
    is_active: true
  },
  {
    id: '2',
    sitemap_type: 'Categories',
    total_urls: 50,
    last_generated: new Date(),
    is_active: true
  }
])

const redirects = ref([
  {
    id: '1',
    old_url: '/old-product',
    new_url: '/product/new-product',
    redirect_type: '301',
    redirect_count: 45
  }
])

const analytics = ref(null)

const redirectForm = ref({
  oldUrl: '',
  newUrl: '',
  type: '301'
})

// Methods
const loadPages = async () => {
  // Load pages based on selected entity type
  console.log('Loading pages for:', selectedEntityType.value)
}

const editPageSEO = (page: any) => {
  // Navigate to SEO editor for this page
  console.log('Edit SEO for:', page)
}

const getScoreClass = (score: number) => {
  if (score >= 80) return 'score-good'
  if (score >= 60) return 'score-medium'
  return 'score-poor'
}

const generateSitemapsHandler = async () => {
  isGenerating.value = true
  try {
    await generateSitemaps()
    // Show success message
  } catch (error) {
    console.error('Failed to generate sitemaps:', error)
  } finally {
    isGenerating.value = false
  }
}

const createNewRedirect = async () => {
  try {
    await createRedirect(redirectForm.value.oldUrl, redirectForm.value.newUrl, redirectForm.value.type)
    redirectForm.value = { oldUrl: '', newUrl: '', type: '301' }
    showCreateRedirect.value = false
    // Reload redirects list
  } catch (error) {
    console.error('Failed to create redirect:', error)
  }
}

const deleteRedirect = (redirectId: string) => {
  if (confirm('Are you sure you want to delete this redirect?')) {
    // Delete redirect
    console.log('Delete redirect:', redirectId)
  }
}

const loadAnalytics = async () => {
  try {
    analytics.value = await getSEOAnalytics(undefined, undefined, analyticsPeriod.value)
  } catch (error) {
    console.error('Failed to load analytics:', error)
  }
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}

// Initialize
onMounted(() => {
  loadAnalytics()
})
</script>

<style scoped>
.seo-dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.dashboard-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.overview-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.card-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.dashboard-tabs {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.tab-button--active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: var(--bg-secondary);
}

.tab-content {
  padding: 2rem;
}

.tab-panel {
  min-height: 400px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.panel-header h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.panel-actions {
  display: flex;
  gap: 1rem;
}

.entity-select,
.period-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.pages-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-info {
  flex: 1;
}

.page-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.page-url {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.page-meta {
  display: flex;
  gap: 1rem;
}

.meta-score {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.meta-score.score-good {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.meta-score.score-medium {
  background: rgba(251, 191, 36, 0.1);
  color: #d97706;
}

.meta-score.score-poor {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.meta-status {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.meta-status.status-active {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.meta-status.status-inactive {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.page-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn--edit {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn--delete {
  border-color: var(--error-color);
  color: var(--error-color);
}

.sitemap-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sitemap-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.sitemap-details h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.sitemap-details p {
  margin: 0 0 0.25rem 0;
  color: var(--text-secondary);
}

.sitemap-details small {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.sitemap-status .status-active {
  color: #16a34a;
  font-weight: 600;
}

.sitemap-status .status-inactive {
  color: #6b7280;
  font-weight: 600;
}

.redirects-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.redirect-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.redirect-info {
  flex: 1;
}

.redirect-urls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.redirect-from {
  color: var(--text-secondary);
  text-decoration: line-through;
  font-size: 0.9rem;
}

.redirect-to {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

.redirect-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.redirect-actions {
  display: flex;
  gap: 0.5rem;
}

.analytics-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.analytics-chart {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
}

.chart-placeholder svg {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1rem;
}

.chart-placeholder p {
  color: var(--text-secondary);
  margin: 0;
}

.analytics-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.metric-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.metric-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal__header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal__body {
  padding: 2rem;
}

.modal__actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn--primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn--primary:hover:not(:disabled) {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}

.btn--outline {
  background: transparent;
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn--outline:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive design */
@media (max-width: 768px) {
  .seo-dashboard {
    padding: 1rem;
  }

  .dashboard-title {
    font-size: 1.5rem;
  }

  .overview-cards {
    grid-template-columns: 1fr;
  }

  .tabs-header {
    flex-direction: column;
  }

  .panel-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .page-item,
  .sitemap-item,
  .redirect-item {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .page-actions,
  .redirect-actions {
    align-self: flex-end;
  }

  .analytics-metrics {
    grid-template-columns: 1fr;
  }

  .modal {
    width: 95%;
    margin: 1rem;
  }

  .modal__body {
    padding: 1.5rem;
  }
}
</style>