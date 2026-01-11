declare const config: {
    database: {
        host: string;
        port: string | number;
        username: string;
        password: string;
        database: string;
        dialect: string;
        pool: {
            max: number;
            min: number;
            acquire: number;
            idle: number;
        };
    };
    redis: {
        host: string;
        port: string | number;
        password: string;
        db: string | number;
    };
    rabbitmq: {
        url: string;
        exchange: string;
        queues: {
            email: string;
            notification: string;
            transaction: string;
            product: string;
            ticket: string;
        };
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    email: {
        host: string;
        port: string | number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
    };
    social: {
        facebook: {
            appId: string;
            appSecret: string;
        };
        google: {
            clientId: string;
            clientSecret: string;
        };
    };
    socket: {
        cors: {
            origin: string;
            methods: string[];
        };
    };
    ports: {
        auth: string | number;
        products: string | number;
        transactions: string | number;
        messaging: string | number;
        notifications: string | number;
        advertising: string | number;
        ticketing: string | number;
        system: string | number;
        analytics: string | number;
        shipping: string | number;
        gateway: string | number;
    };
    services: {
        auth: string;
        products: string;
        transactions: string;
        messaging: string;
        notifications: string;
        advertising: string;
        ticketing: string;
        system: string;
        analytics: string;
        shipping: string;
    };
    logging: {
        enabled: boolean;
        level: string;
        file: string;
    };
    resilience: {
        retryAttempts: string | number;
        retryDelay: string | number;
        circuitBreakerTimeout: string | number;
    };
    payments: {
        stripe: {
            secretKey: string;
            publishableKey: string;
        };
        paypal: {
            clientId: string;
            clientSecret: string;
        };
    };
    notifications: {
        twilio: {
            accountSid: string;
            authToken: string;
            phoneNumber: string;
        };
        fcm: {
            serverKey: string;
        };
    };
    security: {
        corsOrigin: string;
        rateLimit: {
            windowMs: string | number;
            maxRequests: string | number;
        };
        fileUpload: {
            maxSize: string | number;
            allowedTypes: string[];
        };
    };
    app: {
        name: string;
        version: string;
        env: string;
        debug: boolean;
        docs: {
            enabled: true;
            path: string;
        };
    };
    monitoring: {
        healthCheck: {
            interval: string | number;
            timeout: string | number;
        };
    };
    external: {
        ga: {
            trackingId: string;
        };
        recaptcha: {
            secretKey: string;
            siteKey: string;
        };
    };
};
export declare const connectDB: () => Promise<null>;
export { authenticateToken } from './auth.js';
export default config;
