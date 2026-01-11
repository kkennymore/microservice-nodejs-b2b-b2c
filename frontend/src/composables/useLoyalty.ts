import { ref, computed, readonly } from 'vue'

// Loyalty Types
export interface LoyaltyAccount {
  id: string
  user_id: string
  current_points: number
  total_points_earned: number
  total_points_redeemed: number
  current_tier: string
  tier_progress: number
  tier_upgrade_date?: string
  is_active: boolean
  next_tier?: string
}

export interface PointsTransaction {
  id: string
  user_id: string
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted' | 'bonus'
  points: number
  balance_before: number
  balance_after: number
  reference_type: string
  reference_id?: string
  description?: string
  expiry_date?: string
  created_at: string
}

export interface Reward {
  id: string
  reward_name: string
  reward_type: 'discount' | 'free_shipping' | 'product' | 'cashback' | 'experience' | 'donation'
  description?: string
  points_required: number
  value?: number
  currency: string
  max_claims: number
  claims_count: number
  valid_from?: string
  valid_until?: string
  image_url?: string
  terms_conditions?: string
}

export interface RewardRedemption {
  id: string
  user_id: string
  reward_id: string
  points_used: number
  redemption_code: string
  redemption_status: 'pending' | 'approved' | 'fulfilled' | 'cancelled' | 'expired'
  fulfilled_at?: string
  expires_at?: string
  reward_name: string
  reward_type: string
  value?: number
}

export interface Referral {
  id: string
  referrer_id: string
  referee_email: string
  referral_code: string
  referral_status: 'pending' | 'completed' | 'expired' | 'cancelled'
  points_earned: number
  completed_at?: string
  expires_at: string
  referral_data?: {
    qr_code?: string
    referral_url?: string
  }
}

export interface LoyaltyTier {
  id: string
  tier_name: string
  tier_level: number
  min_points: number
  max_points?: number
  multiplier: number
  benefits?: any
  is_active: boolean
}

export interface LoyaltyAnalytics {
  period: string
  analytics: Array<{
    date: string
    metric_type: string
    total_value: number
    total_count: number
  }>
}

// Loyalty State
const loyaltyAccount = ref<LoyaltyAccount | null>(null)
const pointsTransactions = ref<PointsTransaction[]>([])
const rewards = ref<Reward[]>([])
const redemptions = ref<RewardRedemption[]>([])
const referrals = ref<Referral[]>([])
const loyaltyTiers = ref<LoyaltyTier[]>([])
const loyaltyAnalytics = ref<LoyaltyAnalytics | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// API base URL
const API_BASE = import.meta.env.VITE_LOYALTY_API_URL || 'http://localhost:3017/api'

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
    error.value = err instanceof Error ? err.message : 'Loyalty API error'
    throw err
  }
}

// Main functions

