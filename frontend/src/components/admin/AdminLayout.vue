<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="admin-layout__sidebar">
      <div class="admin-layout__logo">
        <h2>Admin Panel</h2>
      </div>

      <nav class="admin-layout__nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[
            'admin-layout__nav-item',
            { 'admin-layout__nav-item--active': $route.path === item.path }
          ]"
        >
          <component :is="item.icon" class="admin-layout__nav-icon" />
          <span class="admin-layout__nav-text">{{ item.label }}</span>
          <span v-if="item.badge" class="admin-layout__nav-badge">{{ item.badge }}</span>
        </router-link>
      </nav>

      <!-- Quick Stats -->
      <div class="admin-layout__stats">
        <div class="admin-layout__stat">
          <span class="admin-layout__stat-label">Online Users</span>
          <span class="admin-layout__stat-value">{{ onlineUsers }}</span>
        </div>
        <div class="admin-layout__stat">
          <span class="admin-layout__stat-label">Pending Orders</span>
          <span class="admin-layout__stat-value">{{ pendingOrders }}</span>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="admin-layout__main">
      <!-- Header -->
      <header class="admin-layout__header">
        <div class="admin-layout__header-left">
          <button
            class="admin-layout__menu-btn"
            @click="toggleSidebar"
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <h1 class="admin-layout__page-title">{{ pageTitle }}</h1>
        </div>

        <div class="admin-layout__header-right">
          <!-- Notifications -->
          <button
            class="admin-layout__notification-btn"
            @click="toggleNotifications"
            :class="{ 'admin-layout__notification-btn--active': showNotifications }"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span v-if="unreadNotifications > 0" class="admin-layout__notification-badge">
              {{ unreadNotifications > 99 ? '99+' : unreadNotifications }}
            </span>
          </button>

          <!-- User Menu -->
          <div class="admin-layout__user-menu">
            <button
              class="admin-layout__user-btn"
              @click="toggleUserMenu"
              :class="{ 'admin-layout__user-btn--active': showUserMenu }"
            >
              <div class="admin-layout__user-avatar">
                <img
                  v-if="currentUser?.avatar"
                  :src="currentUser.avatar"
                  :alt="currentUser.name"
                />
                <div v-else class="admin-layout__user-avatar-placeholder">
                  {{ getInitials(currentUser?.name || 'A') }}
                </div>
              </div>
              <span class="admin-layout__user-name">{{ currentUser?.name }}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            <!-- User Dropdown -->
            <div v-if="showUserMenu" class="admin-layout__user-dropdown">
              <router-link to="/profile" class="admin-layout__user-dropdown-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
              </router-link>
              <router-link to="/settings" class="admin-layout__user-dropdown-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Settings
              </router-link>
              <hr class="admin-layout__user-dropdown-divider">
              <button class="admin-layout__user-dropdown-item admin-layout__user-dropdown-item--danger" @click="logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="admin-layout__content">
        <router-view />
      </main>
    </div>

    <!-- Notifications Panel -->
    <div v-if="showNotifications" class="admin-layout__notifications">
      <div class="admin-layout__notifications-header">
        <h3>Notifications</h3>
        <button @click="markAllRead" class="admin-layout__mark-read-btn">
          Mark all read
        </button>
      </div>

      <div class="admin-layout__notifications-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'admin-layout__notification-item',
            { 'admin-layout__notification-item--unread': !notification.read }
          ]"
          @click="handleNotificationClick(notification)"
        >
          <div class="admin-layout__notification-icon">
            <component :is="notification.icon" />
          </div>
          <div class="admin-layout__notification-content">
            <div class="admin-layout__notification-title">{{ notification.title }}</div>
            <div class="admin-layout__notification-message">{{ notification.message }}</div>
            <div class="admin-layout__notification-time">{{ formatTime(notification.createdAt) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Overlay -->
    <div
      v-if="sidebarOpen && isMobile"
      class="admin-layout__overlay"
      @click="closeSidebar"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// Icon components
const DashboardIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
  h('rect', { x: '3', y: '3', width: '7', height: '7' }),
  h('rect', { x: '14', y: '3', width: '7', height: '7' }),
  h('rect', { x: '14', y: '14', width: '7', height: '7' }),
  h('rect', { x: '3', y: '14', width: '7', height: '7' })
])

const UsersIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
  h('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
  h('circle', { cx: '9', cy: '7', r: '4' }),
  h('path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }),
  h('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })
])

const ProductsIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
  h('circle', { cx: '9', cy: '21', r: '1' }),
  h('circle', { cx: '20', cy: '21', r: '1' }),
  h('path', { d: 'm1 1 4 4h15l-1 9H6' })
])

const OrdersIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
  h('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2' }),
  h('line', { x1: '16', y1: '2', x2: '16', y2: '6' }),
  h('line', { x1: '8', y1: '2', x2: '8', y2: '6' }),
  h('line', { x1: '3', y1: '10', x2: '21', y2: '10' })
])

const AnalyticsIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
  h('line', { x1: '18', y1: '20', x2: '18', y2: '10' }),
  h('line', { x1: '12', y1: '20', x2: '12', y2: '4' }),
  h('line', { x1: '6', y1: '20', x2: '6', y2: '14' })
])

const SettingsIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
  h('circle', { cx: '12', cy: '12', r: '3' }),
  h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' })
])

const ReportsIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
  h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
  h('polyline', { points: '14,2 14,8 20,8' }),
  h('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
  h('line', { x1: '16', y1: '17', x2: '8', y2: '17' }),
  h('polyline', { points: '10,9 9,9 8,9' })
])

interface NavItem {
  path: string
  label: string
  icon: any
  badge?: string | number
}

const route = useRoute()
const router = useRouter()

// State
const sidebarOpen = ref(true)
const showNotifications = ref(false)
const showUserMenu = ref(false)
const onlineUsers = ref(0)
const pendingOrders = ref(0)
const unreadNotifications = ref(0)
const currentUser = ref({ name: 'Admin User', avatar: undefined })

// Navigation items
const navItems: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: DashboardIcon },
  { path: '/admin/users', label: 'Users', icon: UsersIcon },
  { path: '/admin/products', label: 'Products', icon: ProductsIcon, badge: '12' },
  { path: '/admin/orders', label: 'Orders', icon: OrdersIcon, badge: '5' },
  { path: '/admin/analytics', label: 'Analytics', icon: AnalyticsIcon },
  { path: '/admin/reports', label: 'Reports', icon: ReportsIcon },
  { path: '/admin/settings', label: 'Settings', icon: SettingsIcon }
]

// Mock notifications
const notifications = ref([
  {
    id: '1',
    title: 'New Product Approval',
    message: 'Product "Wireless Headphones" is pending approval',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    icon: ProductsIcon
  },
  {
    id: '2',
    title: 'Order Completed',
    message: 'Order #12345 has been delivered successfully',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    icon: OrdersIcon
  }
])

// Computed
const pageTitle = computed(() => {
  const item = navItems.find(item => item.path === route.path)
  return item?.label || 'Admin Panel'
})

const isMobile = computed(() => window.innerWidth < 768)

// Methods
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  showUserMenu.value = false
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  showNotifications.value = false
}

const markAllRead = () => {
  notifications.value.forEach(notification => {
    notification.read = true
  })
  unreadNotifications.value = 0
}

const handleNotificationClick = (notification: any) => {
  // Handle notification click
  console.log('Notification clicked:', notification)
}

const logout = () => {
  // Handle logout
  router.push('/login')
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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

// Handle click outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement

  if (!target.closest('.admin-layout__notification-btn')) {
    showNotifications.value = false
  }

  if (!target.closest('.admin-layout__user-menu')) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  // Mock data updates
  onlineUsers.value = 1247
  pendingOrders.value = 5
  unreadNotifications.value = notifications.value.filter(n => !n.read).length
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-light);
}

