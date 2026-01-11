import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const loggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();

  // Add request ID to request object
  req.requestId = requestId;
  req.startTime = startTime;

  // Log incoming request
  const requestLog = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || null,
    headers: sanitizeHeaders(req.headers),
    query: req.query,
    body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
  };

  console.log(`📨 [${requestId}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);

  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function(data) {
    const responseLog = {
      timestamp: new Date().toISOString(),
      requestId,
      statusCode: res.statusCode,
      responseTime: Date.now() - startTime,
      responseSize: JSON.stringify(data).length,
      data: process.env.NODE_ENV === 'development' ? data : undefined // Only log response data in development
    };

    // Log response
    console.log(`📤 [${requestId}] ${res.statusCode} ${req.method} ${req.originalUrl} - ${Date.now() - startTime}ms`);

    // Store logs for analysis (in production, send to logging service)
    storeLog('requests', requestLog);
    storeLog('responses', responseLog);

    // Call original json method
    return originalJson.call(this, data);
  };

  // Handle response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log performance metrics
    if (duration > 5000) { // Log slow requests (>5 seconds)
      console.warn(`🐌 [${requestId}] SLOW REQUEST: ${req.method} ${req.originalUrl} took ${duration}ms`);
      storeLog('performance', {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        url: req.originalUrl,
        duration,
        userId: req.user?.id,
        statusCode: res.statusCode
      });
    }

    // Log errors
    if (res.statusCode >= 400) {
      console.error(`❌ [${requestId}] ERROR: ${res.statusCode} ${req.method} ${req.originalUrl}`);
      storeLog('errors', {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        userId: req.user?.id,
        error: res.locals.error
      });
    }
  });

  next();
};

// Sanitize sensitive data from headers
function sanitizeHeaders(headers) {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const sanitized = { ...headers };

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Sanitize sensitive data from request body
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'credit_card', 'ssn'];
  const sanitized = { ...body };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Limit body size for logging
  const bodyStr = JSON.stringify(sanitized);
  if (bodyStr.length > 1000) {
    return bodyStr.substring(0, 1000) + '... [TRUNCATED]';
  }

  return sanitized;
}

// Store log entry (in production, send to logging service like ELK stack)
async function storeLog(type, logData) {
  try {
    // In development, store in memory for simple access
    if (process.env.NODE_ENV === 'development') {
      if (!global.gatewayLogs) {
        global.gatewayLogs = {};
      }
      if (!global.gatewayLogs[type]) {
        global.gatewayLogs[type] = [];
      }

      // Keep only last 1000 entries per type
      if (global.gatewayLogs[type].length >= 1000) {
        global.gatewayLogs[type].shift();
      }

      global.gatewayLogs[type].push(logData);
    }

    // In production, you would send to logging service
    // await sendToLoggingService(type, logData);

  } catch (error) {
    console.error('Failed to store log:', error);
  }
}

// Generate unique request ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get logs for monitoring (development only)
export const getLogs = (type = null, limit = 100) => {
  if (!global.gatewayLogs) return [];

  if (type) {
    return global.gatewayLogs[type]?.slice(-limit) || [];
  }

  // Return all logs
  const allLogs = {};
  for (const [logType, logs] of Object.entries(global.gatewayLogs)) {
    allLogs[logType] = logs.slice(-limit);
  }

  return allLogs;
};

// Clear logs (for testing)
export const clearLogs = () => {
  if (global.gatewayLogs) {
    global.gatewayLogs = {};
  }
};