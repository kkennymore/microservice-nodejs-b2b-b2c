<template>
  <div class="product-detail">
    <div class="container">
      <!-- Loading State -->
      <div v-if="loading" class="product-detail__loading">
        <div class="product-detail__skeleton">
          <div class="product-detail__skeleton-gallery"></div>
          <div class="product-detail__skeleton-info">
            <div class="product-detail__skeleton-line product-detail__skeleton-line--long"></div>
            <div class="product-detail__skeleton-line product-detail__skeleton-line--medium"></div>
            <div class="product-detail__skeleton-line product-detail__skeleton-line--short"></div>
            <div class="product-detail__skeleton-line product-detail__skeleton-line--long"></div>
          </div>
        </div>
      </div>

      <!-- Product Content -->
      <div v-else-if="product" class="product-detail__content">
        <!-- Breadcrumb -->
        <nav class="product-detail__breadcrumb">
          <router-link to="/" class="product-detail__breadcrumb-link">Home</router-link>
          <span class="product-detail__breadcrumb-separator">/</span>
          <router-link to="/products" class="product-detail__breadcrumb-link">Products</router-link>
          <span class="product-detail__breadcrumb-separator">/</span>
          <span class="product-detail__breadcrumb-current">{{ product.name }}</span>
        </nav>

        <!-- Main Product Section -->
        <div class="product-detail__main">
          <!-- Product Gallery -->
          <div class="product-detail__gallery">
            <div class="product-detail__main-image">
              <OptimizedImage
                :src="selectedImage"
                :alt="product.name"
                class="product-detail__image"
                :width="600"
                :height="600"
              />
              <div v-if="product.originalPrice && product.originalPrice > product.price" class="product-detail__badge">
                {{ Math.round((1 - product.price / product.originalPrice) * 100) }}% OFF
              </div>
            </div>

            <!-- Thumbnail Images -->
            <div v-if="product.images.length > 1" class="product-detail__thumbnails">
              <button
                v-for="(image, index) in product.images"
                :key="index"
                :class="[
                  'product-detail__thumbnail-btn',
                  { 'product-detail__thumbnail-btn--active': image === selectedImage }
                ]"
                @click="selectedImage = image"
              >
                <OptimizedImage
                  :src="image"
                  :alt="`${product.name} ${index + 1}`"
                  class="product-detail__thumbnail"
                  :width="80"
                  :height="80"
                />
              </button>
            </div>
          </div>

          <!-- Product Info -->
          <div class="product-detail__info">
            <!-- Seller Info -->
            <div class="product-detail__seller">
              <img
                v-if="product.seller.avatar"
                :src="product.seller.avatar"
                :alt="product.seller.name"
                class="product-detail__seller-avatar"
              />
              <div class="product-detail__seller-info">
                <span class="product-detail__seller-name">{{ product.seller.name }}</span>
                <div class="product-detail__seller-rating">
                  <div class="product-detail__stars">
                    <svg
                      v-for="star in 5"
                      :key="star"
                      :class="['product-detail__star', { 'product-detail__star--filled': star <= Math.floor(product.seller.rating) }]"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <span class="product-detail__seller-rating-text">{{ product.seller.rating.toFixed(1) }}</span>
                  <svg v-if="product.seller.verified" class="product-detail__verified-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Product Title -->
            <h1 class="product-detail__title">{{ product.name }}</h1>

            <!-- Rating and Reviews -->
            <div class="product-detail__rating">
              <div class="product-detail__stars">
                <svg
                  v-for="star in 5"
                  :key="star"
                  :class="['product-detail__star', { 'product-detail__star--filled': star <= Math.floor(product.rating) }]"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span class="product-detail__rating-text">{{ product.rating.toFixed(1) }} ({{ product.reviewCount }} reviews)</span>
            </div>

            <!-- Price -->
            <div class="product-detail__price">
              <span class="product-detail__current-price">{{ formatCurrency(product.price, product.currency) }}</span>
              <span v-if="product.originalPrice && product.originalPrice > product.price" class="product-detail__original-price">
                {{ formatCurrency(product.originalPrice, product.currency) }}
              </span>
            </div>

            <!-- Stock Status -->
            <div class="product-detail__stock">
              <span :class="['product-detail__stock-status', { 'product-detail__stock-status--out': !product.inStock }]">
                {{ product.inStock ? 'In Stock' : 'Out of Stock' }}
              </span>
              <span v-if="product.inStock" class="product-detail__stock-quantity">
                ({{ product.inventory }} available)
              </span>
            </div>

            <!-- Variants -->
            <div v-if="product.colors && product.colors.length > 0" class="product-detail__variants">
              <h4 class="product-detail__variant-title">Color</h4>
              <div class="product-detail__color-options">
                <button
                  v-for="color in product.colors"
                  :key="color"
                  :class="[
                    'product-detail__color-btn',
                    { 'product-detail__color-btn--active': selectedColor === color }
                  ]"
                  :style="{ backgroundColor: color }"
                  @click="selectedColor = color"
                  :aria-label="`Select color ${color}`"
                ></button>
              </div>
            </div>

            <div v-if="product.sizes && product.sizes.length > 0" class="product-detail__variants">
              <h4 class="product-detail__variant-title">Size</h4>
              <div class="product-detail__size-options">
                <button
                  v-for="size in product.sizes"
                  :key="size"
                  :class="[
                    'product-detail__size-btn',
                    { 'product-detail__size-btn--active': selectedSize === size }
                  ]"
                  @click="selectedSize = size"
                >
                  {{ size }}
                </button>
              </div>
            </div>

            <!-- Quantity Selector -->
            <div class="product-detail__quantity">
              <label class="product-detail__quantity-label">Quantity</label>
              <div class="product-detail__quantity-controls">
                <button
                  class="product-detail__quantity-btn"
                  @click="decrementQuantity"
                  :disabled="quantity <= 1"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <input
                  v-model.number="quantity"
                  type="number"
                  min="1"
                  :max="product.inventory"
                  class="product-detail__quantity-input"
                />
                <button
                  class="product-detail__quantity-btn"
                  @click="incrementQuantity"
                  :disabled="quantity >= product.inventory"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="product-detail__actions">
              <Button
                v-if="product.inStock"
                variant="primary"
                size="lg"
                @click="addToCart"
                :loading="addingToCart"
                class="product-detail__add-to-cart"
              >
                Add to Cart
              </Button>

              <Button
                variant="outline"
                size="lg"
                @click="toggleWishlist"
                :class="{ 'product-detail__wishlist-btn--active': isInWishlist }"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {{ isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist' }}
              </Button>
            </div>

            <!-- Share -->
            <div class="product-detail__share">
              <span class="product-detail__share-label">Share:</span>
              <div class="product-detail__share-buttons">
                <button class="product-detail__share-btn" @click="shareOnFacebook" aria-label="Share on Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button class="product-detail__share-btn" @click="shareOnTwitter" aria-label="Share on Twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </button>
                <button class="product-detail__share-btn" @click="copyLink" aria-label="Copy link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Product Description -->
        <div class="product-detail__description">
          <h2 class="product-detail__section-title">Description</h2>
          <div class="product-detail__description-content" v-html="formattedDescription"></div>
        </div>

        <!-- Reviews Section -->
        <div class="product-detail__reviews">
          <div class="product-detail__reviews-header">
            <h2 class="product-detail__section-title">Customer Reviews</h2>
            <Button variant="primary" @click="showReviewModal = true">
              Write a Review
            </Button>
          </div>

          <!-- Review Summary -->
          <div class="product-detail__review-summary">
            <div class="product-detail__rating-overview">
              <div class="product-detail__average-rating">{{ product.averageRating?.toFixed(1) || product.rating.toFixed(1) }}</div>
              <div class="product-detail__rating-stars">
                <svg
                  v-for="star in 5"
                  :key="star"
                  :class="['product-detail__star', { 'product-detail__star--filled': star <= Math.floor(product.rating) }]"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div class="product-detail__total-reviews">{{ product.reviewsCount || product.reviewCount }} reviews</div>
            </div>

            <div class="product-detail__rating-breakdown">
              <div
                v-for="rating in [5, 4, 3, 2, 1]"
                :key="rating"
                class="product-detail__rating-bar"
              >
                <span class="product-detail__rating-label">{{ rating }} star</span>
                <div class="product-detail__rating-progress">
                  <div
                    class="product-detail__rating-fill"
                    :style="{ width: `${getRatingPercentage(rating)}%` }"
                  ></div>
                </div>
                <span class="product-detail__rating-count">{{ getRatingCount(rating) }}</span>
              </div>
            </div>
          </div>

          <!-- Individual Reviews -->
          <div class="product-detail__reviews-list">
            <div
              v-for="review in product.reviews"
              :key="review.id"
              class="product-detail__review"
            >
              <div class="product-detail__review-header">
                <div class="product-detail__review-author">
                  <strong>{{ review.userName }}</strong>
                  <div class="product-detail__review-rating">
                    <svg
                      v-for="star in 5"
                      :key="star"
                      :class="['product-detail__star', { 'product-detail__star--filled': star <= review.rating }]"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                </div>
                <div class="product-detail__review-date">{{ formatDate(review.createdAt) }}</div>
              </div>
              <p class="product-detail__review-comment">{{ review.comment }}</p>
              <div v-if="review.images && review.images.length > 0" class="product-detail__review-images">
                <img
                  v-for="image in review.images"
                  :key="image"
                  :src="image"
                  :alt="review.comment"
                  class="product-detail__review-image"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Similar Products -->
        <div v-if="similarProducts && similarProducts.length > 0" class="product-detail__similar">
          <h2 class="product-detail__section-title">Similar Products</h2>
          <ProductGrid
            :products="similarProducts"
            :columns="4"
            @add-to-cart="handleAddToCart"
            @toggle-wishlist="handleToggleWishlist"
          />
        </div>
      </div>

      <!-- Not Found -->
      <div v-else class="product-detail__not-found">
        <h2>Product Not Found</h2>
        <p>The product you're looking for doesn't exist or has been removed.</p>
        <router-link to="/products">
          <Button variant="primary">Browse All Products</Button>
        </router-link>
      </div>
    </div>

    <!-- Review Modal -->
    <Modal v-model="showReviewModal" title="Write a Review">
      <form @submit.prevent="submitReview" class="product-detail__review-form">
        <div class="product-detail__form-group">
          <label class="product-detail__form-label">Rating</label>
          <div class="product-detail__rating-input">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              :class="['product-detail__rating-star', { 'product-detail__rating-star--active': star <= reviewRating }]"
              @click="reviewRating = star"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="product-detail__form-group">
          <label class="product-detail__form-label">Review</label>
          <textarea
            v-model="reviewComment"
            class="product-detail__form-textarea"
            placeholder="Share your thoughts about this product..."
            rows="4"
            required
          ></textarea>
        </div>

        <div class="product-detail__form-actions">
          <Button type="button" variant="outline" @click="showReviewModal = false">
            Cancel
          </Button>
          <Button type="submit" variant="primary" :loading="submittingReview">
            Submit Review
          </Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSEO } from '@/composables/useSEO'
import { useCurrency } from '@/composables/useCurrency'
import productsAPI, { type ProductDetails } from '@/services/productsAPI'
import type { Product } from '@/types'
import ProductGrid from '@/components/products/ProductGrid.vue'
import OptimizedImage from '@/components/OptimizedImage.vue'
import Button from '@/components/Button.vue'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const router = useRouter()
const { setSEO, generateProductStructuredData } = useSEO()
const { formatCurrency } = useCurrency()

// Reactive state
const product = ref<ProductDetails | null>(null)
const similarProducts = ref<Product[]>([])
const loading = ref(true)
const selectedImage = ref('')
const selectedColor = ref('')
const selectedSize = ref('')
const quantity = ref(1)
const isInWishlist = ref(false)
const addingToCart = ref(false)
const showReviewModal = ref(false)
const reviewRating = ref(5)
const reviewComment = ref('')
const submittingReview = ref(false)

// Computed properties
const productId = computed(() => route.params.id as string)

const formattedDescription = computed(() => {
  if (!product.value?.description) return ''
  // Convert line breaks to paragraphs
  return product.value.description.split('\n').map(p => `<p>${p}</p>`).join('')
})

// Methods
const fetchProduct = async () => {
  try {
    loading.value = true
    const [productData, similarData] = await Promise.all([
      productsAPI.getProduct(productId.value),
      productsAPI.getSimilarProducts(productId.value, 4)
    ])

    product.value = productData
    similarProducts.value = similarData
    selectedImage.value = productData.images[0] || ''

    // Update SEO
    setSEO({
      title: `${productData.name} - Multivendor Marketplace`,
      description: productData.description.substring(0, 160),
      url: window.location.href,
      image: productData.images[0],
      structuredData: generateProductStructuredData(productData)
    })

  } catch (error) {
    console.error('Error fetching product:', error)
    product.value = null
  } finally {
    loading.value = false
  }
}

const incrementQuantity = () => {
  if (quantity.value < (product.value?.inventory || 1)) {
    quantity.value++
  }
}

const decrementQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--
  }
}

