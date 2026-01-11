<template>
  <Transition name="onboarding">
    <div v-if="showOnboarding" class="onboarding-overlay" @click.self="closeOnboarding">
      <div class="onboarding-modal">
        <div class="onboarding-header">
          <h2>Welcome to Marketplace</h2>
          <button class="onboarding-close" @click="closeOnboarding" aria-label="Close">
            ×
          </button>
        </div>

        <div class="onboarding-content">
          <div class="onboarding-step" v-for="(step, index) in steps" :key="index" v-show="currentStep === index">
            <div class="step-icon">
              <component :is="step.icon" />
            </div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </div>

          <div class="step-indicators">
            <div
              v-for="(step, index) in steps"
              :key="index"
              class="indicator"
              :class="{ active: currentStep === index }"
              @click="currentStep = index"
            ></div>
          </div>
        </div>

        <div class="onboarding-footer">
          <Button
            v-if="currentStep > 0"
            variant="outline"
            @click="prevStep"
          >
            Previous
          </Button>

          <Button
            v-if="currentStep < steps.length - 1"
            variant="primary"
            @click="nextStep"
          >
            Next
          </Button>

          <Button
            v-else
            variant="primary"
            @click="completeOnboarding"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components'

const showOnboarding = ref(false)
const currentStep = ref(0)

const steps = [
  {
    icon: 'ShoppingIcon',
    title: 'Discover Products',
    description: 'Browse through thousands of products from trusted sellers worldwide.'
  },
  {
    icon: 'SellerIcon',
    title: 'Connect with Sellers',
    description: 'Chat directly with sellers, compare prices, and make informed decisions.'
  },
  {
    icon: 'SecureIcon',
    title: 'Secure Transactions',
    description: 'Enjoy safe and secure payments with our escrow system and buyer protection.'
  },
  {
    icon: 'MobileIcon',
    title: 'Mobile Experience',
    description: 'Access the marketplace anywhere with our responsive mobile app experience.'
  }
]

// Check if user has seen onboarding before
onMounted(() => {
  const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
  if (!hasSeenOnboarding) {
    showOnboarding.value = true
  }
})

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const closeOnboarding = () => {
  showOnboarding.value = false
}

const completeOnboarding = () => {
  localStorage.setItem('hasSeenOnboarding', 'true')
  showOnboarding.value = false
}

// Icon components as simple divs with emojis for now
const ShoppingIcon = () => '🛒'
const SellerIcon = () => '🏪'
const SecureIcon = () => '🔒'
const MobileIcon = () => '📱'
</script>

<style scoped>
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.onboarding-modal {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.onboarding-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.onboarding-header h2 {
  margin: 0;
  font-size: var(--font-size-xl);
}

.onboarding-close {
  background: none;
  border: none;
  font-size: var(--font-size-xl);
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);
}

.onboarding-close:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.onboarding-content {
  padding: var(--spacing-xl);
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.onboarding-step {
  margin-bottom: var(--spacing-lg);
}

.step-icon {
  margin-bottom: var(--spacing-md);
}

.onboarding-icon {
  width: 64px;
  height: 64px;
  color: var(--primary-color);
}

.onboarding-step h3 {
  margin: var(--spacing-md) 0 var(--spacing-sm) 0;
  font-size: var(--font-size-lg);
}

.onboarding-step p {
  margin: 0;
  color: var(--text-secondary);
  line-height: var(--line-height-relaxed);
}

.step-indicators {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--border-color);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.indicator.active {
  background-color: var(--primary-color);
  transform: scale(1.2);
}

.onboarding-footer {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

/* Transitions */
.onboarding-enter-active,
.onboarding-leave-active {
  transition: opacity var(--transition-normal);
}

.onboarding-enter-from,
.onboarding-leave-to {
  opacity: 0;
}

.onboarding-enter-active .onboarding-modal,
.onboarding-leave-active .onboarding-modal {
  transition: transform var(--transition-normal);
}

.onboarding-enter-from .onboarding-modal,
.onboarding-leave-to .onboarding-modal {
  transform: scale(0.9) translateY(-20px);
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .onboarding-content {
    padding: var(--spacing-md);
  }

  .onboarding-footer {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .onboarding-icon {
    width: 48px;
    height: 48px;
  }
}
</style>