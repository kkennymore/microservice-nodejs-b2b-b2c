<template>
  <div class="message-input">
    <!-- Reply Preview -->
    <div v-if="replyingTo" class="message-input__reply">
      <div class="message-input__reply-content">
        <div class="message-input__reply-label">
          Replying to <strong>{{ replyingTo.senderName }}</strong>
        </div>
        <div class="message-input__reply-text">
          {{ getReplyPreview(replyingTo) }}
        </div>
      </div>
      <button
        class="message-input__reply-close"
        @click="$emit('cancel-reply')"
        aria-label="Cancel reply"
      >
        ×
      </button>
    </div>

    <!-- Edit Preview -->
    <div v-if="editingMessage" class="message-input__edit">
      <div class="message-input__edit-content">
        <div class="message-input__edit-label">Editing message</div>
        <div class="message-input__edit-text">{{ editingMessage.content }}</div>
      </div>
      <button
        class="message-input__edit-close"
        @click="$emit('cancel-edit')"
        aria-label="Cancel edit"
      >
        ×
      </button>
    </div>

    <!-- Input Area -->
    <div class="message-input__container">
      <!-- File Preview -->
      <div v-if="selectedFile" class="message-input__file-preview">
        <div class="message-input__file-info">
          <svg v-if="isImageFile" class="message-input__file-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <svg v-else class="message-input__file-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          <div class="message-input__file-details">
            <div class="message-input__file-name">{{ selectedFile.name }}</div>
            <div class="message-input__file-size">{{ formatFileSize(selectedFile.size) }}</div>
          </div>
        </div>
        <button
          class="message-input__file-remove"
          @click="removeFile"
          aria-label="Remove file"
        >
          ×
        </button>
      </div>

      <!-- Text Input -->
      <div class="message-input__input-container">
        <textarea
          ref="inputRef"
          v-model="messageText"
          :placeholder="inputPlaceholder"
          class="message-input__textarea"
          :rows="textareaRows"
          @keydown="handleKeydown"
          @input="handleInput"
          @paste="handlePaste"
        ></textarea>

        <!-- Actions -->
        <div class="message-input__actions">
          <!-- File Upload -->
          <label class="message-input__action-btn" for="file-input">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            <input
              id="file-input"
              ref="fileInputRef"
              type="file"
              class="message-input__file-input"
              @change="handleFileSelect"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
          </label>

          <!-- Emoji (placeholder) -->
          <button
            class="message-input__action-btn"
            @click="toggleEmojiPicker"
            :class="{ 'message-input__action-btn--active': showEmojiPicker }"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>

          <!-- Send Button -->
          <Button
            variant="primary"
            size="sm"
            @click="sendMessage"
            :disabled="!canSend"
            :loading="sending"
            class="message-input__send-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22,2 15,22 11,13 2,9"/>
            </svg>
          </Button>
        </div>
      </div>
    </div>

    <!-- Typing Indicator -->
    <div v-if="showTypingIndicator" class="message-input__typing">
      {{ typingUsers.join(', ') }} {{ typingUsers.length === 1 ? 'is' : 'are' }} typing...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { Message } from '@/services/messagingAPI'
import Button from '@/components/Button.vue'

interface Props {
  replyingTo?: Message | null
  editingMessage?: Message | null
  disabled?: boolean
  showTypingIndicator?: boolean
  typingUsers?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  replyingTo: null,
  editingMessage: null,
  disabled: false,
  showTypingIndicator: false,
  typingUsers: () => []
})

const emit = defineEmits<{
  send: [data: { content: string; file?: File; replyToId?: string }]
  'edit-send': [data: { messageId: string; content: string }]
  'cancel-reply': []
  'cancel-edit': []
  typing: [isTyping: boolean]
}>()

const inputRef = ref<HTMLTextAreaElement>()
const fileInputRef = ref<HTMLInputElement>()
const messageText = ref('')
const selectedFile = ref<File | null>(null)
const sending = ref(false)
const showEmojiPicker = ref(false)

const inputPlaceholder = computed(() => {
  if (props.editingMessage) return 'Edit your message...'
  if (props.replyingTo) return 'Reply to message...'
  return 'Type a message...'
})

const textareaRows = computed(() => {
  const lines = messageText.value.split('\n').length
  return Math.min(Math.max(lines, 1), 5)
})

const canSend = computed(() => {
  return !props.disabled && (messageText.value.trim() || selectedFile.value)
})

const isImageFile = computed(() => {
  return selectedFile.value?.type.startsWith('image/')
})

