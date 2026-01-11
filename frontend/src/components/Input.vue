<template>
  <div class="input">
    <label v-if="label" :class="labelClasses" :for="inputId">
      {{ label }}
      <span v-if="required" class="input__required">*</span>
    </label>
    <div class="input__wrapper">
      <input
        :id="inputId"
        :class="inputClasses"
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
      <div v-if="icon" class="input__icon">
        <slot name="icon" />
      </div>
    </div>
    <div v-if="error" class="input__error">
      {{ error }}
    </div>
    <div v-if="hint && !error" class="input__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string | number
  type?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  error?: string
  hint?: string
  icon?: boolean
  maxlength?: number
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
  icon: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: Event]
  focus: [event: Event]
}>()

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)

const inputClasses = computed(() => {
  const classes = ['input__field']

  if (props.size) {
    classes.push(`input__field--${props.size}`)
  }

  if (props.error) {
    classes.push('input__field--error')
  }

  if (props.disabled) {
    classes.push('input__field--disabled')
  }

  if (props.icon) {
    classes.push('input__field--with-icon')
  }

  return classes.join(' ')
})

const labelClasses = computed(() => {
  const classes = ['input__label']

  if (props.size) {
    classes.push(`input__label--${props.size}`)
  }

  if (props.error) {
    classes.push('input__label--error')
  }

  return classes.join(' ')
})
</script>

<style scoped>
.input {
  margin-bottom: var(--spacing-md);
}

.input__label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.input__label--error {
  color: var(--danger-color);
}

.input__wrapper {
  position: relative;
}

.input__field {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: inherit;
  font-size: var(--font-size-base);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.input__field:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.input__field--error {
  border-color: var(--danger-color);
}

.input__field--error:focus {
  border-color: var(--danger-color);
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

.input__field--disabled {
  background-color: var(--bg-secondary);
  color: var(--text-muted);
  cursor: not-allowed;
}

.input__field--with-icon {
  padding-right: calc(var(--spacing-md) + 2rem);
}

.input__field--sm {
  padding: calc(var(--spacing-xs) / 2) var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.input__field--lg {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-lg);
}

.input__icon {
  position: absolute;
  top: 50%;
  right: var(--spacing-sm);
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.input__required {
  color: var(--danger-color);
}

.input__error {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--danger-color);
}

.input__hint {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}
</style>