import rateLimit from 'express-rate-limit';

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for sensitive operations (user management, system settings)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 sensitive operations per windowMs
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Emergency operations rate limiting (very strict)
export const emergencyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 emergency operations per hour
  message: {
    success: false,
    message: 'Emergency operations are strictly limited, please contact support.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check rate limiting (more lenient)
export const healthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // allow more health checks for monitoring systems
  message: {
    success: false,
    message: 'Health check rate limit exceeded.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin dashboard rate limiting
export const dashboardLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // limit each IP to 200 dashboard requests per hour
  message: {
    success: false,
    message: 'Dashboard request limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// User export rate limiting (strict because it's resource intensive)
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 exports per hour
  message: {
    success: false,
    message: 'Export limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});