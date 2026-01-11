<template>
  <div class="payment-form">
    <div class="payment-form__header">
      <h2 class="payment-form__title">Payment Method</h2>
      <p class="payment-form__subtitle">Choose how you'd like to pay for your order</p>
    </div>

    <div class="payment-form__methods">
      <!-- Payment Method Selection -->
      <div class="payment-form__method-selection">
        <div
          v-for="method in paymentMethods"
          :key="method.id"
          :class="[
            'payment-form__method-option',
            { 'payment-form__method-option--selected': selectedMethod === method.id }
          ]"
          @click="selectedMethod = method.id"
        >
          <div class="payment-form__method-icon">
            <component :is="method.icon" />
          </div>
          <div class="payment-form__method-info">
            <h4 class="payment-form__method-name">{{ method.name }}</h4>
            <p class="payment-form__method-description">{{ method.description }}</p>
          </div>
          <div class="payment-form__method-radio">
            <div v-if="selectedMethod === method.id" class="payment-form__radio-selected">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
                <circle cx="12" cy="12" r="4" fill="white"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Credit Card Form -->
      <div v-if="selectedMethod === 'card'" class="payment-form__card-form">
        <div class="payment-form__form-section">
          <h3 class="payment-form__section-title">Card Information</h3>

          <div class="payment-form__field">
            <label class="payment-form__label">Card Number</label>
            <div class="payment-form__card-input">
              <Input
                v-model="cardData.number"
                placeholder="1234 5678 9012 3456"
                :error="errors.cardNumber"
                @input="formatCardNumber"
                maxlength="19"
              />
              <div class="payment-form__card-icons">
                <svg class="payment-form__card-icon" viewBox="0 0 24 24" fill="currentColor">
                  <rect width="24" height="24" rx="4"/>
                  <path d="M4 6h16v2H4z" fill="white"/>
                  <path d="M4 10h16v2H4z" fill="white"/>
                  <path d="M4 14h8v2H4z" fill="white"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="payment-form__row">
            <div class="payment-form__field">
              <label class="payment-form__label">Expiry Date</label>
              <Input
                v-model="cardData.expiry"
                placeholder="MM/YY"
                :error="errors.expiry"
                @input="formatExpiry"
                maxlength="5"
              />
            </div>

            <div class="payment-form__field">
              <label class="payment-form__label">CVV</label>
              <Input
                v-model="cardData.cvv"
                placeholder="123"
                type="password"
                :error="errors.cvv"
                maxlength="4"
              />
            </div>
          </div>
        </div>

        <div class="payment-form__form-section">
          <h3 class="payment-form__section-title">Billing Address</h3>

          <div class="payment-form__checkbox-group">
            <label class="payment-form__checkbox">
              <input
                type="checkbox"
                v-model="useShippingAddress"
              />
              <span class="payment-form__checkmark"></span>
              Same as shipping address
            </label>
          </div>

          <div v-if="!useShippingAddress" class="payment-form__billing-fields">
            <div class="payment-form__field">
              <label class="payment-form__label">Billing Address</label>
              <Input
                v-model="cardData.billingAddress"
                placeholder="123 Main Street"
                :error="errors.billingAddress"
              />
            </div>

            <div class="payment-form__row">
              <div class="payment-form__field">
                <label class="payment-form__label">City</label>
                <Input
                  v-model="cardData.billingCity"
                  placeholder="New York"
                  :error="errors.billingCity"
                />
              </div>

              <div class="payment-form__field">
                <label class="payment-form__label">ZIP Code</label>
                <Input
                  v-model="cardData.billingZip"
                  placeholder="10001"
                  :error="errors.billingZip"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="payment-form__form-section">
          <div class="payment-form__checkbox-group">
            <label class="payment-form__checkbox">
              <input
                type="checkbox"
                v-model="saveCard"
              />
              <span class="payment-form__checkmark"></span>
              Save this card for future purchases
            </label>
          </div>
        </div>
      </div>

      <!-- PayPal -->
      <div v-if="selectedMethod === 'paypal'" class="payment-form__paypal-section">
        <div class="payment-form__paypal-notice">
          <svg class="payment-form__paypal-logo" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.23 1.527-.727 2.51-1.446 3.287-.76.817-1.53 1.31-2.36 1.31H9.38c-.21 0-.375.166-.318.37l.684 2.52c.07.204.384.37.595.37h2.61c2.483 0 4.43.558 5.48 1.634.906.95 1.222 2.15.882 3.738-.283 1.303-.863 2.224-1.616 2.744-.828.57-1.704.83-2.546.83h-2.52c-.636 0-1.063-.57-1.04-1.2l.388-13.077c.01-.07.044-.13.085-.13h3.72c.66 0 1.25-.054 1.772-.17.404-.09.65-.246.65-.354 0-.05-.043-.08-.104-.08H9.74c-.564 0-1.01.45-1.05 1.005l-.276 9.33c-.007.21-.18.375-.39.375H6.29c-.21 0-.39-.165-.39-.375l-.406-13.59c-.01-.21-.18-.375-.39-.375H.99c-.21 0-.39.165-.39.375L.21 20.6c-.007.21.17.375.38.375h5.51c.21 0 .39-.165.39-.375l.303-10.235c.007-.21.18-.375.39-.375h3.72c.66 0 1.25-.054 1.772-.17.404-.09.65-.246.65-.354 0-.05-.043-.08-.104-.08H7.077c-.564 0-1.01.45-1.05 1.005l-.276 9.33c-.007.21-.18.375-.39.375H3.29c-.21 0-.39-.165-.39-.375l-.406-13.59c-.01-.21-.18-.375-.39-.375H.49c-.21 0-.39.165-.39.375L0 20.85c-.007.21.17.375.38.375h5.51c.21 0 .39-.165.39-.375l.303-10.235z"/>
          </svg>
          <p>You will be redirected to PayPal to complete your payment securely.</p>
        </div>
      </div>

      <!-- Apple Pay / Google Pay -->
      <div v-if="selectedMethod === 'digital'" class="payment-form__digital-section">
        <div class="payment-form__digital-notice">
          <div class="payment-form__digital-options">
            <button class="payment-form__digital-btn payment-form__digital-btn--apple">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Pay
            </button>
            <button class="payment-form__digital-btn payment-form__digital-btn--google">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Pay
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="payment-form__actions">
      <Button
        variant="outline"
        size="lg"
        @click="$emit('back')"
        class="payment-form__back-btn"
      >
        Back to Shipping
      </Button>

      <Button
        variant="primary"
        size="lg"
        @click="handleSubmit"
        :loading="processing"
        class="payment-form__continue-btn"
      >
        {{ selectedMethod === 'paypal' || selectedMethod === 'digital' ? 'Continue to Review' : 'Review Order' }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, h } from 'vue'
