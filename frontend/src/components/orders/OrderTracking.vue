<template>
  <div class="order-tracking">
    <div class="order-tracking__header">
      <h3 class="order-tracking__title">Order Tracking</h3>
      <OrderStatusBadge :status="tracking.status" />
    </div>

    <div v-if="tracking.trackingNumber" class="order-tracking__info">
      <div class="order-tracking__tracking-number">
        <span class="order-tracking__label">Tracking Number:</span>
        <span class="order-tracking__value">{{ tracking.trackingNumber }}</span>
        <Button
          v-if="tracking.trackingUrl"
          variant="link"
          size="sm"
          @click="openTrackingUrl"
        >
          Track Package
        </Button>
      </div>

      <div v-if="tracking.carrier" class="order-tracking__carrier">
        <span class="order-tracking__label">Carrier:</span>
        <span class="order-tracking__value">{{ tracking.carrier }}</span>
      </div>

      <div v-if="tracking.estimatedDelivery" class="order-tracking__delivery">
        <svg class="order-tracking__delivery-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span class="order-tracking__label">Estimated Delivery:</span>
        <span class="order-tracking__value">{{ formatDate(tracking.estimatedDelivery) }}</span>
      </div>
    </div>

    <div class="order-tracking__timeline">
      <div
        v-for="(update, index) in tracking.updates"
        :key="update.id"
        :class="[
          'order-tracking__update',
          { 'order-tracking__update--completed': index < currentUpdateIndex }
        ]"
      >
        <div class="order-tracking__update-dot">
          <div v-if="index < currentUpdateIndex" class="order-tracking__update-check">
            ✓
          </div>
        </div>

        <div class="order-tracking__update-content">
          <div class="order-tracking__update-status">
            <OrderStatusBadge :status="update.status" size="sm" />
          </div>

          <div class="order-tracking__update-message">{{ update.message }}</div>

          <div class="order-tracking__update-meta">
            <span class="order-tracking__update-time">{{ formatDateTime(update.timestamp) }}</span>
            <span v-if="update.location" class="order-tracking__update-location">
              • {{ update.location }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!hasUpdates" class="order-tracking__no-updates">
      <svg class="order-tracking__no-updates-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
      <p>No tracking updates available yet.</p>
      <p class="order-tracking__no-updates-subtitle">
        Tracking information will appear here once your order ships.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderTracking } from '@/services/ordersAPI'
import OrderStatusBadge from './OrderStatusBadge.vue'
import Button from '@/components/Button.vue'

interface Props {
  tracking: OrderTracking
}

defineProps<Props>()

const currentUpdateIndex = computed(() => {
  // Find the index of the most recent update
  return tracking.updates.length - 1
})

const hasUpdates = computed(() => {
  return tracking.updates && tracking.updates.length > 0
})

const openTrackingUrl = () => {
  if (tracking.trackingUrl) {
    window.open(tracking.trackingUrl, '_blank')
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}
</script>

<style scoped>
.order-tracking {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}

.order-tracking__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.order-tracking__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}

.order-tracking__info {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--bg-light);
  border-radius: var(--border-radius-md);
}

.order-tracking__tracking-number,
.order-tracking__carrier,
.order-tracking__delivery {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.order-tracking__tracking-number:last-child,
.order-tracking__carrier:last-child,
.order-tracking__delivery:last-child {
  margin-bottom: 0;
}

.order-tracking__label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-muted);
  min-width: 120px;
}

.order-tracking__value {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-dark);
  flex: 1;
}

.order-tracking__delivery-icon {
  color: var(--primary-color);
  flex-shrink: 0;
}

.order-tracking__timeline {
  position: relative;
  padding-left: 40px;
}

.order-tracking__timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-color);
}

.order-tracking__update {
  position: relative;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
  border-left: 2px solid var(--border-color);
  padding-left: 40px;
}

.order-tracking__update:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-left: none;
}

.order-tracking__update::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border-color);
  border: 2px solid var(--bg-white);
}

.order-tracking__update--completed::before {
  background: var(--success-color);
}

.order-tracking__update-dot {
  position: absolute;
  left: -22px;
  top: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-white);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.order-tracking__update--completed .order-tracking__update-dot {
  background: var(--success-color);
  border-color: var(--success-color);
}

.order-tracking__update-check {
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.order-tracking__update-content {
  margin-left: var(--spacing-md);
}

.order-tracking__update-status {
  margin-bottom: var(--spacing-xs);
}

.order-tracking__update-message {
  font-size: var(--font-size-base);
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
  line-height: 1.4;
}

.order-tracking__update-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-tracking__update-location {
  color: var(--primary-color);
}

.order-tracking__no-updates {
  text-align: center;
  padding: var(--spacing-xl);
}

.order-tracking__no-updates-icon {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

.order-tracking__no-updates p {
  color: var(--text-muted);
  margin-bottom: var(--spacing-sm);
}

.order-tracking__no-updates-subtitle {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}

@media (max-width: 768px) {
  .order-tracking {
    padding: var(--spacing-lg);
  }

  .order-tracking__header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .order-tracking__info {
    padding: var(--spacing-md);
  }

  .order-tracking__timeline {
    padding-left: 30px;
  }

  .order-tracking__update {
    padding-left: 30px;
  }

  .order-tracking__update-dot {
    left: -17px;
  }
}
</style>