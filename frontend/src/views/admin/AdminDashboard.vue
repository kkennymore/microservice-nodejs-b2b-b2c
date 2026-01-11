<template>
  <AdminLayout>
    <div class="admin-dashboard">
      <!-- Welcome Section -->
      <div class="admin-dashboard__welcome">
        <h1 class="admin-dashboard__title">Dashboard Overview</h1>
        <p class="admin-dashboard__subtitle">
          Welcome back! Here's what's happening with your marketplace today.
        </p>
      </div>

      <!-- Key Metrics -->
      <div class="admin-dashboard__metrics">
        <div class="admin-dashboard__metric-card">
          <div class="admin-dashboard__metric-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="m1 1 4 4h15l-1 9H6"/>
            </svg>
          </div>
          <div class="admin-dashboard__metric-content">
            <div class="admin-dashboard__metric-value">{{ formatNumber(stats.totalOrders) }}</div>
            <div class="admin-dashboard__metric-label">Total Orders</div>
            <div class="admin-dashboard__metric-change admin-dashboard__metric-change--positive">
              +{{ stats.monthlyOrders }} this month
            </div>
          </div>
        </div>

        <div class="admin-dashboard__metric-card">
          <div class="admin-dashboard__metric-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="admin-dashboard__metric-content">
            <div class="admin-dashboard__metric-value">${{ formatNumber(stats.totalRevenue) }}</div>
            <div class="admin-dashboard__metric-label">Total Revenue</div>
            <div class="admin-dashboard__metric-change admin-dashboard__metric-change--positive">
              +${{ formatNumber(stats.monthlyRevenue) }} this month
            </div>
          </div>
        </div>

        <div class="admin-dashboard__metric-card">
          <div class="admin-dashboard__metric-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="admin-dashboard__metric-content">
            <div class="admin-dashboard__metric-value">{{ formatNumber(stats.totalUsers) }}</div>
            <div class="admin-dashboard__metric-label">Total Users</div>
            <div class="admin-dashboard__metric-change admin-dashboard__metric-change--positive">
              +{{ stats.monthlyUsers }} this month
            </div>
          </div>
        </div>

        <div class="admin-dashboard__metric-card">
          <div class="admin-dashboard__metric-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1 4 4h15l-1 9H6"/>
            </svg>
          </div>
          <div class="admin-dashboard__metric-content">
            <div class="admin-dashboard__metric-value">{{ formatNumber(stats.totalProducts) }}</div>
            <div class="admin-dashboard__metric-label">Total Products</div>
            <div class="admin-dashboard__metric-change admin-dashboard__metric-change--neutral">
              {{ stats.pendingProducts }} pending approval
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="admin-dashboard__charts">
        <!-- Revenue Chart -->
        <div class="admin-dashboard__chart-card">
          <div class="admin-dashboard__chart-header">
            <h3 class="admin-dashboard__chart-title">Revenue Overview</h3>
            <select v-model="revenuePeriod" class="admin-dashboard__chart-select" @change="updateRevenueChart">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <div class="admin-dashboard__chart-placeholder">
            <svg class="admin-dashboard__chart-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <p>Revenue chart will be displayed here</p>
            <p class="admin-dashboard__chart-note">Integration with Chart.js or similar library needed</p>
          </div>
        </div>

        <!-- User Growth Chart -->
        <div class="admin-dashboard__chart-card">
          <div class="admin-dashboard__chart-header">
            <h3 class="admin-dashboard__chart-title">User Growth</h3>
            <select v-model="userPeriod" class="admin-dashboard__chart-select" @change="updateUserChart">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <div class="admin-dashboard__chart-placeholder">
            <svg class="admin-dashboard__chart-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>User growth chart will be displayed here</p>
            <p class="admin-dashboard__chart-note">Integration with Chart.js or similar library needed</p>
          </div>
        </div>
      </div>

      <!-- Recent Activity & Quick Actions -->
      <div class="admin-dashboard__bottom">
        <!-- Recent Orders -->
        <div class="admin-dashboard__activity-card">
          <div class="admin-dashboard__activity-header">
            <h3 class="admin-dashboard__activity-title">Recent Orders</h3>
            <router-link to="/admin/orders" class="admin-dashboard__activity-link">
              View All
            </router-link>
          </div>

          <div class="admin-dashboard__activity-list">
            <div
              v-for="order in recentOrders"
              :key="order.id"
              class="admin-dashboard__activity-item"
              @click="$router.push(`/admin/orders/${order.id}`)"
            >
              <div class="admin-dashboard__activity-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="m1 1 4 4h15l-1 9H6"/>
                </svg>
              </div>
              <div class="admin-dashboard__activity-content">
                <div class="admin-dashboard__activity-primary">
                  Order {{ order.orderNumber }}
                </div>
                <div class="admin-dashboard__activity-secondary">
                  {{ order.customer.name }} • ${{ order.total }}
                </div>
              </div>
              <div class="admin-dashboard__activity-time">
                {{ formatTime(order.createdAt) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="admin-dashboard__actions-card">
          <h3 class="admin-dashboard__actions-title">Quick Actions</h3>

          <div class="admin-dashboard__actions-grid">
            <router-link to="/admin/products" class="admin-dashboard__action-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1 4 4h15l-1 9H6"/>
              </svg>
              <span>Review Products</span>
              <span class="admin-dashboard__action-badge">{{ stats.pendingProducts }}</span>
            </router-link>

            <router-link to="/admin/orders" class="admin-dashboard__action-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Process Orders</span>
              <span class="admin-dashboard__action-badge">{{ stats.pendingOrders }}</span>
            </router-link>

            <router-link to="/admin/users" class="admin-dashboard__action-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Manage Users</span>
            </router-link>

            <router-link to="/admin/analytics" class="admin-dashboard__action-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>View Analytics</span>
            </router-link>
          </div>
        </div>
      </div>

      <!-- System Status -->
      <div class="admin-dashboard__status">
        <div class="admin-dashboard__status-card">
          <h3 class="admin-dashboard__status-title">System Status</h3>

          <div class="admin-dashboard__status-items">
            <div class="admin-dashboard__status-item">
              <div class="admin-dashboard__status-indicator admin-dashboard__status-indicator--online"></div>
              <span class="admin-dashboard__status-label">API Services</span>
              <span class="admin-dashboard__status-value">Online</span>
            </div>

            <div class="admin-dashboard__status-item">
              <div class="admin-dashboard__status-indicator admin-dashboard__status-indicator--online"></div>
              <span class="admin-dashboard__status-label">Database</span>
              <span class="admin-dashboard__status-value">Connected</span>
            </div>

            <div class="admin-dashboard__status-item">
              <div class="admin-dashboard__status-indicator admin-dashboard__status-indicator--warning"></div>
              <span class="admin-dashboard__status-label">Storage</span>
              <span class="admin-dashboard__status-value">85% Used</span>
            </div>

            <div class="admin-dashboard__status-item">
              <div class="admin-dashboard__status-indicator admin-dashboard__status-indicator--online"></div>
              <span class="admin-dashboard__status-label">Email Service</span>
              <span class="admin-dashboard__status-value">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import adminAPI, { type AdminStats } from '@/services/adminAPI'
import AdminLayout from '@/components/admin/AdminLayout.vue'

const { formatCurrency } = useCurrency()

// State
const stats = ref<AdminStats>({
  totalUsers: 0,
  totalSellers: 0,
  totalBuyers: 0,
  totalProducts: 0,
  totalOrders: 0,
  totalRevenue: 0,
  pendingProducts: 0,
  pendingOrders: 0,
  monthlyRevenue: 0,
  monthlyOrders: 0,
  monthlyUsers: 0,
  activeUsers: 0,
  conversionRate: 0
})

const revenuePeriod = ref('30d')
const userPeriod = ref('30d')

// Mock recent orders
const recentOrders = ref([
  {
    id: '1',
    orderNumber: '#12345',
    customer: { name: 'John Doe' },
    total: 299.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: '2',
    orderNumber: '#12346',
    customer: { name: 'Jane Smith' },
    total: 149.50,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: '3',
    orderNumber: '#12347',
    customer: { name: 'Bob Johnson' },
    total: 79.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  }
])

// Methods
const loadStats = async () => {
  try {
    const data = await adminAPI.getStats()
    stats.value = data
  } catch (error) {
    console.error('Error loading admin stats:', error)
    // Mock data for demo
    stats.value = {
      totalUsers: 15420,
      totalSellers: 2340,
      totalBuyers: 13080,
      totalProducts: 45670,
      totalOrders: 8920,
      totalRevenue: 1250000,
      pendingProducts: 12,
      pendingOrders: 5,
      monthlyRevenue: 125000,
      monthlyOrders: 890,
      monthlyUsers: 1200,
      activeUsers: 3240,
      conversionRate: 3.2
    }
  }
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num)
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

const updateRevenueChart = () => {
  // TODO: Update chart data based on selected period
  console.log('Updating revenue chart for period:', revenuePeriod.value)
}

const updateUserChart = () => {
  // TODO: Update chart data based on selected period
  console.log('Updating user chart for period:', userPeriod.value)
}

// Lifecycle
onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.admin-dashboard__welcome {
  margin-bottom: var(--spacing-xl);
}

.admin-dashboard__title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.admin-dashboard__subtitle {
  font-size: var(--font-size-lg);
  color: var(--text-muted);
  margin: 0;
}

.admin-dashboard__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.admin-dashboard__metric-card {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  transition: transform var(--transition-fast);
}

.admin-dashboard__metric-card:hover {
  transform: translateY(-2px);
}

.admin-dashboard__metric-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-light);
  border-radius: var(--border-radius-lg);
  color: var(--primary-color);
  flex-shrink: 0;
}

