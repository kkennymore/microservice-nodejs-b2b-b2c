<template>
  <div class="seller-dashboard">
    <div class="dashboard-container">
      <!-- Sidebar -->
      <div class="dashboard-sidebar">
        <div class="sidebar-header">
          <div class="seller-avatar">
            <img v-if="user?.avatar" :src="user.avatar" :alt="user.name" class="avatar-image" />
            <div v-else class="avatar-placeholder">
              {{ userInitials }}
            </div>
          </div>
          <h3 class="seller-name">{{ user?.name }}</h3>
          <p class="seller-plan">{{ user?.subscriptionPlan?.toUpperCase() }} Plan</p>
        </div>

        <nav class="sidebar-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="nav-item"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-text">{{ tab.label }}</span>
          </button>
        </nav>
      </div>

      <!-- Main Content -->
      <div class="dashboard-main">
        <div class="dashboard-header">
          <h1>{{ currentTab.title }}</h1>
          <p class="dashboard-subtitle">{{ currentTab.subtitle }}</p>
        </div>

        <div class="dashboard-content">
          <!-- Overview/Dashboard -->
          <div v-if="activeTab === 'overview'" class="dashboard-section">
            <SellerOverview />
          </div>

          <!-- Products Management -->
          <div v-if="activeTab === 'products'" class="dashboard-section">
            <SellerProducts />
          </div>

          <!-- Orders Management -->
          <div v-if="activeTab === 'orders'" class="dashboard-section">
            <SellerOrders />
          </div>

          <!-- Analytics -->
          <div v-if="activeTab === 'analytics'" class="dashboard-section">
            <SellerAnalytics />
          </div>

          <!-- Customers -->
          <div v-if="activeTab === 'customers'" class="dashboard-section">
            <SellerCustomers />
          </div>

          <!-- Settings -->
          <div v-if="activeTab === 'settings'" class="dashboard-section">
            <SellerSettings />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores'
import SellerOverview from '@/components/dashboard/SellerOverview.vue'
import SellerProducts from '@/components/dashboard/SellerProducts.vue'
import SellerOrders from '@/components/dashboard/SellerOrders.vue'
import SellerAnalytics from '@/components/dashboard/SellerAnalytics.vue'
import SellerCustomers from '@/components/dashboard/SellerCustomers.vue'
import SellerSettings from '@/components/dashboard/SellerSettings.vue'

const authStore = useAuthStore()
const activeTab = ref('overview')

const user = computed(() => authStore.user)
const userInitials = computed(() => {
  const name = user.value?.name || ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊', title: 'Dashboard Overview', subtitle: 'Your business at a glance' },
  { id: 'products', label: 'Products', icon: '📦', title: 'Product Management', subtitle: 'Manage your product catalog' },
  { id: 'orders', label: 'Orders', icon: '📋', title: 'Order Management', subtitle: 'Handle customer orders' },
  { id: 'analytics', label: 'Analytics', icon: '📈', title: 'Business Analytics', subtitle: 'Insights and performance metrics' },
  { id: 'customers', label: 'Customers', icon: '👥', title: 'Customer Management', subtitle: 'Your customer relationships' },
  { id: 'settings', label: 'Settings', icon: '⚙️', title: 'Seller Settings', subtitle: 'Configure your seller account' }
]

const currentTab = computed(() =>
  tabs.find(tab => tab.id === activeTab.value) || tabs[0]
)

onMounted(() => {
  // Check if user is a seller
  if (!authStore.isAuthenticated || authStore.user?.role !== 'seller') {
    // Redirect or show unauthorized message
    console.log('Unauthorized access to seller dashboard')
  }
})
</script>

<style scoped>
.seller-dashboard {
  min-height: 100vh;
  background-color: var(--bg-secondary);
  padding: var(--spacing-lg) 0;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--spacing-xl);
  padding: 0 var(--spacing-lg);
}

.dashboard-sidebar {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  height: fit-content;
  position: sticky;
  top: var(--spacing-lg);
}

.sidebar-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.seller-avatar {
  margin-bottom: var(--spacing-md);
}

.avatar-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--primary-color);
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  margin: 0 auto;
  border: 3px solid var(--primary-color);
}

.seller-name {
  margin: var(--spacing-md) 0 var(--spacing-xs) 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.seller-plan {
  color: var(--text-muted);
  font-size: 0.9rem;
  background-color: var(--bg-secondary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  display: inline-block;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--border-radius-md);
  transition: all var(--transition-fast);
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.nav-item.active {
  background-color: var(--primary-color);
  color: var(--text-light);
  font-weight: 500;
}

.nav-icon {
  font-size: 1.2rem;
  min-width: 20px;
}

.dashboard-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.dashboard-header {
  background: white;
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
}

.dashboard-header h1 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 2rem;
  font-weight: 600;
}

.dashboard-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.dashboard-content {
  flex: 1;
}

.dashboard-section {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .dashboard-container {
    grid-template-columns: 240px 1fr;
    gap: var(--spacing-lg);
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .dashboard-sidebar {
    position: static;
    order: 2;
  }

  .dashboard-main {
    order: 1;
  }

  .sidebar-nav {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--spacing-sm);
  }

  .nav-item {
    justify-content: center;
    padding: var(--spacing-sm);
  }

  .nav-text {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 0 var(--spacing-sm);
  }

  .sidebar-nav {
    grid-template-columns: repeat(2, 1fr);
  }

  .nav-item {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-xs);
  }
}
</style>