const addToCart = () => {
  if (!product.value) return

  addingToCart.value = true

  const cartItem = {
    product: product.value,
    quantity: quantity.value,
    selectedColor: selectedColor.value,
    selectedSize: selectedSize.value
  }

  // Emit to parent or use global cart store
  console.log('Add to cart:', cartItem)

  setTimeout(() => {
    addingToCart.value = false
  }, 1000)
}

const toggleWishlist = () => {
  isInWishlist.value = !isInWishlist.value
  console.log('Toggle wishlist:', product.value?.id)
}

const handleAddToCart = (product: Product) => {
  console.log('Add similar product to cart:', product)
}

const handleToggleWishlist = (product: Product) => {
  console.log('Toggle wishlist for similar product:', product)
}

const shareOnFacebook = () => {
  const url = encodeURIComponent(window.location.href)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
}

const shareOnTwitter = () => {
  const url = encodeURIComponent(window.location.href)
  const text = encodeURIComponent(`Check out this product: ${product.value?.name}`)
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank')
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    // Show success message (would use a toast notification in real app)
    console.log('Link copied to clipboard')
  } catch (error) {
    console.error('Failed to copy link:', error)
  }
}

const submitReview = async () => {
  if (!product.value) return

  try {
    submittingReview.value = true
    await productsAPI.addReview(product.value.id, {
      rating: reviewRating.value,
      comment: reviewComment.value
    })

    // Reset form
    reviewRating.value = 5
    reviewComment.value = ''
    showReviewModal.value = false

    // Refresh product data to show new review
    await fetchProduct()

  } catch (error) {
    console.error('Error submitting review:', error)
  } finally {
    submittingReview.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const getRatingPercentage = (rating: number) => {
  if (!product.value?.reviews) return 0
  const count = product.value.reviews.filter(review => review.rating === rating).length
  return (count / product.value.reviews.length) * 100
}

const getRatingCount = (rating: number) => {
  if (!product.value?.reviews) return 0
  return product.value.reviews.filter(review => review.rating === rating).length
}

// Lifecycle
onMounted(() => {
  fetchProduct()
})

// Watch for route changes
watch(() => route.params.id, (newId) => {
  if (newId && newId !== productId.value) {
    fetchProduct()
  }
})

// Cleanup
onUnmounted(() => {
  // Cleanup if needed
})
</script>

<style scoped>
.product-detail {
  min-height: 100vh;
  background: var(--bg-light);
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.product-detail__loading {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl);
}

.product-detail__skeleton {
  display: flex;
  gap: var(--spacing-xl);
  width: 100%;
}

.product-detail__skeleton-gallery {
  flex: 1;
  aspect-ratio: 1;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--border-radius-lg);
}

.product-detail__skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.product-detail__skeleton-line {
  height: 20px;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--border-radius-sm);
}

