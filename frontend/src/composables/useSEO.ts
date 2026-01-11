import { ref, readonly } from 'vue'
import type { Product, Category, Seller } from '@/types'

// SEO Configuration
const SEO_CONFIG = {
  siteName: import.meta.env.VITE_SITE_NAME || 'Multivendor Marketplace',
  siteUrl: import.meta.env.VITE_SITE_URL || 'https://marketplace.com',
  defaultTitle: 'Multivendor Marketplace - Shop Amazing Products',
  defaultDescription: 'Discover amazing products from trusted sellers worldwide',
  defaultImage: '/images/og-default.jpg',
  twitterHandle: import.meta.env.VITE_TWITTER_HANDLE || '@marketplace'
}

// SEO State
const currentMeta = ref<any>({})
const isLoading = ref(false)
const error = ref<string | null>(null)

// API base URL
const API_BASE = import.meta.env.VITE_SEO_API || 'http://localhost:3016/api'

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'SEO API error'
    throw err
  }
}

// SEO Utilities
class SEOUtils {
  private config = SEO_CONFIG

  // Generate title with proper length and formatting
  generateTitle(title: string, suffix = true): string {
    if (!title) return this.config.defaultTitle

    const cleanTitle = title.trim()
    const maxLength = 60

    if (suffix && cleanTitle.length < maxLength - 3) {
      return `${cleanTitle} | ${this.config.siteName}`
    }

    if (cleanTitle.length > maxLength) {
      return cleanTitle.substring(0, maxLength - 3) + '...'
    }

    return cleanTitle
  }

  // Generate description with proper length
  generateDescription(description: string, fallback = ''): string {
    if (!description && !fallback) return this.config.defaultDescription

    const text = description || fallback
    const cleanDesc = text.trim()
    const maxLength = 160

    if (cleanDesc.length <= maxLength) return cleanDesc

    // Try to cut at word boundary
    const truncated = cleanDesc.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...'
    }

