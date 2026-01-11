import { Request as ExpressRequest, Response } from 'express';
export interface AuthenticatedUser {
    id: string;
    email: string;
    username: string;
    role: 'buyer' | 'seller' | 'admin' | 'delivery_partner';
}
export interface AuthenticatedRequest extends ExpressRequest {
    user?: AuthenticatedUser;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface SearchQuery extends PaginationQuery {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
}
export interface FileUploadRequest extends AuthenticatedRequest {
    files?: {
        [fieldname: string]: Express.Multer.File[];
    };
}
export interface JwtPayload {
    userId: string;
    email: string;
    username: string;
    role: string;
    iat?: number;
    exp?: number;
}
export type RequestHandler = (req: AuthenticatedRequest, res: Response, next: Function) => Promise<void> | void;
export type AsyncRequestHandler = (req: AuthenticatedRequest, res: Response, next: Function) => Promise<void>;
export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode?: number;
    message?: string;
}
export interface DatabaseQueryOptions {
    include?: any[];
    where?: Record<string, any>;
    order?: Array<[string, string]>;
    limit?: number;
    offset?: number;
    raw?: boolean;
}
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface SoftDeleteEntity extends BaseEntity {
    deletedAt?: Date;
    isActive?: boolean;
}
