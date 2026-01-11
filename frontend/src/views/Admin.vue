<template>
  <div class="admin-dashboard">
    <AdminSidebar v-model:activeTab="activeTab" />

    <main class="admin-main">
      <AdminHeader
        :title="currentTab.title"
        :subtitle="currentTab.subtitle"
      />

      <div class="admin-content">
        <!-- Dashboard Overview -->
        <AdminOverview v-if="activeTab === 'overview'" />

        <!-- Products Management -->
        <AdminProducts v-if="activeTab === 'products'" />

        <!-- Users Management -->
        <AdminUsers v-if="activeTab === 'users'" />

        <!-- Analytics -->
        <AdminAnalytics v-if="activeTab === 'analytics'" />

        <!-- Settings -->
        <AdminSettings v-if="activeTab === 'settings'" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminOverview from '@/components/admin/AdminOverview.vue'
import AdminProducts from '@/components/admin/AdminProducts.vue'
import AdminUsers from '@/components/admin/AdminUsers.vue'
import AdminAnalytics from '@/components/admin/AdminAnalytics.vue'
import AdminSettings from '@/components/admin/AdminSettings.vue'

const authStore = useAuthStore()
const activeTab = ref('overview')

const tabs = [
  {
    id: 'overview',
    title: 'Dashboard Overview',
    subtitle: 'Platform statistics and key metrics',
    icon: '📊'
  },
  {
    id: 'products',
    title: 'Products Management',
    subtitle: 'Manage products, approvals, and categories',
    icon: '📦'
  },
  {
    id: 'users',
    title: 'Users Management',
    subtitle: 'Manage users, sellers, and subscriptions',
    icon: '👥'
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    subtitle: 'Platform analytics and business insights',
    icon: '📈'
  },
  {
    id: 'settings',
    title: 'Platform Settings',
    subtitle: 'Configure platform settings and features',
    icon: '⚙️'
  }
]

const currentTab = computed(() =>
  tabs.find(tab => tab.id === activeTab.value) || tabs[0]
)

onMounted(() => {
  // Check if user is admin
  if (!authStore.isAuthenticated || authStore.user?.role !== 'admin') {
    // Redirect to home or show unauthorized message
    console.log('Unauthorized access to admin panel')
  }
})
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-secondary);
}

.admin-main {
  flex: 1;
  margin-left: 280px; /* Sidebar width */
  display: flex;
  flex-direction: column;
}

.admin-content {
  flex: 1;
  padding: var(--spacing-lg);
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .admin-main {
    margin-left: 0;
  }

  .admin-content {
    padding: var(--spacing-md);
  }
}

@media (max-width: 768px) {
  .admin-content {
    padding: var(--spacing-sm);
  }
}
</style>