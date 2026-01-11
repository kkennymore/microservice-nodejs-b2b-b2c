# Messaging Service

Real-time messaging service for the multivendor marketplace with Socket.IO integration.

## Features

### 💬 Real-Time Messaging
- Instant message delivery with Socket.IO
- Real-time conversation updates
- Typing indicators and read receipts
- Online/offline status tracking

### 👥 Conversation Management
- Direct messages between users
- Group conversations
- Order support conversations
- Participant management (add/remove users)

### 📎 Rich Messaging
- Text messages with emoji support
- File and image sharing
- Message replies and threading
- Message editing and deletion

### 🔒 Security & Privacy
- JWT authentication for all operations
- Message encryption support
- User permission validation
- Admin oversight capabilities

## Database Tables

### conversations
- Chat conversations with metadata
- Support for direct, group, and system conversations
- Participant tracking and permissions

### conversation_participants
- Users participating in conversations
- Role-based access (admin/member)
- Join/leave timestamps

### messages
- Individual messages with full content
- Support for text, images, files, and system messages
- Reply threading and edit history

### message_reads
- Read receipt tracking
- Per-user read status for messages

### message_attachments
- File attachments for messages
- Support for images, documents, and media

### typing_indicators
- Real-time typing status tracking
- Automatic cleanup of stale indicators

## Socket.IO Events

### Client → Server
```javascript
// Join user-specific room
socket.emit('join-user', userId);

// Join conversation room
socket.emit('join-conversation', conversationId);

// Leave conversation room
socket.emit('leave-conversation', conversationId);

// Send typing indicators
socket.emit('typing-start', { conversationId, userId, username });
socket.emit('typing-stop', { conversationId, userId });

// Mark messages as read
socket.emit('mark-read', { conversationId, userId, messageIds });
```

### Server → Client
```javascript
// Receive new messages
socket.on('new-message', (data) => {
  // data: { message, conversation_id }
});

// Typing indicators
socket.on('user-typing', (data) => {
  // data: { userId, username, conversationId }
});

socket.on('user-stopped-typing', (data) => {
  // data: { userId, conversationId }
});

// Read receipts
socket.on('messages-read', (data) => {
  // data: { conversationId, userId, messageIds }
});

// Conversation updates
socket.on('conversation-created', (data) => {
  // data: { conversation }
});

socket.on('participant-added', (data) => {
  // data: { conversationId, newParticipant, addedBy }
});

socket.on('participant-removed', (data) => {
  // data: { conversationId, removedParticipant, removedBy }
});

// Message updates
socket.on('message-deleted', (data) => {
  // data: { messageId, conversationId, deletedBy }
});

socket.on('message-edited', (data) => {
  // data: { messageId, conversationId, newContent, editedBy, editedAt }
});
```

## API Endpoints

### Messages
```
POST   /api/messages              - Send message
GET    /api/messages/conversation/:id - Get conversation messages
PUT    /api/messages/:id          - Edit message
DELETE /api/messages/:id          - Delete message
POST   /api/messages/read         - Mark messages as read
POST   /api/messages/conversation/:id/read - Mark conversation as read
GET    /api/messages/unread       - Get total unread count
GET    /api/messages/conversation/:id/unread - Get conversation unread count
```

### Conversations
```
POST   /api/conversations         - Create conversation
GET    /api/conversations         - Get user conversations
GET    /api/conversations/:id     - Get conversation details
PUT    /api/conversations/:id     - Update conversation
DELETE /api/conversations/:id     - Delete conversation
POST   /api/conversations/:id/participants - Add participant
DELETE /api/conversations/:id/participants - Remove participant
```

## Conversation Types

### Direct Conversations
- One-on-one messaging between two users
- Automatically created when users message each other
- No duplicate conversations allowed

### Group Conversations
- Multiple participants (3+ users)
- Admin role for conversation management
- Custom titles and descriptions

### Order Support Conversations
- Linked to specific marketplace orders
- Automatic creation for buyer-seller communication
- Enhanced moderation features

## Message Types

### Text Messages
- Plain text with emoji support
- Reply-to functionality
- Edit history tracking

### File Attachments
- Images, documents, and media files
- File size and type validation
- Secure storage with access controls

### System Messages
- Automated notifications
- User join/leave events
- Order status updates

## Real-Time Features

### Typing Indicators
- Show when users are typing
- Automatic timeout after 3 seconds
- Per-conversation tracking

### Read Receipts
- Mark messages as read
- Show read status to senders
- Bulk read operations

### Online Status
- Track user online/offline status
- Real-time presence updates
- Last seen timestamps

## Security Features

- **Authentication**: JWT required for all operations
- **Authorization**: User permission validation
- **Rate Limiting**: Message sending limits
- **Content Filtering**: Profanity and spam detection
- **File Validation**: Secure file upload handling
- **Audit Logging**: Complete message history tracking

## Performance Optimizations

- **Database Indexing**: Optimized queries for message retrieval
- **Connection Pooling**: Efficient database connections
- **Message Pagination**: Limit message loading
- **Real-time Optimization**: Targeted Socket.IO room broadcasting
- **Caching**: Redis integration for session management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up database:
```bash
npm run db:up
```

3. Configure environment variables:
```env
DB_HOST=127.0.0.1
DB_PASSWORD=your_password
DB_NAME=fenap_marketplace
JWT_SECRET=your_jwt_secret
MESSAGING_PORT=3004
FRONTEND_URL=http://localhost:3000
```

4. Start the service:
```bash
npm start
```

## Client Integration

### Socket.IO Client Setup
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3004', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join user room
socket.emit('join-user', userId);

// Join conversation
socket.emit('join-conversation', conversationId);

// Listen for messages
socket.on('new-message', (data) => {
  console.log('New message:', data);
});
```

### REST API Usage
```javascript
// Send a message
const response = await fetch('/api/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    conversation_id: 123,
    content: 'Hello!',
    message_type: 'text'
  })
});
```

## Monitoring

- **Health Check**: `/health` endpoint
- **Connection Count**: Real-time Socket.IO connection tracking
- **Message Metrics**: Send/receive statistics
- **Error Logging**: Comprehensive error tracking

## Future Enhancements

- [ ] Message encryption (end-to-end)
- [ ] Voice/video calling integration
- [ ] Message reactions and emojis
- [ ] Advanced file sharing (Google Drive, Dropbox)
- [ ] Message templates and quick replies
- [ ] Conversation archiving and search
- [ ] Push notifications for mobile apps
- [ ] Message translation features
- [ ] AI-powered chat moderation