<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal" @click.self="$emit('close')">
        <div class="modal__overlay" @click="$emit('close')"></div>
        <div class="modal__content" :class="contentClasses" @click.stop>
          <div v-if="$slots.header || title" class="modal__header">
            <slot name="header">
              <h3 class="modal__title">{{ title }}</h3>
            </slot>
            <button
              v-if="closable"
              class="modal__close"
              @click="$emit('close')"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          <div class="modal__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isOpen: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
  centered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  size: 'md',
  closable: true,
  centered: true
})

defineEmits<{
  close: []
}>()

const contentClasses = computed(() => {
  const classes = ['modal__content']

  classes.push(`modal__content--${props.size}`)

  if (props.centered) {
    classes.push('modal__content--centered')
  }

  return classes.join(' ')
})
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.modal__content {
  position: relative;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  max-height: 90vh;
  overflow: hidden;
  z-index: 1001;
  max-width: 90vw;
}

.modal__content--centered {
  margin: auto;
}

.modal__content--sm {
  width: 400px;
}

.modal__content--md {
  width: 600px;
}

.modal__content--lg {
  width: 800px;
}

.modal__content--xl {
  width: 1000px;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}

.modal__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.modal__close {
  background: none;
  border: none;
  font-size: var(--font-size-xl);
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);
}

.modal__close:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.modal__body {
  padding: var(--spacing-lg);
  overflow-y: auto;
  max-height: calc(90vh - 140px);
}

.modal__footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal__content,
.modal-leave-active .modal__content {
  transition: transform var(--transition-normal);
}

.modal-enter-from .modal__content,
.modal-leave-to .modal__content {
  transform: scale(0.9) translateY(-20px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modal__content--md,
  .modal__content--lg,
  .modal__content--xl {
    width: 95vw;
    max-width: none;
  }

  .modal__header,
  .modal__body,
  .modal__footer {
    padding: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .modal__content {
    width: 100vw;
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }

  .modal__body {
    flex: 1;
    max-height: none;
  }
}
</style>