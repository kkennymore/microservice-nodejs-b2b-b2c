// backend/services/products/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import config from '/app/shared/config.js';
import pligsLogger from '@/utils/logger.js';

const pligsAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);

    // In a microservices architecture, you might verify with auth service
    // For now, we'll trust the token
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    pligsLogger.error('Auth middleware error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const pligsOptionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

export default pligsAuthMiddleware;
export { pligsOptionalAuthMiddleware };