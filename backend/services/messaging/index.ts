import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';
import http from 'http';
import { connectDB } from '/app/shared/config.js';
import messageRoutes from '@/routes/messageRoutes.js';
import conversationRoutes from '@/routes/conversationRoutes.js';
import fileRoutes from '@/routes/fileRoutes.js';
import { TypingService, ReadReceiptService } from '@/services/TypingReadService.js';
import { errorHandler } from '@/middlewares/errorHandler.js';

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.MESSAGING_PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'messaging',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: io.sockets.sockets.size
  });
});

// Routes
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/files', fileRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found in messaging service'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // Join user-specific room
  socket.on('join-user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their personal room`);
  });

  // Join conversation room
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`💬 User joined conversation: ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`👋 User left conversation: ${conversationId}`);
  });

  // Handle typing indicators
  socket.on('typing-start', async (data) => {
    try {
      await TypingService.startTyping(data.conversationId, data.userId, data.username);
    } catch (error) {
      console.error('Typing start error:', error);
    }
  });

  socket.on('typing-stop', async (data) => {
    try {
      await TypingService.stopTyping(data.conversationId, data.userId);
    } catch (error) {
      console.error('Typing stop error:', error);
    }
  });

  // Handle read receipts
  socket.on('mark-read', async (data) => {
    try {
      await ReadReceiptService.markMultipleAsRead(data.messageIds, data.userId, data.conversationId);
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    // Note: We can't reliably get userId here, cleanup will happen via heartbeat or timeout
  });
});

// Make io available globally for controllers
global.io = io;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    server.listen(PORT, () => {
      console.log(`🚀 Messaging service running on port ${PORT}`);
      console.log(`🔌 Socket.IO server ready for real-time connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start messaging service:', error);
    process.exit(1);
  }
};

startServer();

export default app;