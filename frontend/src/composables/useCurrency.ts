import { ref, computed, readonly, onMounted } from 'vue'
import { useAuthStore } from '@/stores'

interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
}

export const useCurrency = () => {
  const authStore = useAuthStore()

  const currencies: Currency[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' }
  ]

  const currentCurrency = ref<Currency>(currencies[0]) // Default to USD
  const exchangeRates = ref<Record<string, number>>({})
  const loading = ref(false)

  const detectCurrency = (): Currency => {
    // Check localStorage
    const storedCode = localStorage.getItem('currency')
    if (storedCode) {
      const storedCurrency = currencies.find(c => c.code === storedCode)
      if (storedCurrency) return storedCurrency
    }

    // Check user's preference from auth store
    if (authStore.user?.preferences?.currency) {
      const userCurrency = currencies.find(c => c.code === authStore.user!.preferences.currency)
      if (userCurrency) return userCurrency
    }

    // Detect based on browser locale
    const locale = navigator.language
    const region = locale.split('-')[1]?.toUpperCase()

    // Map common regions to currencies
    const regionCurrencyMap: Record<string, string> = {
      'US': 'USD',
      'GB': 'GBP',
      'EU': 'EUR',
      'CA': 'CAD',
      'AU': 'AUD',
      'JP': 'JPY',
      'CH': 'CHF',
      'CN': 'CNY',
      'IN': 'INR',
      'BR': 'BRL'
    }

    const detectedCode = regionCurrencyMap[region || ''] || 'USD'
    return currencies.find(c => c.code === detectedCode) || currencies[0]
  }

  const setCurrency = (currency: Currency) => {
    currentCurrency.value = currency
    localStorage.setItem('currency', currency.code)

    // Update auth store if user is logged in
    if (authStore.isAuthenticated) {
      authStore.updatePreferences({ currency: currency.code })
    }

    console.log('Currency changed to:', currency.code)
  }

  const fetchExchangeRates = async () => {
    if (currentCurrency.value.code === 'USD') return // USD is base

    loading.value = true
    try {
      // In a real app, you'd call a currency API
      // For now, we'll simulate with mock data
      const mockRates: Record<string, number> = {
        'EUR': 0.85,
        'GBP': 0.73,
        'JPY': 110.0,
        'CAD': 1.25,
        'AUD': 1.35,
        'CHF': 0.92,
        'CNY': 6.45,
        'INR': 74.5,
        'BRL': 5.2
      }

      exchangeRates.value = mockRates
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error)
    } finally {
      loading.value = false
    }
  }

  const convertPrice = (price: number, fromCurrency = 'USD'): number => {
    if (fromCurrency === currentCurrency.value.code) return price

    const rate = exchangeRates.value[currentCurrency.value.code]
    if (!rate) return price

    return price * rate
  }

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: currentCurrency.value.code,
      minimumFractionDigits: 2
    }).format(price)
  }

  onMounted(async () => {
    currentCurrency.value = detectCurrency()
    await fetchExchangeRates()
  })

  return {
    currencies,
    currentCurrency: readonly(currentCurrency),
    exchangeRates: readonly(exchangeRates),
    loading: readonly(loading),
    setCurrency,
    convertPrice,
    formatPrice,
    fetchExchangeRates
  }
}