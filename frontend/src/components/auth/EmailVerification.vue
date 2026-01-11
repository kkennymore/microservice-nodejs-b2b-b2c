<template>
  <Card class="verify-email">
    <template #header>
      <div class="text-center">
        <div class="email-icon">📧</div>
        <h2>{{ translations.verifyEmail }}</h2>
        <p class="text-muted">{{ translations.checkEmail }}</p>
      </div>
    </template>

    <div class="verification-content">
      <div class="email-preview">
        <p>{{ translations.sentTo }} <strong>{{ email }}</strong></p>
        <p>{{ translations.clickLink }}</p>
      </div>

      <div class="resend-section">
        <p class="text-muted">{{ translations.noEmail }}</p>
        <Button
          variant="outline"
          @click="resendVerification"
          :loading="resending"
          :disabled="resendDisabled"
        >
          {{ resendDisabled ? `Resend in ${countdown}s` : translations.resendEmail }}
        </Button>
      </div>

      <div class="change-email">
        <p>
          {{ translations.wrongEmail }}
          <a href="#" @click.prevent="changeEmail">{{ translations.changeEmail }}</a>
        </p>
      </div>
    </div>

    <div class="verify-actions">
      <Button variant="outline" @click="goToLogin">
        {{ translations.backToLogin }}
      </Button>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Card } from '@/components'

const route = useRoute()
const router = useRouter()

const email = ref('')
const resending = ref(false)
const resendDisabled = ref(false)
const countdown = ref(0)

const translations = {
  verifyEmail: 'Verify Your Email',
  checkEmail: 'Check your email and click the verification link',
  sentTo: 'We sent a verification link to',
  clickLink: 'Click the link in the email to verify your account',
  noEmail: "Didn't receive the email?",
  resendEmail: 'Resend Verification Email',
  wrongEmail: 'Wrong email address?',
  changeEmail: 'Change email',
  backToLogin: 'Back to Login'
}

onMounted(() => {
  email.value = route.query.email as string || ''
})

const resendVerification = async () => {
  if (resendDisabled.value) return

  resending.value = true
  try {
    // API call to resend verification
    console.log('Resending verification to:', email.value)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Start countdown
    startCountdown()

  } catch (error) {
    console.error('Resend failed:', error)
  } finally {
    resending.value = false
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

const changeEmail = () => {
  router.push('/register')
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.verify-email {
  max-width: 500px;
  margin: 2rem auto;
}

.email-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
}

.verification-content {
  text-align: center;
}

.email-preview {
  background-color: var(--bg-secondary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
}

.resend-section {
  margin-bottom: var(--spacing-lg);
}

.change-email {
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
}

.change-email a {
  color: var(--primary-color);
  text-decoration: none;
}

.change-email a:hover {
  text-decoration: underline;
}

.verify-actions {
  text-align: center;
}
</style>