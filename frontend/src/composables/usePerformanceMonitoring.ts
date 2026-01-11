import { onMounted, onUnmounted } from 'vue'

export const usePerformanceMonitoring = () => {
  let observer: PerformanceObserver | null = null

  const initPerformanceMonitoring = () => {
    // Core Web Vitals monitoring
    if ('web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log)
        getFID(console.log)
        getFCP(console.log)
        getLCP(console.log)
        getTTFB(console.log)
      })
    }

    // Performance observer for navigation and resource timing
    if ('PerformanceObserver' in window) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            console.log('Navigation Performance:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              totalTime: navEntry.loadEventEnd - navEntry.fetchStart
            })
          } else if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming
            if (resourceEntry.duration > 1000) { // Log slow resources
              console.warn('Slow resource:', resourceEntry.name, resourceEntry.duration + 'ms')
            }
          }
        }
      })

      observer.observe({ entryTypes: ['navigation', 'resource'] })
    }

    // Monitor memory usage
    if ('memory' in performance) {
      const logMemoryUsage = () => {
        const memory = (performance as any).memory
        console.log('Memory Usage:', {
          used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
        })
      }

      // Log memory usage every 30 seconds
      setInterval(logMemoryUsage, 30000)
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn('Long task detected:', entry.duration + 'ms')
          }
        }
      })

      longTaskObserver.observe({ entryTypes: ['longtask'] })
    }
  }

  const measurePageLoad = () => {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      if (navigation) {
        const metrics = {
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnect: navigation.connectEnd - navigation.connectStart,
          serverResponse: navigation.responseEnd - navigation.requestStart,
          pageLoad: navigation.loadEventEnd - navigation.fetchStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart
        }

        console.log('Page Load Metrics:', metrics)

        // Send to analytics if available
        if (typeof window !== 'undefined' && (window as any).gtag) {
          ;(window as any).gtag('event', 'page_load_metrics', metrics)
        }
      }
    }
  }

  const measureInteraction = (interactionName: string) => {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${interactionName}-start`)
      return () => {
        performance.mark(`${interactionName}-end`)
        performance.measure(interactionName, `${interactionName}-start`, `${interactionName}-end`)
        const measure = performance.getEntriesByName(interactionName)[0]
        console.log(`${interactionName} took ${measure.duration}ms`)

        // Send to analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          ;(window as any).gtag('event', 'user_interaction', {
            interaction: interactionName,
            duration: measure.duration
          })
        }
      }
    }
    return () => {} // No-op if not supported
  }

  onMounted(() => {
    initPerformanceMonitoring()
    // Measure page load after mount
    setTimeout(measurePageLoad, 0)
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return {
    measureInteraction
  }
}