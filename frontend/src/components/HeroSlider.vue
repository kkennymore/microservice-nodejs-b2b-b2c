<template>
  <section class="hero-slider" ref="sliderRef">
    <div class="slider-container">
      <!-- Slides -->
      <div
        class="slides-wrapper"
        :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
      >
        <div
          v-for="(slide, index) in slides"
          :key="index"
          class="slide"
          :class="{ active: index === currentSlide }"
        >
          <div class="slide-background">
            <OptimizedImage
              :src="slide.image"
              :alt="slide.title"
              class="slide-image"
              :priority="index === 0"
            />
            <div class="slide-overlay"></div>
          </div>

          <div class="slide-content">
            <div class="container">
              <div class="content-wrapper">
                <div class="slide-badge" v-if="slide.badge">
                  {{ slide.badge }}
                </div>

                <h1 class="slide-title">
                  {{ slide.title }}
                </h1>

                <p class="slide-description">
                  {{ slide.description }}
                </p>

                <div class="slide-actions">
                  <router-link
                    v-if="slide.primaryButton"
                    :to="slide.primaryButton.link"
                    class="btn btn-primary slide-btn-primary"
                  >
                    {{ slide.primaryButton.text }}
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </router-link>

                  <router-link
                    v-if="slide.secondaryButton"
                    :to="slide.secondaryButton.link"
                    class="btn btn-outline slide-btn-secondary"
                  >
                    {{ slide.secondaryButton.text }}
                  </router-link>
                </div>

                <div class="slide-stats" v-if="slide.stats">
                  <div
                    v-for="stat in slide.stats"
                    :key="stat.label"
                    class="stat-item"
                  >
                    <div class="stat-number">{{ stat.number }}</div>
                    <div class="stat-label">{{ stat.label }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Arrows -->
      <button
        @click="prevSlide"
        class="nav-arrow nav-arrow-prev"
        aria-label="Previous slide"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>

      <button
        @click="nextSlide"
        class="nav-arrow nav-arrow-next"
        aria-label="Next slide"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>

      <!-- Dots Navigation -->
      <div class="slider-dots">
        <button
          v-for="(_, index) in slides"
          :key="index"
          @click="goToSlide(index)"
          class="dot"
          :class="{ active: index === currentSlide }"
          :aria-label="`Go to slide ${index + 1}`"
        ></button>
      </div>

      <!-- Progress Bar -->
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${((currentSlide + 1) / slides.length) * 100}%` }"
        ></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import OptimizedImage from '@/components/OptimizedImage.vue'

// Slider data
const slides = ref([
  {
    image: '/images/hero/electronics.jpg',
    title: 'Premium Electronics',
    description: 'Discover cutting-edge technology from top brands. Quality products, competitive prices, and fast shipping.',
    badge: 'New Arrivals',
    primaryButton: {
      text: 'Shop Electronics',
      link: '/categories/electronics'
    },
    secondaryButton: {
      text: 'View Deals',
      link: '/deals'
    },
    stats: [
      { number: '10k+', label: 'Products' },
      { number: '500+', label: 'Brands' },
      { number: '99%', label: 'Satisfaction' }
    ]
  },
  {
    image: '/images/hero/fashion.jpg',
    title: 'Fashion Forward',
    description: 'Express your unique style with our curated collection. From casual wear to formal attire, find your perfect look.',
    badge: 'Trending Now',
    primaryButton: {
      text: 'Explore Fashion',
      link: '/categories/fashion'
    },
    secondaryButton: {
      text: 'New Collections',
      link: '/collections/new'
    },
    stats: [
      { number: '5k+', label: 'Styles' },
      { number: '200+', label: 'Designers' },
      { number: 'Free Shipping', label: 'on orders $50+' }
    ]
  },
  {
    image: '/images/hero/home.jpg',
    title: 'Home & Garden',
    description: 'Transform your space with our premium home goods. Quality furniture, decor, and garden essentials for every room.',
    badge: 'Home Makeover',
    primaryButton: {
      text: 'Shop Home',
      link: '/categories/home-garden'
    },
    secondaryButton: {
      text: 'Interior Ideas',
      link: '/inspiration'
    },
    stats: [
      { number: '8k+', label: 'Items' },
      { number: '50+', label: 'Categories' },
      { number: 'Expert Advice', label: 'Included' }
    ]
  }
])

// Slider state
const currentSlide = ref(0)
const sliderRef = ref<HTMLElement>()
const autoPlayInterval = ref<number>()
const isTransitioning = ref(false)

// Auto-play settings
const autoPlayDelay = 5000 // 5 seconds

// Navigation functions
const nextSlide = () => {
  if (isTransitioning.value) return
  currentSlide.value = (currentSlide.value + 1) % slides.value.length
  resetAutoPlay()
}

const prevSlide = () => {
  if (isTransitioning.value) return
  currentSlide.value = currentSlide.value === 0 ? slides.value.length - 1 : currentSlide.value - 1
  resetAutoPlay()
}

const goToSlide = (index: number) => {
  if (isTransitioning.value || index === currentSlide.value) return
  currentSlide.value = index
  resetAutoPlay()
}

// Auto-play management
const startAutoPlay = () => {
  if (autoPlayInterval.value) {
    clearInterval(autoPlayInterval.value)
  }
  autoPlayInterval.value = setInterval(nextSlide, autoPlayDelay)
}

const resetAutoPlay = () => {
  if (autoPlayInterval.value) {
    clearInterval(autoPlayInterval.value)
  }
  startAutoPlay()
}

const stopAutoPlay = () => {
  if (autoPlayInterval.value) {
    clearInterval(autoPlayInterval.value)
    autoPlayInterval.value = undefined
  }
}

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowLeft') {
    prevSlide()
  } else if (event.key === 'ArrowRight') {
    nextSlide()
  }
}

// Touch/swipe support
let touchStartX = 0
let touchEndX = 0

const handleTouchStart = (event: TouchEvent) => {
  if (event.changedTouches && event.changedTouches[0]) {
    touchStartX = event.changedTouches[0].screenX
    stopAutoPlay()
  }
}

const handleTouchEnd = (event: TouchEvent) => {
  if (event.changedTouches && event.changedTouches[0]) {
    touchEndX = event.changedTouches[0].screenX
    handleSwipe()
    startAutoPlay()
  }
}

const handleSwipe = () => {
  const swipeThreshold = 50
  const swipeDistance = touchStartX - touchEndX

  if (Math.abs(swipeDistance) > swipeThreshold) {
    if (swipeDistance > 0) {
      nextSlide()
    } else {
      prevSlide()
    }
  }
}

// Lifecycle hooks
onMounted(async () => {
  await nextTick()
  startAutoPlay()

  // Add event listeners
  window.addEventListener('keydown', handleKeydown)

  if (sliderRef.value) {
    sliderRef.value.addEventListener('touchstart', handleTouchStart, { passive: true })
    sliderRef.value.addEventListener('touchend', handleTouchEnd, { passive: true })
  }
})

onUnmounted(() => {
  stopAutoPlay()
  window.removeEventListener('keydown', handleKeydown)

  if (sliderRef.value) {
    sliderRef.value.removeEventListener('touchstart', handleTouchStart)
    sliderRef.value.removeEventListener('touchend', handleTouchEnd)
  }
})

// Expose methods for parent components
defineExpose({
  nextSlide,
  prevSlide,
  goToSlide,
  currentSlide
})
</script>

<style scoped>
.hero-slider {
  position: relative;
  height: 100vh;
  min-height: 600px;
  max-height: 800px;
  overflow: hidden;
}

.slider-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.slides-wrapper {
  display: flex;
  height: 100%;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide {
  position: relative;
  width: 100%;
  height: 100%;
  flex-shrink: 0;
}

.slide-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.4);
}

.slide-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(26, 26, 26, 0.7) 0%,
    rgba(102, 126, 234, 0.3) 50%,
    rgba(118, 75, 162, 0.3) 100%
  );
}

.slide-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  align-items: center;
}

.content-wrapper {
  max-width: 600px;
  color: white;
  animation: slideIn 0.8s ease-out;
}

.slide-badge {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.slide-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slide-description {
  font-size: 1.125rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.slide-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.slide-btn-primary,
.slide-btn-secondary {
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.75rem;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.slide-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
}

.slide-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
}

.slide-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.slide-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Navigation Arrows */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.nav-arrow:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-50%) scale(1.1);
}

.nav-arrow-prev {
  left: 2rem;
}

.nav-arrow-next {
  right: 2rem;
}

/* Dots Navigation */
.slider-dots {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  gap: 0.75rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dot:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.2);
}

.dot.active {
  background: white;
  border-color: white;
  transform: scale(1.3);
}

/* Progress Bar */
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  z-index: 3;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 1024px) {
  .content-wrapper {
    max-width: 500px;
  }

  .slide-title {
    font-size: clamp(2rem, 6vw, 3.5rem);
  }

  .nav-arrow {
    width: 50px;
    height: 50px;
  }

  .nav-arrow-prev {
    left: 1rem;
  }

  .nav-arrow-next {
    right: 1rem;
  }
}

@media (max-width: 768px) {
  .hero-slider {
    height: 80vh;
    min-height: 500px;
  }

  .slide-content {
    padding: 0 1rem;
  }

  .content-wrapper {
    max-width: 100%;
    text-align: center;
  }

  .slide-actions {
    justify-content: center;
  }

  .slide-stats {
    justify-content: center;
  }

  .nav-arrow {
    display: none;
  }

  .slider-dots {
    bottom: 1rem;
  }
}

@media (max-width: 640px) {
  .hero-slider {
    height: 70vh;
    min-height: 400px;
  }

  .slide-title {
    font-size: clamp(1.75rem, 8vw, 2.5rem);
  }

  .slide-description {
    font-size: 1rem;
  }

  .slide-actions {
    flex-direction: column;
    align-items: center;
  }

  .slide-btn-primary,
  .slide-btn-secondary {
    width: 100%;
    justify-content: center;
  }

  .slide-stats {
    gap: 1rem;
  }

  .stat-item {
    flex: 1;
    min-width: 80px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .slides-wrapper {
    transition: none;
  }

  .nav-arrow,
  .slide-btn-primary,
  .slide-btn-secondary,
  .dot {
    transition: none;
  }

  .content-wrapper {
    animation: none;
  }
}
</style>