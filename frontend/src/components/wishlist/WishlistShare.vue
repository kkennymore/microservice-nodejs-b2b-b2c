<template>
  <div class="wishlist-share">
    <div class="wishlist-share__header">
      <h3 class="wishlist-share__title">Share Wishlist</h3>
      <p class="wishlist-share__subtitle">
        Share "{{ wishlist?.name }}" with others
      </p>
    </div>

    <div class="wishlist-share__options">
      <!-- Public Link Sharing -->
      <div class="share-option">
        <div class="share-option__header">
          <div class="share-option__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <div class="share-option__content">
            <h4 class="share-option__title">Share with Link</h4>
            <p class="share-option__description">
              Anyone with this link can view your wishlist
            </p>
          </div>
        </div>

        <div v-if="shareData?.shareUrl" class="share-option__link">
          <input
            :value="shareData.shareUrl"
            readonly
            class="share-link__input"
            ref="shareLinkInput"
          />
          <button
            class="btn btn--outline btn--sm"
            @click="copyShareLink"
            :disabled="copySuccess"
          >
            {{ copySuccess ? 'Copied!' : 'Copy Link' }}
          </button>
        </div>

        <div v-else class="share-option__actions">
          <button
            class="btn btn--primary btn--sm"
            @click="createPublicLink"
            :disabled="isCreating"
          >
            {{ isCreating ? 'Creating...' : 'Create Link' }}
          </button>
        </div>
      </div>

      <!-- Private Sharing -->
      <div class="share-option">
        <div class="share-option__header">
          <div class="share-option__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <circle cx="12" cy="16" r="1"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div class="share-option__content">
            <h4 class="share-option__title">Private Sharing</h4>
            <p class="share-option__description">
              Share with specific people you choose
            </p>
          </div>
        </div>

        <div class="share-option__form">
          <div class="form-group">
            <label class="form-label">Share with</label>
            <input
              v-model="privateShare.email"
              type="email"
              class="form-input"
              placeholder="Enter email address"
              @keyup.enter="addPrivateShare"
            />
          </div>

          <div class="share-option__actions">
            <button
              class="btn btn--outline btn--sm"
              @click="addPrivateShare"
              :disabled="!privateShare.email.trim() || isSharingPrivate"
            >
              {{ isSharingPrivate ? 'Sharing...' : 'Share' }}
            </button>
          </div>
        </div>

        <div v-if="privateShares.length > 0" class="private-shares">
          <h5 class="private-shares__title">Shared with:</h5>
          <div class="private-shares__list">
            <div
              v-for="share in privateShares"
              :key="share.id"
              class="private-share"
            >
              <span class="private-share__email">{{ share.sharedWith }}</span>
              <button
                class="private-share__remove"
                @click="removePrivateShare(share.id)"
                title="Remove share"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Social Media Sharing -->
      <div class="share-option">
        <div class="share-option__header">
          <div class="share-option__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <path d="m8.59 13.51 6.83 3.98"/>
              <path d="m15.41 6.51-6.82 3.98"/>
            </svg>
          </div>
          <div class="share-option__content">
            <h4 class="share-option__title">Share on Social Media</h4>
            <p class="share-option__description">
              Share your wishlist on social platforms
            </p>
          </div>
        </div>

        <div class="social-share-buttons">
          <button
            class="social-btn social-btn--facebook"
            @click="shareOnFacebook"
            title="Share on Facebook"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>

          <button
            class="social-btn social-btn--twitter"
            @click="shareOnTwitter"
            title="Share on Twitter"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            Twitter
          </button>

          <button
            class="social-btn social-btn--whatsapp"
            @click="shareOnWhatsApp"
            title="Share on WhatsApp"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            WhatsApp
          </button>
        </div>
      </div>
    </div>

    <div class="wishlist-share__footer">
      <button
        class="btn btn--outline"
        @click="$emit('close')"
      >
        Close
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Wishlist, WishlistShare } from '@/composables/useWishlist'

