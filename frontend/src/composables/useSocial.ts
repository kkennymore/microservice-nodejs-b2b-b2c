import { ref, computed, readonly } from 'vue'

// Social Types
export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  follow_status: 'active' | 'blocked' | 'muted'
  followed_at: string
  unfollowed_at?: string
}

export interface ProductShare {
  id: string
  user_id: string
  product_id: string
  share_type: 'social' | 'direct' | 'embed' | 'qr'
  platform?: string
  share_url: string
  share_text?: string
  click_count: number
  conversion_count: number
  shared_at: string
  expires_at?: string
}

export interface SocialPost {
  id: string
  user_id: string
  post_type: 'product_share' | 'review' | 'question' | 'tip' | 'story' | 'poll'
  entity_type?: 'product' | 'category' | 'seller' | 'review'
  entity_id?: string
  title?: string
  content: string
  media_urls?: string[]
  tags?: string[]
  location?: string
  is_public: boolean
  is_featured: boolean
  like_count: number
  comment_count: number
  share_count: number
  view_count: number
  created_at: string
  updated_at: string
  username: string
  avatar?: string
  engagement_score?: number
}

export interface PostInteraction {
  id: string
  post_id: string
  user_id: string
  interaction_type: 'like' | 'comment' | 'share' | 'bookmark' | 'report'
  content?: string
  parent_interaction_id?: string
  created_at: string
}

export interface SocialNotification {
  id: string
  user_id: string
  notification_type: 'follow' | 'like' | 'comment' | 'share' | 'mention' | 'tag'
  actor_id: string
  entity_type: 'post' | 'product' | 'user'
  entity_id: string
  message: string
  is_read: boolean
  is_archived: boolean
  created_at: string
  actor_name?: string
  actor_avatar?: string
}

