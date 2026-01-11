<template>
  <div class="profile-page">
    <div class="profile-container">
      <!-- Profile Sidebar -->
      <div class="profile-sidebar">
        <div class="profile-avatar">
          <img
            v-if="user?.avatar"
            :src="user.avatar"
            :alt="user.name"
            class="avatar-image"
          />
          <div v-else class="avatar-placeholder">
            {{ userInitials }}
          </div>
        </div>

        <h3 class="profile-name">{{ user?.name }}</h3>
        <p class="profile-email">{{ user?.email }}</p>

        <nav class="profile-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="nav-item"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-text">{{ tab.label }}</span>
          </button>
        </nav>
      </div>

      <!-- Profile Content -->
      <div class="profile-content">
        <!-- Profile Information -->
        <div v-if="activeTab === 'profile'" class="profile-section">
          <Card>
            <template #header>
              <h3>Profile Information</h3>
            </template>

            <form @submit.prevent="updateProfile">
              <div class="form-row">
                <Input
                  v-model="profileForm.firstName"
                  label="First Name"
                  :error="profileErrors.firstName"
                  required
                />
                <Input
                  v-model="profileForm.lastName"
                  label="Last Name"
                  :error="profileErrors.lastName"
                  required
                />
              </div>

              <Input
                v-model="profileForm.username"
                label="Username"
                :error="profileErrors.username"
                required
              />

              <Input
                v-model="profileForm.phone"
                label="Phone Number"
                :error="profileErrors.phone"
                required
              />

              <div class="form-actions">
                <Button
                  type="submit"
                  variant="primary"
                  :loading="updatingProfile"
                >
                  Update Profile
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <!-- Account Settings -->
        <div v-if="activeTab === 'account'" class="profile-section">
          <Card>
            <template #header>
              <h3>Account Settings</h3>
            </template>

            <div class="settings-section">
              <h4>Email Address</h4>
              <p class="current-value">{{ user?.email }}</p>
              <Button variant="outline" size="sm" @click="showChangeEmail = true">
                Change Email
              </Button>
            </div>

            <div class="settings-section">
              <h4>Password</h4>
              <p class="current-value">••••••••</p>
              <Button variant="outline" size="sm" @click="showChangePassword = true">
                Change Password
              </Button>
            </div>

            <div class="settings-section">
              <h4>Two-Factor Authentication</h4>
              <p class="current-value">Not enabled</p>
              <Button variant="outline" size="sm">
                Enable 2FA
              </Button>
            </div>
          </Card>
        </div>

        <!-- Preferences -->
        <div v-if="activeTab === 'preferences'" class="profile-section">
          <Card>
            <template #header>
              <h3>Preferences</h3>
            </template>

            <form @submit.prevent="updatePreferences">
              <div class="form-group">
                <label>Language</label>
                <select v-model="preferencesForm.language" class="form-select">
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="zh">中文</option>
                </select>
              </div>

              <div class="form-group">
                <label>Currency</label>
                <select v-model="preferencesForm.currency" class="form-select">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Theme</label>
                <select v-model="preferencesForm.theme" class="form-select">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    v-model="preferencesForm.notifications"
                    type="checkbox"
                    class="checkbox"
                  />
                  Email notifications
                </label>
              </div>

              <div class="form-actions">
                <Button
                  type="submit"
                  variant="primary"
                  :loading="updatingPreferences"
                >
                  Update Preferences
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <!-- Subscription -->
        <div v-if="activeTab === 'subscription'" class="profile-section">
          <Card>
            <template #header>
              <h3>Subscription</h3>
            </template>

            <div class="subscription-info">
              <div class="current-plan">
                <h4>Current Plan: {{ subscriptionStore.currentPlan.toUpperCase() }}</h4>
                <p v-if="user?.subscriptionEndDate">
                  Expires: {{ formatDate(user.subscriptionEndDate) }}
                </p>
              </div>

              <div class="plan-features">
                <h4>Features</h4>
                <ul>
                  <li
                    v-for="feature in subscriptionStore.features"
                    :key="feature"
                    :class="{ available: subscriptionStore.features[feature] }"
                  >
                    {{ feature.replace(/([A-Z])/g, ' $1').toLowerCase() }}
                  </li>
                </ul>
              </div>

              <div class="upgrade-options" v-if="subscriptionStore.currentPlan !== 'platinum'">
                <h4>Upgrade Options</h4>
                <div class="plans-grid">
                  <div
                    v-for="(plan, key) in subscriptionStore.plans"
                    :key="key"
                    class="plan-card"
                    :class="{ current: key === subscriptionStore.currentPlan }"
                  >
                    <h5>{{ plan.name }}</h5>
                    <p class="plan-price">${{ plan.price }}/month</p>
                    <Button
                      v-if="key !== subscriptionStore.currentPlan"
                      variant="primary"
                      size="sm"
                      @click="upgradePlan(key)"
                    >
                      Upgrade
                    </Button>
                    <span v-else class="current-badge">Current</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <!-- Security -->
        <div v-if="activeTab === 'security'" class="profile-section">
          <Card>
            <template #header>
              <h3>Security</h3>
            </template>

            <div class="security-section">
              <h4>Login History</h4>
              <div class="login-history">
                <div class="login-item">
                  <span class="device">Chrome on Windows</span>
                  <span class="location">New York, US</span>
                  <span class="time">2 hours ago</span>
                </div>
                <div class="login-item">
                  <span class="device">Safari on iPhone</span>
                  <span class="location">New York, US</span>
                  <span class="time">1 day ago</span>
                </div>
              </div>
            </div>

            <div class="security-section">
              <h4>Active Sessions</h4>
              <div class="sessions-list">
                <div class="session-item">
                  <span class="device">Current session</span>
                  <span class="location">New York, US</span>
                  <Button variant="outline" size="sm" disabled>
                    Current
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores'
import { useSubscriptionStore } from '@/stores'
import { Button, Input, Card } from '@/components'

