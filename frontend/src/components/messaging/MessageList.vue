<template>
  <div class="message-list" ref="messageListRef">
    <!-- Loading State -->
    <div v-if="loading && messages.length === 0" class="message-list__loading">
      <div v-for="i in 6" :key="i" class="message-list__skeleton">
        <div :class="[
          'message-list__skeleton-bubble',
          i % 2 === 0 ? 'message-list__skeleton-bubble--own' : 'message-list__skeleton-bubble--other'
        ]"></div>
      </div>
    </div>

    <!-- Messages -->
    <div v-else class="message-list__messages">
      <!-- Load More Button -->
      <Button
        v-if="hasMoreMessages && !loading"
        variant="outline"
        size="sm"
        @click="loadMoreMessages"
        :loading="loading"
        class="message-list__load-more"
      >
        Load Earlier Messages
      </Button>

      <!-- Message Bubbles -->
      <div
        v-for="message in messages"
        :key="message.id"
        :class="[
          'message-list__message',
          isOwnMessage(message) ? 'message-list__message--own' : 'message-list__message--other'
        ]"
      >
        <!-- Message Header (for other users) -->
        <div v-if="!isOwnMessage(message)" class="message-list__message-header">
          <div class="message-list__sender-avatar">
            <img
              v-if="message.senderAvatar"
              :src="message.senderAvatar"
              :alt="message.senderName"
              class="message-list__sender-avatar-img"
            />
            <div v-else class="message-list__sender-avatar-placeholder">
              {{ getInitials(message.senderName) }}
            </div>
          </div>
          <span class="message-list__sender-name">{{ message.senderName }}</span>
          <span class="message-list__timestamp">{{ formatTime(message.createdAt) }}</span>
        </div>

        <!-- Message Content -->
        <div class="message-list__content">
          <!-- Text Message -->
          <div v-if="message.messageType === 'text'" class="message-list__text">
            {{ message.content }}
          </div>

          <!-- Image Message -->
          <div v-else-if="message.messageType === 'image'" class="message-list__image">
            <OptimizedImage
              :src="message.fileUrl!"
              :alt="message.content || 'Image'"
              class="message-list__image-content"
              @click="openImage(message.fileUrl!)"
            />
            <p v-if="message.content" class="message-list__image-caption">{{ message.content }}</p>
          </div>

          <!-- File Message -->
          <div v-else-if="message.messageType === 'file'" class="message-list__file">
            <div class="message-list__file-info">
              <svg class="message-list__file-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              <div class="message-list__file-details">
                <div class="message-list__file-name">{{ message.fileName }}</div>
                <div class="message-list__file-size">{{ formatFileSize(message.fileSize!) }}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              @click="downloadFile(message.fileUrl!, message.fileName!)"
              class="message-list__file-download"
            >
              Download
            </Button>
          </div>

          <!-- System Message -->
          <div v-else-if="message.messageType === 'system'" class="message-list__system">
            {{ message.content }}
          </div>

          <!-- Message Actions -->
          <div class="message-list__actions">
            <span class="message-list__timestamp">{{ formatTime(message.createdAt) }}</span>

            <!-- Status Indicators -->
            <div v-if="isOwnMessage(message)" class="message-list__status">
              <svg
                v-if="message.status === 'read'"
                class="message-list__status-icon message-list__status-icon--read"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polyline points="20,6 9,17 4,12"/>
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              <svg
                v-else-if="message.status === 'delivered'"
                class="message-list__status-icon message-list__status-icon--delivered"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              <svg
                v-else-if="message.status === 'sent'"
                class="message-list__status-icon message-list__status-icon--sent"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>

            <!-- Message Menu -->
            <div class="message-list__menu">
              <button
                class="message-list__menu-btn"
                @click="toggleMessageMenu(message.id)"
                aria-label="Message options"
              >
                ⋮
              </button>

              <div
                v-if="activeMenu === message.id"
                class="message-list__menu-dropdown"
                v-click-outside="closeMenu"
              >
                <button
                  v-if="isOwnMessage(message) && canEdit(message)"
                  class="message-list__menu-item"
                  @click="editMessage(message)"
                >
                  Edit
                </button>
                <button
                  class="message-list__menu-item"
                  @click="replyToMessage(message)"
                >
                  Reply
                </button>
                <button
                  v-if="isOwnMessage(message)"
                  class="message-list__menu-item message-list__menu-item--danger"
                  @click="deleteMessage(message.id)"
                >
                  Delete
                </button>
                <button
                  class="message-list__menu-item message-list__menu-item--danger"
                  @click="reportMessage(message)"
                >
                  Report
                </button>
              </div>
            </div>
          </div>

          <!-- Reply Preview -->
          <div v-if="replyingTo?.id === message.id" class="message-list__reply-indicator">
            Replying to this message
          </div>
        </div>
      </div>
    </div>

    <!-- Typing Indicator -->
    <div v-if="showTyping" class="message-list__typing">
      <div class="message-list__typing-avatar">
        <div class="message-list__typing-placeholder">U</div>
      </div>
      <div class="message-list__typing-bubble">
        <div class="message-list__typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import type { Message } from '@/services/messagingAPI'
