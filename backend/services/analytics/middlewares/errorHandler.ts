export const errorHandler = (error, req, res, next) => {
  console.error('Analytics Service Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // MySQL errors
  if (error.code) {
    switch (error.code) {
      case 'ER_DUP_ENTRY':
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry found'
        });
      case 'ER_NO_REFERENCED_ROW':
      case 'ER_NO_REFERENCED_ROW_2':
        return res.status(400).json({
          success: false,
          message: 'Referenced record not found'
        });
      case 'ER_BAD_FIELD_ERROR':
        return res.status(400).json({
          success: false,
          message: 'Invalid field specified'
        });
    }
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error response
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      error: error.toString()
    })
  });
};

// Async error wrapper for routes that use async/await
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Database connection error handler
export const handleDatabaseError = (error, operation) => {
  console.error(`Database error during ${operation}:`, {
    message: error.message,
    code: error.code,
    errno: error.errno,
    sqlState: error.sqlState,
    sqlMessage: error.sqlMessage
  });

  throw error;
};

// RabbitMQ connection error handler
export const handleRabbitMQError = (error, operation) => {
  console.error(`RabbitMQ error during ${operation}:`, {
    message: error.message,
    code: error.code
  });

  // Don't throw for RabbitMQ connection issues in development
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
};

// WebSocket error handler
export const handleWebSocketError = (error, clientId) => {
  console.error(`WebSocket error for client ${clientId}:`, {
    message: error.message,
    code: error.code
  });
};