    return truncated + '...'
  }

  // Generate keywords from text
  extractKeywords(text: string, limit = 10): string[] {
    if (!text) return []

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word))

    const wordCount: Record<string, number> = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([word]) => word)
  }

  // Check if word is a stop word
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'an', 'a']
    return stopWords.includes(word.toLowerCase())
  }

  // Generate canonical URL
  generateCanonicalUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${this.config.siteUrl}${cleanPath}`
  }

  // Generate structured data for different entity types
  generateStructuredData(entityType: string, entityData: any): any {
    const baseData = {
      '@context': 'https://schema.org',
      '@type': this.getSchemaType(entityType),
    }

    switch (entityType) {
      case 'product':
        return {
          ...baseData,
          name: entityData.name,
          description: entityData.description,
          image: entityData.images || [this.config.defaultImage],
          offers: {
            '@type': 'Offer',
            price: entityData.price,
            priceCurrency: entityData.currency || 'USD',
            availability: entityData.inStock ? 'InStock' : 'OutOfStock',
            seller: {
              '@type': 'Organization',
              name: entityData.seller?.name || this.config.siteName
            }
          },
          aggregateRating: entityData.averageRating ? {
            '@type': 'AggregateRating',
            ratingValue: entityData.averageRating,
            reviewCount: entityData.reviewCount || 0
          } : undefined,
          brand: entityData.brand ? {
            '@type': 'Brand',
            name: entityData.brand
          } : undefined
        }

      case 'organization':
        return {
          ...baseData,
          name: this.config.siteName,
          url: this.config.siteUrl,
          logo: `${this.config.siteUrl}/images/logo.png`
        }

      default:
        return baseData
    }
  }

  // Get Schema.org type for entity
  private getSchemaType(entityType: string): string {
    const typeMap: Record<string, string> = {
      product: 'Product',
      category: 'CollectionPage',
      brand: 'Brand',
      seller: 'Organization',
      page: 'WebPage',
      blog_post: 'BlogPosting'
    }
    return typeMap[entityType] || 'WebPage'
  }

  // Set document meta tags
  setMetaTags(metaData: any): void {
    if (typeof document === 'undefined') return

    // Basic meta tags
    this.setMetaTag('description', metaData.description)
    this.setMetaTag('keywords', metaData.keywords?.join(', '))
    this.setMetaTag('robots', metaData.robots)

    // Canonical URL
    this.setCanonicalUrl(metaData.canonicalUrl)

    // Open Graph
    if (metaData.openGraph) {
      this.setMetaTag('og:title', metaData.openGraph.title, 'property')
      this.setMetaTag('og:description', metaData.openGraph.description, 'property')
      this.setMetaTag('og:image', metaData.openGraph.image, 'property')
      this.setMetaTag('og:url', metaData.canonicalUrl, 'property')
      this.setMetaTag('og:type', metaData.openGraph.type, 'property')
      this.setMetaTag('og:site_name', this.config.siteName, 'property')
    }

    // Twitter Card
    if (metaData.twitter) {
      this.setMetaTag('twitter:card', metaData.twitter.card, 'name')
      this.setMetaTag('twitter:title', metaData.twitter.title, 'name')
      this.setMetaTag('twitter:description', metaData.twitter.description, 'name')
      this.setMetaTag('twitter:image', metaData.twitter.image, 'name')
      if (this.config.twitterHandle) {
        this.setMetaTag('twitter:site', this.config.twitterHandle, 'name')
      }
    }

    // Title
    if (metaData.title) {
      document.title = metaData.title
    }
  }

  // Set individual meta tag
  private setMetaTag(name: string, content: string, attribute = 'name'): void {
    if (!content) return

    let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement

    if (element) {
      element.content = content
    } else {
      element = document.createElement('meta')
      element.setAttribute(attribute, name)
      element.content = content
      document.head.appendChild(element)
    }
  }

  // Set canonical URL
  private setCanonicalUrl(url: string): void {
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement

    if (canonical) {
      canonical.href = url
    } else {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      canonical.href = url
      document.head.appendChild(canonical)
    }
  }

  // Set structured data
  setStructuredData(data: any): void {
    if (typeof document === 'undefined' || !data) return

    // Remove existing structured data
    const existing = document.querySelector('script[type="application/ld+json"]#structured-data')
    if (existing) {
      existing.remove()
    }

    // Add new structured data
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'structured-data'
    script.textContent = JSON.stringify(data, null, 2)
    document.head.appendChild(script)
  }

  // Generate website structured data
  generateWebsiteStructuredData(): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.config.siteName,
      url: this.config.siteUrl,
      description: this.config.defaultDescription,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${this.config.siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }
  }
}

const seoUtils = new SEOUtils()

// Main functions

// Get meta data for entity
const getMetaData = async (entityType: string, entityId: string) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall(`/seo/meta/${entityType}/${entityId}`)
    currentMeta.value = response
    return response
  } catch (err) {
    console.error('Get meta data error:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Update meta data for entity
const updateMetaData = async (entityType: string, entityId: string, metaData: any) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall(`/seo/meta/${entityType}/${entityId}`, {
      method: 'PUT',
      body: JSON.stringify(metaData)
    })
    return response
  } catch (err) {
    console.error('Update meta data error:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Set SEO for current page
const setSEO = (options: {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: string
  structuredData?: any
}) => {
  const metaData = {
    title: seoUtils.generateTitle(options.title || ''),
    description: seoUtils.generateDescription(options.description || ''),
    keywords: options.keywords || [],
    canonicalUrl: options.url || window.location.href,
    robots: 'index,follow',
    openGraph: {
      title: seoUtils.generateTitle(options.title || ''),
      description: seoUtils.generateDescription(options.description || ''),
      image: options.image || SEO_CONFIG.defaultImage,
      type: options.type || 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: seoUtils.generateTitle(options.title || ''),
      description: seoUtils.generateDescription(options.description || ''),
      image: options.image || SEO_CONFIG.defaultImage
    }
  }

  seoUtils.setMetaTags(metaData)

  if (options.structuredData) {
    seoUtils.setStructuredData(options.structuredData)
  } else {
    // Set default website structured data
    seoUtils.setStructuredData(seoUtils.generateWebsiteStructuredData())
  }

  currentMeta.value = metaData
}

// Auto-generate SEO for product
const setProductSEO = (product: Product) => {
  const title = product.name
  const description = product.description || `Buy ${product.name} for ${product.price}`
  const keywords = seoUtils.extractKeywords(`${product.name} ${product.description} ${product.category}`)
  const image = product.images?.[0] || SEO_CONFIG.defaultImage

  const structuredData = seoUtils.generateStructuredData('product', {
    name: product.name,
    description: product.description,
    images: product.images,
    price: product.price,
    currency: product.currency,
    inStock: product.stockQuantity > 0,
    seller: product.seller,
    averageRating: product.averageRating,
    reviewCount: product.reviewCount,
    brand: product.brand
  })

  setSEO({
    title,
    description,
    keywords,
    image,
    type: 'product',
    structuredData
  })
}

// Auto-generate SEO for category
const setCategorySEO = (category: Category, productCount?: number) => {
  const title = `${category.name} Products`
  const description = category.description || `Browse ${productCount || ''} products in ${category.name} category`
  const keywords = seoUtils.extractKeywords(`${category.name} ${category.description}`)

  setSEO({
    title,
    description,
    keywords,
    type: 'website'
  })
}

// Auto-generate SEO for seller
const setSellerSEO = (seller: Seller) => {
  const title = `${seller.name} - Seller Profile`
  const description = seller.description || `Shop from ${seller.name} on our marketplace`
  const keywords = seoUtils.extractKeywords(`${seller.name} ${seller.description}`)
  const image = seller.avatar || SEO_CONFIG.defaultImage

  const structuredData = seoUtils.generateStructuredData('organization', {
    name: seller.name,
    description: seller.description,
    logo: seller.avatar
  })

  setSEO({
    title,
    description,
    keywords,
    image,
    type: 'profile',
    structuredData
  })
}

// Get SEO analytics
const getSEOAnalytics = async (entityType?: string, entityId?: string, period = '30d') => {
  try {
    const params = new URLSearchParams({ period })
    if (entityType) params.append('entityType', entityType)
    if (entityId) params.append('entityId', entityId)

    const response = await apiCall(`/seo/analytics?${params}`)
    return response.data
  } catch (err) {
    console.error('Get SEO analytics error:', err)
    return null
  }
}

// Generate sitemaps (admin)
const generateSitemaps = async () => {
  try {
    const response = await apiCall('/admin/seo/generate-sitemaps', {
      method: 'POST'
    })
    return response
  } catch (err) {
    console.error('Generate sitemaps error:', err)
    throw err
  }
}

// Create SEO redirect
const createRedirect = async (oldUrl: string, newUrl: string, redirectType = '301') => {
  try {
    const response = await apiCall('/seo/redirects', {
      method: 'POST',
      body: JSON.stringify({
        oldUrl,
        newUrl,
        redirectType
      })
    })
    return response
  } catch (err) {
    console.error('Create redirect error:', err)
    throw err
  }
}

// Utility functions for components
const usePageSEO = (options: {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  structuredData?: any
}) => {
  // Set SEO when component mounts
  const setPageSEO = () => {
    setSEO(options)
  }

  // Update SEO dynamically
  const updatePageSEO = (newOptions: Partial<typeof options>) => {
    setSEO({ ...options, ...newOptions })
  }

  return {
    setPageSEO,
    updatePageSEO
  }
}

export function useSEO() {
  return {
    // State
    currentMeta: readonly(currentMeta),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Main functions
    getMetaData,
    updateMetaData,
    setSEO,
    setProductSEO,
    setCategorySEO,
    setSellerSEO,
    getSEOAnalytics,
    generateSitemaps,
    createRedirect,

    // Utilities
    usePageSEO,
    seoUtils,

    // Clear error
    clearError: () => { error.value = null }
  }
}