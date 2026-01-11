export const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  const statusCode = err.statusCode || err.status || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error details
  console.error(`❌ [${requestId}] Error ${statusCode}:`, {
    message: err.message,
    stack: isDevelopment ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });

  // Determine error type and response
  let errorResponse = {
    success: false,
    message: 'Internal server error',
    requestId,
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.message = 'Validation error';
    errorResponse.details = err.details;
  } else if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
    errorResponse.message = 'Authentication failed';
    errorResponse.code = 'AUTH_FAILED';
  } else if (err.code === 'ECONNREFUSED') {
    errorResponse.message = 'Service temporarily unavailable';
    errorResponse.code = 'SERVICE_UNAVAILABLE';
  } else if (err.code === 'ETIMEDOUT') {
    errorResponse.message = 'Request timeout';
    errorResponse.code = 'TIMEOUT';
  } else if (statusCode === 429) {
    errorResponse.message = 'Too many requests';
    errorResponse.code = 'RATE_LIMITED';
  } else if (statusCode === 403) {
    errorResponse.message = 'Access forbidden';
    errorResponse.code = 'FORBIDDEN';
  } else if (statusCode === 404) {
    errorResponse.message = 'Resource not found';
    errorResponse.code = 'NOT_FOUND';
  }

  // Add error details in development
  if (isDevelopment) {
    errorResponse.error = {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
  }

  // Set appropriate status code
  res.status(statusCode).json(errorResponse);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to send this to a logging service
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Gracefully shutdown in production
  process.exit(1);
});