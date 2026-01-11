<template>
  <div class="shipping-form">
    <div class="shipping-form__header">
      <h2 class="shipping-form__title">Shipping Address</h2>
      <p class="shipping-form__subtitle">Where should we deliver your order?</p>
    </div>

    <form @submit.prevent="handleSubmit" class="shipping-form__form">
      <div class="shipping-form__section">
        <h3 class="shipping-form__section-title">Contact Information</h3>

        <div class="shipping-form__row">
          <div class="shipping-form__field">
            <label class="shipping-form__label">Email Address</label>
            <Input
              v-model="formData.email"
              type="email"
              placeholder="your@email.com"
              :error="errors.email"
              required
            />
          </div>

          <div class="shipping-form__field">
            <label class="shipping-form__label">Phone Number</label>
            <Input
              v-model="formData.phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              :error="errors.phone"
            />
          </div>
        </div>
      </div>

      <div class="shipping-form__section">
        <h3 class="shipping-form__section-title">Shipping Address</h3>

        <div class="shipping-form__field">
          <label class="shipping-form__label">Full Name</label>
          <Input
            v-model="formData.fullName"
            placeholder="John Doe"
            :error="errors.fullName"
            required
          />
        </div>

        <div class="shipping-form__field">
          <label class="shipping-form__label">Country</label>
          <select v-model="formData.country" class="shipping-form__select" required>
            <option value="">Select Country</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="IT">Italy</option>
            <option value="ES">Spain</option>
            <option value="AU">Australia</option>
            <option value="JP">Japan</option>
          </select>
        </div>

        <div class="shipping-form__field">
          <label class="shipping-form__label">Street Address</label>
          <Input
            v-model="formData.address"
            placeholder="123 Main Street"
            :error="errors.address"
            required
          />
        </div>

        <div class="shipping-form__field">
          <label class="shipping-form__label">Apartment, suite, etc. (optional)</label>
          <Input
            v-model="formData.apartment"
            placeholder="Apt 4B"
          />
        </div>

        <div class="shipping-form__row">
          <div class="shipping-form__field">
            <label class="shipping-form__label">City</label>
            <Input
              v-model="formData.city"
              placeholder="New York"
              :error="errors.city"
              required
            />
          </div>

          <div class="shipping-form__field">
            <label class="shipping-form__label">State/Province</label>
            <Input
              v-model="formData.state"
              placeholder="NY"
              :error="errors.state"
              required
            />
          </div>

          <div class="shipping-form__field">
            <label class="shipping-form__label">ZIP/Postal Code</label>
            <Input
              v-model="formData.zipCode"
              placeholder="10001"
              :error="errors.zipCode"
              required
            />
          </div>
        </div>
      </div>

      <div class="shipping-form__section">
        <div class="shipping-form__checkbox-group">
          <label class="shipping-form__checkbox">
            <input
              type="checkbox"
              v-model="formData.saveAddress"
            />
            <span class="shipping-form__checkmark"></span>
            Save this address for future orders
          </label>
        </div>
      </div>

      <div class="shipping-form__actions">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          :loading="loading"
          class="shipping-form__submit"
        >
          Continue to Payment
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import Input from '@/components/Input.vue'
import Button from '@/components/Button.vue'

interface ShippingFormData {
  email: string
  phone: string
  fullName: string
  country: string
  address: string
  apartment: string
  city: string
  state: string
  zipCode: string
  saveAddress: boolean
}

interface Props {
  modelValue: ShippingFormData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: ShippingFormData]
  submit: [data: ShippingFormData]
}>()

const formData = reactive<ShippingFormData>({ ...props.modelValue })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)

// Watch for changes and emit updates
Object.keys(formData).forEach(key => {
  watch(() => (formData as any)[key], () => {
    emit('update:modelValue', { ...formData })
  })
})

const validateForm = (): boolean => {
  // Clear previous errors
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })

  // Email validation
  if (!formData.email) {
    errors.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Please enter a valid email address'
  }

  // Phone validation (optional but format check if provided)
  if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
    errors.phone = 'Please enter a valid phone number'
  }

  // Required field validations
  if (!formData.fullName.trim()) {
    errors.fullName = 'Full name is required'
  }

  if (!formData.country) {
    errors.country = 'Country is required'
  }

  if (!formData.address.trim()) {
    errors.address = 'Street address is required'
  }

  if (!formData.city.trim()) {
    errors.city = 'City is required'
  }

  if (!formData.state.trim()) {
    errors.state = 'State/Province is required'
  }

  if (!formData.zipCode.trim()) {
    errors.zipCode = 'ZIP/Postal code is required'
  }

  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (validateForm()) {
    loading.value = true
    emit('submit', { ...formData })

    // Simulate API call delay
    setTimeout(() => {
      loading.value = false
    }, 1000)
  }
}
</script>

<style scoped>
.shipping-form {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}

.shipping-form__header {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.shipping-form__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.shipping-form__subtitle {
  font-size: var(--font-size-base);
  color: var(--text-muted);
  margin: 0;
}

.shipping-form__section {
  margin-bottom: var(--spacing-xl);
}

.shipping-form__section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-lg);
}

.shipping-form__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.shipping-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.shipping-form__label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-dark);
}

.shipping-form__select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  background: var(--bg-white);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.shipping-form__select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.shipping-form__checkbox-group {
  display: flex;
  align-items: center;
}

.shipping-form__checkbox {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-dark);
}

.shipping-form__checkmark {
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  position: relative;
  background: var(--bg-white);
}

.shipping-form__checkbox input:checked + .shipping-form__checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: bold;
}

.shipping-form__actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.shipping-form__submit {
  min-width: 200px;
}

@media (max-width: 768px) {
  .shipping-form {
    padding: var(--spacing-lg);
  }

  .shipping-form__row {
    grid-template-columns: 1fr;
  }

  .shipping-form__submit {
    width: 100%;
  }
}
</style>