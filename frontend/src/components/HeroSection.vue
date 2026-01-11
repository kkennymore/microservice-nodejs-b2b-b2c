<template>
  <section class="hero-section">
    <div class="hero-slider">
      <!-- Slides -->
      <div
        class="hero-slide"
        v-for="(slide, index) in slides"
        :key="index"
        :class="{ active: index === currentSlide }"
        :style="{ backgroundImage: `url(${slide.background})` }"
      >
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="container">
            <div class="content-wrapper">
              <div class="hero-badge" v-if="slide.badge">
                {{ slide.badge }}
              </div>

              <h1 class="hero-title">
                {{ slide.title }}
              </h1>

              <p class="hero-description">
                {{ slide.description }}
              </p>

              <div class="hero-actions">
                <router-link
                  v-if="slide.primaryButton"
                  :to="slide.primaryButton.link"
                  class="btn btn-primary hero-btn-primary"
                >
                  {{ slide.primaryButton.text }}
                  <i class="fas fa-arrow-right"></i>
                </router-link>

                <router-link
                  v-if="slide.secondaryButton"
                  :to="slide.secondaryButton.link"
                  class="btn btn-outline hero-btn-secondary"
                >
                  {{ slide.secondaryButton.text }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Arrows -->
      <button
        @click="prevSlide"
        class="hero-nav-arrow hero-nav-prev"
        aria-label="Previous slide"
      >
        <i class="fas fa-chevron-left"></i>
      </button>

      <button
        @click="nextSlide"
        class="hero-nav-arrow hero-nav-next"
        aria-label="Next slide"
      >
        <i class="fas fa-chevron-right"></i>
      </button>

      <!-- Slide Indicators -->
      <div class="hero-indicators">
        <button
          v-for="(slide, index) in slides"
          :key="index"
          @click="goToSlide(index)"
          class="indicator"
          :class="{ active: index === currentSlide }"
          :aria-label="`Go to slide ${index + 1}`"
        ></button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Hero slides data
const slides = ref([
  {
    background: '/images/hero/bike-adventure.jpg',
    badge: 'New Collection',
    title: 'The Bike for Any Occasion',
    description: 'Discover our premium collection of bicycles designed for every adventure. From mountain trails to city streets, find your perfect ride with cutting-edge technology and unparalleled comfort.',
    primaryButton: {
      text: 'Shop Now',
      link: '/categories/bikes'
    },
    secondaryButton: {
      text: 'Learn More',
      link: '/about'
    }
  },
  {
    background: '/images/hero/mountain-bike.jpg',
    badge: 'Adventure Ready',
    title: 'Any Terrain, Any Weather',
    description: 'Conquer the toughest trails with our rugged mountain bikes. Built for performance and durability, these bikes are ready for whatever adventure you have in mind.',
    primaryButton: {
      text: 'Shop Now',
      link: '/categories/mountain-bikes'
    },
    secondaryButton: {
      text: 'Learn More',
      link: '/about'
    }
  },
  {
    background: '/images/hero/city-bike.jpg',
    badge: 'Urban Lifestyle',
    title: 'Conquer the City',
    description: 'Navigate urban landscapes with style and efficiency. Our city bikes combine modern design with practical features for the perfect commuting experience.',
    primaryButton: {
      text: 'Shop Now',
      link: '/categories/city-bikes'
    },
    secondaryButton: {
      text: 'Learn More',
      link: '/about'
    }
  }
])

// Slider state
const currentSlide = ref(0)
const autoPlayInterval = ref<NodeJS.Timeout>()

// Auto-play settings
const autoPlayDelay = 6000 // 6 seconds

// Navigation functions
const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % slides.value.length
  resetAutoPlay()
}

const prevSlide = () => {
  currentSlide.value = currentSlide.value === 0 ? slides.value.length - 1 : currentSlide.value - 1
  resetAutoPlay()
}

const goToSlide = (index: number) => {
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

// Pause auto-play on hover
const handleMouseEnter = () => {
  stopAutoPlay()
}

const handleMouseLeave = () => {
  startAutoPlay()
}

// Lifecycle hooks
onMounted(() => {
  startAutoPlay()
  window.addEventListener('keydown', handleKeydown)

  // Add hover listeners to hero section
  const heroSection = document.querySelector('.hero-section')
  if (heroSection) {
    heroSection.addEventListener('mouseenter', handleMouseEnter)
    heroSection.addEventListener('mouseleave', handleMouseLeave)
  }
})

onUnmounted(() => {
  stopAutoPlay()
  window.removeEventListener('keydown', handleKeydown)

  const heroSection = document.querySelector('.hero-section')
  if (heroSection) {
    heroSection.removeEventListener('mouseenter', handleMouseEnter)
    heroSection.removeEventListener('mouseleave', handleMouseLeave)
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
.hero-section {
  position: relative;
  height: 80vh;
  min-height: 600px;
  max-height: 800px;
  overflow: hidden;
}

.hero-slider {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Hero Slides */
.hero-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.8s ease;
}

.hero-slide.active {
  opacity: 1;
  visibility: visible;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.4) 0%,
    rgba(102, 126, 234, 0.2) 50%,
    rgba(118, 75, 162, 0.2) 100%
  );
}

.hero-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  align-items: center;
}

.content-wrapper {
  max-width: 600px;
  color: white;
  animation: slideIn 1s ease-out;
}

.hero-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.025em;
}

.hero-description {
  font-size: 1.125rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.95;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  max-width: 500px;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero-btn-primary,
.hero-btn-secondary {
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.5rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.hero-btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.hero-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.hero-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.hero-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

/* Navigation Arrows */
.hero-nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1.25rem;
}

.hero-nav-arrow:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-50%) scale(1.1);
}

.hero-nav-prev {
  left: 2rem;
}

.hero-nav-next {
  right: 2rem;
}

/* Slide Indicators */
.hero-indicators {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  gap: 0.75rem;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.2);
}

.indicator.active {
  background: white;
  border-color: white;
  transform: scale(1.3);
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
  .hero-title {
    font-size: clamp(2rem, 6vw, 3.5rem);
  }

  .hero-nav-arrow {
    width: 50px;
    height: 50px;
    font-size: 1rem;
  }

  .hero-nav-prev {
    left: 1rem;
  }

  .hero-nav-next {
    right: 1rem;
  }
}

@media (max-width: 768px) {
  .hero-section {
    height: 70vh;
    min-height: 500px;
  }

  .hero-content {
    padding: 0 1rem;
  }

  .content-wrapper {
    max-width: 100%;
    text-align: center;
  }

  .hero-title {
    font-size: clamp(1.75rem, 8vw, 2.5rem);
  }

  .hero-description {
    font-size: 1rem;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-nav-arrow {
    display: none;
  }

  .hero-indicators {
    bottom: 1rem;
  }
}

@media (max-width: 640px) {
  .hero-section {
    height: 60vh;
    min-height: 400px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-btn-primary,
  .hero-btn-secondary {
    width: 100%;
    justify-content: center;
    max-width: 280px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .hero-slide {
    transition: none;
  }

  .hero-nav-arrow,
  .hero-btn-primary,
  .hero-btn-secondary,
  .indicator {
    transition: none;
  }

  .content-wrapper {
    animation: none;
  }
}
</style>