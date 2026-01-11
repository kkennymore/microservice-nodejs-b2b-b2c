import { Response } from 'express';
import { HTTP_STATUS, BUSINESS_STATUS } from '@/shared/statusCodes';
export interface ApiResponse<T = any> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    error?: string;
    timestamp: string;
}
export interface PaginatedResponse<T = any> extends ApiResponse<T> {
    data: {
        items: T[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}
export declare const createSuccessResponse: <T>(res: Response, data?: T, customMessage?: string) => Response;
export declare const createCreatedResponse: <T>(res: Response, data?: T, customMessage?: string) => Response;
export declare const createErrorResponse: (res: Response, status: (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS], error?: string, customMessage?: string) => Response;
export declare const createBusinessErrorResponse: (res: Response, businessStatus: (typeof BUSINESS_STATUS)[keyof typeof BUSINESS_STATUS], statusCode?: (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS], error?: string) => Response;
export declare const createPaginatedResponse: <T>(res: Response, items: T[], page: number, limit: number, total: number, customMessage?: string) => Response;
export declare const createValidationErrorResponse: (res: Response, validationErrors: string[]) => Response;
