<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false
})

defineEmits<{
  click: [event: Event]
}>()

const buttonClasses = computed(() => {
  const classes = ['btn']

  // Variant classes
  classes.push(`btn--${props.variant}`)

  // Size classes
  classes.push(`btn--${props.size}`)

  // State classes
  if (props.disabled || props.loading) {
    classes.push('btn--disabled')
  }

  if (props.loading) {
    classes.push('btn--loading')
  }

  return classes.join(' ')
})
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: inherit;
  font-size: var(--font-size-base);
  font-weight: 500;
  line-height: 1;
  border: 1px solid transparent;
  border-radius: var(--border-radius-md);
  background-color: var(--primary-color);
  color: var(--text-light);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.btn:hover:not(.btn--disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn:active {
  transform: translateY(0);
}

.btn:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Variants */
.btn--secondary {
  background-color: var(--secondary-color);
}

.btn--secondary:hover:not(.btn--disabled) {
  background-color: #5a6268;
}

.btn--success {
  background-color: var(--success-color);
}

.btn--success:hover:not(.btn--disabled) {
  background-color: #218838;
}

.btn--danger {
  background-color: var(--danger-color);
}

.btn--danger:hover:not(.btn--disabled) {
  background-color: #c82333;
}

.btn--outline {
  background-color: transparent;
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn--outline:hover:not(.btn--disabled) {
  background-color: var(--primary-color);
  color: var(--text-light);
}

/* Sizes */
.btn--sm {
  padding: calc(var(--spacing-xs) / 2) var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.btn--lg {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--font-size-lg);
}

/* States */
.btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.btn--loading {
  position: relative;
}

.btn--loading::after {
  content: '';
  width: 1em;
  height: 1em;
  margin-left: var(--spacing-sm);
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>