import OptimizedImage from '@/components/OptimizedImage.vue'
import Button from '@/components/Button.vue'

interface Props {
  messages: Message[]
  currentUserId: string
  loading?: boolean
  hasMoreMessages?: boolean
  showTyping?: boolean
  replyingTo?: Message | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasMoreMessages: false,
  showTyping: false,
  replyingTo: null
})

const emit = defineEmits<{
  'load-more': []
  'edit-message': [message: Message]
  'delete-message': [messageId: string]
  'reply-message': [message: Message]
  'report-message': [message: Message]
}>()

const messageListRef = ref<HTMLElement>()
const activeMenu = ref<string | null>(null)

const isOwnMessage = (message: Message) => {
  return message.senderId === props.currentUserId
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return date.toLocaleDateString()
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const loadMoreMessages = () => {
  emit('load-more')
}

const toggleMessageMenu = (messageId: string) => {
  activeMenu.value = activeMenu.value === messageId ? null : messageId
}

const closeMenu = () => {
  activeMenu.value = null
}

const canEdit = (message: Message) => {
  const messageTime = new Date(message.createdAt).getTime()
  const now = new Date().getTime()
  const fiveMinutes = 5 * 60 * 1000
  return message.messageType === 'text' && (now - messageTime) < fiveMinutes
}

const editMessage = (message: Message) => {
  emit('edit-message', message)
  closeMenu()
}

const replyToMessage = (message: Message) => {
  emit('reply-message', message)
  closeMenu()
}

const deleteMessage = (messageId: string) => {
  emit('delete-message', messageId)
  closeMenu()
}

const reportMessage = (message: Message) => {
  emit('report-message', message)
  closeMenu()
}

const openImage = (imageUrl: string) => {
  window.open(imageUrl, '_blank')
}

const downloadFile = (fileUrl: string, fileName: string) => {
  const link = document.createElement('a')
  link.href = fileUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Auto-scroll to bottom when new messages arrive
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// Watch for new messages and scroll to bottom
watch(() => props.messages.length, scrollToBottom)
watch(() => props.showTyping, scrollToBottom)

onMounted(() => {
  scrollToBottom()
})

// Handle click outside directive
const vClickOutside = {
  mounted: (el: HTMLElement, binding: any) => {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted: (el: HTMLElement) => {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}
</script>

<style scoped>
.message-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  overflow-y: auto;
  background: var(--bg-light);
}

.message-list__loading {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
}

.message-list__skeleton {
  display: flex;
  justify-content: flex-start;
}

.message-list__skeleton-bubble {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-lg);
  background: linear-gradient(90deg, var(--bg-white) 25%, var(--bg-light) 50%, var(--bg-white) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  min-width: 120px;
  max-width: 200px;
}

.message-list__skeleton-bubble--own {
  align-self: flex-end;
  background: var(--primary-color);
}

.message-list__messages {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.message-list__load-more {
  align-self: center;
  margin-bottom: var(--spacing-md);
}

.message-list__message {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  animation: slideIn 0.3s ease-out;
}

.message-list__message--own {
  align-self: flex-end;
  align-items: flex-end;
}

.message-list__message--other {
  align-self: flex-start;
  align-items: flex-start;
}

.message-list__message-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.message-list__sender-avatar {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.message-list__sender-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.message-list__sender-avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--primary-color);
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 10px;
}

.message-list__sender-name {
  font-weight: 600;
  color: var(--text-dark);
}

.message-list__timestamp {
  color: var(--text-muted);
  font-size: 11px;
}

.message-list__content {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  box-shadow: var(--shadow-sm);
  position: relative;
}

.message-list__message--own .message-list__content {
  background: var(--primary-color);
  color: var(--text-light);
}

.message-list__text {
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
}

.message-list__image {
  cursor: pointer;
  max-width: 300px;
}

.message-list__image-content {
  width: 100%;
  height: auto;
  border-radius: var(--border-radius-md);
  transition: transform var(--transition-fast);
}

.message-list__image-content:hover {
  transform: scale(1.05);
}

.message-list__image-caption {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.message-list__file {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: var(--bg-light);
}

.message-list__file-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.message-list__file-icon {
  color: var(--primary-color);
  flex-shrink: 0;
}

.message-list__file-details {
  min-width: 0;
}

.message-list__file-name {
  font-weight: 500;
  word-break: break-all;
}

.message-list__file-size {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.message-list__file-download {
  flex-shrink: 0;
}

.message-list__system {
  font-style: italic;
  color: var(--text-muted);
  text-align: center;
  font-size: var(--font-size-sm);
}

.message-list__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-xs);
  gap: var(--spacing-sm);
}

.message-list__message--own .message-list__actions {
  flex-direction: row-reverse;
}

.message-list__status {
  display: flex;
  gap: 2px;
}

.message-list__status-icon {
  width: 12px;
  height: 12px;
}

.message-list__status-icon--read {
  color: var(--primary-color);
}

.message-list__status-icon--delivered {
  color: var(--text-muted);
}

.message-list__status-icon--sent {
  color: var(--text-muted);
}

.message-list__menu {
  position: relative;
}

.message-list__menu-btn {
  background: none;
  border: none;
  font-size: var(--font-size-lg);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
  transition: background-color var(--transition-fast);
}

.message-list__menu-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.message-list__menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  z-index: 10;
  min-width: 120px;
}

.message-list__message--own .message-list__menu-dropdown {
  right: auto;
  left: 0;
}

.message-list__menu-item {
  display: block;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color var(--transition-fast);
}

.message-list__menu-item:hover {
  background: var(--bg-light);
}

.message-list__menu-item--danger:hover {
  background: rgba(220, 53, 69, 0.1);
  color: var(--danger-color);
}

.message-list__reply-indicator {
  position: absolute;
  top: -8px;
  left: 12px;
  background: var(--primary-color);
  color: var(--text-light);
  padding: 2px 8px;
  border-radius: var(--border-radius-sm);
  font-size: 11px;
  font-weight: 500;
}

.message-list__message--own .message-list__reply-indicator {
  left: auto;
  right: 12px;
}

.message-list__typing {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  animation: fadeIn 0.3s ease-out;
}

.message-list__typing-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.message-list__typing-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  color: var(--text-muted);
}

.message-list__typing-bubble {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.message-list__typing-dots {
  display: flex;
  gap: 4px;
}

.message-list__typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: typing 1.4s infinite;
}

.message-list__typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.message-list__typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .message-list {
    padding: var(--spacing-sm);
  }

  .message-list__message {
    max-width: 85%;
  }

  .message-list__content {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .message-list__image {
    max-width: 250px;
  }

  .message-list__file {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .message-list__file-download {
    align-self: stretch;
  }
}
</style>