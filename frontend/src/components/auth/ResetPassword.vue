<template>
  <Card class="reset-password">
    <template #header>
      <div class="text-center">
        <div class="password-icon">🔒</div>
        <h2>{{ translations.resetPassword }}</h2>
        <p class="text-muted">{{ translations.newPassword }}</p>
      </div>
    </template>

    <form @submit.prevent="handleSubmit">
      <Input
        v-model="form.password"
        type="password"
        label="New Password"
        placeholder="Enter new password"
        :error="errors.password"
        :hint="passwordHint"
        required
      />

      <Input
        v-model="form.confirmPassword"
        type="password"
        label="Confirm Password"
        placeholder="Confirm new password"
        :error="errors.confirmPassword"
        required
      />

      <div class="password-requirements">
        <h4>Password Requirements:</h4>
        <ul>
          <li :class="{ met: hasMinLength }">At least 8 characters</li>
          <li :class="{ met: hasUppercase }">One uppercase letter</li>
          <li :class="{ met: hasLowercase }">One lowercase letter</li>
          <li :class="{ met: hasNumber }">One number</li>
          <li :class="{ met: hasSpecialChar }">One special character</li>
        </ul>
      </div>

      <div class="form-actions">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          :loading="loading"
          :disabled="!isFormValid"
          class="w-100"
        >
          {{ translations.resetPassword }}
        </Button>
      </div>
    </form>

    <div class="reset-footer">
      <router-link to="/login">{{ translations.backToLogin }}</router-link>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Input, Card } from '@/components'

const route = useRoute()
const router = useRouter()

const form = reactive({
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const token = ref('')

const translations = {
  resetPassword: 'Reset Password',
  newPassword: 'Enter your new password',
  backToLogin: 'Back to Login'
}

const passwordHint = computed(() => {
  if (form.password.length === 0) return 'At least 8 characters with numbers and symbols'
  if (form.password.length < 8) return 'Too short - minimum 8 characters'
  if (!/(?=.*[a-z])/.test(form.password)) return 'Add lowercase letter'
  if (!/(?=.*[A-Z])/.test(form.password)) return 'Add uppercase letter'
  if (!/(?=.*\d)/.test(form.password)) return 'Add number'
  if (!/(?=.*[@$!%*?&])/.test(form.password)) return 'Add special character'
  return 'Strong password ✓'
})

const hasMinLength = computed(() => form.password.length >= 8)
const hasUppercase = computed(() => /(?=.*[A-Z])/.test(form.password))
const hasLowercase = computed(() => /(?=.*[a-z])/.test(form.password))
const hasNumber = computed(() => /(?=.*\d)/.test(form.password))
const hasSpecialChar = computed(() => /(?=.*[@$!%*?&])/.test(form.password))

const isFormValid = computed(() => {
  return form.password &&
         form.confirmPassword &&
         hasMinLength.value &&
         hasUppercase.value &&
         hasLowercase.value &&
         hasNumber.value &&
         hasSpecialChar.value &&
         form.password === form.confirmPassword &&
         !errors.password &&
         !errors.confirmPassword
})

onMounted(() => {
  token.value = route.query.token as string || ''

  if (!token.value) {
    // Invalid or missing token
    router.push('/forgot-password')
  }
})

const validateForm = () => {
  errors.password = ''
  errors.confirmPassword = ''

  if (!form.password) {
    errors.password = 'Password is required'
  } else if (!isFormValid.value) {
    errors.password = 'Password does not meet requirements'
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }
}

const handleSubmit = async () => {
  validateForm()

  if (!isFormValid.value || !token.value) return

  loading.value = true
  try {
    // API call to reset password
    console.log('Resetting password with token:', token.value)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Show success message and redirect to login
    router.push('/login?message=password-reset-success')

  } catch (error: any) {
    if (error.response?.data?.message) {
      errors.password = error.response.data.message
    } else {
      errors.password = 'Failed to reset password. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-password {
  max-width: 400px;
  margin: 2rem auto;
}

.password-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
}

.password-requirements {
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.password-requirements h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.password-requirements ul {
  margin: 0;
  padding-left: var(--spacing-md);
}

.password-requirements li {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: var(--spacing-xs);
}

.password-requirements li.met {
  color: var(--success-color);
}

.password-requirements li.met::before {
  content: '✓ ';
  font-weight: bold;
}

.form-actions {
  margin-top: var(--spacing-lg);
}

.reset-footer {
  text-align: center;
  margin-top: var(--spacing-lg);
}

.reset-footer a {
  color: var(--primary-color);
  text-decoration: none;
}

.reset-footer a:hover {
  text-decoration: underline;
}
</style>