<template>
  <Card class="register-form">
    <template #header>
      <h2 class="text-center">{{ translations.register }}</h2>
      <p class="text-center text-muted">{{ translations.createAccount }}</p>
    </template>

    <form @submit.prevent="handleSubmit">
      <div class="form-row">
        <Input
          v-model="form.firstName"
          label="First Name"
          placeholder="Enter your first name"
          :error="errors.firstName"
          required
        />

        <Input
          v-model="form.lastName"
          label="Last Name"
          placeholder="Enter your last name"
          :error="errors.lastName"
          required
        />
      </div>

      <Input
        v-model="form.username"
        label="Username"
        placeholder="Choose a unique username"
        :error="errors.username"
        required
      />

      <Input
        v-model="form.email"
        type="email"
        label="Email Address"
        placeholder="Enter your email"
        :error="errors.email"
        required
      />

      <Input
        v-model="form.phone"
        label="Phone Number"
        placeholder="Enter your phone number"
        :error="errors.phone"
        required
      />

      <Input
        v-model="form.password"
        type="password"
        label="Password"
        placeholder="Create a strong password"
        :error="errors.password"
        :hint="passwordHint"
        required
      />

      <Input
        v-model="form.confirmPassword"
        type="password"
        label="Confirm Password"
        placeholder="Confirm your password"
        :error="errors.confirmPassword"
        required
      />

      <div class="form-group">
        <label class="checkbox-label">
          <input
            v-model="form.acceptTerms"
            type="checkbox"
            class="checkbox"
          />
          I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
        </label>
        <div v-if="errors.acceptTerms" class="error-text">{{ errors.acceptTerms }}</div>
      </div>

      <div class="form-group">
        <label class="radio-group">
          <div class="radio-option">
            <input
              v-model="form.role"
              type="radio"
              value="buyer"
              class="radio"
            />
            <span>I'm a Buyer</span>
          </div>
          <div class="radio-option">
            <input
              v-model="form.role"
              type="radio"
              value="seller"
              class="radio"
            />
            <span>I'm a Seller</span>
          </div>
        </label>
      </div>

      <div class="form-actions">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          :loading="authStore.loading"
          :disabled="!isFormValid"
          class="w-100"
        >
          {{ translations.register }}
        </Button>
      </div>

      <div class="divider">
        <span>or</span>
      </div>

      <div class="social-login">
        <Button
          variant="outline"
          size="lg"
          @click="registerWithGoogle"
          class="social-btn"
        >
          <svg class="social-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <Button
          variant="outline"
          size="lg"
          @click="registerWithFacebook"
          class="social-btn"
        >
          <svg class="social-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Continue with Facebook
        </Button>
      </div>

      <div class="form-footer">
        <p>
          Already have an account?
          <router-link to="/login">Sign in</router-link>
        </p>
      </div>
    </form>
  </Card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { useLanguage } from '@/composables'
import { Button, Input, Card } from '@/components'

const router = useRouter()
const authStore = useAuthStore()
const { translations } = useLanguage()

const form = reactive({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
  role: 'buyer'
})

const errors = reactive({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: ''
})

const passwordHint = computed(() => {
  if (form.password.length === 0) return 'At least 8 characters with numbers and symbols'
  if (form.password.length < 8) return 'Too short - minimum 8 characters'
  if (!/(?=.*[a-z])/.test(form.password)) return 'Add lowercase letter'
  if (!/(?=.*[A-Z])/.test(form.password)) return 'Add uppercase letter'
  if (!/(?=.*\d)/.test(form.password)) return 'Add number'
  if (!/(?=.*[@$!%*?&])/.test(form.password)) return 'Add special character'
  return 'Strong password ✓'
})

const isFormValid = computed(() => {
  return form.firstName &&
         form.lastName &&
         form.username &&
         form.email &&
         form.phone &&
         form.password &&
         form.confirmPassword &&
         form.acceptTerms &&
         form.role &&
         Object.values(errors).every(error => !error)
})

const validateForm = () => {
  // Reset errors
  Object.keys(errors).forEach(key => {
    ;(errors as any)[key] = ''
  })

  // First name validation
  if (!form.firstName.trim()) {
    errors.firstName = 'First name is required'
  }

  // Last name validation
  if (!form.lastName.trim()) {
    errors.lastName = 'Last name is required'
  }

  // Username validation
  if (!form.username.trim()) {
    errors.username = 'Username is required'
  } else if (form.username.length < 3) {
    errors.username = 'Username must be at least 3 characters'
  } else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
    errors.username = 'Username can only contain letters, numbers, and underscores'
  }

  // Email validation
  if (!form.email) {
    errors.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Email is invalid'
  }

  // Phone validation
  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required'
  }

  // Password validation
  if (!form.password) {
    errors.password = 'Password is required'
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password)) {
    errors.password = 'Password must contain uppercase, lowercase, number, and special character'
  }

  // Confirm password validation
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  // Terms validation
  if (!form.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms and conditions'
  }
}

const handleSubmit = async () => {
  validateForm()

  if (!isFormValid.value) return

  try {
    // Call registration API
    const registrationData = {
      username: form.username,
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      role: form.role,
      password: form.password
    }

    // In a real app, this would call the auth API
    console.log('Registering user:', registrationData)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Show success message and redirect to email verification
    router.push('/verify-email?email=' + encodeURIComponent(form.email))

  } catch (error: any) {
    if (error.response?.data?.errors) {
      Object.assign(errors, error.response.data.errors)
    } else {
      errors.email = 'Registration failed. Please try again.'
    }
  }
}

const registerWithGoogle = () => {
  // Implement Google OAuth registration
  console.log('Register with Google')
  window.location.href = '/api/auth/google/register'
}

const registerWithFacebook = () => {
  // Implement Facebook OAuth registration
  console.log('Register with Facebook')
  window.location.href = '/api/auth/facebook/register'
}
</script>

<style scoped>
.register-form {
  max-width: 500px;
  margin: 2rem auto;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  cursor: pointer;
}

.checkbox-label a {
  color: var(--primary-color);
}

.checkbox {
  margin-top: 0.125rem;
  flex-shrink: 0;
}

.radio-group {
  display: flex;
  gap: var(--spacing-lg);
}

.radio-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.radio {
  margin: 0;
}

.error-text {
  color: var(--danger-color);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.form-actions {
  margin-top: var(--spacing-lg);
}

.divider {
  position: relative;
  text-align: center;
  margin: var(--spacing-lg) 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--border-color);
}

.divider span {
  background-color: var(--bg-primary);
  padding: 0 var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.social-login {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.social-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.form-footer {
  text-align: center;
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-sm);
}

.form-footer a {
  color: var(--primary-color);
  font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .radio-group {
    flex-direction: column;
    gap: var(--spacing-md);
  }
}
</style>