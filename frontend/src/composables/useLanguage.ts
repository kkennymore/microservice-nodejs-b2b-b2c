import { ref, computed, readonly, onMounted } from 'vue'
import { useAuthStore } from '@/stores'

export const useLanguage = () => {
  const authStore = useAuthStore()
  const supportedLanguages = ['en', 'fr', 'zh'] as const
  type Language = typeof supportedLanguages[number]

  const currentLanguage = ref<Language>('en')

  const detectLanguage = (): Language => {
    // Check user's browser language
    const browserLang = navigator.language.split('-')[0] as Language

    // Check if browser language is supported
    if (supportedLanguages.includes(browserLang)) {
      return browserLang
    }

    // Check localStorage
    const storedLang = localStorage.getItem('language') as Language
    if (storedLang && supportedLanguages.includes(storedLang)) {
      return storedLang
    }

    // Check user's preference from auth store
    if (authStore.user?.preferences?.language) {
      return authStore.user.preferences.language
    }

    // Default to English
    return 'en'
  }

  const setLanguage = (lang: Language) => {
    currentLanguage.value = lang
    localStorage.setItem('language', lang)

    // Update auth store if user is logged in
    if (authStore.isAuthenticated) {
      authStore.updatePreferences({ language: lang })
    }

    // Update document language
    document.documentElement.lang = lang

    // Here you would typically load language files
    // For now, just log the change
    console.log('Language changed to:', lang)
  }

  const translations = computed(() => {
    // This would be replaced with actual i18n library
    const translations = {
      en: {
        welcome: 'Welcome',
        search: 'Search',
        cart: 'Cart',
        login: 'Login',
        logout: 'Logout'
      },
      fr: {
        welcome: 'Bienvenue',
        search: 'Rechercher',
        cart: 'Panier',
        login: 'Connexion',
        logout: 'Déconnexion'
      },
      zh: {
        welcome: '欢迎',
        search: '搜索',
        cart: '购物车',
        login: '登录',
        logout: '登出'
      }
    }
    return translations[currentLanguage.value] || translations.en
  })

  onMounted(() => {
    currentLanguage.value = detectLanguage()
    document.documentElement.lang = currentLanguage.value
  })

  return {
    currentLanguage: readonly(currentLanguage),
    supportedLanguages,
    setLanguage,
    translations
  }
}