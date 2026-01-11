<template>
  <div class="wishlist-page">
    <div class="container">
      <!-- Page Header -->
      <div class="wishlist-page__header">
        <h1 class="wishlist-page__title">My Wishlists</h1>
        <p class="wishlist-page__subtitle">Save and organize your favorite products</p>

        <!-- Actions -->
        <div class="wishlist-page__actions">
          <button
            class="btn btn--primary"
            @click="showCreateModal = true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Create Wishlist
          </button>

          <button
            class="btn btn--outline"
            @click="showFollowedModal = true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Followed Wishlists
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && !wishlists.length" class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading your wishlists...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading && !hasWishlists" class="empty-state">
        <div class="empty-state__icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <h3 class="empty-state__title">No wishlists yet</h3>
        <p class="empty-state__description">
          Create your first wishlist to save and organize your favorite products
        </p>
        <button
          class="btn btn--primary"
          @click="showCreateModal = true"
        >
          Create Your First Wishlist
        </button>
      </div>

      <!-- Wishlists Grid -->
      <div v-else class="wishlists-grid">
        <WishlistCard
          v-for="wishlist in wishlists"
          :key="wishlist.id"
          :wishlist="wishlist"
          @edit="editWishlist(wishlist)"
          @delete="deleteWishlist(wishlist.id)"
          @share="shareWishlist(wishlist)"
          @view-details="viewWishlistDetails(wishlist.id)"
        />
      </div>

      <!-- Load More -->
      <div v-if="hasMoreWishlists && !isLoading" class="load-more">
        <button
          class="btn btn--outline"
          @click="loadMoreWishlists"
          :disabled="isLoading"
        >
          Load More Wishlists
        </button>
      </div>

      <!-- Create/Edit Wishlist Modal -->
      <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click.self="closeModals">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">
              {{ showEditModal ? 'Edit Wishlist' : 'Create New Wishlist' }}
            </h3>
            <button class="modal__close" @click="closeModals">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleWishlistSubmit" class="modal__body">
            <div class="form-group">
              <label for="wishlistName" class="form-label">Wishlist Name</label>
              <input
                id="wishlistName"
                v-model="wishlistForm.name"
                type="text"
                class="form-input"
                placeholder="e.g., Electronics, Fashion, Books..."
                required
              />
            </div>

            <div class="form-group">
              <label for="wishlistDescription" class="form-label">Description (Optional)</label>
              <textarea
                id="wishlistDescription"
                v-model="wishlistForm.description"
                class="form-textarea"
                placeholder="Describe what this wishlist is for..."
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-checkbox">
                <input
                  v-model="wishlistForm.isPublic"
                  type="checkbox"
                  class="form-checkbox__input"
                />
                <span class="form-checkbox__checkmark"></span>
                Make this wishlist public (others can follow it)
              </label>
            </div>

            <div class="modal__actions">
              <button type="button" class="btn btn--outline" @click="closeModals">
                Cancel
              </button>
              <button type="submit" class="btn btn--primary" :disabled="isSubmitting">
                {{ isSubmitting ? 'Saving...' : (showEditModal ? 'Update' : 'Create') }} Wishlist
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Share Wishlist Modal -->
      <div v-if="showShareModal" class="modal-overlay" @click.self="closeModals">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Share Wishlist</h3>
            <button class="modal__close" @click="closeModals">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal__body">
            <div v-if="shareData" class="share-options">
              <div class="share-option">
                <h4>Share Link</h4>
                <p>Anyone with this link can view your wishlist</p>
                <div class="share-link">
                  <input
                    :value="shareData.shareUrl"
                    readonly
                    class="form-input"
                    ref="shareLinkInput"
                  />
                  <button
                    class="btn btn--outline"
                    @click="copyShareLink"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              <div v-if="shareData.shareType === 'friends'" class="share-option">
                <h4>Share with Friends</h4>
                <p>Share this wishlist with specific friends</p>
                <!-- Friend selection would go here -->
              </div>
            </div>

            <div class="modal__actions">
              <button type="button" class="btn btn--outline" @click="closeModals">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Followed Wishlists Modal -->
      <div v-if="showFollowedModal" class="modal-overlay" @click.self="closeModals">
        <div class="modal modal--large">
          <div class="modal__header">
            <h3 class="modal__title">Wishlists You Follow</h3>
            <button class="modal__close" @click="closeModals">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal__body">
            <div v-if="followedWishlists.length === 0" class="empty-state">
              <p>You haven't followed any wishlists yet</p>
              <button class="btn btn--primary" @click="explorePublicWishlists">
                Explore Public Wishlists
              </button>
            </div>

            <div v-else class="followed-wishlists">
              <WishlistCard
                v-for="wishlist in followedWishlists"
                :key="wishlist.id"
                :wishlist="wishlist"
                :is-followed="true"
                @unfollow="unfollowWishlist(wishlist.id)"
                @view-details="viewWishlistDetails(wishlist.id)"
              />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWishlist, type Wishlist, type WishlistShare } from '@/composables/useWishlist'
