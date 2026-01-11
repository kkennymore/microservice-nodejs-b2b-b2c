<template>
  <div class="analytics-dashboard">
    <div class="dashboard-header">
      <h1>Advanced Analytics Dashboard</h1>
      <div class="header-actions">
        <button @click="createNewDashboard" class="btn-primary">
          Create Dashboard
        </button>
        <button @click="exportData" class="btn-secondary">
          Export Data
        </button>
      </div>
    </div>

    <!-- Dashboard Tabs -->
    <div class="dashboard-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="overview-tab">
        <div class="metrics-grid">
          <MetricsCard
            title="Total Revenue"
            :value="formatCurrency(totalRevenue)"
            :change="revenueChange"
            icon="💰"
          />
          <MetricsCard
            title="Active Users"
            :value="activeUsers.toLocaleString()"
            :change="userChange"
            icon="👥"
          />
          <MetricsCard
            title="Conversion Rate"
            :value="`${conversionRate}%`"
            :change="conversionChange"
            icon="📈"
          />
          <MetricsCard
            title="Avg Order Value"
            :value="formatCurrency(avgOrderValue)"
            :change="aovChange"
            icon="🛒"
          />
        </div>

        <div class="charts-row">
          <div class="chart-container">
            <h3>Revenue Trend</h3>
            <RevenueChart :data="revenueData" />
          </div>
          <div class="chart-container">
            <h3>User Growth</h3>
            <UserGrowthChart :data="userGrowthData" />
          </div>
        </div>
      </div>

      <!-- Predictive Analytics Tab -->
      <div v-if="activeTab === 'predictive'" class="predictive-tab">
        <div class="predictive-grid">
          <PredictivePanel
            title="Churn Prediction"
            :predictions="churnPredictions"
            @run-prediction="runChurnPrediction"
          />
          <PredictivePanel
            title="Purchase Prediction"
            :predictions="purchasePredictions"
            @run-prediction="runPurchasePrediction"
          />
          <PredictivePanel
            title="Recommendation Engine"
            :predictions="recommendationPredictions"
            @run-prediction="runRecommendationPrediction"
          />
          <PredictivePanel
            title="Price Optimization"
            :predictions="priceOptimizations"
            @run-prediction="runPriceOptimization"
          />
        </div>
      </div>

      <!-- Cohorts Tab -->
      <div v-if="activeTab === 'cohorts'" class="cohorts-tab">
        <div class="cohorts-header">
          <h3>User Cohorts</h3>
          <button @click="showCreateCohortModal = true" class="btn-primary">
            Create Cohort
          </button>
        </div>

        <div class="cohorts-list">
          <CohortCard
            v-for="cohort in cohorts"
            :key="cohort.id"
            :cohort="cohort"
          />
        </div>
      </div>

      <!-- Models Tab -->
      <div v-if="activeTab === 'models'" class="models-tab">
        <div class="models-header">
          <h3>Predictive Models</h3>
          <button @click="showCreateModelModal = true" class="btn-primary">
            Create Model
          </button>
        </div>

        <div class="models-list">
          <ModelCard
            v-for="model in models"
            :key="model.id"
            :model="model"
            @train="trainModel"
          />
        </div>
      </div>

      <!-- Reports Tab -->
      <div v-if="activeTab === 'reports'" class="reports-tab">
        <div class="reports-header">
          <h3>Analytics Reports</h3>
          <button @click="showCreateReportModal = true" class="btn-primary">
            Create Report
          </button>
        </div>

        <div class="reports-list">
          <ReportCard
            v-for="report in reports"
            :key="report.id"
            :report="report"
          />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CreateCohortModal
      v-if="showCreateCohortModal"
      @close="showCreateCohortModal = false"
      @created="handleCohortCreated"
    />

    <CreateModelModal
      v-if="showCreateModelModal"
      @close="showCreateModelModal = false"
      @created="handleModelCreated"
    />

    <CreateReportModal
      v-if="showCreateReportModal"
      @close="showCreateReportModal = false"
      @created="handleReportCreated"
    />

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading analytics data...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAnalytics } from '@/composables/useAnalytics'
import MetricsCard from './MetricsCard.vue'
import RevenueChart from './RevenueChart.vue'
import UserGrowthChart from './UserGrowthChart.vue'
import PredictivePanel from './PredictivePanel.vue'
import CohortCard from './CohortCard.vue'
import ModelCard from './ModelCard.vue'
import ReportCard from './ReportCard.vue'
import CreateCohortModal from './CreateCohortModal.vue'
import CreateModelModal from './CreateModelModal.vue'
import CreateReportModal from './CreateReportModal.vue'

const {
  loading,
  cohorts,
  models,
  metrics,
  reports,
  revenueMetrics,
  userEngagementMetrics,
  conversionMetrics,
  fetchCohorts,
  fetchModels,
  fetchMetrics,
  fetchReports,
  predictChurn,
  predictPurchase,
  calculateRecommendationScore,
  optimizePrice
} = useAnalytics()

