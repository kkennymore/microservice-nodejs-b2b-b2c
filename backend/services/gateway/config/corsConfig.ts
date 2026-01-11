export const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001', // Auth service direct access
      'http://localhost:3002', // Products service direct access
      'http://localhost:3003', // Transactions service direct access
      'http://localhost:3004', // Messaging service direct access
      'http://localhost:3005', // Notifications service direct access
    ];

    // Allow localhost variations for development
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      return callback(null, true);
    }

    // Allow 127.0.0.1 variations for development
    if (origin.match(/^https?:\/\/127\.0\.0\.1(:\d+)?$/)) {
      return callback(null, true);
    }

    // Check against allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In production, you might want to be more restrictive
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS'));
    }

    // In development, allow all origins
    return callback(null, true);
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Version',
    'X-Request-ID',
    'X-User-ID',
    'X-Client-IP'
  ],

  exposedHeaders: [
    'X-Gateway-Processed',
    'X-Response-Time',
    'X-API-Version'
  ],

  optionsSuccessStatus: 200, // Some legacy browsers choke on 204

  maxAge: 86400 // Cache preflight for 24 hours
};