import Input from '@/components/Input.vue'
import Button from '@/components/Button.vue'

// Icon components
const CreditCardIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, [
  h('rect', { width: '24', height: '24', rx: '4' }),
  h('path', { d: 'M4 6h16v2H4z', fill: 'white' }),
  h('path', { d: 'M4 10h16v2H4z', fill: 'white' }),
  h('path', { d: 'M4 14h8v2H4z', fill: 'white' })
])

const PayPalIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, [
  h('path', { d: 'M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.23 1.527-.727 2.51-1.446 3.287-.76.817-1.53 1.31-2.36 1.31H9.38c-.21 0-.375.166-.318.37l.684 2.52c.07.204.384.37.595.37h2.61c2.483 0 4.43.558 5.48 1.634.906.95 1.222 2.15.882 3.738-.283 1.303-.863 2.224-1.616 2.744-.828.57-1.704.83-2.546.83h-2.52c-.636 0-1.063-.57-1.04-1.2l.388-13.077c.01-.07.044-.13.085-.13h3.72c.66 0 1.25-.054 1.772-.17.404-.09.65-.246.65-.354 0-.05-.043-.08-.104-.08H9.74c-.564 0-1.01.45-1.05 1.005l-.276 9.33c-.007.21-.18.375-.39.375H6.29c-.21 0-.39-.165-.39-.375l-.406-13.59c-.01-.21-.18-.375-.39-.375H.99c-.21 0-.39.165-.39.375L.21 20.6c-.007.21.17.375.38.375h5.51c.21 0 .39-.165.39-.375l.303-10.235c.007-.21.18-.375.39-.375h3.72c.66 0 1.25-.054 1.772-.17.404-.09.65-.246.65-.354 0-.05-.043-.08-.104-.08H7.077c-.564 0-1.01.45-1.05 1.005l-.276 9.33c-.007.21-.18.375-.39.375H3.29c-.21 0-.39-.165-.39-.375l-.406-13.59c-.01-.21-.18-.375-.39-.375H.49c-.21 0-.39.165-.39.375L0 20.85c-.007.21.17.375.38.375h5.51c.21 0 .39-.165.39-.375l.303-10.235z' })
])

const DigitalWalletIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor' }, [
  h('path', { d: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' }),
  h('path', { d: 'M4 9h16v2H4z', fill: 'white' })
])

interface PaymentMethod {
  id: string
  name: string
  description: string
  icon: any
}

interface CardData {
  number: string
  expiry: string
  cvv: string
  billingAddress: string
  billingCity: string
  billingZip: string
}

interface Props {
  shippingAddress: any
  modelValue: {
    method: string
    cardData: CardData
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
  submit: [data: any]
  back: []
}>()

const paymentMethods: PaymentMethod[] = [
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, American Express',
    icon: CreditCardIcon
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pay with your PayPal account',
    icon: PayPalIcon
  },
  {
    id: 'digital',
    name: 'Apple Pay / Google Pay',
    description: 'Quick and secure digital wallet payment',
    icon: DigitalWalletIcon
  }
]

const selectedMethod = ref('card')
const useShippingAddress = ref(true)
const saveCard = ref(false)
const processing = ref(false)

const cardData = reactive<CardData>({
  number: '',
  expiry: '',
  cvv: '',
  billingAddress: '',
  billingCity: '',
  billingZip: ''
})

const errors = reactive<Record<string, string>>({})

// Watch for changes and emit updates
watch([selectedMethod, cardData], () => {
  emit('update:modelValue', {
    method: selectedMethod.value,
    cardData: { ...cardData }
  })
}, { deep: true })

const formatCardNumber = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
  let formattedValue = value.replace(/(.{4})/g, '$1 ').trim()
  target.value = formattedValue
  cardData.number = formattedValue
}

const formatExpiry = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value.replace(/\D/g, '')
  if (value.length >= 2) {
    value = value.substring(0, 2) + '/' + value.substring(2, 4)
  }
  target.value = value
  cardData.expiry = value
}

