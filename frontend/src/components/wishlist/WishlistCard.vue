<template>
  <div class="wishlist-card">
    <div class="wishlist-card__header">
      <div class="wishlist-card__info">
        <h3 class="wishlist-card__title">{{ wishlist.name }}</h3>
        <p v-if="wishlist.description" class="wishlist-card__description">
          {{ wishlist.description }}
        </p>
        <div class="wishlist-card__meta">
          <span class="wishlist-card__item-count">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="m1 1 4 4h15l-1 8H6"/>
            </svg>
            {{ wishlist.item_count }} items
          </span>
          <span v-if="wishlist.followers_count" class="wishlist-card__followers">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 2l-4 4"/>
              <path d="M18 2l4 4"/>
            </svg>
            {{ wishlist.followers_count }} followers
          </span>
          <span v-if="wishlist.is_public" class="wishlist-card__visibility">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Public
          </span>
        </div>
      </div>

      <div class="wishlist-card__actions">
        <button
          v-if="!isFollowed"
          class="wishlist-card__action-btn"
          @click="$emit('edit')"
          title="Edit wishlist"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        <button
          class="wishlist-card__action-btn"
          @click="$emit('share')"
          title="Share wishlist"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <path d="m8.59 13.51 6.83 3.98"/>
            <path d="m15.41 6.51-6.82 3.98"/>
          </svg>
        </button>

        <div class="wishlist-card__dropdown">
          <button
            class="wishlist-card__action-btn wishlist-card__dropdown-trigger"
            @click="toggleDropdown"
            title="More options"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="12" cy="5" r="1"/>
              <circle cx="12" cy="19" r="1"/>
            </svg>
          </button>

          <div v-if="showDropdown" class="wishlist-card__dropdown-menu">
            <button
              class="wishlist-card__dropdown-item"
              @click="handleViewDetails"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              View Details
            </button>

            <button
              v-if="!isFollowed"
              class="wishlist-card__dropdown-item"
              @click="$emit('delete')"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              Delete
            </button>

            <button
              v-if="isFollowed"
              class="wishlist-card__dropdown-item wishlist-card__dropdown-item--danger"
              @click="$emit('unfollow')"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 2l-4 4"/>
                <path d="M18 2l4 4"/>
              </svg>
              Unfollow
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="wishlist-card__content">
      <!-- Preview of items (if available) -->
      <div v-if="previewItems && previewItems.length > 0" class="wishlist-card__items-preview">
        <div
          v-for="item in previewItems.slice(0, 4)"
          :key="item.id"
          class="wishlist-card__item-preview"
        >
          <img
            :src="item.product.image_url || '/placeholder-product.jpg'"
            :alt="item.product.name"
            class="wishlist-card__item-image"
          />
        </div>
        <div v-if="previewItems.length > 4" class="wishlist-card__more-items">
          +{{ previewItems.length - 4 }} more
        </div>
      </div>

      <!-- Empty state for wishlists with no items -->
      <div v-else class="wishlist-card__empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="m1 1 4 4h15l-1 8H6"/>
        </svg>
        <p>No items yet</p>
      </div>
    </div>

    <div class="wishlist-card__footer">
      <button
        class="wishlist-card__view-btn"
        @click="handleViewDetails"
      >
        View Wishlist
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Wishlist, WishlistItem } from '@/composables/useWishlist'

interface Props {
  wishlist: Wishlist
  isFollowed?: boolean
  previewItems?: WishlistItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: []
  delete: []
  share: []
  viewDetails: [wishlistId: string]
  unfollow: [wishlistId: string]
}>()

const showDropdown = ref(false)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleViewDetails = () => {
  emit('viewDetails', props.wishlist.id)
}

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.wishlist-card__dropdown')) {
    showDropdown.value = false
  }
}

document.addEventListener('click', handleClickOutside)
</script>

<style scoped>
.wishlist-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.wishlist-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.wishlist-card__header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--border-color-light);
}

.wishlist-card__info {
  flex: 1;
  min-width: 0;
}

.wishlist-card__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wishlist-card__description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wishlist-card__meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.wishlist-card__item-count,
.wishlist-card__followers,
.wishlist-card__visibility {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.wishlist-card__actions {
  display: flex;
  gap: 0.5rem;
  position: relative;
}

.wishlist-card__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wishlist-card__action-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.wishlist-card__dropdown {
  position: relative;
}

.wishlist-card__dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 160px;
  padding: 0.5rem 0;
}

.wishlist-card__dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: left;
}

.wishlist-card__dropdown-item:hover {
  background: var(--bg-secondary);
}

.wishlist-card__dropdown-item--danger {
  color: var(--error-color);
}

.wishlist-card__dropdown-item--danger:hover {
  background: rgba(var(--error-rgb), 0.1);
}

.wishlist-card__content {
  padding: 1.5rem;
  min-height: 120px;
}

.wishlist-card__items-preview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.wishlist-card__item-preview {
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color-light);
}

.wishlist-card__item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wishlist-card__more-items {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.wishlist-card__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--text-muted);
  text-align: center;
}

.wishlist-card__empty svg {
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.wishlist-card__empty p {
  font-size: 0.9rem;
  margin: 0;
}

.wishlist-card__footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color-light);
  background: var(--bg-secondary);
}

.wishlist-card__view-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: white;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  justify-content: center;
}

.wishlist-card__view-btn:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}

/* Responsive design */
@media (max-width: 768px) {
  .wishlist-card__header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }

  .wishlist-card__actions {
    align-self: flex-end;
  }

  .wishlist-card__meta {
    gap: 0.75rem;
  }

  .wishlist-card__content {
    padding: 1rem;
  }

  .wishlist-card__footer {
    padding: 0.75rem 1rem;
  }

  .wishlist-card__items-preview {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>