// Watch for editing message changes
watch(() => props.editingMessage, (newMessage) => {
  if (newMessage) {
    messageText.value = newMessage.content
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.setSelectionRange(messageText.value.length, messageText.value.length)
    })
  } else {
    messageText.value = ''
  }
})

const handleInput = () => {
  emit('typing', messageText.value.trim().length > 0)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (canSend.value) {
      sendMessage()
    }
  } else if (event.key === 'Escape') {
    if (props.replyingTo) {
      emit('cancel-reply')
    } else if (props.editingMessage) {
      emit('cancel-edit')
    }
  }
}

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        const file = item.getAsFile()
        if (file) {
          handleFile(file)
        }
        break
      }
    }
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    handleFile(file)
  }
}

const handleFile = (file: File) => {
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be less than 10MB')
    return
  }

  // Validate file type
  const allowedTypes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  const isAllowed = allowedTypes.some(type => file.type.startsWith(type))

  if (!isAllowed) {
    alert('File type not supported. Please upload images, PDFs, or documents.')
    return
  }

  selectedFile.value = file
}

const removeFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const sendMessage = async () => {
  if (!canSend.value) return

  sending.value = true

  try {
    if (props.editingMessage) {
      emit('edit-send', {
        messageId: props.editingMessage.id,
        content: messageText.value.trim()
      })
    } else {
      emit('send', {
        content: messageText.value.trim(),
        file: selectedFile.value || undefined,
        replyToId: props.replyingTo?.id
      })
    }

    // Clear input
    messageText.value = ''
    selectedFile.value = null
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }

    // Clear reply/edit state
    if (props.replyingTo) {
      emit('cancel-reply')
    }
    if (props.editingMessage) {
      emit('cancel-edit')
    }

  } catch (error) {
    console.error('Error sending message:', error)
  } finally {
    sending.value = false
  }
}

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value
  // TODO: Implement emoji picker
}

const getReplyPreview = (message: Message) => {
  if (message.messageType === 'image') return '📷 Image'
  if (message.messageType === 'file') return '📎 File'
  return message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.message-input {
  background: var(--bg-white);
  border-top: 1px solid var(--border-color);
  padding: var(--spacing-md);
}

.message-input__reply,
.message-input__edit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--primary-light);
  border: 1px solid var(--primary-color);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-sm);
}

.message-input__reply-content,
.message-input__edit-content {
  flex: 1;
  min-width: 0;
}

.message-input__reply-label,
.message-input__edit-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--primary-dark);
  margin-bottom: 2px;
}

.message-input__reply-text,
.message-input__edit-text {
  font-size: var(--font-size-sm);
  color: var(--text-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-input__reply-close,
.message-input__edit-close {
  background: none;
  border: none;
  font-size: var(--font-size-lg);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--primary-dark);
  transition: background-color var(--transition-fast);
}

.message-input__reply-close:hover,
.message-input__edit-close:hover {
  background: rgba(0, 123, 255, 0.1);
}

.message-input__container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.message-input__file-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm);
  background: var(--bg-light);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
}

.message-input__file-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.message-input__file-icon {
  color: var(--primary-color);
  flex-shrink: 0;
}

.message-input__file-details {
  min-width: 0;
}

.message-input__file-name {
  font-weight: 500;
  word-break: break-all;
  margin-bottom: 2px;
}

.message-input__file-size {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.message-input__file-remove {
  background: none;
  border: none;
  font-size: var(--font-size-lg);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-muted);
  transition: background-color var(--transition-fast);
}

.message-input__file-remove:hover {
  background: rgba(220, 53, 69, 0.1);
  color: var(--danger-color);
}

.message-input__input-container {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--bg-light);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
}

.message-input__textarea {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  font-family: inherit;
  font-size: var(--font-size-base);
  line-height: 1.4;
  min-height: 20px;
  max-height: 100px;
  outline: none;
}

.message-input__textarea::placeholder {
  color: var(--text-muted);
}

.message-input__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.message-input__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  color: var(--text-muted);
}

.message-input__action-btn:hover {
  background: var(--bg-white);
  color: var(--text-dark);
}

.message-input__action-btn--active {
  background: var(--primary-color);
  color: var(--text-light);
}

.message-input__file-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.message-input__send-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-input__typing {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-style: italic;
}

@media (max-width: 768px) {
  .message-input {
    padding: var(--spacing-sm);
  }

  .message-input__input-container {
    padding: var(--spacing-xs);
  }

  .message-input__actions {
    gap: 2px;
  }

  .message-input__action-btn {
    width: 28px;
    height: 28px;
  }

  .message-input__send-btn {
    width: 28px;
    height: 28px;
  }
}
</style>