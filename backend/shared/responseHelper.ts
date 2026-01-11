// Common response helper utilities
import { Response } from 'express';
import { HTTP_STATUS, BUSINESS_STATUS, getStatusResponse, isSuccessStatus } from './statusCodes';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<{
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  // Additional properties if needed
}

export const createSuccessResponse = <T>(
  res: Response,
  data?: T,
  customMessage?: string
): Response => {
  const status = getStatusResponse(HTTP_STATUS.OK);
  return res.status(HTTP_STATUS.OK.code).json({
    success: true,
    statusCode: HTTP_STATUS.OK.code,
    message: customMessage || status.message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const createCreatedResponse = <T>(
  res: Response,
  data?: T,
  customMessage?: string
): Response => {
  const status = getStatusResponse(HTTP_STATUS.CREATED);
  return res.status(HTTP_STATUS.CREATED.code).json({
    success: true,
    statusCode: HTTP_STATUS.CREATED.code,
    message: customMessage || status.message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const createErrorResponse = (
  res: Response,
  status: typeof HTTP_STATUS[keyof typeof HTTP_STATUS],
  error?: string,
  customMessage?: string
): Response => {
  const statusResponse = getStatusResponse(status);
  return res.status(status.code).json({
    success: false,
    statusCode: status.code,
    message: customMessage || statusResponse.message,
    error,
    timestamp: new Date().toISOString(),
  });
};

export const createBusinessErrorResponse = (
  res: Response,
  businessStatus: typeof BUSINESS_STATUS[keyof typeof BUSINESS_STATUS],
  statusCode: typeof HTTP_STATUS[keyof typeof HTTP_STATUS] = HTTP_STATUS.BAD_REQUEST,
  error?: string
): Response => {
  const statusResponse = getStatusResponse(businessStatus);
  const httpStatus = typeof statusCode.code === 'number' ? statusCode : HTTP_STATUS.BAD_REQUEST;
  return res.status(httpStatus.code).json({
    success: false,
    statusCode: httpStatus.code,
    message: statusResponse.message,
    error: error || businessStatus.code,
    timestamp: new Date().toISOString(),
  });
};

export const createPaginatedResponse = <T>(
  res: Response,
  items: T[],
  page: number,
  limit: number,
  total: number,
  customMessage?: string
): Response => {
  const totalPages = Math.ceil(total / limit);
  const status = getStatusResponse(HTTP_STATUS.OK);
  
  return res.status(HTTP_STATUS.OK.code).json({
    success: true,
    statusCode: HTTP_STATUS.OK.code,
    message: customMessage || status.message,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
    timestamp: new Date().toISOString(),
  });
};

export const createValidationErrorResponse = (
  res: Response,
  validationErrors: string[]
): Response => {
  return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY.code).json({
    success: false,
    statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY.code,
    message: getStatusResponse(BUSINESS_STATUS.VALIDATION_ERROR).message,
    error: validationErrors,
    timestamp: new Date().toISOString(),
  });
};