import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
    fbq: (...args: any[]) => void
    _paq: any[]
  }
}

export const useAnalytics = () => {
  const route = useRoute()

  // Google Analytics 4
  const initGoogleAnalytics = (measurementId: string) => {
    // Load Google Analytics script
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    document.head.appendChild(script)

    // Initialize gtag
    window.dataLayer = window.dataLayer || []
    window.gtag = function() {
      window.dataLayer.push(arguments)
    }

    window.gtag('js', new Date())
    window.gtag('config', measurementId, {
      page_title: document.title,
      page_location: window.location.href
    })
  }

  // Facebook Pixel
  const initFacebookPixel = (pixelId: string) => {
    // Load Facebook Pixel script
    const script = document.createElement('script')
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `
    document.head.appendChild(script)
  }

  // Matomo (formerly Piwik)
  const initMatomo = (url: string, siteId: string) => {
    window._paq = window._paq || []

    window._paq.push(['trackPageView'])
    window._paq.push(['enableLinkTracking'])

    const script = document.createElement('script')
    script.async = true
    script.src = `${url}/matomo.js`
    document.head.appendChild(script)

    // Fallback for older Matomo versions
    const fallbackScript = document.createElement('script')
    fallbackScript.innerHTML = `
      var _paq = window._paq = window._paq || [];
      _paq.push(['setTrackerUrl', '${url}/matomo.php']);
      _paq.push(['setSiteId', '${siteId}']);
      var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
      g.async=true; g.src='${url}/matomo.js'; s.parentNode.insertBefore(g,s);
    `
    document.head.appendChild(fallbackScript)
  }

  // Track page views
  const trackPageView = (pagePath?: string) => {
    const path = pagePath || route.fullPath

    // Google Analytics
    if (window.gtag) {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: path,
        page_title: document.title
      })
    }

    // Facebook Pixel
    if (window.fbq) {
      window.fbq('track', 'PageView')
    }

    // Matomo
    if (window._paq) {
      window._paq.push(['setCustomUrl', path])
      window._paq.push(['setDocumentTitle', document.title])
      window._paq.push(['trackPageView'])
    }
  }

  // Track events
  const trackEvent = (
    eventName: string,
    parameters: Record<string, any> = {},
    category?: string,
    action?: string,
    label?: string
  ) => {
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, {
        event_category: category,
        event_action: action,
        event_label: label,
        ...parameters
      })
    }

    // Facebook Pixel
    if (window.fbq) {
      // Map common events to Facebook Pixel standard events
      const pixelEventMap: Record<string, string> = {
        'product_view': 'ViewContent',
        'add_to_cart': 'AddToCart',
        'purchase': 'Purchase',
        'search': 'Search',
        'contact': 'Contact'
      }

      const pixelEvent = pixelEventMap[eventName] || 'trackCustom'
      window.fbq(pixelEvent, eventName, parameters)
    }

    // Matomo
    if (window._paq) {
      window._paq.push(['trackEvent', category || 'engagement', action || eventName, label, parameters.value])
    }
  }

  // Track e-commerce events
  const trackProductView = (product: any) => {
    trackEvent('product_view', {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency
    }, 'ecommerce', 'product_view', product.name)

    // Enhanced e-commerce for Google Analytics
    if (window.gtag) {
      window.gtag('event', 'view_item', {
        currency: product.currency,
        value: product.price,
        items: [{
          item_id: product.id,
          item_name: product.name,
          category: product.category,
          price: product.price,
          quantity: 1
        }]
      })
    }
  }

  const trackAddToCart = (product: any, quantity = 1) => {
    trackEvent('add_to_cart', {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      quantity,
      currency: product.currency
    }, 'ecommerce', 'add_to_cart', product.name)

    // Enhanced e-commerce
    if (window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency: product.currency,
        value: product.price * quantity,
        items: [{
          item_id: product.id,
          item_name: product.name,
          category: product.category,
          price: product.price,
          quantity
        }]
      })
    }
  }

  const trackPurchase = (order: any) => {
    trackEvent('purchase', {
      transaction_id: order.id,
      value: order.total,
      currency: order.currency,
      items: order.items
    }, 'ecommerce', 'purchase', order.id)

    // Enhanced e-commerce
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: order.id,
        currency: order.currency,
        value: order.total,
        items: order.items.map((item: any) => ({
          item_id: item.product_id,
          item_name: item.product_name,
          category: item.category,
          price: item.price,
          quantity: item.quantity
        }))
      })
    }
  }

  const trackSearch = (query: string, resultsCount = 0) => {
    trackEvent('search', {
      search_term: query,
      results_count: resultsCount
    }, 'engagement', 'search', query)

    // Facebook Pixel Search event
    if (window.fbq) {
      window.fbq('track', 'Search', {
        search_string: query
      })
    }
  }

  // Track user engagement
  const trackTimeOnPage = () => {
    const startTime = Date.now()

    onUnmounted(() => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000)
      trackEvent('time_on_page', {
        time_spent: timeSpent,
        page_path: route.fullPath
      }, 'engagement', 'time_on_page', route.fullPath)
    })
  }

  // Track errors
  const trackError = (error: Error, context?: string) => {
    trackEvent('exception', {
      description: error.message,
      fatal: false,
      context
    }, 'error', 'exception', error.message)

    // Also track in Matomo if available
    if (window._paq) {
      window._paq.push(['trackEvent', 'error', 'javascript_error', error.message, context])
    }
  }

  // Initialize analytics on mount
  onMounted(() => {
    // Initialize analytics (these would come from environment variables)
    if (import.meta.env.VITE_GA_ID) {
      initGoogleAnalytics(import.meta.env.VITE_GA_ID)
    }

    if (import.meta.env.VITE_FB_PIXEL_ID) {
      initFacebookPixel(import.meta.env.VITE_FB_PIXEL_ID)
    }

    if (import.meta.env.VITE_MATOMO_URL && import.meta.env.VITE_MATOMO_SITE_ID) {
      initMatomo(import.meta.env.VITE_MATOMO_URL, import.meta.env.VITE_MATOMO_SITE_ID)
    }

    // Track initial page view
    trackPageView()

    // Track time on page
    trackTimeOnPage()
  })

  return {
    trackPageView,
    trackEvent,
    trackProductView,
    trackAddToCart,
    trackPurchase,
    trackSearch,
    trackError,
    trackTimeOnPage
  }
}