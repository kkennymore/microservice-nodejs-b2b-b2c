<template>
  <header class="app-header">
    <!-- Top Bar -->
    <div class="header-top">
      <div class="container">
        <div class="header-top-content">
          <div class="contact-info">
            <a href="tel:18005558989" class="contact-item">
              <i class="fas fa-phone"></i>
              1.800.555.8899
            </a>
            <a href="mailto:support@marketplace.com" class="contact-item">
              <i class="fas fa-envelope"></i>
              support@marketplace.com
            </a>
          </div>
          <div class="header-top-links">
            <router-link to="/faq" class="top-link">FAQ</router-link>
            <router-link to="/contact" class="top-link">Contact</router-link>
            <router-link to="/blog" class="top-link">Blog</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Header -->
    <div class="header-main">
      <div class="container">
        <div class="header-main-content">
          <!-- Mobile Menu Button -->
          <button
            @click="toggleMobileMenu"
            class="mobile-menu-btn"
            aria-label="Toggle mobile menu"
          >
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>

          <!-- Logo -->
          <router-link to="/" class="logo">
            <span class="logo-text">Marketplace</span>
          </router-link>

          <!-- Desktop Navigation -->
          <nav class="main-nav">
            <ul class="nav-list">
              <li class="nav-item">
                <router-link to="/categories" class="nav-link">Catalog</router-link>
              </li>
              <li class="nav-item has-dropdown">
                <a href="#" class="nav-link" @click.prevent="toggleDropdown('categories')">
                  Categories
                  <i class="fas fa-chevron-down dropdown-arrow"></i>
                </a>
                <div class="dropdown-menu categories-dropdown" v-show="activeDropdown === 'categories'">
                  <div class="dropdown-content">
                    <div class="dropdown-column">
                      <h4 class="dropdown-title">Electronics</h4>
                      <ul class="dropdown-links">
                        <li><router-link to="/categories/smartphones">Smartphones</router-link></li>
                        <li><router-link to="/categories/laptops">Laptops</router-link></li>
                        <li><router-link to="/categories/tablets">Tablets</router-link></li>
                        <li><router-link to="/categories/audio">Audio</router-link></li>
                      </ul>
                    </div>
                    <div class="dropdown-column">
                      <h4 class="dropdown-title">Fashion</h4>
                      <ul class="dropdown-links">
                        <li><router-link to="/categories/womens-clothing">Women's Clothing</router-link></li>
                        <li><router-link to="/categories/mens-clothing">Men's Clothing</router-link></li>
                        <li><router-link to="/categories/shoes">Shoes</router-link></li>
                        <li><router-link to="/categories/jewelry">Jewelry</router-link></li>
                      </ul>
                    </div>
                    <div class="dropdown-column">
                      <h4 class="dropdown-title">Home & Garden</h4>
                      <ul class="dropdown-links">
                        <li><router-link to="/categories/furniture">Furniture</router-link></li>
                        <li><router-link to="/categories/kitchen">Kitchen</router-link></li>
                        <li><router-link to="/categories/garden">Garden</router-link></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
              <li class="nav-item">
                <router-link to="/deals" class="nav-link sale-link">
                  <span class="sale-text">SALE</span>
                  <span class="sale-badge">-75%</span>
                </router-link>
              </li>
            </ul>
          </nav>

          <!-- Search Bar -->
          <div class="search-container">
            <form @submit.prevent="performSearch" class="search-form">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search entire store..."
                class="search-input"
                @focus="showSearchDropdown = true"
                @blur="hideSearchDropdown"
              >
              <button type="submit" class="search-btn">
                <i class="fas fa-search"></i>
              </button>
            </form>
          </div>

          <!-- User Actions -->
          <div class="user-actions">
            <router-link to="/account" class="action-link" title="Account">
              <i class="fas fa-user"></i>
              <span class="action-text">Account</span>
            </router-link>

            <router-link to="/wishlist" class="action-link" title="Wishlist">
              <i class="fas fa-heart"></i>
              <span class="action-text">Wishlist</span>
              <span class="action-count" v-if="wishlistCount > 0">{{ wishlistCount }}</span>
            </router-link>

            <a href="#" @click.prevent="toggleCart" class="action-link cart-link" title="Shopping Cart">
              <i class="fas fa-shopping-cart"></i>
              <span class="action-text">Cart</span>
              <span class="action-count" v-if="cartCount > 0">{{ cartCount }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Menu Overlay -->
    <div
      v-if="mobileMenuOpen"
      class="mobile-menu-overlay"
      @click="closeMobileMenu"
    ></div>

    <!-- Mobile Menu -->
    <div class="mobile-menu" :class="{ active: mobileMenuOpen }">
      <div class="mobile-menu-header">
        <button @click="closeMobileMenu" class="mobile-menu-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <nav class="mobile-nav">
        <ul class="mobile-nav-list">
          <li class="mobile-nav-item">
            <router-link to="/categories" @click="closeMobileMenu">Catalog</router-link>
          </li>
          <li class="mobile-nav-item has-children">
            <a href="#" @click="toggleMobileDropdown('categories')">
              Categories
              <i class="fas fa-chevron-down"></i>
            </a>
            <ul class="mobile-submenu" v-show="mobileDropdowns.categories">
              <li><router-link to="/categories/electronics" @click="closeMobileMenu">Electronics</router-link></li>
              <li><router-link to="/categories/fashion" @click="closeMobileMenu">Fashion</router-link></li>
              <li><router-link to="/categories/home" @click="closeMobileMenu">Home & Garden</router-link></li>
              <li><router-link to="/categories/sports" @click="closeMobileMenu">Sports</router-link></li>
            </ul>
          </li>
          <li class="mobile-nav-item">
            <router-link to="/deals" @click="closeMobileMenu" class="sale-link">SALE -75%</router-link>
          </li>
        </ul>
      </nav>
    </div>

          <!-- Desktop Navigation -->
          <nav class="desktop-nav">
            <ul class="nav-list">
              <li class="nav-item">
                <router-link to="/" class="nav-link" exact>
                  <i class="fas fa-home"></i>
                  Home
                </router-link>
              </li>
              <li class="nav-item dropdown">
                <a href="#" class="nav-link" @click.prevent="toggleDropdown('products')">
                  <i class="fas fa-box"></i>
                  Products
                  <i class="fas fa-chevron-down dropdown-icon"></i>
                </a>
                <div v-if="activeDropdown === 'products'" class="mega-menu">
                  <div class="mega-menu-content">
                    <div class="mega-menu-section">
                      <h4>Shop by Category</h4>
                      <ul>
                        <li v-for="category in categories.slice(0, 6)" :key="category.id">
                          <router-link :to="`/products?category=${category.slug}`">
                            {{ category.name }}
                          </router-link>
                        </li>
                      </ul>
                    </div>
                    <div class="mega-menu-section">
                      <h4>Featured</h4>
                      <ul>
                        <li><router-link to="/products?featured=true">Featured Products</router-link></li>
                        <li><router-link to="/products?sort=newest">New Arrivals</router-link></li>
                        <li><router-link to="/products?sort=popular">Best Sellers</router-link></li>
                        <li><router-link to="/products?sale=true">On Sale</router-link></li>
                      </ul>
                    </div>
                    <div class="mega-menu-section">
                      <h4>Brands</h4>
                      <ul>
                        <li><router-link to="/products?brand=audioTech">AudioTech</router-link></li>
                        <li><router-link to="/products?brand=techPro">TechPro</router-link></li>
                        <li><router-link to="/products?brand=soundMax">SoundMax</router-link></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
              <li class="nav-item">
                <router-link to="/products" class="nav-link">
                  <i class="fas fa-tags"></i>
                  Deals
                </router-link>
              </li>
              <li class="nav-item">
                <router-link to="/sellers" class="nav-link">
                  <i class="fas fa-store"></i>
                  Sellers
                </router-link>
              </li>
              <li class="nav-item">
                <router-link to="/about" class="nav-link">
                  <i class="fas fa-info-circle"></i>
                  About
                </router-link>
              </li>
            </ul>
          </nav>

          <!-- Search Bar -->
          <div class="search-container">
            <div class="search-box">
              <input
                v-model="searchQuery"
                @keyup.enter="performSearch"
                type="text"
                placeholder="Search products..."
                class="search-input"
              >
              <button @click="performSearch" class="search-btn">
                <i class="fas fa-search"></i>
              </button>
            </div>
          </div>

          <!-- User Actions -->
          <div class="user-actions">
            <!-- Wishlist -->
            <router-link to="/wishlist" class="action-btn" title="Wishlist">
              <i class="fas fa-heart"></i>
              <span class="action-count" v-if="wishlistCount > 0">{{ wishlistCount }}</span>
            </router-link>

            <!-- Cart -->
            <router-link to="/cart" class="action-btn" title="Shopping Cart">
              <i class="fas fa-shopping-cart"></i>
              <span class="action-count" v-if="cartCount > 0">{{ cartCount }}</span>
            </router-link>

            <!-- User Menu -->
            <div class="user-menu" v-if="isAuthenticated">
              <button @click="toggleUserMenu" class="user-btn">
                <div class="user-avatar">
                  <img v-if="user?.avatar" :src="user.avatar" :alt="user.name">
                  <div v-else class="user-initials">{{ userInitials }}</div>
                </div>
                <i class="fas fa-chevron-down"></i>
              </button>

              <div v-if="userMenuOpen" class="user-dropdown">
                <div class="user-info">
                  <div class="user-name">{{ user?.name }}</div>
                  <div class="user-email">{{ user?.email }}</div>
                </div>
                <hr>
                <router-link to="/profile" class="dropdown-item">
                  <i class="fas fa-user"></i>
                  Profile
                </router-link>
                <router-link to="/orders" class="dropdown-item">
                  <i class="fas fa-shopping-bag"></i>
                  Orders
                </router-link>
                <router-link to="/dashboard" class="dropdown-item" v-if="user?.role === 'seller'">
                  <i class="fas fa-tachometer-alt"></i>
                  Dashboard
                </router-link>
                <router-link to="/settings" class="dropdown-item">
                  <i class="fas fa-cog"></i>
                  Settings
                </router-link>
                <hr>
                <button @click="logout" class="dropdown-item logout-btn">
                  <i class="fas fa-sign-out-alt"></i>
                  Logout
                </button>
              </div>
            </div>

            <!-- Auth Buttons -->
            <div v-else class="auth-buttons">
              <router-link to="/login" class="btn btn-outline">
                Sign In
              </router-link>
              <router-link to="/register" class="btn btn-primary">
                Sign Up
              </router-link>
            </div>
          </div>

          <!-- Mobile Menu Toggle -->
          <button @click="toggleMobileMenu" class="mobile-menu-toggle">
            <i :class="mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <div :class="['mobile-nav', { 'mobile-nav-open': mobileMenuOpen }]">
      <div class="mobile-nav-content">
        <!-- Mobile Search -->
        <div class="mobile-search">
          <input
            v-model="searchQuery"
            @keyup.enter="performSearch"
            type="text"
            placeholder="Search products..."
            class="mobile-search-input"
          >
          <button @click="performSearch" class="mobile-search-btn">
            <i class="fas fa-search"></i>
          </button>
        </div>

        <!-- Mobile Menu Items -->
        <nav class="mobile-nav-menu">
          <router-link to="/" @click="closeMobileMenu" class="mobile-nav-link">
            <i class="fas fa-home"></i>
            Home
          </router-link>

          <div class="mobile-nav-section">
            <div class="mobile-nav-section-title">Products</div>
            <router-link to="/products" @click="closeMobileMenu" class="mobile-nav-link">
              <i class="fas fa-box"></i>
              All Products
            </router-link>
            <router-link to="/products?featured=true" @click="closeMobileMenu" class="mobile-nav-link">
              <i class="fas fa-star"></i>
              Featured
            </router-link>
            <router-link to="/products?sale=true" @click="closeMobileMenu" class="mobile-nav-link">
              <i class="fas fa-tags"></i>
              On Sale
            </router-link>
          </div>

          <router-link to="/sellers" @click="closeMobileMenu" class="mobile-nav-link">
            <i class="fas fa-store"></i>
            Sellers
          </router-link>

          <router-link to="/about" @click="closeMobileMenu" class="mobile-nav-link">
            <i class="fas fa-info-circle"></i>
            About
          </router-link>

          <!-- Mobile User Actions -->
          <div v-if="isAuthenticated" class="mobile-nav-section">
            <div class="mobile-nav-section-title">Account</div>
            <router-link to="/profile" @click="closeMobileMenu" class="mobile-nav-link">
              <i class="fas fa-user"></i>
              Profile
            </router-link>
            <router-link to="/orders" @click="closeMobileMenu" class="mobile-nav-link">
              <i class="fas fa-shopping-bag"></i>
              Orders
            </router-link>
            <router-link v-if="user?.role === 'seller'" to="/dashboard" @click="closeMobileMenu" class="mobile-nav-link">
              <i class="fas fa-tachometer-alt"></i>
              Dashboard
            </router-link>
            <router-link to="/wishlist" @click="closeMobileMenu" class="mobile-nav-link">
              <i class="fas fa-heart"></i>
              Wishlist
            </router-link>
            <button @click="logout" class="mobile-nav-link logout-link">
              <i class="fas fa-sign-out-alt"></i>
              Logout
            </button>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { useCartStore } from '@/stores'

// Reactive data
const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

// Component state
const mobileMenuOpen = ref(false)
const searchQuery = ref('')
const showSearchDropdown = ref(false)
const activeDropdown = ref<string | null>(null)
const mobileDropdowns = ref({
  categories: false
})

// Computed properties
const user = computed(() => authStore.user)
const cartCount = computed(() => cartStore.totalItems || 0)
const wishlistCount = computed(() => cartStore.wishlistItems?.length || 0)

// Methods
const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
  if (mobileMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
  document.body.style.overflow = ''
}

const toggleDropdown = (dropdown: string) => {
  activeDropdown.value = activeDropdown.value === dropdown ? null : dropdown
}

const toggleMobileDropdown = (dropdown: string) => {
  mobileDropdowns.value[dropdown] = !mobileDropdowns.value[dropdown]
}

const performSearch = () => {
  if (searchQuery.value.trim()) {
    router.push(`/search?q=${encodeURIComponent(searchQuery.value)}`)
    searchQuery.value = ''
    closeMobileMenu()
  }
}

const hideSearchDropdown = () => {
  setTimeout(() => {
    showSearchDropdown.value = false
  }, 200)
}

const toggleCart = () => {
  // TODO: Implement cart sidebar toggle
  console.log('Toggle cart sidebar')
}

// Close dropdowns when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.has-dropdown')) {
    activeDropdown.value = null
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* Journal Theme Header Styles */
.app-header {
  position: relative;
  z-index: 1000;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

/* Top Bar */
.header-top {
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
  padding: 0.5rem 0;
}

.header-top-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.contact-info {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.contact-item:hover {
  color: #374151;
}

.contact-item i {
  color: #667eea;
}

.header-top-links {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.top-link {
  color: #6b7280;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.top-link:hover {
  color: #374151;
}

/* Main Header */
.header-main {
  padding: 1rem 0;
  background: white;
}

.header-main-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

/* Logo */
.logo {
  text-decoration: none;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  transition: color 0.2s ease;
}

.logo:hover {
  color: #667eea;
}

.logo-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Mobile Menu Button */
.mobile-menu-btn {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s ease;
}

.mobile-menu-btn:hover {
  background: #f3f4f6;
}

.hamburger-line {
  width: 20px;
  height: 2px;
  background: #374151;
  transition: all 0.3s ease;
  transform-origin: center;
}

/* Desktop Navigation */
.main-nav {
  flex: 1;
  display: flex;
  justify-content: center;
}

.nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 2rem;
  align-items: center;
}

.nav-item {
  position: relative;
}

.nav-link {
  color: #374151;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 0;
  position: relative;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: #667eea;
}

.sale-link {
  color: #dc2626 !important;
  position: relative;
}

.sale-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, #dc2626, #ef4444);
  border-radius: 0.375rem;
  opacity: 0.1;
  z-index: -1;
}

.sale-badge {
  background: #dc2626;
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  margin-left: 0.5rem;
}

/* Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 600px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  padding: 2rem;
}

.dropdown-column h4 {
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.dropdown-links {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dropdown-links li {
  margin-bottom: 0.5rem;
}

.dropdown-links a {
  color: #6b7280;
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s ease;
}

.dropdown-links a:hover {
  color: #667eea;
}

.dropdown-arrow {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.nav-item.has-dropdown:hover .dropdown-arrow {
  transform: rotate(180deg);
}

/* Search */
.search-container {
  flex: 1;
  max-width: 500px;
}

.search-form {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.75rem 3rem 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-btn {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: color 0.2s ease;
}

.search-btn:hover {
  color: #667eea;
}

/* User Actions */
.user-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.action-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: #374151;
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  position: relative;
}

.action-link:hover {
  color: #667eea;
  background: #f3f4f6;
}

.action-link i {
  font-size: 1.25rem;
  margin-bottom: 0.125rem;
}

.action-count {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: #dc2626;
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 0.75rem;
  min-width: 1.25rem;
  text-align: center;
  line-height: 1;
}

/* Mobile Menu */
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  background: white;
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  padding: 2rem;
  overflow-y: auto;
}

.mobile-menu.active {
  transform: translateX(0);
}

.mobile-menu.active + .mobile-menu-overlay {
  opacity: 1;
  visibility: visible;
}

.mobile-menu-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2rem;
}

