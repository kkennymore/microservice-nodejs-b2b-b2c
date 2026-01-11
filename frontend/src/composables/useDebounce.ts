import { ref, watch, type Ref } from 'vue'

export function useDebounce<T>(value: Ref<T>, delay: number) {
  const debouncedValue = ref<T>(value.value)

  let timeoutId: number | null = null

  watch(value, (newValue) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = window.setTimeout(() => {
      debouncedValue.value = newValue
    }, delay)
  })

  return {
    debouncedValue
  }
}