.admin-dashboard__metric-content {
  flex: 1;
}

.admin-dashboard__metric-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.admin-dashboard__metric-label {
  font-size: var(--font-size-base);
  color: var(--text-muted);
  margin-bottom: var(--spacing-xs);
}

.admin-dashboard__metric-change {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.admin-dashboard__metric-change--positive {
  color: var(--success-color);
}

.admin-dashboard__metric-change--negative {
  color: var(--danger-color);
}

.admin-dashboard__metric-change--neutral {
  color: var(--warning-color);
}

.admin-dashboard__charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.admin-dashboard__chart-card {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}

.admin-dashboard__chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.admin-dashboard__chart-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}

.admin-dashboard__chart-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  background: var(--bg-white);
  cursor: pointer;
}

.admin-dashboard__chart-placeholder {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-muted);
  border: 2px dashed var(--border-color);
  border-radius: var(--border-radius-md);
}

.admin-dashboard__chart-icon {
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.admin-dashboard__chart-note {
  font-size: var(--font-size-sm);
  opacity: 0.7;
}

.admin-dashboard__bottom {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.admin-dashboard__activity-card,
.admin-dashboard__actions-card {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}

.admin-dashboard__activity-header,
.admin-dashboard__actions-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.admin-dashboard__activity-title,
.admin-dashboard__actions-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}

.admin-dashboard__activity-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.admin-dashboard__activity-link:hover {
  text-decoration: underline;
}

.admin-dashboard__activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.admin-dashboard__activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.admin-dashboard__activity-item:hover {
  background: var(--bg-light);
}

.admin-dashboard__activity-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-light);
  border-radius: var(--border-radius-md);
  color: var(--primary-color);
  flex-shrink: 0;
}

