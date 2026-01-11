export declare const HTTP_STATUS: {
    readonly OK: {
        readonly code: 200;
        readonly message: "OK";
    };
    readonly CREATED: {
        readonly code: 201;
        readonly message: "Created successfully";
    };
    readonly ACCEPTED: {
        readonly code: 202;
        readonly message: "Request accepted";
    };
    readonly NO_CONTENT: {
        readonly code: 204;
        readonly message: "No content";
    };
    readonly BAD_REQUEST: {
        readonly code: 400;
        readonly message: "Bad request";
    };
    readonly UNAUTHORIZED: {
        readonly code: 401;
        readonly message: "Unauthorized";
    };
    readonly FORBIDDEN: {
        readonly code: 403;
        readonly message: "Forbidden";
    };
    readonly NOT_FOUND: {
        readonly code: 404;
        readonly message: "Resource not found";
    };
    readonly METHOD_NOT_ALLOWED: {
        readonly code: 405;
        readonly message: "Method not allowed";
    };
    readonly CONFLICT: {
        readonly code: 409;
        readonly message: "Conflict";
    };
    readonly UNPROCESSABLE_ENTITY: {
        readonly code: 422;
        readonly message: "Unprocessable entity";
    };
    readonly TOO_MANY_REQUESTS: {
        readonly code: 429;
        readonly message: "Too many requests";
    };
    readonly INTERNAL_SERVER_ERROR: {
        readonly code: 500;
        readonly message: "Internal server error";
    };
    readonly SERVICE_UNAVAILABLE: {
        readonly code: 503;
        readonly message: "Service unavailable";
    };
};
export declare const BUSINESS_STATUS: {
    readonly USER_CREATED: {
        readonly code: "USER_CREATED";
        readonly message: "User created successfully";
    };
    readonly USER_NOT_FOUND: {
        readonly code: "USER_NOT_FOUND";
        readonly message: "User not found";
    };
    readonly INVALID_CREDENTIALS: {
        readonly code: "INVALID_CREDENTIALS";
        readonly message: "Invalid credentials";
    };
    readonly USER_ALREADY_EXISTS: {
        readonly code: "USER_ALREADY_EXISTS";
        readonly message: "User already exists";
    };
    readonly USER_INACTIVE: {
        readonly code: "USER_INACTIVE";
        readonly message: "User account is inactive";
    };
    readonly TOKEN_INVALID: {
        readonly code: "TOKEN_INVALID";
        readonly message: "Invalid or expired token";
    };
    readonly TOKEN_EXPIRED: {
        readonly code: "TOKEN_EXPIRED";
        readonly message: "Token has expired";
    };
    readonly INSUFFICIENT_PERMISSIONS: {
        readonly code: "INSUFFICIENT_PERMISSIONS";
        readonly message: "Insufficient permissions";
    };
    readonly PRODUCT_CREATED: {
        readonly code: "PRODUCT_CREATED";
        readonly message: "Product created successfully";
    };
    readonly PRODUCT_NOT_FOUND: {
        readonly code: "PRODUCT_NOT_FOUND";
        readonly message: "Product not found";
    };
    readonly PRODUCT_OUT_OF_STOCK: {
        readonly code: "PRODUCT_OUT_OF_STOCK";
        readonly message: "Product is out of stock";
    };
    readonly PRODUCT_ALREADY_EXISTS: {
        readonly code: "PRODUCT_ALREADY_EXISTS";
        readonly message: "Product already exists";
    };
    readonly TRANSACTION_SUCCESS: {
        readonly code: "TRANSACTION_SUCCESS";
        readonly message: "Transaction completed successfully";
    };
    readonly TRANSACTION_FAILED: {
        readonly code: "TRANSACTION_FAILED";
        readonly message: "Transaction failed";
    };
    readonly INSUFFICIENT_BALANCE: {
        readonly code: "INSUFFICIENT_BALANCE";
        readonly message: "Insufficient balance";
    };
    readonly VALIDATION_ERROR: {
        readonly code: "VALIDATION_ERROR";
        readonly message: "Validation failed";
    };
    readonly INVALID_INPUT: {
        readonly code: "INVALID_INPUT";
        readonly message: "Invalid input provided";
    };
    readonly MISSING_REQUIRED_FIELD: {
        readonly code: "MISSING_REQUIRED_FIELD";
        readonly message: "Required field is missing";
    };
    readonly FILE_UPLOAD_SUCCESS: {
        readonly code: "FILE_UPLOAD_SUCCESS";
        readonly message: "File uploaded successfully";
    };
    readonly FILE_TOO_LARGE: {
        readonly code: "FILE_TOO_LARGE";
        readonly message: "File size exceeds limit";
    };
    readonly INVALID_FILE_TYPE: {
        readonly code: "INVALID_FILE_TYPE";
        readonly message: "Invalid file type";
    };
};
export declare const getStatusResponse: (status: (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS] | (typeof BUSINESS_STATUS)[keyof typeof BUSINESS_STATUS]) => {
    success: boolean;
    statusCode: 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 405 | 409 | 422 | 429 | 500 | 503 | "USER_CREATED" | "USER_NOT_FOUND" | "INVALID_CREDENTIALS" | "USER_ALREADY_EXISTS" | "USER_INACTIVE" | "TOKEN_INVALID" | "TOKEN_EXPIRED" | "INSUFFICIENT_PERMISSIONS" | "PRODUCT_CREATED" | "PRODUCT_NOT_FOUND" | "PRODUCT_OUT_OF_STOCK" | "PRODUCT_ALREADY_EXISTS" | "TRANSACTION_SUCCESS" | "TRANSACTION_FAILED" | "INSUFFICIENT_BALANCE" | "VALIDATION_ERROR" | "INVALID_INPUT" | "MISSING_REQUIRED_FIELD" | "FILE_UPLOAD_SUCCESS" | "FILE_TOO_LARGE" | "INVALID_FILE_TYPE";
    message: "User not found" | "OK" | "Created successfully" | "Request accepted" | "No content" | "Bad request" | "Unauthorized" | "Forbidden" | "Resource not found" | "Method not allowed" | "Conflict" | "Unprocessable entity" | "Too many requests" | "Internal server error" | "Service unavailable" | "User created successfully" | "Invalid credentials" | "User already exists" | "User account is inactive" | "Invalid or expired token" | "Token has expired" | "Insufficient permissions" | "Product created successfully" | "Product not found" | "Product is out of stock" | "Product already exists" | "Transaction completed successfully" | "Transaction failed" | "Insufficient balance" | "Validation failed" | "Invalid input provided" | "Required field is missing" | "File uploaded successfully" | "File size exceeds limit" | "Invalid file type";
};
export declare const isSuccessStatus: (statusCode: number | string) => boolean;
