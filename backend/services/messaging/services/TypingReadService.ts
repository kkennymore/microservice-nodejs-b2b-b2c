// Typing indicators handled in-memory for real-time functionality

class TypingService {
  constructor() {
    this.typingTimeouts = new Map(); // conversationId_userId -> timeout
    this.typingUsers = new Map(); // conversationId -> Set of userIds
  }

  // Start typing indicator
  async startTyping(conversationId, userId, username) {
    const key = `${conversationId}_${userId}`;

    // Clear existing timeout
    if (this.typingTimeouts.has(key)) {
      clearTimeout(this.typingTimeouts.get(key));
    }

    // Add user to typing list
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    this.typingUsers.get(conversationId).add(userId);

    // Set timeout to auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      this.stopTyping(conversationId, userId);
    }, 3000);

    this.typingTimeouts.set(key, timeout);

    // Emit typing started event
    if (global.io) {
      global.io.to(`conversation_${conversationId}`).emit('user-typing', {
        userId,
        username,
        conversationId
      });
    }

    return true;
  }

  // Stop typing indicator
  async stopTyping(conversationId, userId) {
    const key = `${conversationId}_${userId}`;

    // Clear timeout
    if (this.typingTimeouts.has(key)) {
      clearTimeout(this.typingTimeouts.get(key));
      this.typingTimeouts.delete(key);
    }

    // Remove user from typing list
    if (this.typingUsers.has(conversationId)) {
      this.typingUsers.get(conversationId).delete(userId);

      // Clean up empty sets
      if (this.typingUsers.get(conversationId).size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }

    // Emit typing stopped event
    if (global.io) {
      global.io.to(`conversation_${conversationId}`).emit('user-stopped-typing', {
        userId,
        conversationId
      });
    }

    return true;
  }

  // Get currently typing users in a conversation
  getTypingUsers(conversationId) {
    if (!this.typingUsers.has(conversationId)) {
      return [];
    }
    return Array.from(this.typingUsers.get(conversationId));
  }

  // Clean up typing indicators for disconnected users
  cleanupUserTyping(userId) {
    for (const [conversationId, users] of this.typingUsers.entries()) {
      if (users.has(userId)) {
        this.stopTyping(conversationId, userId);
      }
    }
  }

  // Clean up all typing indicators for a conversation
  cleanupConversationTyping(conversationId) {
    if (this.typingUsers.has(conversationId)) {
      const users = Array.from(this.typingUsers.get(conversationId));
      users.forEach(userId => this.stopTyping(conversationId, userId));
    }
  }

  // Periodic cleanup of stale typing indicators
  startPeriodicCleanup() {
    setInterval(() => {
      const now = Date.now();
      // This is a simple cleanup - in production you might want more sophisticated logic
      console.log(`🔧 Typing indicators active: ${this.typingTimeouts.size} timeouts, ${this.typingUsers.size} conversations`);
    }, 30000); // Every 30 seconds
  }
}

class ReadReceiptService {
  constructor() {
    this.readReceipts = new Map(); // messageId -> Set of userIds who read it
  }

  // Mark message as read
  async markAsRead(messageId, userId, conversationId) {
    if (!this.readReceipts.has(messageId)) {
      this.readReceipts.set(messageId, new Set());
    }

    const readers = this.readReceipts.get(messageId);
    const wasAlreadyRead = readers.has(userId);

    readers.add(userId);

    // Emit read receipt if not already read
    if (!wasAlreadyRead && global.io) {
      global.io.to(`conversation_${conversationId}`).emit('message-read', {
        messageId,
        userId,
        conversationId,
        readAt: new Date()
      });
    }

    return true;
  }

  // Mark multiple messages as read
  async markMultipleAsRead(messageIds, userId, conversationId) {
    const results = [];

    for (const messageId of messageIds) {
      const result = await this.markAsRead(messageId, userId, conversationId);
      results.push({ messageId, success: result });
    }

    // Emit bulk read receipt
    if (global.io) {
      global.io.to(`conversation_${conversationId}`).emit('messages-read', {
        messageIds,
        userId,
        conversationId,
        readAt: new Date()
      });
    }

    return results;
  }

  // Get read status for a message
  getReadStatus(messageId) {
    if (!this.readReceipts.has(messageId)) {
      return [];
    }
    return Array.from(this.readReceipts.get(messageId));
  }

  // Check if user has read a message
  hasUserReadMessage(messageId, userId) {
    if (!this.readReceipts.has(messageId)) {
      return false;
    }
    return this.readReceipts.get(messageId).has(userId);
  }

  // Clean up old read receipts (memory management)
  cleanupOldReadReceipts(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoffTime = Date.now() - maxAge;

    // This is a simplified cleanup - in production you'd track timestamps
    // For now, we'll just limit the total number of stored receipts
    if (this.readReceipts.size > 10000) { // Arbitrary limit
      const keys = Array.from(this.readReceipts.keys()).slice(0, 1000);
      keys.forEach(key => this.readReceipts.delete(key));
      console.log('🧹 Cleaned up old read receipts');
    }
  }

  // Get read statistics for a conversation
  getConversationReadStats(conversationId, messageIds) {
    const stats = {};

    for (const messageId of messageIds) {
      stats[messageId] = {
        readBy: this.getReadStatus(messageId),
        readCount: this.readReceipts.get(messageId)?.size || 0
      };
    }

    return stats;
  }
}

// Create singleton instances
const typingService = new TypingService();
const readReceiptService = new ReadReceiptService();

// Start periodic cleanup
typingService.startPeriodicCleanup();

// Periodic cleanup for read receipts
setInterval(() => {
  readReceiptService.cleanupOldReadReceipts();
}, 60 * 60 * 1000); // Every hour

export { typingService as TypingService, readReceiptService as ReadReceiptService };