const validateCardForm = (): boolean => {
  // Clear previous errors
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })

  // Card number validation
  const cleanNumber = cardData.number.replace(/\s+/g, '')
  if (!cleanNumber) {
    errors.cardNumber = 'Card number is required'
  } else if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    errors.cardNumber = 'Please enter a valid card number'
  }

  // Expiry validation
  if (!cardData.expiry) {
    errors.expiry = 'Expiry date is required'
  } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardData.expiry)) {
    errors.expiry = 'Please enter a valid expiry date (MM/YY)'
  }

  // CVV validation
  if (!cardData.cvv) {
    errors.cvv = 'CVV is required'
  } else if (cardData.cvv.length < 3 || cardData.cvv.length > 4) {
    errors.cvv = 'Please enter a valid CVV'
  }

  // Billing address validation (if not using shipping address)
  if (!useShippingAddress.value) {
    if (!cardData.billingAddress.trim()) {
      errors.billingAddress = 'Billing address is required'
    }
    if (!cardData.billingCity.trim()) {
      errors.billingCity = 'Billing city is required'
    }
    if (!cardData.billingZip.trim()) {
      errors.billingZip = 'Billing ZIP code is required'
    }
  }

  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (selectedMethod.value === 'card' && !validateCardForm()) {
    return
  }

  processing.value = true

  // Simulate payment processing
  setTimeout(() => {
    emit('submit', {
      method: selectedMethod.value,
      cardData: selectedMethod.value === 'card' ? cardData : null,
      useShippingAddress: useShippingAddress.value,
      saveCard: saveCard.value
    })
    processing.value = false
  }, 1500)
}
</script>

<style scoped>
.payment-form {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}

.payment-form__header {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.payment-form__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.payment-form__subtitle {
  font-size: var(--font-size-base);
  color: var(--text-muted);
  margin: 0;
}

.payment-form__methods {
  margin-bottom: var(--spacing-xl);
}

.payment-form__method-selection {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.payment-form__method-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.payment-form__method-option:hover {
  border-color: var(--primary-color);
  background: rgba(0, 123, 255, 0.05);
}

.payment-form__method-option--selected {
  border-color: var(--primary-color);
  background: rgba(0, 123, 255, 0.1);
}

.payment-form__method-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-light);
  border-radius: var(--border-radius-md);
  color: var(--text-dark);
}

.payment-form__method-info {
  flex: 1;
}

.payment-form__method-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-xs);
}

.payment-form__method-description {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin: 0;
}

.payment-form__method-radio {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.payment-form__card-form,
.payment-form__paypal-section,
.payment-form__digital-section {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
}

.payment-form__form-section {
  margin-bottom: var(--spacing-xl);
}

.payment-form__section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-md);
}

.payment-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.payment-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.payment-form__label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-dark);
}

.payment-form__card-input {
  position: relative;
}

.payment-form__card-icons {
  position: absolute;
  right: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
}

.payment-form__card-icon {
  width: 24px;
  height: 16px;
  color: var(--text-muted);
}

.payment-form__checkbox-group {
  margin-bottom: var(--spacing-md);
}

.payment-form__checkbox {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-dark);
}

.payment-form__checkmark {
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  position: relative;
  background: var(--bg-white);
}

.payment-form__checkbox input:checked + .payment-form__checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: bold;
}

.payment-form__billing-fields {
  margin-top: var(--spacing-md);
}

.payment-form__paypal-notice,
.payment-form__digital-notice {
  text-align: center;
}

.payment-form__paypal-logo {
  width: 80px;
  height: 24px;
  color: #0070ba;
  margin-bottom: var(--spacing-md);
}

.payment-form__digital-options {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-top: var(--spacing-md);
}

.payment-form__digital-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: var(--bg-white);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.payment-form__digital-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.payment-form__digital-btn--apple {
  color: #000;
}

.payment-form__digital-btn--google {
  color: #4285f4;
}

.payment-form__actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: space-between;
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.payment-form__back-btn,
.payment-form__continue-btn {
  flex: 1;
  max-width: 200px;
}

@media (max-width: 768px) {
  .payment-form {
    padding: var(--spacing-lg);
  }

  .payment-form__method-option {
    padding: var(--spacing-sm);
  }

  .payment-form__method-icon {
    width: 40px;
    height: 40px;
  }

  .payment-form__row {
    grid-template-columns: 1fr;
  }

  .payment-form__actions {
    flex-direction: column;
  }

  .payment-form__back-btn,
  .payment-form__continue-btn {
    max-width: none;
  }

  .payment-form__digital-options {
    flex-direction: column;
    align-items: center;
  }
}
</style>