interface Props {
  wishlist: Wishlist
  shareData?: WishlistShare
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  createShare: [options: { shareType: string; sharedWith?: string; expiresAt?: string }]
  removeShare: [shareId: string]
}>()

const shareLinkInput = ref<HTMLInputElement>()
const copySuccess = ref(false)
const isCreating = ref(false)
const isSharingPrivate = ref(false)

const privateShare = ref({
  email: ''
})

const privateShares = ref<Array<{ id: string; sharedWith: string }>>([])

// Computed
const shareUrl = computed(() => {
  if (props.shareData?.shareUrl) {
    return props.shareData.shareUrl
  }
  return null
})

// Methods
const createPublicLink = async () => {
  isCreating.value = true

  try {
    emit('createShare', {
      shareType: 'public_link'
    })
  } catch (error) {
    console.error('Error creating public link:', error)
  } finally {
    isCreating.value = false
  }
}

const copyShareLink = async () => {
  if (shareUrl.value) {
    await navigator.clipboard.writeText(shareUrl.value)
    copySuccess.value = true

    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}

const addPrivateShare = async () => {
  if (!privateShare.value.email.trim()) return

  isSharingPrivate.value = true

  try {
    emit('createShare', {
      shareType: 'private',
      sharedWith: privateShare.value.email
    })

    privateShare.value.email = ''
  } catch (error) {
    console.error('Error sharing privately:', error)
  } finally {
    isSharingPrivate.value = false
  }
}

const removePrivateShare = (shareId: string) => {
  emit('removeShare', shareId)
}

const shareOnFacebook = () => {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value || window.location.href)}`
  window.open(url, '_blank', 'width=600,height=400')
}

const shareOnTwitter = () => {
  const text = `Check out my wishlist: ${props.wishlist.name}`
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl.value || window.location.href)}`
  window.open(url, '_blank', 'width=600,height=400')
}

const shareOnWhatsApp = () => {
  const text = `Check out my wishlist: ${props.wishlist.name} - ${shareUrl.value || window.location.href}`
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank')
}
</script>

<style scoped>
.wishlist-share {
  max-width: 600px;
  width: 100%;
}

.wishlist-share__header {
  text-align: center;
  margin-bottom: 2rem;
}

.wishlist-share__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.wishlist-share__subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.wishlist-share__options {
  space-y: 2rem;
  margin-bottom: 2rem;
}

.share-option {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  background: var(--bg-primary);
}

.share-option__header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.share-option__icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background: var(--primary-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.share-option__content {
  flex: 1;
}

.share-option__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.share-option__description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
}

.share-option__link {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.share-link__input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.9rem;
}

.share-option__actions {
  margin-top: 1rem;
}

.share-option__form {
  margin-top: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.social-share-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.social-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.social-btn:hover {
  border-color: var(--primary-color);
  background: var(--bg-secondary);
}

.social-btn--facebook:hover {
  border-color: #1877f2;
  color: #1877f2;
}

.social-btn--twitter:hover {
  border-color: #1da1f2;
  color: #1da1f2;
}

.social-btn--whatsapp:hover {
  border-color: #25d366;
  color: #25d366;
}

.private-shares {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-light);
}

.private-shares__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}

.private-shares__list {
  space-y: 0.5rem;
}

.private-share {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color-light);
}

.private-share:last-child {
  border-bottom: none;
}

.private-share__email {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.private-share__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.private-share__remove:hover {
  background: var(--error-color);
  color: white;
}

.wishlist-share__footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color-light);
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

.btn--sm {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .wishlist-share__options {
    space-y: 1.5rem;
  }

  .share-option {
    padding: 1rem;
  }

  .share-option__header {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .share-option__icon {
    align-self: center;
  }

  .share-link__input {
    font-size: 0.8rem;
  }

  .social-share-buttons {
    justify-content: center;
  }

  .social-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>