const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

const user = computed(() => authStore.user)
const userInitials = computed(() => {
  const name = user.value?.name || ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

const activeTab = ref('profile')

const tabs = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'account', label: 'Account', icon: '⚙️' },
  { id: 'preferences', label: 'Preferences', icon: '🎛️' },
  { id: 'subscription', label: 'Subscription', icon: '💎' },
  { id: 'security', label: 'Security', icon: '🔒' }
]

// Profile form
const profileForm = reactive({
  firstName: '',
  lastName: '',
  username: '',
  phone: ''
})

const profileErrors = reactive({
  firstName: '',
  lastName: '',
  username: '',
  phone: ''
})

const updatingProfile = ref(false)

// Preferences form
const preferencesForm = reactive({
  language: 'en',
  currency: 'USD',
  theme: 'light',
  notifications: true
})

const updatingPreferences = ref(false)

// Modal states
const showChangeEmail = ref(false)
const showChangePassword = ref(false)

onMounted(() => {
  // Load user data into forms
  if (user.value) {
    profileForm.firstName = user.value.firstName
    profileForm.lastName = user.value.lastName
    profileForm.username = user.value.username
    profileForm.phone = user.value.phone

    preferencesForm.language = user.value.preferences?.language || 'en'
    preferencesForm.currency = user.value.preferences?.currency || 'USD'
    preferencesForm.theme = user.value.preferences?.theme || 'light'
    preferencesForm.notifications = user.value.preferences?.notifications !== false
  }
})

const updateProfile = async () => {
  updatingProfile.value = true
  try {
    // API call to update profile
    console.log('Updating profile:', profileForm)
    await new Promise(resolve => setTimeout(resolve, 1000))
    // Update auth store
  } catch (error) {
    console.error('Profile update failed:', error)
  } finally {
    updatingProfile.value = false
  }
}

const updatePreferences = async () => {
  updatingPreferences.value = true
  try {
    // API call to update preferences
    console.log('Updating preferences:', preferencesForm)
    authStore.updatePreferences(preferencesForm)
    await new Promise(resolve => setTimeout(resolve, 1000))
  } catch (error) {
    console.error('Preferences update failed:', error)
  } finally {
    updatingPreferences.value = false
  }
}

const upgradePlan = async (plan: string) => {
  try {
    await subscriptionStore.upgrade(plan as any)
    console.log('Upgraded to plan:', plan)
  } catch (error) {
    console.error('Upgrade failed:', error)
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString()
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: var(--bg-secondary);
  padding: var(--spacing-lg) 0;
}

.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--spacing-xl);
  padding: 0 var(--spacing-lg);
}

.profile-sidebar {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.profile-avatar {
  margin-bottom: var(--spacing-lg);
}

.avatar-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  margin: 0 auto;
}

.profile-name {
  margin: var(--spacing-md) 0 var(--spacing-xs) 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.profile-email {
  color: var(--text-muted);
  margin: 0;
}

.profile-nav {
  margin-top: var(--spacing-xl);
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--border-radius-md);
  transition: all var(--transition-fast);
  text-align: left;
}

.nav-item:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.nav-item.active {
  background-color: var(--primary-color);
  color: var(--text-light);
}

.nav-icon {
  font-size: 1.2rem;
  min-width: 20px;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.profile-section {
  width: 100%;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-base);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.checkbox {
  margin: 0;
}

.settings-section {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.settings-section:last-child {
  border-bottom: none;
}

.current-value {
  color: var(--text-secondary);
  margin: var(--spacing-xs) 0 var(--spacing-md) 0;
}

.subscription-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.current-plan {
  background-color: var(--bg-secondary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
}

.plan-features ul {
  list-style: none;
  padding: 0;
  margin: var(--spacing-md) 0 0 0;
}

.plan-features li {
  padding: var(--spacing-xs) 0;
  position: relative;
  padding-left: var(--spacing-lg);
}

.plan-features li.available::before {
  content: '✓';
  color: var(--success-color);
  font-weight: bold;
  position: absolute;
  left: 0;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.plan-card {
  background-color: var(--bg-secondary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  text-align: center;
  border: 2px solid transparent;
  transition: all var(--transition-fast);
}

.plan-card.current {
  border-color: var(--primary-color);
  background-color: var(--bg-primary);
}

.plan-price {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
  margin: var(--spacing-sm) 0;
}

.current-badge {
  background-color: var(--success-color);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
}

.login-history,
.sessions-list {
  margin-top: var(--spacing-md);
}

.login-item,
.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-sm);
}

.device {
  font-weight: 500;
}

.location,
.time {
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .profile-container {
    grid-template-columns: 250px 1fr;
    gap: var(--spacing-lg);
  }
}

@media (max-width: 768px) {
  .profile-container {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }

  .profile-sidebar {
    order: 2;
  }

  .profile-content {
    order: 1;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }
}
</style>