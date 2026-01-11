<template>
  <div class="messages-page">
    <div class="container">
      <!-- Page Header -->
      <div class="messages-page__header">
        <h1 class="messages-page__title">Messages</h1>
        <p class="messages-page__subtitle">Connect with buyers and sellers</p>
      </div>

      <div class="messages-page__content">
        <!-- Conversations Sidebar -->
        <div class="messages-page__sidebar">
          <ConversationList
            :conversations="conversations"
            :active-conversation-id="activeConversation?.id"
            :loading="loadingConversations"
            :current-user-id="currentUserId"
            @select-conversation="selectConversation"
            @new-conversation="showNewConversationModal = true"
            @search="handleSearch"
          />
        </div>

        <!-- Chat Area -->
        <div class="messages-page__chat">
          <!-- Chat Header -->
          <div v-if="activeConversation" class="messages-page__chat-header">
            <div class="messages-page__chat-participant">
              <div class="messages-page__participant-avatar">
                <img
                  v-if="activeConversation.participants[0]?.avatar"
                  :src="activeConversation.participants[0].avatar"
                  :alt="activeConversation.participants[0].name"
                  class="messages-page__participant-avatar-img"
                />
                <div v-else class="messages-page__participant-avatar-placeholder">
                  {{ getInitials(activeConversation.participants[0]?.name || 'U') }}
                </div>

                <div
                  v-if="activeConversation.participants[0]?.isOnline"
                  class="messages-page__participant-online"
                ></div>
              </div>

              <div class="messages-page__participant-info">
                <h2 class="messages-page__participant-name">
                  {{ activeConversation.participants[0]?.name || 'Unknown User' }}
                </h2>
                <p class="messages-page__participant-status">
                  {{ activeConversation.participants[0]?.isOnline ? 'Online' : 'Offline' }}
                </p>
              </div>
            </div>

            <div class="messages-page__chat-actions">
              <Button
                variant="outline"
                size="sm"
                @click="showConversationMenu = !showConversationMenu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="12" cy="5" r="1"/>
                  <circle cx="12" cy="19" r="1"/>
                </svg>
              </Button>

              <!-- Conversation Menu -->
              <div v-if="showConversationMenu" class="messages-page__menu">
                <button class="messages-page__menu-item" @click="contactSeller">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Contact Support
                </button>
                <button class="messages-page__menu-item" @click="archiveConversation">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="21,8 21,21 3,21 3,8"/>
                    <rect x="1" y="3" width="22" height="5"/>
                    <line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                  Archive Conversation
                </button>
                <button class="messages-page__menu-item messages-page__menu-item--danger" @click="blockUser">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  Block User
                </button>
              </div>
            </div>
          </div>

          <!-- Messages Area -->
          <div v-if="activeConversation" class="messages-page__messages">
            <MessageList
              :messages="messages"
              :current-user-id="currentUserId"
              :loading="loadingMessages"
              :has-more-messages="hasMoreMessages"
              :show-typing="isTyping"
              :replying-to="replyingTo"
              @load-more="loadMoreMessages"
              @edit-message="handleEditMessage"
              @delete-message="handleDeleteMessage"
              @reply-message="handleReplyMessage"
              @report-message="handleReportMessage"
            />
          </div>

          <!-- Message Input -->
          <div v-if="activeConversation" class="messages-page__input">
            <MessageInput
              :replying-to="replyingTo"
              :editing-message="editingMessage"
              :disabled="sendingMessage"
              :show-typing-indicator="isTyping"
              :typing-users="typingUsers"
              @send="handleSendMessage"
              @edit-send="handleEditSend"
              @cancel-reply="replyingTo = null"
              @cancel-edit="editingMessage = null"
              @typing="handleTyping"
            />
          </div>

          <!-- Empty Chat State -->
          <div v-else class="messages-page__empty-chat">
            <div class="messages-page__empty-chat-content">
              <svg class="messages-page__empty-chat-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <h3 class="messages-page__empty-chat-title">Select a conversation</h3>
              <p class="messages-page__empty-chat-description">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- New Conversation Modal -->
      <Modal v-model="showNewConversationModal" title="Start New Conversation">
        <div class="messages-page__new-conversation">
          <p>Enter the name or email of the person you want to message:</p>

          <div class="messages-page__search-users">
            <Input
              v-model="searchUserQuery"
              placeholder="Search users..."
              @input="debouncedSearchUsers"
            />

            <div v-if="searchingUsers" class="messages-page__searching">
              Searching...
            </div>

            <div v-else-if="userSearchResults.length > 0" class="messages-page__user-results">
              <div
                v-for="user in userSearchResults"
                :key="user.id"
                class="messages-page__user-result"
                @click="startConversationWithUser(user)"
              >
                <div class="messages-page__user-avatar">
                  <img
                    v-if="user.avatar"
                    :src="user.avatar"
                    :alt="user.name"
                    class="messages-page__user-avatar-img"
                  />
                  <div v-else class="messages-page__user-avatar-placeholder">
                    {{ getInitials(user.name) }}
                  </div>
                </div>
                <div class="messages-page__user-info">
                  <div class="messages-page__user-name">{{ user.name }}</div>
                  <div class="messages-page__user-role">{{ user.role }}</div>
                </div>
              </div>
            </div>

            <div v-else-if="searchUserQuery && !searchingUsers" class="messages-page__no-results">
              No users found
            </div>
          </div>
        </div>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import messagingAPI, { type Conversation, type Message, type ConversationWithMessages } from '@/services/messagingAPI'
