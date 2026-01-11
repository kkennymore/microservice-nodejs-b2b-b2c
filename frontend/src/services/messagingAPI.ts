import api from './authAPI'

// Message types for API responses
export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  messageType: 'text' | 'image' | 'file' | 'system'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  status: 'sending' | 'sent' | 'delivered' | 'read'
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  participants: ConversationParticipant[]
  lastMessage?: Message
  unreadCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ConversationParticipant {
  id: string
  name: string
  avatar?: string
  role: 'buyer' | 'seller'
  isOnline: boolean
  lastSeen?: string
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface TypingIndicator {
  conversationId: string
  userId: string
  userName: string
  isTyping: boolean
}

export interface MessageFilters {
  conversationId?: string
  messageType?: Message['messageType']
  dateFrom?: string
  dateTo?: string
  search?: string
}

class MessagingAPI {
  // Get user's conversations
  async getConversations(params: {
    page?: number
    limit?: number
    search?: string
  } = {}): Promise<{
    conversations: Conversation[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await api.get('/messaging/conversations', { params })
    return response.data.data
  }

  // Get conversation with messages
  async getConversation(conversationId: string, params: {
    page?: number
    limit?: number
    beforeMessageId?: string
  } = {}): Promise<ConversationWithMessages> {
    const response = await api.get(`/messaging/conversations/${conversationId}`, { params })
    return response.data.data
  }

  // Create new conversation
  async createConversation(participantId: string, initialMessage?: string): Promise<Conversation> {
    const response = await api.post('/messaging/conversations', {
      participantId,
      initialMessage
    })
    return response.data.data
  }

  // Send message
  async sendMessage(conversationId: string, data: {
    content: string
    messageType?: Message['messageType']
    file?: File
  }): Promise<Message> {
    const formData = new FormData()
    formData.append('content', data.content)
    formData.append('messageType', data.messageType || 'text')

    if (data.file) {
      formData.append('file', data.file)
    }

    const response = await api.post(`/messaging/conversations/${conversationId}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.data
  }

  // Mark messages as read
  async markAsRead(conversationId: string, messageIds?: string[]): Promise<{ success: boolean }> {
    const response = await api.put(`/messaging/conversations/${conversationId}/read`, {
      messageIds
    })
    return response.data
  }

  // Delete message
  async deleteMessage(conversationId: string, messageId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/messaging/conversations/${conversationId}/messages/${messageId}`)
    return response.data
  }

  // Edit message
  async editMessage(conversationId: string, messageId: string, content: string): Promise<Message> {
    const response = await api.put(`/messaging/conversations/${conversationId}/messages/${messageId}`, {
      content
    })
    return response.data.data
  }

  // Get conversation participants
  async getParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    const response = await api.get(`/messaging/conversations/${conversationId}/participants`)
    return response.data.data
  }

  // Leave conversation
  async leaveConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/messaging/conversations/${conversationId}/leave`)
    return response.data
  }

  // Archive conversation
  async archiveConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await api.put(`/messaging/conversations/${conversationId}/archive`)
    return response.data
  }

  // Unarchive conversation
  async unarchiveConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await api.put(`/messaging/conversations/${conversationId}/unarchive`)
    return response.data
  }

  // Search messages
  async searchMessages(query: string, conversationId?: string): Promise<{
    messages: Message[]
    conversations: Conversation[]
  }> {
    const response = await api.get('/messaging/search', {
      params: { q: query, conversationId }
    })
    return response.data.data
  }

  // Get unread count
  async getUnreadCount(): Promise<{ total: number; conversations: Record<string, number> }> {
    const response = await api.get('/messaging/unread-count')
    return response.data.data
  }

  // Upload file (for sharing in messages)
  async uploadFile(file: File): Promise<{ url: string; fileName: string; fileSize: number }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/messaging/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.data
  }

  // Start typing indicator
  async startTyping(conversationId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/messaging/conversations/${conversationId}/typing/start`)
    return response.data
  }

  // Stop typing indicator
  async stopTyping(conversationId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/messaging/conversations/${conversationId}/typing/stop`)
    return response.data
  }

  // Report user/message
  async reportUser(conversationId: string, reportedUserId: string, reason: string, messageId?: string): Promise<{ success: boolean }> {
    const response = await api.post('/messaging/report', {
      conversationId,
      reportedUserId,
      reason,
      messageId
    })
    return response.data
  }

  // Block user
  async blockUser(userId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/messaging/block/${userId}`)
    return response.data
  }

  // Unblock user
  async unblockUser(userId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/messaging/block/${userId}`)
    return response.data
  }

  // Get blocked users
  async getBlockedUsers(): Promise<Array<{ id: string; name: string; blockedAt: string }>> {
    const response = await api.get('/messaging/blocked')
    return response.data.data
  }
}

export const messagingAPI = new MessagingAPI()
export default messagingAPI