<template>
  <div class="checkout-steps">
    <div class="checkout-steps__container">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        :class="[
          'checkout-steps__step',
          {
            'checkout-steps__step--active': currentStep === step.id,
            'checkout-steps__step--completed': completedSteps.includes(step.id)
          }
        ]"
      >
        <div class="checkout-steps__step-circle">
          <span v-if="completedSteps.includes(step.id)" class="checkout-steps__check">
            ✓
          </span>
          <span v-else class="checkout-steps__number">{{ index + 1 }}</span>
        </div>

        <div class="checkout-steps__step-content">
          <h3 class="checkout-steps__step-title">{{ step.title }}</h3>
          <p class="checkout-steps__step-description">{{ step.description }}</p>
        </div>

        <div v-if="index < steps.length - 1" class="checkout-steps__connector"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentStep: string
  completedSteps: string[]
}

defineProps<Props>()

const steps = [
  {
    id: 'shipping',
    title: 'Shipping',
    description: 'Delivery address'
  },
  {
    id: 'payment',
    title: 'Payment',
    description: 'Payment method'
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Confirm order'
  }
]
</script>

<style scoped>
.checkout-steps {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-xl);
}

.checkout-steps__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.checkout-steps__step {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex: 1;
  position: relative;
}

.checkout-steps__step-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-light);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.checkout-steps__step--active .checkout-steps__step-circle {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-light);
}

.checkout-steps__step--completed .checkout-steps__step-circle {
  background: var(--success-color);
  border-color: var(--success-color);
  color: var(--text-light);
}

.checkout-steps__check,
.checkout-steps__number {
  font-size: var(--font-size-base);
  font-weight: 600;
}

.checkout-steps__step-content {
  flex: 1;
  min-width: 0;
}

.checkout-steps__step-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-dark);
  margin: 0 0 var(--spacing-xs) 0;
}

.checkout-steps__step-description {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin: 0;
}

.checkout-steps__step--active .checkout-steps__step-title,
.checkout-steps__step--completed .checkout-steps__step-title {
  color: var(--primary-color);
}

.checkout-steps__connector {
  position: absolute;
  right: -25px;
  top: 24px;
  width: 50px;
  height: 2px;
  background: var(--border-color);
  z-index: 1;
}

.checkout-steps__step--completed + .checkout-steps__step .checkout-steps__connector,
.checkout-steps__step--active + .checkout-steps__step .checkout-steps__connector {
  background: var(--primary-color);
}

@media (max-width: 768px) {
  .checkout-steps__container {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .checkout-steps__step {
    width: 100%;
    justify-content: flex-start;
  }

  .checkout-steps__connector {
    display: none;
  }

  .checkout-steps__step-content {
    flex: 1;
  }
}
</style>