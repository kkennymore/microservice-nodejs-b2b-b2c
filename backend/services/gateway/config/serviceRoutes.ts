export const serviceRoutes = [
  // Authentication Service
  {
    name: 'auth',
    path: '/api/auth',
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:9001',
    protected: false,
    description: 'User authentication and authorization',
    middleware: []
  },

  // Products Service
  {
    name: 'products',
    path: '/api/products',
    target: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:9002',
    protected: true,
    description: 'Product management and catalog',
    middleware: []
  },

  // Transactions Service
  {
    name: 'transactions',
    path: '/api/transactions',
    target: process.env.TRANSACTIONS_SERVICE_URL || 'http://localhost:9003',
    protected: true,
    description: 'Payments, wallets, and subscriptions',
    middleware: []
  },

  // Messaging Service
  {
    name: 'messaging',
    path: '/api/messaging',
    target: process.env.MESSAGING_SERVICE_URL || 'http://localhost:9004',
    protected: true,
    description: 'Real-time messaging and chat',
    middleware: []
  },

  // Notifications Service
  {
    name: 'notifications',
    path: '/api/notifications',
    target: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:9005',
    protected: true,
    description: 'Email, SMS, push notifications',
    middleware: []
  },

  // Advertising Service
  {
    name: 'advertising',
    path: '/api/advertising',
    target: process.env.ADVERTISING_SERVICE_URL || 'http://localhost:9006',
    protected: true,
    description: 'Advertising campaigns and promotional management',
    middleware: []
  },

  // Ticketing Service
  {
    name: 'ticketing',
    path: '/api/ticketing',
    target: process.env.TICKETING_SERVICE_URL || 'http://localhost:9007',
    protected: true,
    description: 'Customer support ticketing system',
    middleware: []
  },

  // Reviews Service
  {
    name: 'reviews',
    path: '/api/reviews',
    target: process.env.REVIEWS_SERVICE_URL || 'http://localhost:9008',
    protected: true,
    description: 'Product reviews and ratings',
    middleware: []
  },

  // Promotions Service
  {
    name: 'promotions',
    path: '/api/promotions',
    target: process.env.PROMOTIONS_SERVICE_URL || 'http://localhost:9009',
    protected: true,
    description: 'Coupons, discounts, and promotions',
    middleware: []
  },

  // Shipping Service
  {
    name: 'shipping',
    path: '/api/shipping',
    target: process.env.SHIPPING_SERVICE_URL || 'http://localhost:9010',
    protected: true,
    description: 'Shipping, logistics, and delivery management',
    middleware: []
  },

  // Recommender Service
  {
    name: 'recommender',
    path: '/api/recommender',
    target: process.env.RECOMMENDER_SERVICE_URL || 'http://localhost:9011',
    protected: true,
    description: 'AI-powered product recommendations',
    middleware: []
  },

  // System Service (Admin)
  {
    name: 'system',
    path: '/api/system',
    target: process.env.SYSTEM_SERVICE_URL || 'http://localhost:9012',
    protected: true,
    description: 'System administration and platform management',
    middleware: []
  },

  // Analytics Service (Business Intelligence)
  {
    name: 'analytics',
    path: '/api/analytics',
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:9013',
    protected: true,
    description: 'Business analytics, reporting, and real-time metrics',
    middleware: [],
    loadBalancing: {
      enabled: true,
      strategy: 'least-connections'
    }
  },

  // Wishlist Service
  {
    name: 'wishlist',
    path: '/api/wishlist',
    target: process.env.WISHLIST_SERVICE_URL || 'http://localhost:9014',
    protected: true,
    description: 'User wishlists and favorites',
    middleware: []
  },

  // Search Service
  {
    name: 'search',
    path: '/api/search',
    target: process.env.SEARCH_SERVICE_URL || 'http://localhost:9015',
    protected: false,
    description: 'Advanced product search',
    middleware: []
  },

  // SEO Service
  {
    name: 'seo',
    path: '/api/seo',
    target: process.env.SEO_SERVICE_URL || 'http://localhost:9016',
    protected: false,
    description: 'SEO optimization and meta tags',
    middleware: []
  },

  // Loyalty Service
  {
    name: 'loyalty',
    path: '/api/loyalty',
    target: process.env.LOYALTY_SERVICE_URL || 'http://localhost:9017',
    protected: true,
    description: 'Loyalty programs and rewards',
    middleware: []
  },

  // Social Service
  {
    name: 'social',
    path: '/api/social',
    target: process.env.SOCIAL_SERVICE_URL || 'http://localhost:9018',
    protected: true,
    description: 'Social features and interactions',
    middleware: []
  },

  // Enhanced Analytics Service
  {
    name: 'enhanced-analytics',
    path: '/api/enhanced-analytics',
    target: process.env.ENHANCED_ANALYTICS_SERVICE_URL || 'http://localhost:9019',
    protected: true,
    description: 'Advanced analytics with AI',
    middleware: []
  },

  // Conversations (part of messaging)
  {
    name: 'conversations',
    path: '/api/conversations',
    target: process.env.MESSAGING_SERVICE_URL || 'http://localhost:9004',
    protected: true,
    description: 'Chat conversations management',
    middleware: []
  },

  // File uploads (messaging service)
  {
    name: 'files',
    path: '/api/files',
    target: process.env.MESSAGING_SERVICE_URL || 'http://localhost:9004',
    protected: true,
    description: 'File upload and management',
    middleware: []
  },

  // WhatsApp messaging
  {
    name: 'whatsapp',
    path: '/api/whatsapp',
    target: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:9005',
    protected: true,
    description: 'WhatsApp Business API messaging',
    middleware: []
  },

  // Email service
  {
    name: 'emails',
    path: '/api/emails',
    target: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:9005',
    protected: true,
    description: 'Email sending and templates',
    middleware: []
  },

  // SMS service
  {
    name: 'sms',
    path: '/api/sms',
    target: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:9005',
    protected: true,
    description: 'SMS messaging service',
    middleware: []
  },

  // Push notifications
  {
    name: 'push',
    path: '/api/push',
    target: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:9005',
    protected: true,
    description: 'Push notification service',
    middleware: []
  },

  // Campaigns (notifications)
  {
    name: 'campaigns',
    path: '/api/campaigns',
    target: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:9005',
    protected: true,
    description: 'Notification campaigns and scheduling',
    middleware: []
  },

  // Dashboard routes (Analytics Service)
  {
    name: 'dashboard',
    path: '/api/dashboard',
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:9013',
    protected: true,
    description: 'Analytics dashboard and KPIs',
    middleware: [],
    loadBalancing: {
      enabled: true,
      strategy: 'round-robin'
    }
  },

  // Reports routes (Analytics Service)
  {
    name: 'reports',
    path: '/api/reports',
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:9013',
    protected: true,
    description: 'Analytics reports and exports',
    middleware: [],
    loadBalancing: {
      enabled: true,
      strategy: 'least-connections'
    }
  }
];