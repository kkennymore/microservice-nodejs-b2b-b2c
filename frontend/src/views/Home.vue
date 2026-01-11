<template>
  <div class="home">
    <!-- Hero Section -->
    <HeroSection />

    <!-- Categories Section -->
    <section class="categories-section">
      <div class="container">
        <div class="categories-grid">
          <div
            v-for="category in categories"
            :key="category.id"
            class="category-card"
            @click="browseCategory(category)"
          >
            <div class="category-placeholder">
              <span>{{ category.icon }}</span>
            </div>
            <router-link :to="`/categories/${category.id}`" class="category-link">
              <h3 class="category-name">{{ category.name }}</h3>
              <span class="category-count">{{ category.count }} products</span>
            </router-link>
            <div class="category-hover">
              <span>Shop now</span>
              <i class="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Products Section -->
    <section class="products-section">
      <div class="container">
        <div class="section-header">
          <h2 class="products-title">New Arrivals</h2>
          <router-link to="/products" class="view-all-link">
            View All
            <i class="fas fa-arrow-right"></i>
          </router-link>
        </div>

        <div class="products-grid">
          <div
            v-for="product in featuredProducts"
            :key="product.id"
            class="product-card"
            @click="viewProduct(product.id)"
          >
            <div class="product-image">
              <div class="product-badges">
                <span v-if="product.isNew" class="badge badge-new">New</span>
                <span v-if="product.isSale" class="badge badge-sale">Sale</span>
              </div>
              <div class="product-placeholder">
                <span>{{ product.icon }}</span>
              </div>
              <div class="product-overlay">
                <button class="quickview-btn" @click.stop="quickView(product)">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="wishlist-btn" @click.stop="toggleWishlist(product)">
                  <i class="fas fa-heart"></i>
                </button>
              </div>
            </div>
            <div class="product-info">
              <div class="product-category">{{ product.category }}</div>
              <h3 class="product-name">{{ product.name }}</h3>
              <div class="product-price">
                <span class="current-price">{{ formatPrice(product.price) }}</span>
                <span v-if="product.originalPrice" class="original-price">{{ formatPrice(product.originalPrice) }}</span>
              </div>
              <div class="product-rating">
                <div class="stars">
                  <i v-for="star in 5" :key="star" class="fas fa-star" :class="{ filled: star <= Math.floor(product.rating) }"></i>
                </div>
                <span class="rating-count">({{ product.reviewCount }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">10,000+</div>
            <div class="stat-label">Active Sellers</div>
            <div class="stat-description">Trusted vendors worldwide</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">500K+</div>
            <div class="stat-label">Happy Customers</div>
            <div class="stat-description">Satisfied buyers globally</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">1M+</div>
            <div class="stat-label">Products Sold</div>
            <div class="stat-description">Successful transactions</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">99%</div>
            <div class="stat-label">Satisfaction Rate</div>
            <div class="stat-description">Customer happiness guaranteed</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose Us -->
    <section class="why-choose-us">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Why Choose Our Marketplace?</h2>
            <p class="section-subtitle">Experience the difference with our premium marketplace features</p>
          </div>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon-wrapper">
              <div class="feature-icon">🔒</div>
            </div>
            <h3>Secure Transactions</h3>
            <p>Protected payments with advanced escrow system ensuring your money is safe</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon-wrapper">
              <div class="feature-icon">🚚</div>
            </div>
            <h3>Fast Shipping</h3>
            <p>Reliable delivery network with real-time tracking from trusted sellers</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon-wrapper">
              <div class="feature-icon">💬</div>
            </div>
            <h3>Direct Communication</h3>
            <p>Chat directly with sellers for personalized service and better deals</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon-wrapper">
              <div class="feature-icon">⭐</div>
            </div>
            <h3>Quality Assurance</h3>
            <p>Verified sellers, detailed reviews, and quality guarantee on all products</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon-wrapper">
              <div class="feature-icon">💎</div>
            </div>
            <h3>Premium Support</h3>
            <p>24/7 customer support with dedicated account managers for businesses</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon-wrapper">
              <div class="feature-icon">🌍</div>
            </div>
            <h3>Global Reach</h3>
            <p>Connect with buyers and sellers from over 150 countries worldwide</p>
          </div>
        </div>
      </div>
    </section>


  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore, useSearchStore } from '@/stores'
import { useCurrency } from '@/composables'
import { Input, Button } from '@/components'
import HeroSection from '@/components/HeroSection.vue'

const router = useRouter()
const productStore = useProductStore()
const searchStore = useSearchStore()
const { formatPrice } = useCurrency()

const searchQuery = ref('')

// Sample categories - in real app, fetch from API
const categories = ref([
  { id: 'mountain-bikes', name: 'Mountain Bikes', icon: '🚵‍♂️', count: 5 },
  { id: 'road-bikes', name: 'Road Bikes', icon: '🚴‍♂️', count: 4 },
  { id: 'e-bikes', name: 'E-Bikes', icon: '🔋', count: 3 },
  { id: 'city-bikes', name: 'City Bikes', icon: '🏙️', count: 5 },
  { id: 'classic-bikes', name: 'Classic Bikes', icon: '🚲', count: 3 },
  { id: 'racing-bikes', name: 'Racing Bikes', icon: '🏁', count: 2 },
  { id: 'kids-bikes', name: 'Kids Bikes', icon: '👶', count: 5 },
  { id: 'tandem-bikes', name: 'Tandem Bikes', icon: '👫', count: 2 }
])

const featuredProducts = ref([
  {
    id: '1',
    name: 'Cobalt Blue Mountain Bike',
    category: 'Mountain Bikes',
    price: 392.40,
    originalPrice: null,
    icon: '🚵‍♂️',
    rating: 4.5,
    reviewCount: 12,
    isNew: true,
    isSale: false
  },
  {
    id: '2',
    name: 'Green Grass Mountain Bike',
    category: 'Mountain Bikes',
    price: 150.00,
    originalPrice: null,
    icon: '🚵‍♀️',
    rating: 4.8,
    reviewCount: 8,
    isNew: false,
    isSale: false
  },
  {
    id: '3',
    name: 'Light Blue Trekking Bike',
    category: 'City Bikes',
    price: 122.86,
    originalPrice: null,
    icon: '🚴‍♂️',
    rating: 4.7,
    reviewCount: 15,
    isNew: false,
    isSale: false
  },
  {
    id: '4',
    name: 'Mountain Bike for Men',
    category: 'Mountain Bikes',
    price: 485.85,
    originalPrice: null,
    icon: '🚵‍♂️',
    rating: 4.6,
    reviewCount: 23,
    isNew: false,
    isSale: false
  },
  {
    id: '5',
    name: 'Yellow Mountain Bike',
    category: 'Mountain Bikes',
    price: 404.81,
    originalPrice: null,
    icon: '🚵‍♀️',
    rating: 4.9,
    reviewCount: 9,
    isNew: true,
    isSale: false
  },
  {
    id: '6',
    name: 'Blue Road Bike',
    category: 'Road Bikes',
    price: 239.51,
    originalPrice: null,
    icon: '🚴‍♂️',
    rating: 4.4,
    reviewCount: 18,
    isNew: false,
    isSale: false
  }
])

onMounted(async () => {
  // Fetch featured products from store
  await productStore.fetchProducts()
  // In real app, this would be: featuredProducts.value = productStore.featuredProducts
})

const performSearch = () => {
  if (searchQuery.value.trim()) {
    router.push(`/search?q=${encodeURIComponent(searchQuery.value)}`)
  }
}

const browseCategory = (category: any) => {
  router.push(`/category/${category.id}`)
}

const viewProduct = (productId: string) => {
  router.push(`/product/${productId}`)
}

const viewAllProducts = () => {
  router.push('/products')
}

const viewAllCategories = () => {
  router.push('/categories')
}

const quickView = (product: any) => {
  // TODO: Implement quick view modal
  console.log('Quick view:', product)
}

const toggleWishlist = (product: any) => {
  // TODO: Implement wishlist toggle
  console.log('Toggle wishlist:', product)
}


</script>

<style scoped>
/* Journal Theme Home Page Styles */

/* Categories Section */
.categories-section {
  padding: 5rem 0;
  background: #f8f9fa;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.category-card {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 35px rgba(102, 126, 234, 0.15);
}

.category-placeholder {
  height: 200px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #9ca3af;
}

.category-link {
  display: block;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
}

.category-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1f2937;
  transition: color 0.2s ease;
}