// Get user loyalty account
const getLoyaltyAccount = async (userId: string) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall(`/loyalty/account/${userId}`)
    loyaltyAccount.value = response
    return response
  } catch (err) {
    console.error('Get loyalty account error:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Award points to user
const awardPoints = async (data: {
  userId: string
  points: number
  transactionType: 'earned' | 'redeemed' | 'expired' | 'adjusted' | 'bonus'
  referenceType: string
  referenceId?: string
  description?: string
}) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall('/loyalty/points/award', {
      method: 'POST',
      body: JSON.stringify(data)
    })

    // Refresh account data
    if (loyaltyAccount.value?.user_id === data.userId) {
      await getLoyaltyAccount(data.userId)
    }

    return response
  } catch (err) {
    console.error('Award points error:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Get points transaction history
const getPointsTransactions = async (userId: string, options: {
  page?: number
  limit?: number
  type?: string
} = {}) => {
  try {
    const params = new URLSearchParams()
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.type) params.append('type', options.type)

    const response = await apiCall(`/loyalty/transactions/${userId}?${params}`)
    pointsTransactions.value = response.data.transactions
    return response.data
  } catch (err) {
    console.error('Get transactions error:', err)
    throw err
  }
}

// Get rewards catalog
const getRewards = async (options: {
  category?: string
  minPoints?: number
  maxPoints?: number
  page?: number
  limit?: number
} = {}) => {
  try {
    const params = new URLSearchParams()
    if (options.category) params.append('category', options.category)
    if (options.minPoints) params.append('minPoints', options.minPoints.toString())
    if (options.maxPoints) params.append('maxPoints', options.maxPoints.toString())
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())

    const response = await apiCall(`/loyalty/rewards?${params}`)
    rewards.value = response.data.rewards
    return response.data
  } catch (err) {
    console.error('Get rewards error:', err)
    throw err
  }
}

// Redeem reward
const redeemReward = async (rewardId: string, userId: string) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiCall('/loyalty/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify({ rewardId, userId })
    })

    // Refresh account and redemptions
    await getLoyaltyAccount(userId)
    await getRewardRedemptions(userId)

    return response
  } catch (err) {
    console.error('Redeem reward error:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Get user reward redemptions
const getRewardRedemptions = async (userId: string, options: {
  page?: number
  limit?: number
  status?: string
} = {}) => {
  try {
    const params = new URLSearchParams()
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.status) params.append('status', options.status)

    const response = await apiCall(`/loyalty/redemptions/${userId}?${params}`)
    redemptions.value = response.data.redemptions
    return response.data
  } catch (err) {
    console.error('Get redemptions error:', err)
    throw err
  }
}

// Create referral
const createReferral = async (referrerId: string, refereeEmail: string) => {
  try {
    const response = await apiCall('/loyalty/referrals', {
      method: 'POST',
      body: JSON.stringify({ referrerId, refereeEmail })
    })
    return response
  } catch (err) {
    console.error('Create referral error:', err)
    throw err
  }
}

// Get referral by code
const getReferralByCode = async (code: string) => {
  try {
    const response = await apiCall(`/loyalty/referrals/${code}`)
    return response.data
  } catch (err) {
    console.error('Get referral error:', err)
    throw err
  }
}

// Get loyalty tiers
const getLoyaltyTiers = async () => {
  try {
    const response = await apiCall('/loyalty/tiers')
    loyaltyTiers.value = response.data.tiers
    return response.data
  } catch (err) {
    console.error('Get tiers error:', err)
    throw err
  }
}

// Get loyalty analytics
const getLoyaltyAnalytics = async (period = '30d', metric?: string) => {
  try {
    const params = new URLSearchParams({ period })
    if (metric) params.append('metric', metric)

    const response = await apiCall(`/loyalty/analytics?${params}`)
    loyaltyAnalytics.value = response.data
    return response.data
  } catch (err) {
    console.error('Get analytics error:', err)
    return null
  }
}

// Calculate points for purchase
const calculatePurchasePoints = (orderTotal: number, userTier = 'bronze') => {
  const minPurchase = 10.0
  const pointsPerDollar = 1.0

  if (orderTotal < minPurchase) return 0

  const basePoints = Math.floor(orderTotal * pointsPerDollar)

  // Apply tier multiplier
  const tierMultipliers: Record<string, number> = {
    bronze: 1.0,
    silver: 1.1,
    gold: 1.2,
    platinum: 1.3,
    diamond: 1.5
  }

  return Math.floor(basePoints * (tierMultipliers[userTier] || 1.0))
}

// Get tier benefits
const getTierBenefits = (tierName: string) => {
  const tierBenefits: Record<string, string[]> = {
    bronze: ['Basic member benefits', '1x points multiplier'],
    silver: ['Priority customer support', '1.1x points multiplier', 'Free shipping on orders over $50'],
    gold: ['VIP customer support', '1.2x points multiplier', 'Free shipping on all orders', 'Exclusive promotions'],
    platinum: ['Dedicated account manager', '1.3x points multiplier', 'Early access to sales', 'Exclusive member events'],
    diamond: ['All Platinum benefits', '1.5x points multiplier', 'Personal styling sessions', 'Exclusive product previews']
  }

  return tierBenefits[tierName] || []
}

// Get points to next tier
const getPointsToNextTier = (currentPoints: number, currentTier: string) => {
  const tierRequirements: Record<string, number> = {
    silver: 1000,
    gold: 5000,
    platinum: 15000,
    diamond: 50000
  }

  const nextTier = getNextTier(currentTier)
  if (!nextTier) return 0

  const requiredPoints = tierRequirements[nextTier] || 0
  return Math.max(0, requiredPoints - currentPoints)
}

// Get next tier name
const getNextTier = (currentTier: string) => {
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  const currentIndex = tierOrder.indexOf(currentTier)

  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return null
  }

  return tierOrder[currentIndex + 1]
}

// Computed properties
const hasLoyaltyAccount = computed(() => !!loyaltyAccount.value)

const currentTier = computed(() => loyaltyAccount.value?.current_tier || 'bronze')

const tierProgress = computed(() => loyaltyAccount.value?.tier_progress || 0)

const availablePoints = computed(() => loyaltyAccount.value?.current_points || 0)

const totalEarned = computed(() => loyaltyAccount.value?.total_points_earned || 0)

const totalRedeemed = computed(() => loyaltyAccount.value?.total_points_redeemed || 0)

const nextTier = computed(() => loyaltyAccount.value?.next_tier || null)

const pointsToNextTier = computed(() => {
  if (!loyaltyAccount.value) return 0
  return getPointsToNextTier(loyaltyAccount.value.current_points, loyaltyAccount.value.current_tier)
})

const tierBenefits = computed(() => getTierBenefits(currentTier.value))

const canRedeemRewards = computed(() =>
  rewards.value.filter(reward => reward.points_required <= (availablePoints.value)).length > 0
)

const recentTransactions = computed(() =>
  pointsTransactions.value.slice(0, 5)
)

export function useLoyalty() {
  return {
    // State
    loyaltyAccount: readonly(loyaltyAccount),
    pointsTransactions: readonly(pointsTransactions),
    rewards: readonly(rewards),
    redemptions: readonly(redemptions),
    referrals: readonly(referrals),
    loyaltyTiers: readonly(loyaltyTiers),
    loyaltyAnalytics: readonly(loyaltyAnalytics),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    hasLoyaltyAccount,
    currentTier,
    tierProgress,
    availablePoints,
    totalEarned,
    totalRedeemed,
    nextTier,
    pointsToNextTier,
    tierBenefits,
    canRedeemRewards,
    recentTransactions,

    // Methods
    getLoyaltyAccount,
    awardPoints,
    getPointsTransactions,
    getRewards,
    redeemReward,
    getRewardRedemptions,
    createReferral,
    getReferralByCode,
    getLoyaltyTiers,
    getLoyaltyAnalytics,
    calculatePurchasePoints,
    getTierBenefits,
    getPointsToNextTier,
    getNextTier,

    // Clear error
    clearError: () => { error.value = null }
  }
}