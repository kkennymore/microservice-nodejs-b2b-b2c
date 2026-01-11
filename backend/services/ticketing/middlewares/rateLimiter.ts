// Rate limiting middleware for Ticketing Service

import rateLimit from 'express-rate-limit'

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Ticket creation rate limiting (stricter)
export const ticketCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 ticket creations per hour
  message: {
    success: false,
    message: 'Too many tickets created, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Message sending rate limiting
export const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 messages per hour
  message: {
    success: false,
    message: 'Too many messages sent, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// File upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Admin operations rate limiting
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 admin operations per windowMs
  message: {
    success: false,
    message: 'Too many admin operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Agent operations rate limiting
export const agentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 agent operations per windowMs
  message: {
    success: false,
    message: 'Too many agent operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})