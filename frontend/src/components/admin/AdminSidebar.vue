<template>
  <aside class="admin-sidebar" :class="{ 'sidebar-collapsed': collapsed }">
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <span class="logo-icon">🏪</span>
        <span v-if="!collapsed" class="logo-text">Admin Panel</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        @click="toggleSidebar"
        class="sidebar-toggle"
      >
        <span v-if="collapsed">▶</span>
        <span v-else>◀</span>
      </Button>
    </div>

    <nav class="sidebar-nav">
      <ul class="nav-list">
        <li
          v-for="tab in tabs"
          :key="tab.id"
          class="nav-item"
          :class="{ active: activeTab === tab.id }"
        >
          <button
            class="nav-link"
            @click="setActiveTab(tab.id)"
          >
            <span class="nav-icon">{{ tab.icon }}</span>
            <span v-if="!collapsed" class="nav-text">{{ tab.label }}</span>
          </button>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <div class="user-info" v-if="!collapsed">
        <div class="user-avatar">
          <span>{{ userInitials }}</span>
        </div>
        <div class="user-details">
          <div class="user-name">{{ userName }}</div>
          <div class="user-role">Administrator</div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        @click="logout"
        class="logout-btn"
      >
        <span v-if="collapsed">🚪</span>
        <span v-else>Logout</span>
      </Button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores'
import { Button } from '@/components'

interface Tab {
  id: string
  label: string
  icon: string
}

interface Props {
  activeTab: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:activeTab': [tab: string]
}>()

const authStore = useAuthStore()
const collapsed = ref(false)

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'products', label: 'Products', icon: '📦' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

const userName = computed(() => {
  return authStore.user?.name || authStore.user?.username || 'Admin'
})

const userInitials = computed(() => {
  const name = userName.value
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

const setActiveTab = (tabId: string) => {
  emit('update:activeTab', tabId)
}

const toggleSidebar = () => {
  collapsed.value = !collapsed.value
}

const logout = () => {
  authStore.logout()
  // Redirect to login or home
}
</script>

<style scoped>
.admin-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  z-index: 100;
}

.sidebar-collapsed {
  width: 70px;
}

.sidebar-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-weight: 600;
  font-size: 1.1rem;
}

.sidebar-toggle {
  padding: var(--spacing-xs);
  min-width: auto;
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-lg) 0;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin-bottom: var(--spacing-xs);
}

.nav-link {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  background: none;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-radius: 0;
}

.nav-link:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.nav-item.active .nav-link {
  background-color: var(--primary-color);
  color: var(--text-light);
  border-right: 3px solid var(--primary-hover);
}

.nav-icon {
  font-size: 1.2rem;
  min-width: 20px;
}

.nav-text {
  font-weight: 500;
}

.sidebar-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  font-weight: 600;
  font-size: 0.9rem;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.user-role {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.logout-btn {
  width: 100%;
  justify-content: center;
}

/* Collapsed state adjustments */
.sidebar-collapsed .sidebar-header {
  padding: var(--spacing-md);
  justify-content: center;
}

.sidebar-collapsed .sidebar-logo .logo-text,
.sidebar-collapsed .nav-text,
.sidebar-collapsed .user-info {
  display: none;
}

.sidebar-collapsed .nav-link {
  padding: var(--spacing-md);
  justify-content: center;
}

.sidebar-collapsed .sidebar-footer {
  align-items: center;
}

/* Mobile responsiveness */
@media (max-width: 1024px) {
  .admin-sidebar {
    transform: translateX(-100%);
  }

  .admin-sidebar:not(.sidebar-collapsed) {
    transform: translateX(0);
  }
}
</style>