import WishlistCard from '@/components/wishlist/WishlistCard.vue'

const router = useRouter()
const {
  wishlists,
  followedWishlists,
  isLoading,
  error,
  hasWishlists,
  fetchWishlists,
  fetchFollowedWishlists,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  shareWishlist,
  followWishlist,
  unfollowWishlist,
  clearError
} = useWishlist()

// Local state
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showShareModal = ref(false)
const showFollowedModal = ref(false)
const editingWishlist = ref<Wishlist | null>(null)
const shareData = ref<WishlistShare | null>(null)
const isSubmitting = ref(false)
const hasMoreWishlists = ref(false)

// Form data
const wishlistForm = ref({
  name: '',
  description: '',
  isPublic: false
})

// Methods
const closeModals = () => {
  showCreateModal.value = false
  showEditModal.value = false
  showShareModal.value = false
  showFollowedModal.value = false
  editingWishlist.value = null
  shareData.value = null
  wishlistForm.value = { name: '', description: '', isPublic: false }
}

const editWishlist = (wishlist: Wishlist) => {
  editingWishlist.value = wishlist
  wishlistForm.value = {
    name: wishlist.name,
    description: wishlist.description || '',
    isPublic: wishlist.is_public
  }
  showEditModal.value = true
}

const handleWishlistSubmit = async () => {
  if (!wishlistForm.value.name.trim()) return

  isSubmitting.value = true

  try {
    if (showEditModal.value && editingWishlist.value) {
      await updateWishlist(editingWishlist.value.id, wishlistForm.value)
    } else {
      await createWishlist(wishlistForm.value)
    }
    closeModals()
  } catch (err) {
    console.error('Error saving wishlist:', err)
  } finally {
    isSubmitting.value = false
  }
}

const handleDeleteWishlist = async (wishlistId: string) => {
  if (confirm('Are you sure you want to delete this wishlist? This action cannot be undone.')) {
    try {
      await deleteWishlist(wishlistId)
    } catch (err) {
      console.error('Error deleting wishlist:', err)
    }
  }
}

const handleShareWishlist = async (wishlist: Wishlist) => {
  try {
    const data = await shareWishlist(wishlist.id, {
      shareType: wishlist.is_public ? 'public_link' : 'private'
    })
    shareData.value = data
    showShareModal.value = true
  } catch (err) {
    console.error('Error sharing wishlist:', err)
  }
}

const copyShareLink = async () => {
  if (shareData.value?.shareUrl) {
    await navigator.clipboard.writeText(shareData.value.shareUrl)
    // Could show a toast notification here
    alert('Share link copied to clipboard!')
  }
}

const viewWishlistDetails = (wishlistId: string) => {
  router.push(`/wishlist/${wishlistId}`)
}

const loadMoreWishlists = async () => {
  // In a real implementation, this would fetch the next page
  // For now, just refetch all
  await fetchWishlists()
}

const explorePublicWishlists = () => {
  closeModals()
  router.push('/wishlists/public')
}

// Lifecycle
onMounted(async () => {
  await fetchWishlists()
})
</script>

<style scoped>
.wishlist-page {
  padding: 2rem 0;
  min-height: 100vh;
}

.wishlist-page__header {
  text-align: center;
  margin-bottom: 3rem;
}

.wishlist-page__title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.wishlist-page__subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.wishlist-page__actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.wishlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.load-more {
  text-align: center;
  margin-top: 2rem;
}

.loading-spinner {
  text-align: center;
  padding: 4rem 0;
}

.loading-spinner .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  max-width: 400px;
  margin: 0 auto;
}

.empty-state__icon {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.empty-state__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-state__description {
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
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
  padding: 1rem;
}

.modal {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal--large {
  max-width: 800px;
}

.modal__header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal__close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal__close:hover {
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

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 400;
}

.form-checkbox__input {
  width: 18px;
  height: 18px;
  margin: 0;
}

.share-options {
  space-y: 2rem;
}

.share-option {
  margin-bottom: 2rem;
}

.share-option h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.share-option p {
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.share-link {
  display: flex;
  gap: 0.5rem;
}

.share-link .form-input {
  flex: 1;
}

.followed-wishlists {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
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

/* Button styles */
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* Responsive design */
@media (max-width: 768px) {
  .wishlist-page__title {
    font-size: 2rem;
  }

  .wishlist-page__actions {
    flex-direction: column;
    align-items: center;
  }

  .wishlists-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .modal__body {
    padding: 1.5rem;
  }

  .modal__actions {
    flex-direction: column;
  }

  .share-link {
    flex-direction: column;
  }
}
</style>