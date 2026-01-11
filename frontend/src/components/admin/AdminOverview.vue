<template>
  <div class="admin-overview">
    <div class="stats-grid">
      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-value">{{ totalUsers }}</div>
            <div class="stat-label">Total Users</div>
          </div>
        </div>
      </Card>

      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <div class="stat-value">{{ totalProducts }}</div>
            <div class="stat-label">Total Products</div>
          </div>
        </div>
      </Card>

      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value">{{ totalRevenue }}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
        </div>
      </Card>

      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <div class="stat-value">{{ totalOrders }}</div>
            <div class="stat-label">Total Orders</div>
          </div>
        </div>
      </Card>
    </div>

    <div class="charts-section">
      <Card class="chart-card">
        <h3>Revenue Overview</h3>
        <div class="chart-placeholder">
          <span>📈 Revenue Chart</span>
        </div>
      </Card>

      <Card class="chart-card">
        <h3>User Growth</h3>
        <div class="chart-placeholder">
          <span>📊 User Growth Chart</span>
        </div>
      </Card>
    </div>

    <div class="recent-activity">
      <Card>
        <h3>Recent Activity</h3>
        <div class="activity-list">
          <div class="activity-item">
            <span class="activity-icon">🆕</span>
            <div class="activity-content">
              <div class="activity-title">New user registered</div>
              <div class="activity-time">2 minutes ago</div>
            </div>
          </div>
          <div class="activity-item">
            <span class="activity-icon">📦</span>
            <div class="activity-content">
              <div class="activity-title">Product approved</div>
              <div class="activity-time">5 minutes ago</div>
            </div>
          </div>
          <div class="activity-item">
            <span class="activity-icon">💳</span>
            <div class="activity-content">
              <div class="activity-title">Payment processed</div>
              <div class="activity-time">10 minutes ago</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card } from '@/components'

// Mock data - in real app, fetch from API
const totalUsers = ref(12543)
const totalProducts = ref(8921)
const totalRevenue = ref('$1,245,678')
const totalOrders = ref(34567)

onMounted(() => {
  // Fetch dashboard stats from API
  console.log('Loading dashboard overview data...')
})
</script>

<style scoped>
.admin-overview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.stat-card {
  padding: var(--spacing-lg);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.stat-icon {
  font-size: 2.5rem;
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
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.chart-card {
  padding: var(--spacing-lg);
}

.chart-placeholder {
  height: 200px;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 1.2rem;
}

.recent-activity {
  margin-top: var(--spacing-lg);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.activity-icon {
  font-size: 1.5rem;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.activity-time {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .stat-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>