<template>
  <span :class="statusClasses" class="order-status-badge">
    {{ statusText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderStatus } from '@/services/ordersAPI'

interface Props {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const statusConfig = {
  pending: { text: 'Pending', color: 'var(--warning-color)' },
  confirmed: { text: 'Confirmed', color: 'var(--info-color)' },
  processing: { text: 'Processing', color: 'var(--primary-color)' },
  shipped: { text: 'Shipped', color: 'var(--info-color)' },
  delivered: { text: 'Delivered', color: 'var(--success-color)' },
  cancelled: { text: 'Cancelled', color: 'var(--danger-color)' },
  refunded: { text: 'Refunded', color: 'var(--warning-color)' },
  returned: { text: 'Returned', color: 'var(--text-muted)' }
}

const statusClasses = computed(() => {
  const classes = ['order-status-badge']
  classes.push(`order-status-badge--${props.size}`)
  return classes.join(' ')
})

const statusText = computed(() => {
  return statusConfig[props.status]?.text || props.status
})

const statusColor = computed(() => {
  return statusConfig[props.status]?.color || 'var(--text-muted)'
})
</script>

<style scoped>
.order-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px var(--spacing-sm);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: v-bind(statusColor);
  color: white;
}

.order-status-badge--sm {
  font-size: 10px;
  padding: 2px var(--spacing-xs);
}

.order-status-badge--lg {
  font-size: var(--font-size-sm);
  padding: 6px var(--spacing-md);
}
</style>