export interface SocialFeed {
  posts: SocialPost[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface TrendingHashtag {
  hashtag: string
  usage_count: number
  trending_score: number
}

// Social State
const follows = ref<UserFollow[]>([])
const shares = ref<ProductShare[]>([])
const socialFeed = ref<SocialFeed | null>(null)
const notifications = ref<SocialNotification[]>([])
const trendingHashtags = ref<TrendingHashtag[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// API base URL
const API_BASE = import.meta.env.VITE_SOCIAL_API_URL || 'http://localhost:3018/api'

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
    error.value = err instanceof Error ? err.message : 'Social API error'
    throw err
  }
}

// Main functions

// Follow/Unfollow user
const toggleFollow = async (followingId: string) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall(`/social/follow/${followingId}`, {
      method: 'POST'
    })
    return response
  } catch (err) {
    console.error('Follow error:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Get user's followers/following
const getFollows = async (userId: string, type: 'followers' | 'following' = 'followers', options: {
  page?: number
  limit?: number
} = {}) => {
  try {
    const params = new URLSearchParams({
      type,
      ...(options.page && { page: options.page.toString() }),
      ...(options.limit && { limit: options.limit.toString() })
    })

    const response = await apiCall(`/social/follows/${userId}?${params}`)
    return response.data
  } catch (err) {
    console.error('Get follows error:', err)
    throw err
  }
}

// Share product
const shareProduct = async (data: {
  productId: string
  shareType: 'social' | 'direct' | 'embed' | 'qr'
  platform?: string
  shareText?: string
}) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall('/social/share', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return response
  } catch (err) {
    console.error('Share error:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Get share by ID
const getShare = async (shareId: string) => {
  try {
    const response = await apiCall(`/social/share/${shareId}`)
    return response.data
  } catch (err) {
    console.error('Get share error:', err)
    throw err
  }
}

// Create social post
const createPost = async (data: {
  postType: 'product_share' | 'review' | 'question' | 'tip' | 'story' | 'poll'
  entityType?: 'product' | 'category' | 'seller' | 'review'
  entityId?: string
  title?: string
  content: string
  mediaUrls?: string[]
  tags?: string[]
  location?: string
  isPublic?: boolean
}) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall('/social/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return response
  } catch (err) {
    console.error('Create post error:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Get social feed
const getSocialFeed = async (options: {
  type?: 'following' | 'trending' | 'discovery'
  page?: number
  limit?: number
} = {}) => {
  try {
    const params = new URLSearchParams({
      ...(options.type && { type: options.type }),
      ...(options.page && { page: options.page.toString() }),
      ...(options.limit && { limit: options.limit.toString() })
    })

    const response = await apiCall(`/social/feed?${params}`)
    socialFeed.value = response.data
    return response.data
  } catch (err) {
    console.error('Get feed error:', err)
    throw err
  }
}

// Interact with post
const interactWithPost = async (postId: string, data: {
  interactionType: 'like' | 'comment' | 'share' | 'bookmark' | 'report'
  content?: string
}) => {
  try {
    const response = await apiCall(`/social/posts/${postId}/interact`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return response
  } catch (err) {
    console.error('Post interaction error:', err)
    throw err
  }
}

// Get trending hashtags
const getTrendingHashtags = async (limit = 10) => {
  try {
    const response = await apiCall(`/social/trending?limit=${limit}`)
    trendingHashtags.value = response.data.hashtags
    return response.data.hashtags
  } catch (err) {
    console.error('Get trending hashtags error:', err)
    trendingHashtags.value = []
    return []
  }
}

// Get social notifications
const getNotifications = async (userId: string, options: {
  page?: number
  limit?: number
  unreadOnly?: boolean
} = {}) => {
  try {
    const params = new URLSearchParams({
      ...(options.page && { page: options.page.toString() }),
      ...(options.limit && { limit: options.limit.toString() }),
      ...(options.unreadOnly && { unreadOnly: options.unreadOnly.toString() })
    })

    const response = await apiCall(`/social/notifications/${userId}?${params}`)
    notifications.value = response.data.notifications
    return response.data
  } catch (err) {
    console.error('Get notifications error:', err)
    throw err
  }
}

// Mark notification as read
const markNotificationRead = async (notificationId: string) => {
  try {
    const response = await apiCall(`/social/notifications/${notificationId}/read`, {
      method: 'PUT'
    })
    return response
  } catch (err) {
    console.error('Mark notification read error:', err)
    throw err
  }
}

// Social sharing utilities
const shareToPlatform = (platform: string, url: string, text: string) => {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)

  const shareUrls: Record<string, string> = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedText}&body=${encodedUrl}`
  }

  const shareUrl = shareUrls[platform.toLowerCase()]
  if (shareUrl) {
    window.open(shareUrl, '_blank', 'width=600,height=400')
  }
}

// Generate social media preview
const generateSocialPreview = (data: {
  title: string
  description: string
  image?: string
  url: string
}) => {
  return {
    og: {
      title: data.title,
      description: data.description,
      image: data.image,
      url: data.url,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.description,
      image: data.image
    }
  }
}

// Check if user is following another user
const isFollowing = (followerId: string, followingId: string) => {
  return follows.value.some(follow =>
    follow.follower_id === followerId &&
    follow.following_id === followingId &&
    follow.follow_status === 'active'
  )
}

// Get follower/following counts
const getFollowCounts = (userId: string) => {
  const followers = follows.value.filter(follow =>
    follow.following_id === userId && follow.follow_status === 'active'
  ).length

  const following = follows.value.filter(follow =>
    follow.follower_id === userId && follow.follow_status === 'active'
  ).length

  return { followers, following }
}

// Calculate post engagement rate
const calculateEngagementRate = (post: SocialPost) => {
  const totalEngagement = post.like_count + post.comment_count + post.share_count
  return post.view_count > 0 ? (totalEngagement / post.view_count) * 100 : 0
}

// Format post timestamp
const formatPostTime = (timestamp: string) => {
  const now = new Date()
  const postTime = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - postTime.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`

  return postTime.toLocaleDateString()
}

// Computed properties
const unreadNotificationsCount = computed(() =>
  notifications.value.filter(notification => !notification.is_read).length
)

const hasNewNotifications = computed(() => unreadNotificationsCount.value > 0)

const topTrendingHashtags = computed(() =>
  trendingHashtags.value.slice(0, 5)
)

export function useSocial() {
  return {
    // State
    follows: readonly(follows),
    shares: readonly(shares),
    socialFeed: readonly(socialFeed),
    notifications: readonly(notifications),
    trendingHashtags: readonly(trendingHashtags),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    unreadNotificationsCount,
    hasNewNotifications,
    topTrendingHashtags,

    // Methods
    toggleFollow,
    getFollows,
    shareProduct,
    getShare,
    createPost,
    getSocialFeed,
    interactWithPost,
    getTrendingHashtags,
    getNotifications,
    markNotificationRead,
    shareToPlatform,
    generateSocialPreview,
    isFollowing,
    getFollowCounts,
    calculateEngagementRate,
    formatPostTime,

    // Clear error
    clearError: () => { error.value = null }
  }
}