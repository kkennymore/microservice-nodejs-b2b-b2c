<template>
  <header class="admin-header">
    <div class="header-content">
      <div class="header-left">
        <h1 class="header-title">{{ title }}</h1>
        <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
      </div>

      <div class="header-right">
        <div class="header-actions">
          <Button variant="outline" @click="refreshData">
            <span>🔄</span>
            Refresh
          </Button>

          <Button variant="primary" @click="exportData" v-if="showExport">
            <span>📊</span>
            Export
          </Button>
        </div>

        <div class="header-notifications">
          <Button variant="outline" size="sm" @click="toggleNotifications">
            <span>🔔</span>
            <span v-if="notificationCount > 0" class="notification-badge">
              {{ notificationCount }}
            </span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Breadcrumb -->
    <nav v-if="breadcrumbs.length > 0" class="breadcrumb">
      <ol class="breadcrumb-list">
        <li
          v-for="(crumb, index) in breadcrumbs"
          :key="index"
          class="breadcrumb-item"
          :class="{ active: index === breadcrumbs.length - 1 }"
        >
          <span v-if="index === breadcrumbs.length - 1">{{ crumb.label }}</span>
          <a v-else :href="crumb.href" @click.prevent="navigateTo(crumb)">{{ crumb.label }}</a>
        </li>
      </ol>
    </nav>
  </header>
</template>

<script setup lang="ts">
// defineProps and defineEmits are compiler macros in Vue 3
import { Button } from '@/components'

interface Breadcrumb {
  label: string
  href?: string
}

interface Props {
  title: string
  subtitle?: string
  showExport?: boolean
  breadcrumbs?: Breadcrumb[]
  notificationCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  showExport: false,
  breadcrumbs: () => [],
  notificationCount: 0
})

const emit = defineEmits<{
  refresh: []
  export: []
  navigate: [crumb: Breadcrumb]
}>()

const refreshData = () => {
  emit('refresh')
}

const exportData = () => {
  emit('export')
}

const toggleNotifications = () => {
  // Toggle notifications panel
  console.log('Toggle notifications')
}

const navigateTo = (crumb: Breadcrumb) => {
  emit('navigate', crumb)
}
</script>

<style scoped>
.admin-header {
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  padding: var(--spacing-lg);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.header-left {
  flex: 1;
}

.header-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.header-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.header-notifications {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: var(--danger-color);
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-primary);
}

.breadcrumb {
  margin-top: var(--spacing-md);
}

.breadcrumb-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: var(--spacing-sm);
}

.breadcrumb-item {
  color: var(--text-secondary);
}

.breadcrumb-item.active {
  color: var(--text-primary);
  font-weight: 500;
}

.breadcrumb-item a {
  color: var(--primary-color);
  text-decoration: none;
}

.breadcrumb-item a:hover {
  text-decoration: underline;
}

.breadcrumb-item:not(:last-child)::after {
  content: '/';
  margin-left: var(--spacing-sm);
  color: var(--text-muted);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .admin-header {
    padding: var(--spacing-md);
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .header-actions {
    flex: 1;
  }

  .header-title {
    font-size: 1.5rem;
  }

  .breadcrumb-list {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .header-actions button {
    width: 100%;
  }
}
</style>