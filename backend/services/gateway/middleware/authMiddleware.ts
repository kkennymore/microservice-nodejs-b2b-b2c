import jwt from 'jsonwebtoken';

export const authenticationMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user information to request
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'buyer',
      iat: decoded.iat,
      exp: decoded.exp
    };

    // Check if token is expired (additional check)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }

    // Add request timing for monitoring
    req.startTime = Date.now();
    req.requestId = req.headers['x-request-id'] || generateRequestId();

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// Utility function to generate request ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuthenticationMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role || 'buyer',
        iat: decoded.iat,
        exp: decoded.exp
      };
    }

    req.startTime = Date.now();
    req.requestId = req.headers['x-request-id'] || generateRequestId();

    next();
  } catch (error) {
    // For optional auth, we don't fail, just continue without user
    req.startTime = Date.now();
    req.requestId = req.headers['x-request-id'] || generateRequestId();
    next();
  }
};

// Admin-only authentication middleware
export const adminAuthenticationMiddleware = async (req, res, next) => {
  // First apply regular authentication
  await authenticationMiddleware(req, res, (err) => {
    if (err || !req.user) return;

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'AUTH_ADMIN_REQUIRED'
      });
    }

    next();
  });
};