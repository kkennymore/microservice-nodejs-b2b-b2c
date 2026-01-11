<template>
  <div class="loyalty-dashboard">
    <div class="dashboard-header">
      <div class="header-content">
        <h2 class="dashboard-title">My Loyalty Rewards</h2>
        <p class="dashboard-subtitle">Earn points, unlock tiers, and redeem amazing rewards</p>
      </div>

      <div class="tier-badge" :class="`tier-${currentTier}`">
        <div class="tier-icon">
          <svg v-if="currentTier === 'bronze'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <svg v-else-if="currentTier === 'silver'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <svg v-else-if="currentTier === 'gold'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 15,8 22,8 17,13 19,20 12,16 5,20 7,13 2,8 9,8"/>
          </svg>
          <svg v-else-if="currentTier === 'platinum'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21"/>
          </svg>
          <svg v-else-if="currentTier === 'diamond'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <div class="tier-info">
          <div class="tier-name">{{ currentTier.charAt(0).toUpperCase() + currentTier.slice(1) }} Member</div>
          <div class="tier-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${tierProgress}%` }"></div>
            </div>
            <div class="progress-text">
              {{ tierProgress }}% to {{ nextTier ? nextTier.charAt(0).toUpperCase() + nextTier.slice(1) : 'Max' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Points Overview -->
    <div class="points-overview">
      <div class="points-card">
        <div class="points-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <div class="points-info">
          <div class="points-value">{{ availablePoints }}</div>
          <div class="points-label">Available Points</div>
        </div>
      </div>

      <div class="points-card">
        <div class="points-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div class="points-info">
          <div class="points-value">{{ totalEarned }}</div>
          <div class="points-label">Total Earned</div>
        </div>
      </div>

      <div class="points-card">
        <div class="points-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <div class="points-info">
          <div class="points-value">{{ totalRedeemed }}</div>
          <div class="points-label">Total Redeemed</div>
        </div>
      </div>
    </div>

    <!-- Tier Benefits -->
    <div v-if="tierBenefits.length > 0" class="tier-benefits">
      <h3>Your {{ currentTier.charAt(0).toUpperCase() + currentTier.slice(1) }} Benefits</h3>
      <div class="benefits-list">
        <div
          v-for="benefit in tierBenefits"
          :key="benefit"
          class="benefit-item"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
          {{ benefit }}
        </div>
      </div>
    </div>

    <!-- Main Content Tabs -->
    <div class="dashboard-tabs">
      <div class="tabs-header">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-button', { 'tab-button--active': activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <!-- Rewards Tab -->
        <div v-if="activeTab === 'rewards'" class="tab-panel">
          <div class="panel-header">
            <h3>Rewards Catalog</h3>
            <div class="panel-actions">
              <select v-model="rewardFilter" @change="loadRewards" class="filter-select">
                <option value="">All Rewards</option>
                <option value="discount">Discounts</option>
                <option value="free_shipping">Free Shipping</option>
                <option value="product">Products</option>
                <option value="cashback">Cashback</option>
              </select>
            </div>
          </div>

          <div v-if="rewards.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h4>No rewards available</h4>
            <p>Earn more points to unlock exclusive rewards</p>
          </div>

          <div v-else class="rewards-grid">
            <div
              v-for="reward in filteredRewards"
              :key="reward.id"
              class="reward-card"
              :class="{ 'reward-card--unavailable': reward.points_required > availablePoints }"
            >
              <div class="reward-header">
                <div class="reward-icon">
                  <svg v-if="reward.reward_type === 'discount'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="19" y1="5" x2="5" y2="19"/>
                    <circle cx="6.5" cy="6.5" r="2.5"/>
                    <circle cx="17.5" cy="17.5" r="2.5"/>
                  </svg>
                  <svg v-else-if="reward.reward_type === 'free_shipping'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="m1 1 4 4h15l-1 8H6"/>
                  </svg>
                </div>
                <div class="reward-points">{{ reward.points_required }} pts</div>
              </div>

              <div class="reward-content">
                <h4 class="reward-title">{{ reward.reward_name }}</h4>
                <p class="reward-description">{{ reward.description }}</p>
                <div v-if="reward.value" class="reward-value">
                  Value: ${{ reward.value }}
                </div>
              </div>

              <div class="reward-actions">
                <button
                  class="redeem-btn"
                  :disabled="reward.points_required > availablePoints || isRedeeming"
                  @click="redeemReward(reward)"
                >
                  {{ reward.points_required > availablePoints ? 'Need More Points' : 'Redeem' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Transactions Tab -->
        <div v-if="activeTab === 'transactions'" class="tab-panel">
          <div class="panel-header">
            <h3>Points History</h3>
            <div class="panel-actions">
              <select v-model="transactionFilter" @change="loadTransactions" class="filter-select">
                <option value="">All Transactions</option>
                <option value="earned">Earned</option>
                <option value="redeemed">Redeemed</option>
                <option value="bonus">Bonus</option>
              </select>
            </div>
          </div>

          <div v-if="pointsTransactions.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <h4>No transactions yet</h4>
            <p>Your points activity will appear here</p>
          </div>

          <div v-else class="transactions-list">
            <div
              v-for="transaction in filteredTransactions"
              :key="transaction.id"
              class="transaction-item"
            >
              <div class="transaction-icon" :class="`transaction-${transaction.transaction_type}`">
                <svg v-if="transaction.transaction_type === 'earned'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <svg v-else-if="transaction.transaction_type === 'redeemed'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                </svg>
              </div>

              <div class="transaction-content">
                <div class="transaction-description">{{ transaction.description || getTransactionDescription(transaction) }}</div>
                <div class="transaction-meta">
                  <span class="transaction-date">{{ formatDate(transaction.created_at) }}</span>
                  <span class="transaction-type">{{ transaction.transaction_type }}</span>
                </div>
              </div>

              <div class="transaction-amount" :class="`amount-${transaction.transaction_type}`">
                {{ transaction.transaction_type === 'earned' ? '+' : '-' }}{{ Math.abs(transaction.points) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Referrals Tab -->
        <div v-if="activeTab === 'referrals'" class="tab-panel">
          <div class="panel-header">
            <h3>Referral Program</h3>
            <div class="panel-actions">
              <button @click="showReferralModal = true" class="btn btn--primary">
                Invite Friends
              </button>
            </div>
          </div>

          <div class="referral-stats">
            <div class="stat-item">
              <div class="stat-value">{{ referrals.length }}</div>
              <div class="stat-label">Friends Invited</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ referrals.filter(r => r.referral_status === 'completed').length }}</div>
              <div class="stat-label">Successful Referrals</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ referrals.reduce((sum, r) => sum + r.points_earned, 0) }}</div>
              <div class="stat-label">Points Earned</div>
            </div>
          </div>

          <div v-if="referrals.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 2l-4 4"/>
                <path d="M18 2l4 4"/>
              </svg>
            </div>
            <h4>Start referring friends</h4>
            <p>Earn points for each successful referral</p>
          </div>

          <div v-else class="referrals-list">
            <div
              v-for="referral in referrals"
              :key="referral.id"
              class="referral-item"
            >
              <div class="referral-info">
                <div class="referral-email">{{ referral.referee_email }}</div>
                <div class="referral-status" :class="`status-${referral.referral_status}`">
                  {{ referral.referral_status }}
                </div>
              </div>
              <div class="referral-rewards">
                <div class="referral-points">+{{ referral.points_earned }} pts</div>
                <div v-if="referral.referral_data?.referral_url" class="referral-link">
                  <button @click="copyReferralLink(referral)" class="copy-link-btn">
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Referral Modal -->
    <div v-if="showReferralModal" class="modal-overlay" @click.self="showReferralModal = false">
      <div class="modal">
        <div class="modal__header">
          <h3>Invite Friends</h3>
          <button @click="showReferralModal = false" class="modal-close">×</button>
        </div>
        <div class="modal__body">
          <div class="referral-form">
            <div class="form-group">
              <label class="form-label">Friend's Email</label>
              <input
                v-model="referralEmail"
                type="email"
                class="form-input"
                placeholder="friend@example.com"
              />
            </div>
            <div class="referral-info">
              <div class="info-item">
                <div class="info-icon">🎁</div>
                <div class="info-text">
                  <strong>You get 250 points</strong> when your friend makes their first purchase
                </div>
              </div>
              <div class="info-item">
                <div class="info-icon">🎉</div>
                <div class="info-text">
                  <strong>Your friend gets 100 points</strong> as a welcome bonus
                </div>
              </div>
            </div>
            <div class="modal__actions">
              <button type="button" @click="showReferralModal = false" class="btn btn--outline">
                Cancel
              </button>
              <button
                type="button"
                @click="sendReferralInvite"
                class="btn btn--primary"
                :disabled="!referralEmail.trim()"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="clearError" class="error-message__close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLoyalty, type Reward, type Referral } from '@/composables/useLoyalty'
import { useAuth } from '@/composables/useAuth'

const {
  loyaltyAccount,
  pointsTransactions,
  rewards,
  referrals,
  currentTier,
  tierProgress,
  availablePoints,
  totalEarned,
  totalRedeemed,
  nextTier,
  tierBenefits,
  getLoyaltyAccount,
  getPointsTransactions,
  getRewards,
  getRewardRedemptions,
  redeemReward,
  createReferral,
  clearError,
  error
} = useLoyalty()

const { user } = useAuth()

// Local state
const activeTab = ref('rewards')
const rewardFilter = ref('')
const transactionFilter = ref('')
const showReferralModal = ref(false)
const referralEmail = ref('')
const isRedeeming = ref(false)

const tabs = [
  { id: 'rewards', label: 'Rewards' },
  { id: 'transactions', label: 'History' },
  { id: 'referrals', label: 'Referrals' }
]

// Computed
const filteredRewards = computed(() => {
  if (!rewardFilter.value) return rewards.value
  return rewards.value.filter(reward => reward.reward_type === rewardFilter.value)
})

const filteredTransactions = computed(() => {
  if (!transactionFilter.value) return pointsTransactions.value
  return pointsTransactions.value.filter(transaction => transaction.transaction_type === transactionFilter.value)
})

// Methods
const loadRewards = async () => {
  if (user.value?.id) {
    await getRewards()
  }
}

const loadTransactions = async () => {
  if (user.value?.id) {
    await getPointsTransactions(user.value.id, { type: transactionFilter.value || undefined })
  }
}

const handleRedeemReward = async (reward: Reward) => {
  if (!user.value?.id) return

  isRedeeming.value = true
  try {
    await redeemReward(reward.id, user.value.id)
    // Refresh data
    await getLoyaltyAccount(user.value.id)
    await getRewards()
  } catch (err) {
    console.error('Failed to redeem reward:', err)
  } finally {
    isRedeeming.value = false
  }
}

const sendReferralInvite = async () => {
  if (!user.value?.id || !referralEmail.value.trim()) return

  try {
    await createReferral(user.value.id, referralEmail.value.trim())
    referralEmail.value = ''
    showReferralModal.value = false
    // Could refresh referrals list here
  } catch (err) {
    console.error('Failed to send referral:', err)
  }
}

const copyReferralLink = async (referral: Referral) => {
  if (referral.referral_data?.referral_url) {
    await navigator.clipboard.writeText(referral.referral_data.referral_url)
    // Could show a toast notification
    alert('Referral link copied to clipboard!')
  }
}

const getTransactionDescription = (transaction: any) => {
  const typeMap: Record<string, string> = {
    earned: 'Points earned',
    redeemed: 'Points redeemed',
    bonus: 'Bonus points',
    expired: 'Points expired',
    adjusted: 'Points adjusted'
  }
  return typeMap[transaction.transaction_type] || 'Points transaction'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Initialize
onMounted(async () => {
  if (user.value?.id) {
    await getLoyaltyAccount(user.value.id)
    await loadRewards()
    await loadTransactions()
  }
})
</script>

<style scoped>
.loyalty-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-content {
  flex: 1;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.dashboard-subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin: 0;
}

.tier-badge {
  background: var(--bg-primary);
  border: 2px solid;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 300px;
}

.tier-bronze { border-color: #cd7f32; }
.tier-silver { border-color: #c0c0c0; }
.tier-gold { border-color: #ffd700; }
.tier-platinum { border-color: #e5e4e2; }
.tier-diamond { border-color: #b9f2ff; }

.tier-icon {
  width: 48px;
  height: 48px;
  background: currentColor;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.tier-bronze .tier-icon { color: #cd7f32; }
.tier-silver .tier-icon { color: #c0c0c0; }
.tier-gold .tier-icon { color: #ffd700; }
.tier-platinum .tier-icon { color: #e5e4e2; }
.tier-diamond .tier-icon { color: #b9f2ff; }

.tier-info {
  flex: 1;
}

.tier-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.tier-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: currentColor;
  transition: width 0.3s ease;
}

.tier-bronze .progress-fill { background: #cd7f32; }
.tier-silver .progress-fill { background: #c0c0c0; }
.tier-gold .progress-fill { background: #ffd700; }
.tier-platinum .progress-fill { background: #e5e4e2; }
.tier-diamond .progress-fill { background: #b9f2ff; }

.progress-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.points-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.points-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.points-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.points-info {
  flex: 1;
}

.points-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.points-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.tier-benefits {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 3rem;
}

.tier-benefits h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
}

.benefits-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.dashboard-tabs {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.tab-button--active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: var(--bg-secondary);
}

.tab-content {
  padding: 2rem;
}

.tab-panel {
  min-height: 400px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.panel-header h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.panel-actions {
  display: flex;
  gap: 1rem;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.reward-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.reward-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.reward-card--unavailable {
  opacity: 0.6;
  pointer-events: none;
}

.reward-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  background: var(--bg-secondary);
}

.reward-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.reward-points {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary-color);
}

.reward-content {
  padding: 1.5rem;
}

.reward-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.reward-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.reward-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--success-color);
}

.reward-actions {
  padding: 1rem 1.5rem 1.5rem;
}

.redeem-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: white;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.redeem-btn:hover:not(:disabled) {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}

.redeem-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--border-color);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.transaction-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.transaction-earned .transaction-icon {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.transaction-redeemed .transaction-icon {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.transaction-bonus .transaction-icon {
  background: rgba(251, 191, 36, 0.1);
  color: #d97706;
}

.transaction-content {
  flex: 1;
}

.transaction-description {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.transaction-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.transaction-amount {
  font-size: 1.1rem;
  font-weight: 700;
  text-align: right;
}

.amount-earned {
  color: #16a34a;
}

.amount-redeemed {
  color: #dc2626;
}

.amount-bonus {
  color: #d97706;
}

.referral-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-item {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.referrals-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.referral-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.referral-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.referral-email {
  font-weight: 500;
  color: var(--text-primary);
}

.referral-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-pending {
  background: rgba(251, 191, 36, 0.1);
  color: #d97706;
}

.status-completed {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.status-expired {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.referral-rewards {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.referral-points {
  font-weight: 600;
  color: var(--primary-color);
}

.copy-link-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-link-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.empty-state h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal__header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal__body {
  padding: 2rem;
}

.modal__actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.referral-form {
  max-width: 400px;
  margin: 0 auto;
}

.referral-info {
  margin: 1.5rem 0;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.info-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.info-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.4;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn--primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn--primary:hover:not(:disabled) {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}

.btn--outline {
  background: transparent;
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn--outline:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: var(--error-color);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
}

.error-message__close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.error-message__close:hover {
  opacity: 1;
}

/* Responsive design */
@media (max-width: 768px) {
  .loyalty-dashboard {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 1.5rem;
  }

  .tier-badge {
    min-width: auto;
    width: 100%;
  }

  .points-overview {
    grid-template-columns: 1fr;
  }

  .benefits-list {
    grid-template-columns: 1fr;
  }

  .tabs-header {
    flex-direction: column;
  }

  .panel-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .rewards-grid {
    grid-template-columns: 1fr;
  }

  .referral-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .referral-item {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .referral-rewards {
    align-self: flex-end;
  }

  .modal {
    width: 95%;
    margin: 1rem;
  }

  .modal__body {
    padding: 1.5rem;
  }

  .info-item {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
}
</style>