.category-card:hover .category-name {
  color: #667eea;
}

.category-count {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.category-hover {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(102, 126, 234, 0.9);
  color: white;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.category-card:hover .category-hover {
  transform: translateY(0);
}

/* Products Section */
.products-section {
  padding: 5rem 0;
  background: white;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.products-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.view-all-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.view-all-link:hover {
  color: #5a67d8;
  gap: 0.75rem;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.product-card {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 35px rgba(102, 126, 234, 0.15);
}

.product-image {
  position: relative;
  height: 240px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.product-badges {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-new {
  background: #10b981;
  color: white;
}

.badge-sale {
  background: #ef4444;
  color: white;
}

.product-placeholder {
  font-size: 3rem;
  color: #9ca3af;
}

.product-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.product-card:hover .product-overlay {
  opacity: 1;
}

.quickview-btn,
.wishlist-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.quickview-btn:hover,
.wishlist-btn:hover {
  background: white;
  transform: scale(1.1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.wishlist-btn:hover {
  color: #ef4444;
}

.product-info {
  padding: 1.5rem;
}

.product-category {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.product-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.75rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.current-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.original-price {
  font-size: 0.875rem;
  color: #9ca3af;
  text-decoration: line-through;
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stars {
  display: flex;
  gap: 0.125rem;
}

.stars .fa-star {
  font-size: 0.875rem;
  color: #d1d5db;
}

.stars .fa-star.filled {
  color: #fbbf24;
}

.rating-count {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .categories-grid,
  .products-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .categories-section,
  .products-section {
    padding: 4rem 0;
  }

  .section-header {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .categories-grid,
  .products-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .category-card,
  .product-card {
    border-radius: 0.5rem;
  }

  .category-placeholder,
  .product-image {
    height: 180px;
  }

  .product-overlay {
    gap: 0.75rem;
  }

  .quickview-btn,
  .wishlist-btn {
    width: 36px;
    height: 36px;
    font-size: 0.875rem;
  }
}

@media (max-width: 640px) {
  .categories-grid,
  .products-grid {
    grid-template-columns: 1fr;
  }

  .categories-section,
  .products-section {
    padding: 3rem 0;
  }

  .products-title {
    font-size: 1.5rem;
  }

  .category-hover {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
}
</style>