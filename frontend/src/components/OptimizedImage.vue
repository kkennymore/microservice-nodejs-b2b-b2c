<template>
  <div
    v-intersection-observer="onIntersection"
    class="image-container"
  >
    <img
      v-if="shouldLoad"
      :src="optimizedSrc"
      :alt="alt"
      :loading="loading"
      :width="width"
      :height="height"
      :class="imageClasses"
      @load="onImageLoad"
      @error="$emit('error')"
    />
    <div v-else class="image-placeholder">
      <div class="placeholder-shimmer"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  src: string
  alt?: string
  loading?: 'lazy' | 'eager'
  width?: number
  height?: number
  placeholder?: string
  sizes?: string
  srcset?: string
  quality?: number
  format?: 'webp' | 'jpg' | 'png'
  rootMargin?: string
  threshold?: number | number[]
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  loading: 'lazy',
  quality: 80,
  format: 'webp',
  rootMargin: '50px',
  threshold: 0.1
})

defineEmits<{
  load: []
  error: []
}>()

const isIntersecting = ref(false)
const isLoaded = ref(false)

const shouldLoad = computed(() => {
  return props.loading === 'eager' || isIntersecting.value
})

const imageClasses = computed(() => {
  const classes = ['optimized-image']
  if (isLoaded.value) classes.push('loaded')
  return classes.join(' ')
})

// Intersection observer for lazy loading
const onIntersection = (entry: IntersectionObserverEntry) => {
  if (entry.isIntersecting && !isIntersecting.value) {
    isIntersecting.value = true
  }
}

const onImageLoad = () => {
  isLoaded.value = true
  // emit('load')
}

// Generate optimized image URL (for CDN integration)
const optimizedSrc = computed(() => {
  if (!props.src) return ''

  // In a real app, this would transform the URL for optimization
  // Example: https://cdn.example.com/optimize?url=${encodeURIComponent(props.src)}&w=${props.width}&q=${props.quality}&f=${props.format}

  return props.src
})
</script>

<style scoped>
.image-container {
  position: relative;
  overflow: hidden;
  background-color: var(--bg-secondary);
}

.optimized-image {
  width: 100%;
  height: auto;
  transition: opacity 0.3s ease-in-out;
  opacity: 0;
  display: block;
}

.optimized-image.loaded {
  opacity: 1;
}

.image-placeholder {
  width: 100%;
  aspect-ratio: 16/9; /* Default aspect ratio */
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-shimmer {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Responsive image handling */
@media (max-width: 768px) {
  .optimized-image {
    width: 100%;
    height: auto;
  }
}
</style>