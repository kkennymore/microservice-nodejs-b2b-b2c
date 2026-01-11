<template>
  <div class="order-card">
    <div class="order-card__header">
      <div class="order-card__order-info">
        <h3 class="order-card__order-number">{{ order.orderNumber }}</h3>
        <div class="order-card__order-date">
          {{ formatDate(order.createdAt) }}
        </div>
      </div>

      <div class="order-card__order-status">
        <OrderStatusBadge :status="order.status" />
      </div>
    </div>

    <div class="order-card__content">
      <div class="order-card__items">
        <div
          v-for="item in order.items.slice(0, 2)"
          :key="item.id"
          class="order-card__item"
        >
          <OptimizedImage
            :src="item.productImage"
            :alt="item.productName"
            class="order-card__item-image"
            :width="60"
            :height="60"
          />
          <div class="order-card__item-info">
            <div class="order-card__item-name">{{ item.productName }}</div>
            <div class="order-card__item-details">
              <span class="order-card__item-quantity">Qty: {{ item.quantity }}</span>
              <span v-if="item.selectedColor" class="order-card__item-variant">
                Color: {{ item.selectedColor }}
              </span>
              <span v-if="item.selectedSize" class="order-card__item-variant">
                Size: {{ item.selectedSize }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="order.items.length > 2" class="order-card__more-items">
          +{{ order.items.length - 2 }} more item{{ order.items.length - 2 > 1 ? 's' : '' }}
        </div>
      </div>

      <div class="order-card__summary">
        <div class="order-card__total">
          <span class="order-card__total-label">Total:</span>
          <span class="order-card__total-value">
            {{ formatCurrency(order.total, order.currency) }}
          </span>
        </div>

        <div v-if="order.estimatedDelivery" class="order-card__delivery">
          <svg class="order-card__delivery-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <span class="order-card__delivery-text">
            Est. delivery: {{ formatDate(order.estimatedDelivery) }}
          </span>
        </div>
      </div>
    </div>

    <div class="order-card__actions">
      <Button
        variant="outline"
        size="sm"
        @click="$emit('view-details', order.id)"
      >
        View Details
      </Button>

      <Button
        v-if="canReorder"
        variant="outline"
        size="sm"
        @click="$emit('reorder', order.id)"
      >
        Reorder
      </Button>

      <Button
        v-if="canCancel"
        variant="danger"
        size="sm"
        @click="$emit('cancel-order', order.id)"
      >
        Cancel Order
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import type { OrderSummary, OrderStatus } from '@/services/ordersAPI'
import OptimizedImage from '@/components/OptimizedImage.vue'
import Button from '@/components/Button.vue'
import OrderStatusBadge from './OrderStatusBadge.vue'

interface Props {
  order: OrderSummary
}

defineProps<Props>()

const emit = defineEmits<{
  'view-details': [orderId: string]
  reorder: [orderId: string]
  'cancel-order': [orderId: string]
}>()

const { formatCurrency } = useCurrency()

const canReorder = computed(() => {
  return ['delivered', 'cancelled', 'refunded'].includes(order.status)
})

const canCancel = computed(() => {
  return ['pending', 'confirmed', 'processing'].includes(order.status)
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.order-card {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  transition: box-shadow var(--transition-fast);
}

.order-card:hover {
  box-shadow: var(--shadow-md);
}

.order-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.order-card__order-info h3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.order-card__order-date {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-card__content {
  margin-bottom: var(--spacing-lg);
}

.order-card__items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.order-card__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.order-card__item-image {
  border-radius: var(--border-radius-md);
  flex-shrink: 0;
}

.order-card__item-info {
  flex: 1;
}

.order-card__item-name {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.order-card__item-details {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-card__item-variant {
  padding: 2px var(--spacing-xs);
  background: var(--bg-light);
  border-radius: var(--border-radius-sm);
}

.order-card__more-items {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: var(--spacing-sm);
}

.order-card__summary {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.order-card__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-card__total-label {
  font-size: var(--font-size-base);
  color: var(--text-dark);
}

.order-card__total-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text-dark);
}

.order-card__delivery {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-card__delivery-icon {
  color: var(--primary-color);
  flex-shrink: 0;
}

.order-card__actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .order-card {
    padding: var(--spacing-md);
  }

  .order-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .order-card__item {
    align-items: flex-start;
  }

  .order-card__actions {
    justify-content: stretch;
  }

  .order-card__actions button {
    flex: 1;
  }
}
</style>