<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="card__header">
      <slot name="header" />
    </div>
    <div class="card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  size?: 'sm' | 'md' | 'lg'
  hover?: boolean
  padding?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  hover: false,
  padding: true
})

const cardClasses = computed(() => {
  const classes = ['card']

  classes.push(`card--${props.variant}`)
  classes.push(`card--${props.size}`)

  if (props.hover) {
    classes.push('card--hover')
  }

  if (!props.padding) {
    classes.push('card--no-padding')
  }

  return classes.join(' ')
})
</script>

<style scoped>
.card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.card--default {
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.card--elevated {
  box-shadow: var(--shadow-lg);
}

.card--outlined {
  border: 2px solid var(--border-color);
}

.card--filled {
  background-color: var(--bg-secondary);
}

.card--hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.card--sm {
  border-radius: var(--border-radius-md);
}

.card--lg {
  border-radius: var(--border-radius-xl);
}

.card--no-padding .card__body {
  padding: 0;
}

.card__header {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  font-weight: 600;
  color: var(--text-primary);
}

.card__body {
  padding: var(--spacing-lg);
}

.card__footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .card__header,
  .card__body,
  .card__footer {
    padding: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .card__header,
  .card__body,
  .card__footer {
    padding: var(--spacing-sm);
  }
}
</style>