<template>
  <div v-if="!isOnline" class="offline-indicator">
    <div class="offline-content">
      <span class="offline-icon">📶</span>
      <span class="offline-text">You're offline</span>
      <Button
        size="sm"
        variant="outline"
        @click="retryConnection"
        :loading="retrying"
      >
        Retry
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components'

const isOnline = ref(navigator.onLine)
const retrying = ref(false)

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine
}

const retryConnection = async () => {
  retrying.value = true
  // Simple connectivity check
  try {
    const response = await fetch(window.location.origin + '/manifest.json', {
      method: 'HEAD',
      cache: 'no-cache'
    })
    if (response.ok) {
      isOnline.value = true
    }
  } catch (error) {
    // Still offline
  }
  retrying.value = false
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: var(--warning-color);
  color: #000;
  padding: var(--spacing-sm) var(--spacing-md);
  box-shadow: var(--shadow-md);
  z-index: 1000;
  border-bottom: 2px solid var(--danger-color);
}

.offline-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  max-width: 1200px;
  margin: 0 auto;
}

.offline-text {
  font-weight: 500;
}

.offline-icon {
  font-size: var(--font-size-lg);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .offline-content {
    flex-direction: column;
    gap: var(--spacing-sm);
    text-align: center;
  }
}
</style>