.product-detail__skeleton-line--long {
  width: 100%;
}

.product-detail__skeleton-line--medium {
  width: 80%;
}

.product-detail__skeleton-line--short {
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

.product-detail__breadcrumb {
  margin-bottom: var(--spacing-lg);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.product-detail__breadcrumb-link {
  color: var(--text-muted);
  text-decoration: none;
}

.product-detail__breadcrumb-link:hover {
  color: var(--primary-color);
}

.product-detail__breadcrumb-separator {
  margin: 0 var(--spacing-xs);
}

.product-detail__breadcrumb-current {
  color: var(--text-dark);
  font-weight: 500;
}

.product-detail__main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.product-detail__gallery {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.product-detail__main-image {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  background: var(--bg-white);
}

.product-detail__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-detail__badge {
  position: absolute;
  top: var(--spacing-md);
  left: var(--spacing-md);
  background: var(--danger-color);
  color: var(--text-light);
  padding: calc(var(--spacing-xs) / 2) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.product-detail__thumbnails {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
  padding-bottom: var(--spacing-xs);
}

.product-detail__thumbnail-btn {
  flex-shrink: 0;
  border: 2px solid transparent;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.product-detail__thumbnail-btn:hover,
.product-detail__thumbnail-btn--active {
  border-color: var(--primary-color);
}

.product-detail__thumbnail {
  width: 80px;
  height: 80px;
  object-fit: cover;
}

.product-detail__info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.product-detail__seller {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.product-detail__seller-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.product-detail__seller-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.product-detail__seller-name {
  font-weight: 600;
  color: var(--text-dark);
}

.product-detail__seller-rating {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.product-detail__stars {
  display: flex;
  gap: 2px;
}

.product-detail__star {
  color: var(--text-muted);
}

.product-detail__star--filled {
  color: #ffc107;
}

.product-detail__verified-icon {
  color: var(--success-color);
}

.product-detail__title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-dark);
  line-height: 1.2;
  margin: 0;
}

.product-detail__rating {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.product-detail__rating-text {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.product-detail__price {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.product-detail__current-price {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-dark);
}

.product-detail__original-price {
  font-size: var(--font-size-lg);
  color: var(--text-muted);
  text-decoration: line-through;
}

.product-detail__stock {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.product-detail__stock-status {
  font-weight: 600;
  color: var(--success-color);
}

.product-detail__stock-status--out {
  color: var(--danger-color);
}

.product-detail__stock-quantity {
  color: var(--text-muted);
}

.product-detail__variants {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.product-detail__variant-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}

.product-detail__color-options {
  display: flex;
  gap: var(--spacing-sm);
}

.product-detail__color-btn {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.product-detail__color-btn:hover,
.product-detail__color-btn--active {
  border-color: var(--primary-color);
}

.product-detail__size-options {
  display: flex;
  gap: var(--spacing-sm);
}

.product-detail__size-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-white);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.product-detail__size-btn:hover,
.product-detail__size-btn--active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: var(--text-light);
}

.product-detail__quantity {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.product-detail__quantity-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-dark);
}

.product-detail__quantity-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.product-detail__quantity-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-white);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.product-detail__quantity-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.product-detail__quantity-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.product-detail__quantity-input {
  width: 60px;
  height: 32px;
  text-align: center;
  border: 1px solid var(--border-color);
  border-left: none;
  border-right: none;
  background: var(--bg-white);
  font-size: var(--font-size-base);
}

.product-detail__actions {
  display: flex;
  gap: var(--spacing-md);
}

.product-detail__add-to-cart {
  flex: 1;
}

.product-detail__wishlist-btn--active {
  background: var(--danger-color);
  border-color: var(--danger-color);
  color: var(--text-light);
}

.product-detail__share {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.product-detail__share-label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.product-detail__share-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.product-detail__share-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-white);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-muted);
}

.product-detail__share-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.product-detail__description,
.product-detail__reviews,
.product-detail__similar {
  margin-bottom: var(--spacing-xl);
}

.product-detail__section-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-lg);
}

.product-detail__description-content {
  line-height: 1.6;
  color: var(--text-dark);
}

.product-detail__description-content p {
  margin-bottom: var(--spacing-md);
}

.product-detail__reviews-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.product-detail__review-summary {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
}

.product-detail__rating-overview {
  text-align: center;
}

.product-detail__average-rating {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.product-detail__total-reviews {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.product-detail__rating-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.product-detail__rating-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.product-detail__rating-label {
  width: 60px;
  color: var(--text-muted);
}

.product-detail__rating-progress {
  flex: 1;
  height: 8px;
  background: var(--bg-light);
  border-radius: 4px;
  overflow: hidden;
}

.product-detail__rating-fill {
  height: 100%;
  background: var(--primary-color);
  transition: width var(--transition-fast);
}

.product-detail__rating-count {
  width: 40px;
  text-align: right;
  color: var(--text-muted);
}

.product-detail__reviews-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.product-detail__review {
  padding: var(--spacing-lg);
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
}

.product-detail__review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.product-detail__review-author {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.product-detail__review-rating {
  display: flex;
  gap: 2px;
}

.product-detail__review-date {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.product-detail__review-comment {
  color: var(--text-dark);
  line-height: 1.5;
  margin-bottom: var(--spacing-md);
}

.product-detail__review-images {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.product-detail__review-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--border-radius-sm);
}

.product-detail__not-found {
  text-align: center;
  padding: var(--spacing-xl);
}

.product-detail__not-found h2 {
  color: var(--text-dark);
  margin-bottom: var(--spacing-md);
}

.product-detail__not-found p {
  color: var(--text-muted);
  margin-bottom: var(--spacing-xl);
}

.product-detail__review-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.product-detail__form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.product-detail__form-label {
  font-weight: 500;
  color: var(--text-dark);
}

.product-detail__rating-input {
  display: flex;
  gap: var(--spacing-xs);
}

.product-detail__rating-star {
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.product-detail__rating-star:hover,
.product-detail__rating-star--active {
  color: #ffc107;
}

.product-detail__form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-family: inherit;
  font-size: var(--font-size-base);
  resize: vertical;
}

.product-detail__form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.product-detail__form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .product-detail__main {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .product-detail__gallery {
    order: -1;
  }

  .product-detail__actions {
    flex-direction: column;
  }

  .product-detail__share {
    justify-content: center;
  }

  .product-detail__reviews-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .product-detail__review-summary {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
}
</style>