.mobile-menu-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #374151;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s ease;
}

.mobile-menu-close:hover {
  background: #f3f4f6;
}

.mobile-nav {
  margin-top: 2rem;
}

.mobile-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mobile-nav-item {
  border-bottom: 1px solid #e5e7eb;
}

.mobile-nav-item a {
  display: block;
  padding: 1rem 0;
  color: #374151;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.mobile-nav-item a:hover,
.mobile-nav-item a.sale-link {
  color: #667eea;
}

.mobile-submenu {
  list-style: none;
  margin: 0;
  padding: 0;
  background: #f9fafb;
  border-radius: 0.375rem;
  margin-top: 0.5rem;
  overflow: hidden;
}

.mobile-submenu li a {
  padding: 0.75rem 1rem;
  font-weight: 500;
  border-bottom: 1px solid #e5e7eb;
}

.mobile-submenu li:last-child a {
  border-bottom: none;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .nav-list {
    gap: 1.5rem;
  }

  .search-container {
    max-width: 350px;
  }

  .dropdown-content {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

@media (max-width: 768px) {
  .header-main-content {
    position: relative;
  }

  .main-nav {
    display: none;
  }

  .search-container {
    display: none;
  }

  .user-actions {
    gap: 0.75rem;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .mobile-menu-overlay {
    display: block;
  }
}

@media (max-width: 640px) {
  .header-top-content {
    flex-direction: column;
    gap: 0.5rem;
  }

  .contact-info {
    gap: 1rem;
  }

  .header-top-links {
    gap: 1rem;
  }

  .mobile-menu {
    width: 100%;
  }

  .user-actions {
    gap: 0.5rem;
  }

  .action-link {
    padding: 0.5rem;
    font-size: 0.625rem;
  }
}

/* Hover effects for dropdown */
.nav-item.has-dropdown:hover .dropdown-menu {
  display: block;
}
</style>