import ConversationList from '@/components/messaging/ConversationList.vue'
import MessageList from '@/components/messaging/MessageList.vue'
import MessageInput from '@/components/messaging/MessageInput.vue'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Modal from '@/components/Modal.vue'

const conversations = ref<Conversation[]>([])
const activeConversation = ref<ConversationWithMessages | null>(null)
const messages = ref<Message[]>([])
const currentUserId = ref('user123') // In real app, get from auth store
const loadingConversations = ref(true)
const loadingMessages = ref(false)
const hasMoreMessages = ref(false)
const sendingMessage = ref(false)

// UI states
const showConversationMenu = ref(false)
const showNewConversationModal = ref(false)
const searchUserQuery = ref('')
const userSearchResults = ref<Array<{ id: string; name: string; avatar?: string; role: 'buyer' | 'seller' }>>([])
const searchingUsers = ref(false)

// Message states
const replyingTo = ref<Message | null>(null)
const editingMessage = ref<Message | null>(null)
const isTyping = ref(false)
const typingUsers = ref<string[]>([])

// WebSocket connection (placeholder - would be implemented with Socket.IO)
let socket: any = null

// Debounced search
const { debouncedValue: debouncedUserSearch } = useDebounce(searchUserQuery, 500)

// Methods
const loadConversations = async () => {
  try {
    loadingConversations.value = true
    const response = await messagingAPI.getConversations()
    conversations.value = response.conversations
  } catch (error) {
    console.error('Error loading conversations:', error)
  } finally {
    loadingConversations.value = false
  }
}

const selectConversation = async (conversationId: string) => {
  try {
    loadingMessages.value = true
    const conversationData = await messagingAPI.getConversation(conversationId)
    activeConversation.value = conversationData
    messages.value = conversationData.messages
    hasMoreMessages.value = conversationData.messages.length === 50 // Assuming page size of 50

    // Mark messages as read
    if (conversationData.unreadCount > 0) {
      await messagingAPI.markAsRead(conversationId)
      // Update conversation unread count
      const conv = conversations.value.find(c => c.id === conversationId)
      if (conv) {
        conv.unreadCount = 0
      }
    }
  } catch (error) {
    console.error('Error loading conversation:', error)
  } finally {
    loadingMessages.value = false
  }
}

