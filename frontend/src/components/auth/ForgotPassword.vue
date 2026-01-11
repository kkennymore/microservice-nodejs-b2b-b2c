<template>
  <Card class="forgot-password">
    <template #header>
      <div class="text-center">
        <div class="password-icon">🔑</div>
        <h2>{{ translations.forgotPassword }}</h2>
        <p class="text-muted">{{ translations.resetInstructions }}</p>
      </div>
    </template>

    <form @submit.prevent="handleSubmit" v-if="!emailSent">
      <Input
        v-model="form.email"
        type="email"
        label="Email Address"
        placeholder="Enter your email address"
        :error="errors.email"
        required
      />

      <div class="form-actions">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          :loading="loading"
          class="w-100"
        >
          {{ translations.sendResetLink }}
        </Button>
      </div>
    </form>

    <div v-else class="success-message">
      <div class="success-icon">✅</div>
      <h3>{{ translations.checkEmail }}</h3>
      <p>{{ translations.resetLinkSent }}</p>
      <p class="email-note">{{ translations.sentTo }} <strong>{{ form.email }}</strong></p>

      <div class="resend-section">
        <p class="text-muted">{{ translations.noEmail }}</p>
        <Button
          variant="outline"
          @click="handleSubmit"
          :loading="loading"
          :disabled="resendDisabled"
        >
          {{ resendDisabled ? `Resend in ${countdown}s` : translations.resendEmail }}
        </Button>
      </div>
    </div>

    <div class="forgot-footer">
      <router-link to="/login">{{ translations.backToLogin }}</router-link>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Input, Card } from '@/components'

const router = useRouter()

const form = reactive({
  email: ''
})

const errors = reactive({
  email: ''
})

const loading = ref(false)
const emailSent = ref(false)
const resendDisabled = ref(false)
const countdown = ref(0)

const translations = {
  forgotPassword: 'Forgot Password',
  resetInstructions: 'Enter your email address and we\'ll send you a link to reset your password',
  sendResetLink: 'Send Reset Link',
  checkEmail: 'Check Your Email',
  resetLinkSent: 'We\'ve sent a password reset link to your email address',
  sentTo: 'Sent to',
  noEmail: "Didn't receive the email?",
  resendEmail: 'Resend Email',
  backToLogin: 'Back to Login'
}

const validateForm = () => {
  errors.email = ''

  if (!form.email) {
    errors.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Email is invalid'
  }
}

const handleSubmit = async () => {
  validateForm()

  if (errors.email) return

  loading.value = true
  try {
    // API call to send reset email
    console.log('Sending reset email to:', form.email)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    emailSent.value = true
    startCountdown()

  } catch (error: any) {
    if (error.response?.data?.message) {
      errors.email = error.response.data.message
    } else {
      errors.email = 'Failed to send reset email. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const startCountdown = () => {
  resendDisabled.value = true
  countdown.value = 60

  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      resendDisabled.value = false
      clearInterval(timer)
    }
  }, 1000)
}
</script>

<style scoped>
.forgot-password {
  max-width: 400px;
  margin: 2rem auto;
}

.password-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
}

.success-message {
  text-align: center;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
}

.success-message h3 {
  margin-bottom: var(--spacing-sm);
}

.email-note {
  background-color: var(--bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin: var(--spacing-md) 0;
}

.resend-section {
  margin-top: var(--spacing-lg);
}

.forgot-footer {
  text-align: center;
  margin-top: var(--spacing-lg);
}

.forgot-footer a {
  color: var(--primary-color);
  text-decoration: none;
}

.forgot-footer a:hover {
  text-decoration: underline;
}
</style>