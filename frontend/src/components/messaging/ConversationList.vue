<template>
  <div class="conversation-list">
    <div class="conversation-list__header">
      <h2 class="conversation-list__title">Messages</h2>

      <div class="conversation-list__actions">
        <Button
          variant="outline"
          size="sm"
          @click="toggleSearch"
          class="conversation-list__search-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </Button>

        <Button
          variant="primary"
          size="sm"
          @click="$emit('new-conversation')"
          class="conversation-list__new-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </Button>
      </div>
    </div>

    <!-- Search -->
    <div v-if="showSearch" class="conversation-list__search">
      <div class="conversation-list__search-input">
        <svg class="conversation-list__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search conversations..."
          class="conversation-list__input"
          @input="debouncedSearch"
        />
        <Button
          v-if="searchQuery"
          variant="ghost"
          size="sm"
          @click="clearSearch"
          class="conversation-list__clear-btn"
        >
          ×
        </Button>
      </div>
    </div>

    <!-- Conversations -->
    <div class="conversation-list__conversations">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        :class="[
          'conversation-list__item',
          { 'conversation-list__item--active': conversation.id === activeConversationId }
        ]"
        @click="$emit('select-conversation', conversation.id)"
      >
        <div class="conversation-list__avatar">
          <img
            v-if="conversation.participants[0]?.avatar"
            :src="conversation.participants[0].avatar"
            :alt="conversation.participants[0].name"
            class="conversation-list__avatar-img"
          />
          <div v-else class="conversation-list__avatar-placeholder">
            {{ getInitials(conversation.participants[0]?.name || 'U') }}
          </div>

          <div
            v-if="conversation.participants[0]?.isOnline"
            class="conversation-list__online-indicator"
          ></div>
        </div>

        <div class="conversation-list__content">
          <div class="conversation-list__header">
            <div class="conversation-list__participant">
              {{ conversation.participants[0]?.name || 'Unknown User' }}
            </div>

            <div class="conversation-list__time">
              {{ formatTime(conversation.lastMessage?.createdAt) }}
            </div>
          </div>

          <div class="conversation-list__message">
            <div v-if="conversation.lastMessage" class="conversation-list__message-content">
              <span v-if="isOwnMessage(conversation.lastMessage)" class="conversation-list__message-prefix">You: </span>
              {{ getMessagePreview(conversation.lastMessage) }}
            </div>
            <div v-else class="conversation-list__message-placeholder">
              No messages yet
            </div>
          </div>
        </div>

        <div v-if="conversation.unreadCount > 0" class="conversation-list__unread">
          {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="conversation-list__loading">
      <div v-for="i in 5" :key="i" class="conversation-list__skeleton">
        <div class="conversation-list__skeleton-avatar"></div>
        <div class="conversation-list__skeleton-content">
          <div class="conversation-list__skeleton-line conversation-list__skeleton-line--long"></div>
          <div class="conversation-list__skeleton-line conversation-list__skeleton-line--short"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && conversations.length === 0" class="conversation-list__empty">
      <svg class="conversation-list__empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <h3 class="conversation-list__empty-title">
        {{ searchQuery ? 'No conversations found' : 'No messages yet' }}
      </h3>
      <p class="conversation-list__empty-description">
        {{ searchQuery ? 'Try a different search term' : 'Start a conversation to connect with sellers and buyers' }}
      </p>
      <Button
        v-if="!searchQuery"
        variant="primary"
        @click="$emit('new-conversation')"
      >
        Start a Conversation
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import type { Conversation } from '@/services/messagingAPI'
import Button from '@/components/Button.vue'

interface Props {
  conversations: Conversation[]
  activeConversationId?: string
  loading?: boolean
  currentUserId?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  currentUserId: ''
})

const emit = defineEmits<{
  'select-conversation': [conversationId: string]
  'new-conversation': []
  search: [query: string]
}>()

const showSearch = ref(false)
const searchQuery = ref('')

// Debounced search
const { debouncedValue: debouncedSearchQuery } = useDebounce(searchQuery, 500)

// Watch for search changes
watch(debouncedSearchQuery, (newQuery) => {
  emit('search', newQuery)
})

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    clearSearch()
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  emit('search', '')
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const formatTime = (dateString?: string) => {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'now' // less than 1 minute
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m` // minutes
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h` // hours

  return date.toLocaleDateString()
}

const isOwnMessage = (message: any) => {
  return message.senderId === props.currentUserId
}

const getMessagePreview = (message: any) => {
  if (message.messageType === 'image') return '📷 Image'
  if (message.messageType === 'file') return '📎 File'
  if (message.messageType === 'system') return message.content

  // Truncate long messages
  return message.content.length > 50
    ? message.content.substring(0, 50) + '...'
    : message.content
}
</script>

<style scoped>
.conversation-list {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.conversation-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.conversation-list__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}

.conversation-list__actions {
  display: flex;
  gap: var(--spacing-xs);
}

.conversation-list__search-btn,
.conversation-list__new-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conversation-list__search {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.conversation-list__search-input {
  position: relative;
}

.conversation-list__search-icon {
  position: absolute;
  left: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.conversation-list__input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) calc(var(--spacing-sm) + 20px);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
}

.conversation-list__input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.conversation-list__clear-btn {
  position: absolute;
  right: var(--spacing-xs);
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: var(--font-size-lg);
  color: var(--text-muted);
}

.conversation-list__conversations {
  flex: 1;
  overflow-y: auto;
}

.conversation-list__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border-bottom: 1px solid var(--border-color-lighter);
}

.conversation-list__item:hover {
  background: var(--bg-light);
}

.conversation-list__item--active {
  background: var(--primary-light);
  border-left: 3px solid var(--primary-color);
}

.conversation-list__avatar {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.conversation-list__avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.conversation-list__avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--primary-color);
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-base);
}

.conversation-list__online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--success-color);
  border: 2px solid var(--bg-white);
}

.conversation-list__content {
  flex: 1;
  min-width: 0;
}

.conversation-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.conversation-list__participant {
  font-weight: 600;
  color: var(--text-dark);
  font-size: var(--font-size-base);
}

.conversation-list__time {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.conversation-list__message {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  line-height: 1.4;
}

.conversation-list__message-prefix {
  font-weight: 500;
  color: var(--primary-color);
}

.conversation-list__message-placeholder {
  font-style: italic;
}

.conversation-list__unread {
  background: var(--primary-color);
  color: var(--text-light);
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.conversation-list__loading {
  padding: var(--spacing-lg);
}

.conversation-list__skeleton {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.conversation-list__skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.conversation-list__skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.conversation-list__skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, var(--bg-light) 25%, var(--bg-white) 50%, var(--bg-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--border-radius-sm);
}

.conversation-list__skeleton-line--long {
  width: 100%;
}

.conversation-list__skeleton-line--short {
  width: 60%;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.conversation-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  text-align: center;
  flex: 1;
}

.conversation-list__empty-icon {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

.conversation-list__empty-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.conversation-list__empty-description {
  color: var(--text-muted);
  margin-bottom: var(--spacing-xl);
  max-width: 300px;
}

@media (max-width: 768px) {
  .conversation-list__header {
    padding: var(--spacing-md);
  }

  .conversation-list__search {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .conversation-list__item {
    padding: var(--spacing-sm) var(--spacing-md);
    gap: var(--spacing-sm);
  }

  .conversation-list__avatar {
    width: 40px;
    height: 40px;
  }

  .conversation-list__participant {
    font-size: var(--font-size-sm);
  }

  .conversation-list__time {
    font-size: 11px;
  }

  .conversation-list__message {
    font-size: 12px;
  }
}
</style>