<template>
  <div class="orders-page">
    <div class="container">
      <!-- Page Header -->
      <div class="orders-page__header">
        <h1 class="orders-page__title">My Orders</h1>
        <p class="orders-page__subtitle">Track and manage your order history</p>
      </div>

      <!-- Order Statistics -->
      <div class="orders-page__stats">
        <div class="orders-page__stat-card">
          <div class="orders-page__stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="m1 1 4 4h15l-1 9H6"/>
            </svg>
          </div>
          <div class="orders-page__stat-content">
            <div class="orders-page__stat-value">{{ stats.totalOrders }}</div>
            <div class="orders-page__stat-label">Total Orders</div>
          </div>
        </div>

        <div class="orders-page__stat-card">
          <div class="orders-page__stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="orders-page__stat-content">
            <div class="orders-page__stat-value">{{ formatCurrency(stats.totalSpent, stats.currency) }}</div>
            <div class="orders-page__stat-label">Total Spent</div>
          </div>
        </div>

        <div class="orders-page__stat-card">
          <div class="orders-page__stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <div class="orders-page__stat-content">
            <div class="orders-page__stat-value">{{ formatCurrency(stats.averageOrderValue, stats.currency) }}</div>
            <div class="orders-page__stat-label">Average Order</div>
          </div>
        </div>

        <div class="orders-page__stat-card">
          <div class="orders-page__stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div class="orders-page__stat-content">
            <div class="orders-page__stat-value">{{ stats.statusCounts.delivered || 0 }}</div>
            <div class="orders-page__stat-label">Successful Deliveries</div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="orders-page__filters">
        <div class="orders-page__search">
          <div class="orders-page__search-input">
            <svg class="orders-page__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search orders..."
              class="orders-page__input"
              @input="debouncedSearch"
            />
          </div>
        </div>

        <div class="orders-page__filter-controls">
          <select v-model="statusFilter" class="orders-page__select" @change="applyFilters">
            <option value="">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
            <option value="returned">Returned</option>
          </select>

          <Button variant="outline" size="sm" @click="toggleDateFilter">
            {{ showDateFilter ? 'Hide Date Filter' : 'Filter by Date' }}
          </Button>
        </div>

        <!-- Date Range Filter -->
        <div v-if="showDateFilter" class="orders-page__date-filter">
          <div class="orders-page__date-inputs">
            <div class="orders-page__date-field">
              <label class="orders-page__date-label">From</label>
              <input
                v-model="dateFrom"
                type="date"
                class="orders-page__date-input"
                @change="applyFilters"
              />
            </div>

            <div class="orders-page__date-field">
              <label class="orders-page__date-label">To</label>
              <input
                v-model="dateTo"
                type="date"
                class="orders-page__date-input"
                @change="applyFilters"
              />
            </div>
          </div>

          <Button variant="ghost" size="sm" @click="clearDateFilter">
            Clear Dates
          </Button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="orders-page__loading">
        <div v-for="i in 3" :key="i" class="orders-page__skeleton-card">
          <div class="orders-page__skeleton-header"></div>
          <div class="orders-page__skeleton-content">
            <div class="orders-page__skeleton-line"></div>
            <div class="orders-page__skeleton-line orders-page__skeleton-line--short"></div>
          </div>
        </div>
      </div>

      <!-- Orders List -->
      <div v-else-if="orders.length > 0" class="orders-page__orders">
        <OrderCard
          v-for="order in orders"
          :key="order.id"
          :order="order"
          @view-details="viewOrderDetails"
          @reorder="handleReorder"
          @cancel-order="handleCancelOrder"
        />

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="orders-page__pagination">
          <Button
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="goToPage(pagination.page - 1)"
          >
            Previous
          </Button>

          <div class="orders-page__page-numbers">
            <button
              v-for="page in visiblePages"
              :key="page"
              :class="[
                'orders-page__page-btn',
                { 'orders-page__page-btn--active': page === pagination.page }
              ]"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="goToPage(pagination.page + 1)"
          >
            Next
          </Button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="orders-page__empty">
        <div class="orders-page__empty-content">
          <svg class="orders-page__empty-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="m1 1 4 4h15l-1 9H6"/>
          </svg>
          <h2 class="orders-page__empty-title">No orders found</h2>
          <p class="orders-page__empty-description">
            {{ searchQuery || statusFilter || dateFrom || dateTo
              ? 'Try adjusting your search or filter criteria.'
              : 'You haven\'t placed any orders yet.' }}
          </p>
          <router-link v-if="!searchQuery && !statusFilter && !dateFrom && !dateTo" to="/products">
            <Button variant="primary" size="lg">Start Shopping</Button>
          </router-link>
          <Button
            v-else
            variant="outline"
            size="lg"
            @click="clearAllFilters"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <!-- Cancel Order Modal -->
      <Modal v-model="showCancelModal" title="Cancel Order">
        <div class="orders-page__cancel-content">
          <p>Are you sure you want to cancel order <strong>{{ cancelOrderId }}</strong>?</p>
          <p class="orders-page__cancel-warning">
            This action cannot be undone. If the order has already shipped, you may need to return it when it arrives.
          </p>

          <div class="orders-page__cancel-reason">
            <label class="orders-page__cancel-label">Reason for cancellation:</label>
            <select v-model="cancelReason" class="orders-page__cancel-select">
              <option value="">Select a reason</option>
              <option value="changed_mind">Changed my mind</option>
              <option value="found_better_price">Found better price elsewhere</option>
              <option value="shipping_delay">Shipping delay</option>
              <option value="wrong_item">Ordered wrong item</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div class="orders-page__modal-actions">
          <Button variant="outline" @click="showCancelModal = false">
            Keep Order
          </Button>
          <Button
            variant="danger"
            @click="confirmCancelOrder"
            :disabled="!cancelReason"
            :loading="cancellingOrder"
          >
            Cancel Order
          </Button>
        </div>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDebounce } from '@/composables/useDebounce'
