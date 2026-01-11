<template>
  <div class="seller-overview">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalProducts }}</div>
            <div class="stat-label">Total Products</div>
            <div class="stat-change" :class="{ positive: stats.productChange > 0 }">
              {{ stats.productChange > 0 ? '+' : '' }}{{ stats.productChange }} this month
            </div>
          </div>
        </div>
      </Card>

      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value">{{ formatCurrency(stats.totalRevenue) }}</div>
            <div class="stat-label">Total Revenue</div>
            <div class="stat-change" :class="{ positive: stats.revenueChange > 0 }">
              {{ stats.revenueChange > 0 ? '+' : '' }}{{ stats.revenueChange }}% this month
            </div>
          </div>
        </div>
      </Card>

      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalOrders }}</div>
            <div class="stat-label">Total Orders</div>
            <div class="stat-change" :class="{ positive: stats.orderChange > 0 }">
              {{ stats.orderChange > 0 ? '+' : '' }}{{ stats.orderChange }} this week
            </div>
          </div>
        </div>
      </Card>

      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.averageRating }}</div>
            <div class="stat-label">Average Rating</div>
            <div class="rating-stars">
              <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.floor(stats.averageRating) }">
                ★
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Charts and Recent Activity -->
    <div class="overview-grid">
      <!-- Sales Chart -->
      <Card class="chart-card">
        <div class="card-header">
          <h3>Sales Overview</h3>
          <select v-model="chartPeriod" class="period-select">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
        <div class="chart-placeholder">
          <div class="chart-bars">
            <div v-for="i in 7" :key="i" class="chart-bar" :style="{ height: Math.random() * 100 + '%' }"></div>
          </div>
          <p class="chart-label">Revenue trend for {{ chartPeriod }}</p>
        </div>
      </Card>

      <!-- Recent Orders -->
      <Card class="recent-card">
        <div class="card-header">
          <h3>Recent Orders</h3>
          <Button variant="outline" size="sm" @click="$emit('viewAllOrders')">
            View All
          </Button>
        </div>
        <div class="orders-list">
          <div v-for="order in recentOrders" :key="order.id" class="order-item">
            <div class="order-info">
              <div class="order-number">Order #{{ order.id }}</div>
              <div class="order-customer">{{ order.customerName }}</div>
              <div class="order-date">{{ formatDate(order.createdAt) }}</div>
            </div>
            <div class="order-status">
              <span class="status-badge" :class="order.status.toLowerCase()">
                {{ order.status }}
              </span>
              <div class="order-amount">{{ formatCurrency(order.total) }}</div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Quick Actions -->
    <Card class="quick-actions">
      <h3>Quick Actions</h3>
      <div class="actions-grid">
        <Button variant="primary" @click="$emit('addProduct')">
          <span>➕</span>
          Add New Product
        </Button>
        <Button variant="outline" @click="$emit('viewAnalytics')">
          <span>📈</span>
          View Analytics
        </Button>
        <Button variant="outline" @click="$emit('manageInventory')">
          <span>📦</span>
          Manage Inventory
        </Button>
        <Button variant="outline" @click="$emit('customerSupport')">
          <span>💬</span>
          Customer Support
        </Button>
      </div>
    </Card>

    <!-- Alerts and Notifications -->
    <div v-if="alerts.length > 0" class="alerts-section">
      <Card v-for="alert in alerts" :key="alert.id" class="alert-card" :class="alert.type">
        <div class="alert-content">
          <div class="alert-icon">{{ alert.icon }}</div>
          <div class="alert-info">
            <h4>{{ alert.title }}</h4>
            <p>{{ alert.message }}</p>
          </div>
          <Button v-if="alert.action" variant="outline" size="sm" @click="$emit(alert.action)">
            {{ alert.actionText }}
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCurrency } from '@/composables'
import { Card, Button } from '@/components'
import sellerAPI from '@/services/sellerAPI'

const { formatPrice } = useCurrency()
const chartPeriod = ref('30d')

// Real data from API
const stats = ref({
  totalProducts: 0,
  productChange: 0,
  totalRevenue: 0,
  revenueChange: 0,
  totalOrders: 0,
  orderChange: 0,
  averageRating: 0
})

const recentOrders = ref([
  {
    id: '1001',
    customerName: 'John Doe',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    status: 'Processing',
    total: 89.99
  },
  {
    id: '1002',
    customerName: 'Jane Smith',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    status: 'Shipped',
    total: 156.50
  },
  {
    id: '1003',
    customerName: 'Bob Johnson',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    status: 'Delivered',
    total: 234.75
  }
])

const alerts = ref([
  {
    id: 1,
    type: 'warning',
    icon: '⚠️',
    title: 'Low Stock Alert',
    message: '5 products are running low on inventory',
    action: 'manageInventory',
    actionText: 'Manage Stock'
  },
  {
    id: 2,
    type: 'info',
    icon: '💡',
    title: 'New Feature Available',
    message: 'Video uploads are now available on your plan',
    action: 'upgradePlan',
    actionText: 'Learn More'
  }
])

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  try {
    const overviewData = await sellerAPI.getDashboardOverview()
    stats.value = {
      ...overviewData,
      productChange: 5, // Mock change data - would come from API
      revenueChange: 12.5,
      orderChange: 8
    }
  } catch (error) {
    console.error('Failed to load dashboard overview:', error)
    // Keep default values on error
  }
})
</script>

<style scoped>
.seller-overview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.stat-card {
  padding: var(--spacing-lg);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.stat-icon {
  font-size: 3rem;
  opacity: 0.8;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.stat-change {
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-change.positive {
  color: var(--success-color);
}

.rating-stars {
  margin-top: var(--spacing-xs);
}

.star {
  color: #ddd;
  font-size: 1.2rem;
}

.star.filled {
  color: #ffd700;
}

.overview-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-lg);
}

.chart-card,
.recent-card {
  padding: var(--spacing-lg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.card-header h3 {
  margin: 0;
}

.period-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: white;
}

.chart-placeholder {
  height: 200px;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary));
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--text-muted);
}

.chart-bars {
  display: flex;
  align-items: end;
  gap: var(--spacing-xs);
  height: 120px;
  margin-bottom: var(--spacing-md);
}

.chart-bar {
  width: 30px;
  background-color: var(--primary-color);
  border-radius: var(--border-radius-sm);
  transition: height 0.3s ease;
}

.chart-label {
  font-size: 0.9rem;
  margin: 0;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.order-info {
  flex: 1;
}

.order-number {
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.order-customer {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: var(--spacing-xs);
}

.order-date {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.order-status {
  text-align: right;
}

.status-badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  margin-bottom: var(--spacing-xs);
}

.status-badge.processing {
  background-color: #fff3cd;
  color: #856404;
}

.status-badge.shipped {
  background-color: #cce5ff;
  color: #004085;
}

.status-badge.delivered {
  background-color: #d1ecf1;
  color: #0c5460;
}

.order-amount {
  font-weight: 600;
  color: var(--primary-color);
}

.quick-actions {
  padding: var(--spacing-lg);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.alerts-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.alert-card {
  padding: var(--spacing-lg);
}

.alert-card.warning {
  border-left: 4px solid var(--warning-color);
  background-color: #fff3cd;
}

.alert-card.info {
  border-left: 4px solid var(--info-color);
  background-color: #d1ecf1;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.alert-icon {
  font-size: 2rem;
}

.alert-info {
  flex: 1;
}

.alert-info h4 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 1rem;
}

.alert-info p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .order-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .order-status {
    text-align: left;
    width: 100%;
  }
}
</style>