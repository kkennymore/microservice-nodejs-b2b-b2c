<template>
  <Card class="login-form">
    <template #header>
      <h2 class="text-center">{{ translations.login }}</h2>
    </template>

    <form @submit.prevent="handleSubmit">
      <Input
        v-model="form.email"
        type="email"
        label="Email"
        :error="errors.email"
        required
      />

      <Input
        v-model="form.password"
        type="password"
        label="Password"
        :error="errors.password"
        required
      />

      <div class="form-group">
        <label class="checkbox-label">
          <input
            v-model="form.rememberMe"
            type="checkbox"
            class="checkbox"
          />
          Remember me
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
          {{ translations.login }}
        </Button>
      </div>

      <div class="divider">
        <span>or</span>
      </div>

      <div class="social-login">
        <Button
          variant="outline"
          size="lg"
          @click="loginWithGoogle"
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
          @click="loginWithFacebook"
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
          <router-link to="/forgot-password">Forgot password?</router-link>
        </p>
        <p>
          Don't have an account?
          <router-link to="/register">Sign up</router-link>
        </p>
      </div>
    </form>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { useLanguage } from '@/composables'
import { Button, Input, Card } from '@/components'

const router = useRouter()
const authStore = useAuthStore()
const { translations } = useLanguage()

const form = reactive({
  email: '',
  password: '',
  rememberMe: false
})

const errors = reactive({
  email: '',
  password: ''
})

const isFormValid = computed(() => {
  return form.email && form.password && !errors.email && !errors.password
})

const validateForm = () => {
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Email is invalid'
  }

  if (!form.password) {
    errors.password = 'Password is required'
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }
}

const handleSubmit = async () => {
  validateForm()

  if (!isFormValid.value) return

  try {
    await authStore.login(form.email, form.password)
    router.push('/')
  } catch (error) {
    errors.password = 'Invalid email or password'
  }
}

const loginWithGoogle = () => {
  // Implement Google OAuth
  console.log('Login with Google')
}

const loginWithFacebook = () => {
  // Implement Facebook OAuth
  console.log('Login with Facebook')
}
</script>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 2rem auto;
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.checkbox {
  width: 1rem;
  height: 1rem;
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
</style>