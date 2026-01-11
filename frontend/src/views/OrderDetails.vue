<template>
  <div class="order-details-page">
    <div class="container">
      <!-- Loading State -->
      <div v-if="loading" class="order-details-page__loading">
        <div class="order-details-page__skeleton">
          <div class="order-details-page__skeleton-header"></div>
          <div class="order-details-page__skeleton-content">
            <div class="order-details-page__skeleton-line"></div>
            <div class="order-details-page__skeleton-line order-details-page__skeleton-line--short"></div>
            <div class="order-details-page__skeleton-line"></div>
          </div>
        </div>
      </div>

      <!-- Order Details -->
      <div v-else-if="order" class="order-details-page__content">
        <!-- Back Button -->
        <div class="order-details-page__back">
          <router-link to="/orders" class="order-details-page__back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
            Back to Orders
          </router-link>
        </div>

        <!-- Order Header -->
        <div class="order-details-page__header">
          <div class="order-details-page__header-main">
            <h1 class="order-details-page__title">Order {{ order.orderNumber }}</h1>
            <OrderStatusBadge :status="order.status" size="lg" />
          </div>

          <div class="order-details-page__header-meta">
            <div class="order-details-page__meta-item">
              <span class="order-details-page__meta-label">Order Date:</span>
              <span class="order-details-page__meta-value">{{ formatDate(order.createdAt) }}</span>
            </div>

            <div v-if="order.estimatedDelivery" class="order-details-page__meta-item">
              <span class="order-details-page__meta-label">Estimated Delivery:</span>
              <span class="order-details-page__meta-value">{{ formatDate(order.estimatedDelivery) }}</span>
            </div>
          </div>
        </div>

        <!-- Order Actions -->
        <div class="order-details-page__actions">
          <Button
            v-if="canReorder"
            variant="outline"
            size="sm"
            @click="handleReorder"
            :loading="reordering"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Reorder Items
          </Button>

          <Button
            variant="outline"
            size="sm"
            @click="downloadInvoice"
            :loading="downloadingInvoice"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            Download Invoice
          </Button>

          <Button
            v-if="canCancel"
            variant="danger"
            size="sm"
            @click="showCancelModal = true"
          >
            Cancel Order
          </Button>

          <Button
            v-if="canReturn"
            variant="outline"
            size="sm"
            @click="showReturnModal = true"
          >
            Request Return
          </Button>

          <Button
            variant="outline"
            size="sm"
            @click="contactSeller"
            :loading="contactingSeller"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Contact Seller
          </Button>
        </div>

        <!-- Order Tracking -->
        <div v-if="tracking" class="order-details-page__tracking">
          <OrderTracking :tracking="tracking" />
        </div>

        <!-- Order Items -->
        <div class="order-details-page__section">
          <h2 class="order-details-page__section-title">Order Items</h2>

          <div class="order-details-page__items">
            <div
              v-for="item in order.items"
              :key="item.id"
              class="order-details-page__item"
            >
              <div class="order-details-page__item-image">
                <OptimizedImage
                  :src="item.productImage"
                  :alt="item.productName"
                  class="order-details-page__item-img"
                  :width="100"
                  :height="100"
                />
              </div>

              <div class="order-details-page__item-content">
                <div class="order-details-page__item-info">
                  <h3 class="order-details-page__item-name">{{ item.productName }}</h3>

                  <div class="order-details-page__item-details">
                    <span class="order-details-page__item-seller">Sold by: {{ item.sellerName }}</span>

                    <div v-if="item.selectedColor || item.selectedSize" class="order-details-page__item-variants">
                      <span v-if="item.selectedColor" class="order-details-page__item-variant">
                        Color: {{ item.selectedColor }}
                      </span>
                      <span v-if="item.selectedSize" class="order-details-page__item-variant">
                        Size: {{ item.selectedSize }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="order-details-page__item-actions">
                  <div class="order-details-page__item-quantity">
                    Qty: {{ item.quantity }}
                  </div>

                  <div class="order-details-page__item-price">
                    {{ formatCurrency(item.price * item.quantity, order.currency) }}
                  </div>

                  <Button
                    v-if="order.status === 'delivered'"
                    variant="outline"
                    size="sm"
                    @click="writeReview(item.id)"
                  >
                    Write Review
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="order-details-page__summary">
          <h2 class="order-details-page__section-title">Order Summary</h2>

          <div class="order-details-page__summary-content">
            <div class="order-details-page__summary-row">
              <span class="order-details-page__summary-label">Subtotal</span>
              <span class="order-details-page__summary-value">{{ formatCurrency(order.subtotal, order.currency) }}</span>
            </div>

            <div class="order-details-page__summary-row">
              <span class="order-details-page__summary-label">Shipping</span>
              <span class="order-details-page__summary-value">{{ formatCurrency(order.shipping, order.currency) }}</span>
            </div>

            <div v-if="order.tax > 0" class="order-details-page__summary-row">
              <span class="order-details-page__summary-label">Tax</span>
              <span class="order-details-page__summary-value">{{ formatCurrency(order.tax, order.currency) }}</span>
            </div>

            <div v-if="order.discount > 0" class="order-details-page__summary-row order-details-page__summary-row--discount">
              <span class="order-details-page__summary-label">Discount</span>
              <span class="order-details-page__summary-value">-{{ formatCurrency(order.discount, order.currency) }}</span>
            </div>

            <div class="order-details-page__summary-divider"></div>

            <div class="order-details-page__summary-row order-details-page__summary-row--total">
              <span class="order-details-page__summary-label">Total</span>
              <span class="order-details-page__summary-value">{{ formatCurrency(order.total, order.currency) }}</span>
            </div>
          </div>
        </div>

        <!-- Shipping & Payment Info -->
        <div class="order-details-page__info-grid">
          <!-- Shipping Address -->
          <div class="order-details-page__info-section">
            <h3 class="order-details-page__info-title">Shipping Address</h3>
            <div class="order-details-page__address">
              <p class="order-details-page__address-name">{{ order.shippingAddress.fullName }}</p>
              <p class="order-details-page__address-line">{{ order.shippingAddress.address }}</p>
              <p v-if="order.shippingAddress.apartment" class="order-details-page__address-line">
                {{ order.shippingAddress.apartment }}
              </p>
              <p class="order-details-page__address-line">
                {{ order.shippingAddress.city }}, {{ order.shippingAddress.state }} {{ order.shippingAddress.zipCode }}
              </p>
              <p class="order-details-page__address-line">{{ order.shippingAddress.country }}</p>
              <p v-if="order.shippingAddress.phone" class="order-details-page__address-line">
                Phone: {{ order.shippingAddress.phone }}
              </p>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="order-details-page__info-section">
            <h3 class="order-details-page__info-title">Payment Method</h3>
            <div class="order-details-page__payment">
              <div v-if="order.paymentMethod.type === 'card'" class="order-details-page__card">
                <div class="order-details-page__card-info">
                  <svg class="order-details-page__card-icon" viewBox="0 0 24 24" fill="currentColor">
                    <rect width="24" height="24" rx="4"/>
                    <path d="M4 6h16v2H4z" fill="white"/>
                    <path d="M4 10h16v2H4z" fill="white"/>
                    <path d="M4 14h8v2H4z" fill="white"/>
                  </svg>
                  <div>
                    <p class="order-details-page__card-type">
                      {{ order.paymentMethod.brand || 'Card' }} ending in {{ order.paymentMethod.last4 }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-else-if="order.paymentMethod.type === 'paypal'" class="order-details-page__paypal">
                <svg class="order-details-page__paypal-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.23 1.527-.727 2.51-1.446 3.287-.76.817-1.53 1.31-2.36 1.31H9.38c-.21 0-.375.166-.318.37l.684 2.52c.07.204.384.37.595.37h2.61c2.483 0 4.43.558 5.48 1.634.906.95 1.222 2.15.882 3.738-.283 1.303-.863 2.224-1.616 2.744-.828.57-1.704.83-2.546.83h-2.52c-.636 0-1.063-.57-1.04-1.2l.388-13.077c.01-.07.044-.13.085-.13h3.72c.66 0 1.25-.054 1.772-.17.404-.09.65-.246.65-.354 0-.05-.043-.08-.104-.08H9.74c-.564 0-1.01.45-1.05 1.005l-.276 9.33c-.007.21-.18.375-.39.375H6.29c-.21 0-.39-.165-.39-.375l-.406-13.59c-.01-.21-.18-.375-.39-.375H.99c-.21 0-.39.165-.39.375L.21 20.6c-.007.21.17.375.38.375h5.51c.21 0 .39-.165.39-.375l.303-10.235c.007-.21.18-.375.39-.375h3.72c.66 0 1.25-.054 1.772-.17.404-.09.65-.246.65-.354 0-.05-.043-.08-.104-.08H7.077c-.564 0-1.01.45-1.05 1.005l-.276 9.33c-.007.21-.18.375-.39.375H3.29c-.21 0-.39-.165-.39-.375l-.406-13.59c-.01-.21-.18-.375-.39-.375H.49c-.21 0-.39.165-.39.375L0 20.85c-.007.21.17.375.38.375h5.51c.21 0 .39-.165.39-.375l.303-10.235z"/>
                </svg>
                <span>PayPal</span>
              </div>

              <div v-else class="order-details-page__digital">
                <svg class="order-details-page__digital-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                  <path d="M4 9h16v2H4z" fill="white"/>
                </svg>
                <span>Digital Wallet</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Not Found -->
      <div v-else class="order-details-page__not-found">
        <h2>Order Not Found</h2>
        <p>The order you're looking for doesn't exist or you don't have permission to view it.</p>
        <router-link to="/orders">
          <Button variant="primary">Back to Orders</Button>
        </router-link>
      </div>

      <!-- Cancel Order Modal -->
      <Modal v-model="showCancelModal" title="Cancel Order">
        <div class="order-details-page__cancel-content">
          <p>Are you sure you want to cancel this order?</p>
          <p class="order-details-page__cancel-warning">
            This action cannot be undone. If the order has already shipped, you may need to return it when it arrives.
          </p>

          <div class="order-details-page__cancel-reason">
            <label class="order-details-page__cancel-label">Reason for cancellation:</label>
            <select v-model="cancelReason" class="order-details-page__cancel-select">
              <option value="">Select a reason</option>
              <option value="changed_mind">Changed my mind</option>
              <option value="found_better_price">Found better price elsewhere</option>
              <option value="shipping_delay">Shipping delay</option>
              <option value="wrong_item">Ordered wrong item</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div class="order-details-page__modal-actions">
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

      <!-- Return Request Modal -->
      <Modal v-model="showReturnModal" title="Request Return">
        <div class="order-details-page__return-content">
          <p>Select the items you want to return:</p>

          <div class="order-details-page__return-items">
            <div
              v-for="item in order.items"
              :key="item.id"
              class="order-details-page__return-item"
            >
              <label class="order-details-page__return-item-label">
                <input
                  type="checkbox"
                  :value="item.id"
                  v-model="returnItems"
                />
                <span class="order-details-page__return-checkmark"></span>
                <div class="order-details-page__return-item-info">
                  <span class="order-details-page__return-item-name">{{ item.productName }}</span>
                  <span class="order-details-page__return-item-details">
                    Qty: {{ item.quantity }} • {{ formatCurrency(item.price * item.quantity, order.currency) }}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div v-if="returnItems.length > 0" class="order-details-page__return-reason">
            <label class="order-details-page__return-label">Return reason:</label>
            <select v-model="returnReason" class="order-details-page__return-select">
              <option value="">Select a reason</option>
              <option value="wrong_item">Wrong item received</option>
              <option value="damaged">Item damaged</option>
              <option value="not_as_described">Not as described</option>
              <option value="changed_mind">Changed my mind</option>
              <option value="other">Other</option>
            </select>

            <label class="order-details-page__return-label">Additional details (optional):</label>
            <textarea
              v-model="returnDescription"
              class="order-details-page__return-textarea"
              placeholder="Please provide any additional details about your return..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="order-details-page__modal-actions">
          <Button variant="outline" @click="showReturnModal = false">
            Cancel
          </Button>
          <Button
            variant="primary"
            @click="submitReturnRequest"
            :disabled="returnItems.length === 0 || !returnReason"
            :loading="submittingReturn"
          >
            Submit Return Request
          </Button>
        </div>
      </Modal>

      <!-- Review Modal -->
      <Modal v-model="showReviewModal" title="Write a Review">
        <div class="order-details-page__review-content">
          <div class="order-details-page__review-product">
            <OptimizedImage
              :src="reviewProduct?.productImage"
              :alt="reviewProduct?.productName"
              class="order-details-page__review-image"
              :width="60"
              :height="60"
            />
            <div>
              <h4 class="order-details-page__review-product-name">{{ reviewProduct?.productName }}</h4>
              <p class="order-details-page__review-product-seller">by {{ reviewProduct?.sellerName }}</p>
            </div>
          </div>

          <form @submit.prevent="submitReview" class="order-details-page__review-form">
            <div class="order-details-page__form-group">
              <label class="order-details-page__form-label">Rating</label>
              <div class="order-details-page__rating-input">
                <button
                  v-for="star in 5"
                  :key="star"
                  type="button"
                  :class="['order-details-page__rating-star', { 'order-details-page__rating-star--active': star <= reviewRating }]"
                  @click="reviewRating = star"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="order-details-page__form-group">
              <label class="order-details-page__form-label">Review</label>
              <textarea
                v-model="reviewComment"
                class="order-details-page__form-textarea"
                placeholder="Share your thoughts about this product..."
                rows="4"
                required
              ></textarea>
            </div>

            <div class="order-details-page__form-actions">
              <Button type="button" variant="outline" @click="showReviewModal = false">
                Cancel
              </Button>
              <Button type="submit" variant="primary" :loading="submittingReview">
                Submit Review
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrency } from '@/composables/useCurrency'
import ordersAPI, { type Order, type OrderTracking } from '@/services/ordersAPI'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge.vue'
import OrderTracking from '@/components/orders/OrderTracking.vue'
import OptimizedImage from '@/components/OptimizedImage.vue'
import Button from '@/components/Button.vue'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const router = useRouter()
const { formatCurrency } = useCurrency()

// State
const order = ref<Order | null>(null)
const tracking = ref<OrderTracking | null>(null)
const loading = ref(true)
const loadingTracking = ref(true)

// Modal states
const showCancelModal = ref(false)
const showReturnModal = ref(false)
const showReviewModal = ref(false)

// Form states
const cancelReason = ref('')
const cancellingOrder = ref(false)
const returnItems = ref<string[]>([])
const returnReason = ref('')
const returnDescription = ref('')
const submittingReturn = ref(false)
const reviewItemId = ref('')
const reviewRating = ref(5)
const reviewComment = ref('')
const submittingReview = ref(false)
const contactingSeller = ref(false)
const downloadingInvoice = ref(false)
const reordering = ref(false)

// Computed
const orderId = computed(() => route.params.id as string)

const canReorder = computed(() => {
  return order.value && ['delivered', 'cancelled', 'refunded'].includes(order.value.status)
})

const canCancel = computed(() => {
  return order.value && ['pending', 'confirmed', 'processing'].includes(order.value.status)
})

const canReturn = computed(() => {
  return order.value && order.value.status === 'delivered'
})

const reviewProduct = computed(() => {
  if (!order.value || !reviewItemId.value) return null
  return order.value.items.find(item => item.id === reviewItemId.value)
})

// Methods
const fetchOrder = async () => {
  try {
    loading.value = true
    const orderData = await ordersAPI.getOrder(orderId.value)
    order.value = orderData
  } catch (error) {
    console.error('Error fetching order:', error)
    order.value = null
  } finally {
    loading.value = false
  }
}

const fetchTracking = async () => {
  try {
    loadingTracking.value = true
    const trackingData = await ordersAPI.getOrderTracking(orderId.value)
    tracking.value = trackingData
  } catch (error) {
    console.error('Error fetching tracking:', error)
    // Tracking might not be available yet, which is fine
  } finally {
    loadingTracking.value = false
  }
}

const handleReorder = async () => {
  if (!order.value) return

  try {
    reordering.value = true
    await ordersAPI.reorder(order.value.id)
    router.push('/cart')
  } catch (error) {
    console.error('Error reordering:', error)
  } finally {
    reordering.value = false
  }
}

const downloadInvoice = async () => {
  if (!order.value) return

  try {
    downloadingInvoice.value = true
    const blob = await ordersAPI.downloadInvoice(order.value.id)

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `invoice-${order.value.orderNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading invoice:', error)
  } finally {
    downloadingInvoice.value = false
  }
}

const confirmCancelOrder = async () => {
  if (!order.value || !cancelReason.value) return

  try {
    cancellingOrder.value = true
    await ordersAPI.cancelOrder(order.value.id, cancelReason.value)

    showCancelModal.value = false
    // Refresh order data
    await fetchOrder()
    await fetchTracking()
  } catch (error) {
    console.error('Error cancelling order:', error)
  } finally {
    cancellingOrder.value = false
  }
}

const submitReturnRequest = async () => {
  if (!order.value || returnItems.value.length === 0 || !returnReason.value) return

  try {
    submittingReturn.value = true

    const returnData = {
      items: returnItems.value.map(itemId => {
        const item = order.value!.items.find(i => i.id === itemId)!
        return {
          itemId,
          quantity: item.quantity,
          reason: returnReason.value,
          description: returnDescription.value
        }
      }),
      returnMethod: 'refund' as const
    }

    await ordersAPI.requestReturn(order.value.id, returnData)

    showReturnModal.value = false
    // Reset form
    returnItems.value = []
    returnReason.value = ''
    returnDescription.value = ''

    // Show success message (in real app, use toast)
    console.log('Return request submitted successfully')

  } catch (error) {
    console.error('Error submitting return request:', error)
  } finally {
    submittingReturn.value = false
  }
}

const writeReview = (itemId: string) => {
  reviewItemId.value = itemId
  reviewRating.value = 5
  reviewComment.value = ''
  showReviewModal.value = true
}

const submitReview = async () => {
  if (!order.value || !reviewItemId.value) return

  try {
    submittingReview.value = true

    await ordersAPI.leaveReview(order.value.id, [{
      itemId: reviewItemId.value,
      rating: reviewRating.value,
      comment: reviewComment.value
    }])

    showReviewModal.value = false
    // Show success message (in real app, use toast)
    console.log('Review submitted successfully')

  } catch (error) {
    console.error('Error submitting review:', error)
  } finally {
    submittingReview.value = false
  }
}

const contactSeller = async () => {
  if (!order.value) return

  const message = prompt('Enter your message to the seller:')
  if (!message?.trim()) return

  try {
    contactingSeller.value = true
    await ordersAPI.contactSeller(order.value.id, message)
    // Show success message (in real app, use toast)
    console.log('Message sent to seller')
  } catch (error) {
    console.error('Error contacting seller:', error)
  } finally {
    contactingSeller.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Lifecycle
onMounted(() => {
  fetchOrder()
  fetchTracking()
})
</script>

<style scoped>
.order-details-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.order-details-page__loading {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl);
}

.order-details-page__skeleton {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  width: 100%;
  max-width: 800px;
}

.order-details-page__skeleton-header {
  height: 32px;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--border-radius-sm);
  margin-bottom: var(--spacing-lg);
}

.order-details-page__skeleton-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.order-details-page__skeleton-line {
  height: 20px;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--border-radius-sm);
}

.order-details-page__skeleton-line--short {
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

.order-details-page__back {
  margin-bottom: var(--spacing-lg);
}

.order-details-page__back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--text-muted);
  text-decoration: none;
  font-size: var(--font-size-sm);
  transition: color var(--transition-fast);
}

.order-details-page__back-link:hover {
  color: var(--primary-color);
}

.order-details-page__header {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-lg);
}

.order-details-page__header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.order-details-page__title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-dark);
  margin: 0;
}

.order-details-page__header-meta {
  display: flex;
  gap: var(--spacing-lg);
}

.order-details-page__meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.order-details-page__meta-label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-weight: 500;
}

.order-details-page__meta-value {
  font-size: var(--font-size-base);
  color: var(--text-dark);
  font-weight: 500;
}

.order-details-page__actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-xl);
}

.order-details-page__tracking {
  margin-bottom: var(--spacing-xl);
}

.order-details-page__section {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-lg);
}

.order-details-page__section-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-lg);
}

.order-details-page__items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.order-details-page__item {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--bg-light);
  border-radius: var(--border-radius-md);
}

.order-details-page__item-image {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.order-details-page__item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-details-page__item-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.order-details-page__item-info {
  flex: 1;
}

.order-details-page__item-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.order-details-page__item-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-details-page__item-variants {
  display: flex;
  gap: var(--spacing-sm);
}

.order-details-page__item-variant {
  padding: 2px var(--spacing-xs);
  background: var(--bg-white);
  border-radius: var(--border-radius-sm);
}

.order-details-page__item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.order-details-page__item-quantity,
.order-details-page__item-price {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-details-page__summary-content {
  max-width: 400px;
}

.order-details-page__summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.order-details-page__summary-label {
  font-size: var(--font-size-base);
  color: var(--text-muted);
}

.order-details-page__summary-value {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-dark);
}

.order-details-page__summary-row--discount .order-details-page__summary-value {
  color: var(--success-color);
}

.order-details-page__summary-row--total {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.order-details-page__summary-row--total .order-details-page__summary-label,
.order-details-page__summary-row--total .order-details-page__summary-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text-dark);
}

.order-details-page__summary-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--spacing-md) 0;
}

.order-details-page__info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.order-details-page__info-section {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}

.order-details-page__info-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-lg);
}

.order-details-page__address,
.order-details-page__payment {
  font-size: var(--font-size-base);
  line-height: 1.5;
}

.order-details-page__address-name {
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.order-details-page__address-line {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-muted);
}

.order-details-page__card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.order-details-page__card-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.order-details-page__card-icon {
  width: 40px;
  height: 24px;
  color: var(--primary-color);
}

.order-details-page__card-type {
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: 2px;
}

.order-details-page__paypal,
.order-details-page__digital {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-weight: 600;
  color: var(--text-dark);
}

.order-details-page__paypal-icon {
  width: 80px;
  height: 24px;
  color: #0070ba;
}

.order-details-page__digital-icon {
  width: 32px;
  height: 24px;
  color: var(--primary-color);
}

.order-details-page__not-found {
  text-align: center;
  padding: var(--spacing-xl);
}

.order-details-page__not-found h2 {
  color: var(--text-dark);
  margin-bottom: var(--spacing-md);
}

.order-details-page__not-found p {
  color: var(--text-muted);
  margin-bottom: var(--spacing-xl);
}

.order-details-page__cancel-content,
.order-details-page__return-content,
.order-details-page__review-content {
  margin-bottom: var(--spacing-lg);
}

.order-details-page__cancel-warning {
  color: var(--danger-color);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
}

.order-details-page__cancel-reason {
  margin-bottom: var(--spacing-lg);
}

.order-details-page__cancel-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.order-details-page__cancel-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  background: var(--bg-white);
}

.order-details-page__return-items {
  margin-bottom: var(--spacing-lg);
}

.order-details-page__return-item {
  margin-bottom: var(--spacing-sm);
}

.order-details-page__return-item-label {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-dark);
}

.order-details-page__return-checkmark {
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  position: relative;
  background: var(--bg-white);
  margin-top: 2px;
  flex-shrink: 0;
}

.order-details-page__return-item-label input:checked + .order-details-page__return-checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: bold;
}

.order-details-page__return-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-details-page__return-item-name {
  font-weight: 500;
}

.order-details-page__return-item-details {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-details-page__return-reason {
  margin-top: var(--spacing-lg);
}

.order-details-page__return-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.order-details-page__return-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  background: var(--bg-white);
  margin-bottom: var(--spacing-md);
}

.order-details-page__return-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-family: inherit;
  font-size: var(--font-size-base);
  resize: vertical;
}

.order-details-page__review-product {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.order-details-page__review-image {
  border-radius: var(--border-radius-md);
  flex-shrink: 0;
}

.order-details-page__review-product-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.order-details-page__review-product-seller {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.order-details-page__review-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.order-details-page__form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.order-details-page__form-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-dark);
}

.order-details-page__rating-input {
  display: flex;
  gap: var(--spacing-xs);
}

.order-details-page__rating-star {
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.order-details-page__rating-star--active {
  color: #ffc107;
}

.order-details-page__form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-family: inherit;
  font-size: var(--font-size-base);
  resize: vertical;
}

.order-details-page__form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.order-details-page__form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

.order-details-page__modal-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .order-details-page__header-main {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .order-details-page__header-meta {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .order-details-page__actions {
    justify-content: stretch;
  }

  .order-details-page__actions button {
    flex: 1;
  }

  .order-details-page__item {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .order-details-page__item-content {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .order-details-page__item-actions {
    align-items: flex-start;
  }

  .order-details-page__info-grid {
    grid-template-columns: 1fr;
  }

  .order-details-page__modal-actions {
    flex-direction: column;
  }
}
</style>