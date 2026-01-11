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

// Strict rate limiting for expensive operations
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many expensive operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Shipping-specific rate limiting
export const shippingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 shipping operations per hour
  message: {
    success: false,
    message: 'Shipping operation limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Analytics rate limiting
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // limit each IP to 200 analytics requests per hour
  message: {
    success: false,
    message: 'Analytics request limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});