.admin-dashboard__activity-content {
  flex: 1;
}

.admin-dashboard__activity-primary {
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 2px;
}

.admin-dashboard__activity-secondary {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.admin-dashboard__activity-time {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.admin-dashboard__actions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
}

.admin-dashboard__action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-light);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  text-decoration: none;
  color: var(--text-dark);
  transition: all var(--transition-fast);
}

.admin-dashboard__action-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-1px);
}

.admin-dashboard__action-badge {
  margin-left: auto;
  background: var(--primary-color);
  color: white;
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.admin-dashboard__status {
  margin-bottom: var(--spacing-xl);
}

.admin-dashboard__status-card {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}

.admin-dashboard__status-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-lg);
}

.admin-dashboard__status-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.admin-dashboard__status-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.admin-dashboard__status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.admin-dashboard__status-indicator--online {
  background: var(--success-color);
}

.admin-dashboard__status-indicator--warning {
  background: var(--warning-color);
}

.admin-dashboard__status-indicator--offline {
  background: var(--danger-color);
}

.admin-dashboard__status-label {
  flex: 1;
  font-size: var(--font-size-base);
  color: var(--text-dark);
}

.admin-dashboard__status-value {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-weight: 500;
}

@media (max-width: 1024px) {
  .admin-dashboard__bottom {
    grid-template-columns: 1fr;
  }

  .admin-dashboard__charts {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .admin-dashboard__metrics {
    grid-template-columns: 1fr;
  }

  .admin-dashboard__metric-card {
    padding: var(--spacing-lg);
  }

  .admin-dashboard__metric-icon {
    width: 48px;
    height: 48px;
  }

  .admin-dashboard__metric-value {
    font-size: var(--font-size-xl);
  }

  .admin-dashboard__chart-card,
  .admin-dashboard__activity-card,
  .admin-dashboard__actions-card,
  .admin-dashboard__status-card {
    padding: var(--spacing-lg);
  }

  .admin-dashboard__actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>