const loadMoreMessages = async () => {
  if (!activeConversation.value) return

  try {
    const oldestMessage = messages.value[0]
    const conversationData = await messagingAPI.getConversation(activeConversation.value.id, {
      beforeMessageId: oldestMessage.id,
      limit: 50
    })

    messages.value.unshift(...conversationData.messages)
    hasMoreMessages.value = conversationData.messages.length === 50
  } catch (error) {
    console.error('Error loading more messages:', error)
  }
}

const handleSendMessage = async (data: { content: string; file?: File; replyToId?: string }) => {
  if (!activeConversation.value) return

  try {
    sendingMessage.value = true
    const messageData = await messagingAPI.sendMessage(activeConversation.value.id, data)

    // Add message to local state
    messages.value.push(messageData)

    // Update conversation last message
    activeConversation.value.lastMessage = messageData
    const conv = conversations.value.find(c => c.id === activeConversation.value!.id)
    if (conv) {
      conv.lastMessage = messageData
    }

  } catch (error) {
    console.error('Error sending message:', error)
  } finally {
    sendingMessage.value = false
  }
}

const handleEditMessage = (message: Message) => {
  editingMessage.value = message
  replyingTo.value = null
}

const handleEditSend = async (data: { messageId: string; content: string }) => {
  try {
    const updatedMessage = await messagingAPI.editMessage(activeConversation.value!.id, data.messageId, data.content)

    // Update message in local state
    const index = messages.value.findIndex(m => m.id === data.messageId)
    if (index >= 0) {
      messages.value[index] = updatedMessage
    }

    editingMessage.value = null

  } catch (error) {
    console.error('Error editing message:', error)
  }
}

const handleDeleteMessage = async (messageId: string) => {
  if (!confirm('Are you sure you want to delete this message?')) return

  try {
    await messagingAPI.deleteMessage(activeConversation.value!.id, messageId)

    // Remove message from local state
    const index = messages.value.findIndex(m => m.id === messageId)
    if (index >= 0) {
      messages.value.splice(index, 1)
    }

  } catch (error) {
    console.error('Error deleting message:', error)
  }
}

const handleReplyMessage = (message: Message) => {
  replyingTo.value = message
  editingMessage.value = null
}

const handleReportMessage = (message: Message) => {
  if (confirm('Are you sure you want to report this message?')) {
    // Handle report
    console.log('Reporting message:', message)
  }
}

const handleTyping = (isTyping: boolean) => {
  // Emit typing event via WebSocket
  if (socket) {
    socket.emit('typing', {
      conversationId: activeConversation.value?.id,
      isTyping
    })
  }
}

const handleSearch = (query: string) => {
  // Filter conversations locally or search server-side
  console.log('Searching conversations:', query)
}

const debouncedSearchUsers = async () => {
  if (!searchUserQuery.value.trim()) {
    userSearchResults.value = []
    return
  }

  try {
    searchingUsers.value = true
    // In real app, this would search users via API
    // For now, simulate search
    await new Promise(resolve => setTimeout(resolve, 500))

    userSearchResults.value = [
      {
        id: 'user1',
        name: 'John Seller',
        role: 'seller' as const,
        avatar: undefined
      },
      {
        id: 'user2',
        name: 'Jane Buyer',
        role: 'buyer' as const,
        avatar: undefined
      }
    ].filter(user =>
      user.name.toLowerCase().includes(searchUserQuery.value.toLowerCase())
    )

  } catch (error) {
    console.error('Error searching users:', error)
  } finally {
    searchingUsers.value = false
  }
}

const startConversationWithUser = async (user: any) => {
  try {
    const conversation = await messagingAPI.createConversation(user.id)
    conversations.value.unshift(conversation)
    showNewConversationModal.value = false
    searchUserQuery.value = ''
    userSearchResults.value = []
    selectConversation(conversation.id)
  } catch (error) {
    console.error('Error starting conversation:', error)
  }
}

const contactSeller = () => {
  // Handle contacting seller support
  console.log('Contacting seller support')
  showConversationMenu.value = false
}