.admin-layout__sidebar {
  width: 280px;
  background: var(--bg-white);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  transform: translateX(0);
  transition: transform var(--transition-fast);
}

.admin-layout__sidebar--closed {
  transform: translateX(-100%);
}

.admin-layout__logo {
  padding: var(--spacing-xl) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.admin-layout__logo h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--primary-color);
}

.admin-layout__nav {
  flex: 1;
  padding: var(--spacing-lg) 0;
}

.admin-layout__nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  color: var(--text-muted);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.admin-layout__nav-item:hover,
.admin-layout__nav-item--active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.admin-layout__nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.admin-layout__nav-text {
  flex: 1;
}

.admin-layout__nav-badge {
  background: var(--danger-color);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.admin-layout__stats {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.admin-layout__stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.admin-layout__stat:last-child {
  margin-bottom: 0;
}

.admin-layout__stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.admin-layout__stat-value {
  font-weight: 600;
  color: var(--text-dark);
}

.admin-layout__main {
  flex: 1;
  margin-left: 280px;
  display: flex;
  flex-direction: column;
}

.admin-layout__header {
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
  padding: var(--spacing-md) var(--spacing-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-layout__header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.admin-layout__menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
  transition: background-color var(--transition-fast);
}

.admin-layout__menu-btn:hover {
  background: var(--bg-light);
}

.admin-layout__page-title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
}

.admin-layout__header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.admin-layout__notification-btn,
.admin-layout__user-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-md);
  transition: background-color var(--transition-fast);
  position: relative;
}

.admin-layout__notification-btn:hover,
.admin-layout__notification-btn--active,
.admin-layout__user-btn:hover,
.admin-layout__user-btn--active {
  background: var(--bg-light);
}

.admin-layout__notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--danger-color);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}

.admin-layout__user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.admin-layout__user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-layout__user-avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.admin-layout__user-name {
  font-weight: 500;
  color: var(--text-dark);
}

.admin-layout__user-menu {
  position: relative;
}

.admin-layout__user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 10;
  min-width: 200px;
}

.admin-layout__user-dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  color: var(--text-dark);
  text-decoration: none;
  transition: background-color var(--transition-fast);
}

.admin-layout__user-dropdown-item:hover {
  background: var(--bg-light);
}

.admin-layout__user-dropdown-item--danger:hover {
  background: rgba(220, 53, 69, 0.1);
  color: var(--danger-color);
}

.admin-layout__user-dropdown-divider {
  margin: 0;
  border: 0;
  border-top: 1px solid var(--border-color);
}

.admin-layout__content {
  flex: 1;
  padding: var(--spacing-xl);
  overflow-y: auto;
}

.admin-layout__notifications {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: var(--bg-white);
  border-left: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.admin-layout__notifications-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-layout__notifications-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.admin-layout__mark-read-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.admin-layout__notifications-list {
  flex: 1;
  overflow-y: auto;
}

.admin-layout__notification-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color-lighter);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.admin-layout__notification-item:hover {
  background: var(--bg-light);
}

.admin-layout__notification-item--unread {
  background: rgba(0, 123, 255, 0.05);
  border-left: 3px solid var(--primary-color);
}

.admin-layout__notification-icon {
  width: 20px;
  height: 20px;
  color: var(--primary-color);
  flex-shrink: 0;
  margin-top: 2px;
}

.admin-layout__notification-content {
  flex: 1;
}

.admin-layout__notification-title {
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 2px;
}

.admin-layout__notification-message {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: var(--spacing-xs);
  line-height: 1.4;
}

.admin-layout__notification-time {
  font-size: 11px;
  color: var(--text-muted);
}

.admin-layout__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
}

@media (max-width: 768px) {
  .admin-layout__sidebar {
    transform: translateX(-100%);
  }

  .admin-layout__sidebar--open {
    transform: translateX(0);
  }

  .admin-layout__main {
    margin-left: 0;
  }

  .admin-layout__menu-btn {
    display: flex;
  }

  .admin-layout__notifications {
    width: 100%;
  }
}
</style>