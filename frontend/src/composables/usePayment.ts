import { ref, readonly, computed } from 'vue'

declare global {
  interface Window {
    Stripe: any
  }
}

export interface PaymentData {
  amount: number
  currency: string
  description: string
  metadata?: Record<string, any>
}

export interface PaymentResult {
  success: boolean
  paymentIntentId?: string
  error?: string
}

export const useStripePayment = () => {
  const stripe = ref<any>(null)
  const elements = ref<any>(null)
  const isLoading = ref(false)

  // Initialize Stripe
  const initStripe = (publishableKey: string) => {
    if (typeof window !== 'undefined' && !stripe.value) {
      // Load Stripe.js if not already loaded
      if (!window.Stripe) {
        const script = document.createElement('script')
        script.src = 'https://js.stripe.com/v3/'
        script.onload = () => {
          stripe.value = window.Stripe(publishableKey)
        }
        document.head.appendChild(script)
      } else {
        stripe.value = window.Stripe(publishableKey)
      }
    }
  }

  // Create payment intent
  const createPaymentIntent = async (paymentData: PaymentData): Promise<string | null> => {
    try {
      // In a real app, this would call your backend API
      // const response = await api.createPaymentIntent(paymentData)
      // return response.data.clientSecret

      console.log('Creating payment intent:', paymentData)
      // Mock client secret for demo
      return 'pi_mock_client_secret_' + Date.now()
    } catch (error) {
      console.error('Failed to create payment intent:', error)
      return null
    }
  }

  // Confirm payment
  const confirmPayment = async (clientSecret: string, paymentMethod: any): Promise<PaymentResult> => {
    if (!stripe.value) {
      return { success: false, error: 'Stripe not initialized' }
    }

    isLoading.value = true

    try {
      const result = await stripe.value.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        }
      } else if (result.paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntentId: result.paymentIntent.id
        }
      } else {
        return {
          success: false,
          error: 'Payment failed'
        }
      }
    } catch (error) {
      console.error('Payment confirmation failed:', error)
      return {
        success: false,
        error: 'Payment confirmation failed'
      }
    } finally {
      isLoading.value = false
    }
  }

  // Process subscription payment
  const processSubscriptionPayment = async (
    priceId: string,
    customerEmail: string
  ): Promise<PaymentResult> => {
    if (!stripe.value) {
      return { success: false, error: 'Stripe not initialized' }
    }

    try {
      const result = await stripe.value.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        successUrl: window.location.origin + '/subscription/success',
        cancelUrl: window.location.origin + '/subscription/cancel',
        customerEmail
      })

      return { success: true }
    } catch (error) {
      console.error('Subscription payment failed:', error)
      return {
        success: false,
        error: 'Subscription payment failed'
      }
    }
  }

  // Create payment element
  const createPaymentElement = (containerId: string) => {
    if (!stripe.value) return null

    const elementsInstance = stripe.value.elements()
    const paymentElement = elementsInstance.create('payment')

    const container = document.getElementById(containerId)
    if (container) {
      paymentElement.mount(container)
    }

    return paymentElement
  }

  return {
    initStripe,
    createPaymentIntent,
    confirmPayment,
    processSubscriptionPayment,
    createPaymentElement,
    isLoading: readonly(isLoading)
  }
}

export const usePayPalPayment = () => {
  const paypal = ref<any>(null)
  const isLoading = ref(false)

  // Initialize PayPal
  const initPayPal = (clientId: string) => {
    if (typeof window !== 'undefined' && !paypal.value) {
      // Load PayPal SDK
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
      script.onload = () => {
        paypal.value = (window as any).paypal
      }
      document.head.appendChild(script)
    }
  }

  // Create PayPal button
  const createPayPalButton = (
    containerId: string,
    amount: number,
    onApprove: (data: any) => void,
    onError: (error: any) => void
  ) => {
    if (!paypal.value) return

    paypal.value.Buttons({
      createOrder: (data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: amount.toString()
            }
          }]
        })
      },
      onApprove,
      onError
    }).render(`#${containerId}`)
  }

  return {
    initPayPal,
    createPayPalButton,
    isLoading: readonly(isLoading)
  }
}

export const usePayment = () => {
  const stripePayment = useStripePayment()
  const paypalPayment = usePayPalPayment()

  // Initialize both payment providers with environment variables
  const initPayments = () => {
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

    if (stripeKey) {
      stripePayment.initStripe(stripeKey)
    }

    if (paypalClientId) {
      paypalPayment.initPayPal(paypalClientId)
    }
  }

  return {
    // Combined initialization
    initPayments,

    // Stripe methods
    stripe: stripePayment,

    // PayPal methods
    paypal: paypalPayment,

    // Convenience methods
    isLoading: computed(() => stripePayment.isLoading.value || paypalPayment.isLoading.value)
  }
}