const activeTab = ref('overview')
const showCreateCohortModal = ref(false)
const showCreateModelModal = ref(false)
const showCreateReportModal = ref(false)

// Mock data for charts (in real app, this would come from the API)
const revenueData = ref([
  { date: '2024-01', value: 12500 },
  { date: '2024-02', value: 15200 },
  { date: '2024-03', value: 18100 },
  { date: '2024-04', value: 22300 },
  { date: '2024-05', value: 25600 },
  { date: '2024-06', value: 28900 }
])

const userGrowthData = ref([
  { date: '2024-01', value: 1200 },
  { date: '2024-02', value: 1450 },
  { date: '2024-03', value: 1680 },
  { date: '2024-04', value: 1920 },
  { date: '2024-05', value: 2150 },
  { date: '2024-06', value: 2380 }
])

const churnPredictions = ref([])
const purchasePredictions = ref([])
const recommendationPredictions = ref([])
const priceOptimizations = ref([])

const tabs = [
  { id: 'overview', name: 'Overview' },
  { id: 'predictive', name: 'Predictive Analytics' },
  { id: 'cohorts', name: 'Cohorts' },
  { id: 'models', name: 'Models' },
  { id: 'reports', name: 'Reports' }
]

// Computed properties for metrics
const totalRevenue = computed(() => {
  return revenueMetrics.value.reduce((sum, metric) => sum + metric.metric_value, 0)
})

const activeUsers = computed(() => {
  return userEngagementMetrics.value.reduce((sum, metric) => sum + metric.metric_value, 0)
})

const conversionRate = computed(() => {
  const conversions = conversionMetrics.value.reduce((sum, metric) => sum + metric.metric_value, 0)
  return ((conversions / activeUsers.value) * 100).toFixed(1)
})

const avgOrderValue = computed(() => {
  const totalOrders = conversionMetrics.value.reduce((sum, metric) => sum + metric.metric_value, 0)
  return totalOrders > 0 ? totalRevenue.value / totalOrders : 0
})

// Mock change percentages (in real app, calculate from historical data)
const revenueChange = ref(12.5)
const userChange = ref(8.3)
const conversionChange = ref(3.2)
const aovChange = ref(-1.8)

// Methods
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

const createNewDashboard = () => {
  // Implementation for creating new dashboard
  console.log('Creating new dashboard...')
}

const exportData = () => {
  // Implementation for exporting data
  console.log('Exporting data...')
}

const runChurnPrediction = async (userId) => {
  try {
    const result = await predictChurn(userId)
    churnPredictions.value.push(result)
  } catch (error) {
    console.error('Error running churn prediction:', error)
  }
}

const runPurchasePrediction = async (userId, productId) => {
  try {
    const result = await predictPurchase(userId, productId)
    purchasePredictions.value.push(result)
  } catch (error) {
    console.error('Error running purchase prediction:', error)
  }
}

const runRecommendationPrediction = async (userId, productId) => {
  try {
    const result = await calculateRecommendationScore(userId, productId)
    recommendationPredictions.value.push(result)
  } catch (error) {
    console.error('Error running recommendation prediction:', error)
  }
}

const runPriceOptimization = async (productId) => {
  try {
    const result = await optimizePrice(productId)
    priceOptimizations.value.push(result)
  } catch (error) {
    console.error('Error running price optimization:', error)
  }
}

const trainModel = async (modelId) => {
  try {
    await useAnalytics().trainModel(modelId)
    // Refresh models list
    await fetchModels()
  } catch (error) {
    console.error('Error training model:', error)
  }
}

const handleCohortCreated = async (cohort) => {
  cohorts.value.push(cohort)
  showCreateCohortModal.value = false
}

const handleModelCreated = async (model) => {
  models.value.push(model)
  showCreateModelModal.value = false
}

const handleReportCreated = async (report) => {
  reports.value.push(report)
  showCreateReportModal.value = false
}

// Load data on mount
onMounted(async () => {
  try {
    await Promise.all([
      fetchCohorts(),
      fetchModels(),
      fetchMetrics(),
      fetchReports()
    ])
  } catch (error) {
    console.error('Error loading analytics data:', error)
  }
})
</script>

<style scoped>
.analytics-dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.dashboard-header h1 {
  color: #2c3e50;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-primary {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.dashboard-tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 30px;
}

.tab-button {
  background: none;
  border: none;
  padding: 15px 25px;
  cursor: pointer;
  font-size: 16px;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tab-button.active {
  border-bottom-color: #3498db;
  color: #3498db;
  font-weight: 500;
}

.tab-button:hover {
  background: #f8f9fa;
}

.tab-content {
  min-height: 600px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.chart-container h3 {
  margin-top: 0;
  color: #2c3e50;
}

.predictive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.cohorts-header,
.models-header,
.reports-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.cohorts-header h3,
.models-header h3,
.reports-header h3 {
  margin: 0;
  color: #2c3e50;
}

.cohorts-list,
.models-list,
.reports-list {
  display: grid;
  gap: 15px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p {
  margin-top: 15px;
  color: #7f8c8d;
}
</style>