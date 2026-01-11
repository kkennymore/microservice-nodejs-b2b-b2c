// backend/services/auth/utils/socketHandler.js
import pligsLogger from '@/logger.js';

const pligsSocketHandler = (socket, io, redisClient, rabbitChannel) => {
  pligsLogger.info(`Auth service user connected: ${socket.id}`);

  socket.on('disconnect', () => {
    pligsLogger.info(`Auth service user disconnected: ${socket.id}`);
  });
};

export default pligsSocketHandler;