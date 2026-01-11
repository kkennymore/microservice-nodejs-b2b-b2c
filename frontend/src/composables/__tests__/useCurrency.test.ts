import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCurrency } from '@/composables/useCurrency'

// Mock navigator.language
Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  configurable: true
})

describe('useCurrency Composable', () => {
  beforeEach(() => {
    // Clear localStorage mocks
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('detects currency from browser locale', () => {
    const { currentCurrency } = useCurrency()

    expect(currentCurrency.value.code).toBe('USD')
    expect(currentCurrency.value.symbol).toBe('$')
  })

  it('uses stored currency from localStorage', () => {
    localStorage.setItem('currency', 'EUR')

    const { currentCurrency } = useCurrency()

    expect(currentCurrency.value.code).toBe('EUR')
    expect(currentCurrency.value.symbol).toBe('€')
  })

  it('sets currency correctly', () => {
    const { setCurrency, currentCurrency } = useCurrency()

    setCurrency({ code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' })

    expect(currentCurrency.value.code).toBe('GBP')
    expect(currentCurrency.value.symbol).toBe('£')
    expect(localStorage.setItem).toHaveBeenCalledWith('currency', 'GBP')
  })

  it('formats price correctly', () => {
    const { formatPrice } = useCurrency()

    const formatted = formatPrice(1234.56)

    expect(formatted).toContain('$')
    expect(formatted).toContain('1,234.56')
  })

  it('converts price correctly', () => {
    const { convertPrice } = useCurrency()

    // Mock exchange rates
    const mockExchangeRates = { EUR: 0.85, GBP: 0.73 }
    const { exchangeRates } = useCurrency()

    // Simulate setting exchange rates
    ;(exchangeRates.value as any) = mockExchangeRates

    const converted = convertPrice(100, 'EUR')

    expect(converted).toBe(85)
  })

  it('returns supported currencies', () => {
    const { currencies } = useCurrency()

    expect(currencies.length).toBeGreaterThan(0)
    expect(currencies[0]).toHaveProperty('code')
    expect(currencies[0]).toHaveProperty('name')
    expect(currencies[0]).toHaveProperty('symbol')
  })
})