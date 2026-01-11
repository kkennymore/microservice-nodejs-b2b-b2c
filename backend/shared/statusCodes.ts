// HTTP Status Codes and Messages
export const HTTP_STATUS = {
  // Success Codes
  OK: { code: 200, message: 'OK' },
  CREATED: { code: 201, message: 'Created successfully' },
  ACCEPTED: { code: 202, message: 'Request accepted' },
  NO_CONTENT: { code: 204, message: 'No content' },

  // Client Error Codes
  BAD_REQUEST: { code: 400, message: 'Bad request' },
  UNAUTHORIZED: { code: 401, message: 'Unauthorized' },
  FORBIDDEN: { code: 403, message: 'Forbidden' },
  NOT_FOUND: { code: 404, message: 'Resource not found' },
  METHOD_NOT_ALLOWED: { code: 405, message: 'Method not allowed' },
  CONFLICT: { code: 409, message: 'Conflict' },
  UNPROCESSABLE_ENTITY: { code: 422, message: 'Unprocessable entity' },
  LOCKED: { code: 423, message: 'Locked' },
  TOO_MANY_REQUESTS: { code: 429, message: 'Too many requests' },

  // Server Error Codes
  INTERNAL_SERVER_ERROR: { code: 500, message: 'Internal server error' },
  SERVICE_UNAVAILABLE: { code: 503, message: 'Service unavailable' },
} as const;

// Business Logic Status Codes
export const BUSINESS_STATUS = {
  // User Status
  USER_CREATED: { code: 'USER_CREATED', message: 'User created successfully' },
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', message: 'User not found' },
  INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
  USER_ALREADY_EXISTS: { code: 'USER_ALREADY_EXISTS', message: 'User already exists' },
  USER_INACTIVE: { code: 'USER_INACTIVE', message: 'User account is inactive' },
  
  // Authentication Status
  TOKEN_INVALID: { code: 'TOKEN_INVALID', message: 'Invalid or expired token' },
  TOKEN_EXPIRED: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
  INSUFFICIENT_PERMISSIONS: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions' },
  
  // Product Status
  PRODUCT_CREATED: { code: 'PRODUCT_CREATED', message: 'Product created successfully' },
  PRODUCT_NOT_FOUND: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
  PRODUCT_OUT_OF_STOCK: { code: 'PRODUCT_OUT_OF_STOCK', message: 'Product is out of stock' },
  PRODUCT_ALREADY_EXISTS: { code: 'PRODUCT_ALREADY_EXISTS', message: 'Product already exists' },
  
  // Transaction Status
  TRANSACTION_SUCCESS: { code: 'TRANSACTION_SUCCESS', message: 'Transaction completed successfully' },
  TRANSACTION_FAILED: { code: 'TRANSACTION_FAILED', message: 'Transaction failed' },
  INSUFFICIENT_BALANCE: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' },
  
  // Validation Status
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Validation failed' },
  INVALID_INPUT: { code: 'INVALID_INPUT', message: 'Invalid input provided' },
  MISSING_REQUIRED_FIELD: { code: 'MISSING_REQUIRED_FIELD', message: 'Required field is missing' },
  
  // File Upload Status
  FILE_UPLOAD_SUCCESS: { code: 'FILE_UPLOAD_SUCCESS', message: 'File uploaded successfully' },
  FILE_TOO_LARGE: { code: 'FILE_TOO_LARGE', message: 'File size exceeds limit' },
  INVALID_FILE_TYPE: { code: 'INVALID_FILE_TYPE', message: 'Invalid file type' },
} as const;

// Utility functions for status codes
export const getStatusResponse = (status: typeof HTTP_STATUS[keyof typeof HTTP_STATUS] | typeof BUSINESS_STATUS[keyof typeof BUSINESS_STATUS]) => {
  const statusCode = typeof status.code === 'number' ? status.code : 400;
  return {
    success: statusCode < 400 || (typeof status.code === 'string' && !status.code.includes('FAILED') && !status.code.includes('ERROR')),
    statusCode: status.code,
    message: status.message,
  };
};

export const isSuccessStatus = (statusCode: number | string): boolean => {
  if (typeof statusCode === 'number') {
    return statusCode >= 200 && statusCode < 300;
  }
  return !statusCode.toString().includes('FAILED') && !statusCode.toString().includes('ERROR') && !statusCode.toString().includes('INVALID');
};