<template>
  <div class="wishlist-item">
    <div class="wishlist-item__image-container">
      <OptimizedImage
        :src="item.product.image_url || '/placeholder-product.jpg'"
        :alt="item.product.name"
        class="wishlist-item__image"
        :width="120"
        :height="120"
      />

      <!-- Priority indicator -->
      <div
        v-if="item.priority !== 'medium'"
        class="wishlist-item__priority"
        :class="`wishlist-item__priority--${item.priority}`"
      >
        {{ item.priority }}
      </div>

      <!-- Price alert indicator -->
      <div v-if="item.price_alert" class="wishlist-item__alert">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>

      <!-- Stock status -->
      <div
        v-if="!item.product.is_available"
        class="wishlist-item__stock-status wishlist-item__stock-status--out"
      >
        Out of Stock
      </div>
      <div
        v-else-if="item.product.stock_quantity <= 5"
        class="wishlist-item__stock-status wishlist-item__stock-status--low"
      >
        Low Stock
      </div>
    </div>

    <div class="wishlist-item__content">
      <div class="wishlist-item__header">
        <h4 class="wishlist-item__title">{{ item.product.name }}</h4>
        <div class="wishlist-item__sku">SKU: {{ item.product.sku }}</div>
      </div>

      <div class="wishlist-item__price">
        <span class="wishlist-item__current-price">
          {{ formatCurrency(item.product.price) }}
        </span>
        <span v-if="item.alert_price" class="wishlist-item__alert-price">
          Alert: {{ formatCurrency(item.alert_price) }}
        </span>
      </div>

      <div class="wishlist-item__quantity">
        <label class="wishlist-item__quantity-label">Quantity:</label>
        <div class="wishlist-item__quantity-controls">
          <button
            class="wishlist-item__quantity-btn"
            @click="updateQuantity(Math.max(1, item.quantity - 1))"
            :disabled="item.quantity <= 1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <span class="wishlist-item__quantity-value">{{ item.quantity }}</span>
          <button
            class="wishlist-item__quantity-btn"
            @click="updateQuantity(item.quantity + 1)"
            :disabled="item.quantity >= 99"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="item.notes" class="wishlist-item__notes">
        <strong>Notes:</strong> {{ item.notes }}
      </div>

      <div class="wishlist-item__date">
        Added {{ formatDate(item.added_at) }}
      </div>
    </div>

    <div class="wishlist-item__actions">
      <!-- Edit item -->
      <button
        class="wishlist-item__action-btn"
        @click="showEditModal = true"
        title="Edit item"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      <!-- View product -->
      <button
        class="wishlist-item__action-btn"
        @click="viewProduct"
        title="View product"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>

      <!-- Add to cart -->
      <button
        class="wishlist-item__action-btn wishlist-item__action-btn--primary"
        @click="addToCart"
        :disabled="!item.product.is_available"
        title="Add to cart"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="m1 1 4 4h15l-1 8H6"/>
        </svg>
      </button>

      <!-- Remove from wishlist -->
      <button
        class="wishlist-item__action-btn wishlist-item__action-btn--danger"
        @click="confirmRemove"
        title="Remove from wishlist"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    </div>

    <!-- Edit Item Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title">Edit Wishlist Item</h3>
          <button class="modal__close" @click="showEditModal = false">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleEditSubmit" class="modal__body">
          <div class="form-group">
            <label class="form-label">Quantity</label>
            <input
              v-model.number="editForm.quantity"
              type="number"
              class="form-input"
              min="1"
              max="99"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Priority</label>
            <select v-model="editForm.priority" class="form-select">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Notes (Optional)</label>
            <textarea
              v-model="editForm.notes"
              class="form-textarea"
              placeholder="Add notes about this item..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-checkbox">
              <input
                v-model="editForm.priceAlert"
                type="checkbox"
                class="form-checkbox__input"
              />
              <span class="form-checkbox__checkmark"></span>
              Set price alert
            </label>
          </div>

          <div v-if="editForm.priceAlert" class="form-group">
            <label class="form-label">Alert Price</label>
            <input
              v-model.number="editForm.alertPrice"
              type="number"
              class="form-input"
              step="0.01"
              min="0.01"
              :max="item.product.price - 0.01"
              placeholder="Enter target price"
            />
          </div>

          <div class="modal__actions">
            <button type="button" class="btn btn--outline" @click="showEditModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn--primary" :disabled="isUpdating">
              {{ isUpdating ? 'Updating...' : 'Update Item' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrency } from '@/composables/useCurrency'
import OptimizedImage from '@/components/OptimizedImage.vue'
import type { WishlistItem } from '@/composables/useWishlist'

interface Props {
  item: WishlistItem
  wishlistId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [updates: Partial<WishlistItem>]
  remove: [itemId: string]
}>()

const router = useRouter()
const { formatCurrency } = useCurrency()

const showEditModal = ref(false)
const isUpdating = ref(false)

const editForm = ref({
  quantity: props.item.quantity,
  priority: props.item.priority,
  notes: props.item.notes || '',
  priceAlert: props.item.price_alert,
  alertPrice: props.item.alert_price || undefined
})

// Methods
const updateQuantity = async (newQuantity: number) => {
  if (newQuantity !== props.item.quantity) {
    emit('update', { quantity: newQuantity })
  }
}

const viewProduct = () => {
  router.push(`/product/${props.item.product.id}`)
}

const addToCart = () => {
  // This would integrate with the cart composable
  // For now, just emit an event that parent components can handle
  emit('addToCart', props.item.product, props.item.quantity)
}

const confirmRemove = () => {
  if (confirm('Are you sure you want to remove this item from your wishlist?')) {
    emit('remove', props.item.id)
  }
}

const handleEditSubmit = async () => {
  isUpdating.value = true

  try {
    const updates: Partial<WishlistItem> = {
      quantity: editForm.value.quantity,
      priority: editForm.value.priority as 'low' | 'medium' | 'high',
      notes: editForm.value.notes || undefined,
      price_alert: editForm.value.priceAlert,
      alert_price: editForm.value.alertPrice
    }

    emit('update', updates)
    showEditModal.value = false
  } catch (error) {
    console.error('Error updating item:', error)
  } finally {
    isUpdating.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.wishlist-item {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  transition: all 0.2s ease;
}

.wishlist-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.wishlist-item__image-container {
  position: relative;
  flex-shrink: 0;
}

.wishlist-item__image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  object-fit: cover;
}

.wishlist-item__priority {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
}

.wishlist-item__priority--low {
  background: var(--success-color);
}

.wishlist-item__priority--medium {
  background: var(--warning-color);
}

.wishlist-item__priority--high {
  background: var(--error-color);
}

.wishlist-item__alert {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.wishlist-item__stock-status {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.wishlist-item__stock-status--out {
  background: var(--error-color);
}

.wishlist-item__stock-status--low {
  background: var(--warning-color);
}

.wishlist-item__content {
  flex: 1;
  min-width: 0;
}

.wishlist-item__header {
  margin-bottom: 0.75rem;
}

.wishlist-item__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.wishlist-item__sku {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.wishlist-item__price {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.wishlist-item__current-price {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary-color);
}

.wishlist-item__alert-price {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.wishlist-item__quantity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.wishlist-item__quantity-label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.wishlist-item__quantity-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wishlist-item__quantity-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wishlist-item__quantity-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--primary-color);
}

.wishlist-item__quantity-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wishlist-item__quantity-value {
  min-width: 40px;
  text-align: center;
  font-weight: 600;
  color: var(--text-primary);
}

.wishlist-item__notes {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.wishlist-item__date {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.wishlist-item__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.wishlist-item__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wishlist-item__action-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--primary-color);
}

.wishlist-item__action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wishlist-item__action-btn--primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.wishlist-item__action-btn--primary:hover:not(:disabled) {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}

.wishlist-item__action-btn--danger {
  color: var(--error-color);
  border-color: var(--error-color);
}

.wishlist-item__action-btn--danger:hover:not(:disabled) {
  background: rgba(var(--error-rgb), 0.1);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal__header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal__close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal__close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal__body {
  padding: 2rem;
}

.modal__actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 400;
}

.form-checkbox__input {
  width: 18px;
  height: 18px;
  margin: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn--primary:hover:not(:disabled) {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}

.btn--outline {
  background: transparent;
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn--outline:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

/* Responsive design */
@media (max-width: 768px) {
  .wishlist-item {
    flex-direction: column;
    padding: 1rem;
  }

  .wishlist-item__image {
    width: 100px;
    height: 100px;
    align-self: center;
  }

  .wishlist-item__actions {
    flex-direction: row;
    justify-content: center;
    margin-top: 1rem;
  }

  .wishlist-item__price {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .modal__body {
    padding: 1.5rem;
  }

  .modal__actions {
    flex-direction: column;
  }
}
</style>