import { useCurrency } from '@/composables/useCurrency'
import ordersAPI, { type OrderSummary } from '@/services/ordersAPI'
import OrderCard from '@/components/orders/OrderCard.vue'
import Button from '@/components/Button.vue'
import Modal from '@/components/Modal.vue'

const router = useRouter()
const { formatCurrency } = useCurrency()

// State
const orders = ref<OrderSummary[]>([])
const stats = ref({
  totalOrders: 0,
  totalSpent: 0,
  currency: 'USD',
  averageOrderValue: 0,
  lastOrderDate: undefined as string | undefined,
  statusCounts: {} as Record<string, number>
})
const loading = ref(true)
const loadingStats = ref(true)

// Filters
const searchQuery = ref('')
const statusFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const showDateFilter = ref(false)

// Pagination
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0
})

// Modal states
const showCancelModal = ref(false)
const cancelOrderId = ref('')
const cancelReason = ref('')
const cancellingOrder = ref(false)

// Debounced search
const { debouncedValue: debouncedSearchQuery } = useDebounce(searchQuery, 500)

// Computed
const visiblePages = computed(() => {
  const current = pagination.value.page
  const total = pagination.value.totalPages
  const delta = 2
  const range = []

  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i)
  }

  if (current - delta > 2) {
    range.unshift(1, '...')
  } else {
    range.unshift(1)
  }

  if (current + delta < total - 1) {
    range.push('...', total)
  } else if (total > 1) {
    range.push(total)
  }

  return range.filter(item => typeof item === 'number')
})

// Methods
const fetchOrders = async () => {
  try {
    loading.value = true

    const filters = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: debouncedSearchQuery.value,
      status: statusFilter.value || undefined,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined
    }

    const response = await ordersAPI.getOrders(filters)
    orders.value = response.orders
    pagination.value = response.pagination

  } catch (error) {
    console.error('Error fetching orders:', error)
    orders.value = []
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    loadingStats.value = true
    const response = await ordersAPI.getOrderStats()
    stats.value = response
  } catch (error) {
    console.error('Error fetching order stats:', error)
  } finally {
    loadingStats.value = false
  }
}

const applyFilters = () => {
  pagination.value.page = 1
  fetchOrders()
}

const toggleDateFilter = () => {
  showDateFilter.value = !showDateFilter.value
  if (!showDateFilter.value) {
    clearDateFilter()
  }
}

const clearDateFilter = () => {
  dateFrom.value = ''
  dateTo.value = ''
  applyFilters()
}

const clearAllFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  showDateFilter.value = false
  pagination.value.page = 1
  fetchOrders()
}

const goToPage = (page: number) => {
  pagination.value.page = page
  fetchOrders()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const viewOrderDetails = (orderId: string) => {
  router.push(`/orders/${orderId}`)
}

const handleReorder = async (orderId: string) => {
  try {
    await ordersAPI.reorder(orderId)
    // In a real app, this would add items back to cart
    router.push('/cart')
  } catch (error) {
    console.error('Error reordering:', error)
  }
}

const handleCancelOrder = (orderId: string) => {
  cancelOrderId.value = orderId
  cancelReason.value = ''
  showCancelModal.value = true
}

const confirmCancelOrder = async () => {
  if (!cancelReason.value) return

  try {
    cancellingOrder.value = true
    await ordersAPI.cancelOrder(cancelOrderId.value, cancelReason.value)

    showCancelModal.value = false
    // Refresh orders list
    fetchOrders()
    fetchStats()

  } catch (error) {
    console.error('Error cancelling order:', error)
  } finally {
    cancellingOrder.value = false
  }
}

// Watchers
watch(debouncedSearchQuery, () => {
  pagination.value.page = 1
  fetchOrders()
})

// Lifecycle
onMounted(() => {
  fetchOrders()
  fetchStats()
})
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.orders-page__header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.orders-page__title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.orders-page__subtitle {
  font-size: var(--font-size-lg);
  color: var(--text-muted);
  margin: 0;
}

.orders-page__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.orders-page__stat-card {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.orders-page__stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-light);
  border-radius: var(--border-radius-md);
  color: var(--primary-color);
}

.orders-page__stat-content {
  flex: 1;
}

.orders-page__stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.orders-page__stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.orders-page__filters {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-xl);
}

.orders-page__search {
  margin-bottom: var(--spacing-lg);
}

.orders-page__search-input {
  position: relative;
  max-width: 400px;
}

.orders-page__search-icon {
  position: absolute;
  left: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.orders-page__input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) calc(var(--spacing-sm) + 24px);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
}

.orders-page__input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.orders-page__filter-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.orders-page__select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  background: var(--bg-white);
  cursor: pointer;
}

.orders-page__date-filter {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.orders-page__date-inputs {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
}

.orders-page__date-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.orders-page__date-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-dark);
}

.orders-page__date-input {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
}

.orders-page__loading {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.orders-page__skeleton-card {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.orders-page__skeleton-header {
  height: 24px;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--border-radius-sm);
  margin-bottom: var(--spacing-md);
}

.orders-page__skeleton-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.orders-page__skeleton-line {
  height: 16px;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--border-radius-sm);
}

.orders-page__skeleton-line--short {
  width: 60%;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.orders-page__orders {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.orders-page__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.orders-page__page-numbers {
  display: flex;
  gap: var(--spacing-xs);
}

.orders-page__page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  background: var(--bg-white);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-dark);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.orders-page__page-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.orders-page__page-btn--active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-light);
}

.orders-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: var(--spacing-xl);
}

.orders-page__empty-content {
  text-align: center;
  max-width: 400px;
}

.orders-page__empty-icon {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

.orders-page__empty-title {
  color: var(--text-dark);
  margin-bottom: var(--spacing-md);
}

.orders-page__empty-description {
  color: var(--text-muted);
  margin-bottom: var(--spacing-xl);
  line-height: 1.5;
}

.orders-page__cancel-content {
  margin-bottom: var(--spacing-lg);
}

.orders-page__cancel-warning {
  color: var(--danger-color);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
}

.orders-page__cancel-reason {
  margin-bottom: var(--spacing-lg);
}

.orders-page__cancel-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.orders-page__cancel-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  background: var(--bg-white);
}

.orders-page__modal-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .orders-page__title {
    font-size: var(--font-size-2xl);
  }

  .orders-page__stats {
    grid-template-columns: 1fr;
  }

  .orders-page__filter-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .orders-page__date-filter {
    flex-direction: column;
    align-items: stretch;
  }

  .orders-page__date-inputs {
    flex-direction: column;
  }

  .orders-page__pagination {
    flex-wrap: wrap;
  }

  .orders-page__modal-actions {
    flex-direction: column;
  }
}
</style>