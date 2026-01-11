import { computed } from 'vue'
import { useAuthStore } from '@/stores'
import type { User } from '@/types'

export function useAuth() {
  const authStore = useAuthStore()

  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const loading = computed(() => authStore.loading)

  const login = async (email: string, password: string) => {
    await authStore.login(email, password)
  }

  const logout = () => {
    authStore.logout()
  }

  const updatePreferences = (preferences: Partial<User['preferences']>) => {
    authStore.updatePreferences(preferences)
  }

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updatePreferences
  }
}