const archiveConversation = async () => {
  if (!activeConversation.value) return

  try {
    await messagingAPI.archiveConversation(activeConversation.value.id)
    // Remove from conversations list
    conversations.value = conversations.value.filter(c => c.id !== activeConversation.value!.id)
    activeConversation.value = null
    messages.value = []
  } catch (error) {
    console.error('Error archiving conversation:', error)
  }
  showConversationMenu.value = false
}

const blockUser = async () => {
  if (!activeConversation.value) return

  if (confirm('Are you sure you want to block this user? You won\'t be able to message them anymore.')) {
    try {
      await messagingAPI.blockUser(activeConversation.value.participants[0].id)
      archiveConversation()
    } catch (error) {
      console.error('Error blocking user:', error)
    }
  }
  showConversationMenu.value = false
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Watch for user search
watch(debouncedUserSearch, debouncedSearchUsers)

// Initialize
onMounted(() => {
  loadConversations()

  // Initialize WebSocket connection (placeholder)
  // socket = io('/messaging')
  // socket.on('message', handleNewMessage)
  // socket.on('typing', handleTypingIndicator)
  // socket.on('message-status', handleMessageStatus)
})

onUnmounted(() => {
  if (socket) {
    socket.disconnect()
  }
})
</script>

<style scoped>
.messages-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.messages-page__header {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.messages-page__title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.messages-page__subtitle {
  font-size: var(--font-size-lg);
  color: var(--text-muted);
  margin: 0;
}

.messages-page__content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: var(--spacing-lg);
  height: calc(100vh - 200px);
  min-height: 600px;
}

.messages-page__sidebar {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.messages-page__chat {
  background: var(--bg-white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-page__chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-white);
}

.messages-page__chat-participant {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.messages-page__participant-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.messages-page__participant-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.messages-page__participant-avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--primary-color);
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.messages-page__participant-online {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--success-color);
  border: 2px solid var(--bg-white);
}

.messages-page__participant-info {
  min-width: 0;
}

.messages-page__participant-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 2px;
}

.messages-page__participant-status {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.messages-page__chat-actions {
  position: relative;
}

.messages-page__menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  z-index: 10;
  min-width: 200px;
}

.messages-page__menu-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color var(--transition-fast);
}

.messages-page__menu-item:hover {
  background: var(--bg-light);
}

.messages-page__menu-item--danger:hover {
  background: rgba(220, 53, 69, 0.1);
  color: var(--danger-color);
}

.messages-page__messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-page__input {
  border-top: 1px solid var(--border-color);
  background: var(--bg-white);
}

.messages-page__empty-chat {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.messages-page__empty-chat-content {
  text-align: center;
  max-width: 400px;
}

.messages-page__empty-chat-icon {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

.messages-page__empty-chat-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: var(--spacing-sm);
}

.messages-page__empty-chat-description {
  color: var(--text-muted);
  margin-bottom: var(--spacing-xl);
}

.messages-page__new-conversation {
  margin-bottom: var(--spacing-lg);
}

.messages-page__search-users {
  margin-top: var(--spacing-lg);
}

.messages-page__searching {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--text-muted);
}

.messages-page__user-results {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-sm);
}

.messages-page__user-result {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.messages-page__user-result:hover {
  background: var(--bg-light);
}

.messages-page__user-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.messages-page__user-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.messages-page__user-avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--primary-color);
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.messages-page__user-info {
  flex: 1;
}

.messages-page__user-name {
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: 2px;
}

.messages-page__user-role {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  text-transform: capitalize;
}

.messages-page__no-results {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .messages-page__content {
    grid-template-columns: 300px 1fr;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .messages-page__content {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 600px;
  }

  .messages-page__sidebar {
    display: none; /* Could be made into a mobile drawer */
  }

  .messages-page__chat {
    height: 600px;
  }

  .messages-page__title {
    font-size: var(--font-size-2xl);
  }
}
</style>