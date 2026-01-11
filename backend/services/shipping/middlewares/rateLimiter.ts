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

// Strict rate limiting for expensive operations (shipping creation, label generation)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 expensive operations per windowMs
  message: {
    success: false,
    message: 'Too many shipping operations, please try again later.'
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

// Tracking rate limiting (more lenient)
export const trackingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // limit each IP to 200 tracking requests per hour
  message: {
    success: false,
    message: 'Tracking request limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});