// backend/shared/events.js

const EVENTS = {
  // Auth Events
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
  USER_PROFILE_UPDATED: 'user.profile_updated',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  USER_EMAIL_VERIFIED: 'user.email_verified',
  USER_DELETED: 'user.deleted',

  // Product Events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_APPROVED: 'product.approved',
  PRODUCT_REJECTED: 'product.rejected',
  PRODUCT_LISTED: 'product.listed',
  PRODUCT_UNLISTED: 'product.unlisted',
  PRODUCT_PURCHASED: 'product.purchased',
  PRODUCT_OFFER_MADE: 'product.offer_made',
  PRODUCT_OFFER_ACCEPTED: 'product.offer_accepted',
  PRODUCT_OFFER_REJECTED: 'product.offer_rejected',
  PRODUCT_VIEWED: 'product.viewed',
  PRODUCT_LIKED: 'product.liked',
  PRODUCT_REVIEWED: 'product.reviewed',
  PRODUCT_VIDEOS_UPDATED: 'product.videos_updated',

  // Transaction Events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  WALLET_FUNDED: 'wallet.funded',
  WALLET_DEBITED: 'wallet.debited',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  COMMISSION_CALCULATED: 'commission.calculated',
  COMMISSION_PAID: 'commission.paid',

  // Messaging Events
  MESSAGE_SENT: 'message.sent',
  CHAT_STARTED: 'chat.started',
  CHAT_ENDED: 'chat.ended',
  FILE_UPLOADED: 'file.uploaded',
  VOICE_NOTE_SENT: 'voice_note.sent',

  // Notification Events
  EMAIL_SENT: 'email.sent',
  SMS_SENT: 'sms.sent',
  PUSH_NOTIFICATION_SENT: 'push.sent',
  NOTIFICATION_READ: 'notification.read',

  // Advertising Events
  AD_CREATED: 'ad.created',
  AD_UPDATED: 'ad.updated',
  AD_DELETED: 'ad.deleted',
  AD_CLICKED: 'ad.clicked',
  AD_IMPRESSION: 'ad.impression',

  // Ticketing Events
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_CLOSED: 'ticket.closed',
  TICKET_ASSIGNED: 'ticket.assigned',
  TICKET_ESCALATED: 'ticket.escalated',

  // System Events
  SYSTEM_ERROR: 'system.error',
  SERVICE_DOWN: 'service.down',
  SERVICE_UP: 'service.up',
  LOG_TOGGLED: 'log.toggled',
  SETTING_UPDATED: 'setting.updated',
  BACKUP_COMPLETED: 'backup.completed',

  // Analytics Events
  PAGE_VIEWED: 'page.viewed',
  PRODUCT_ANALYTICS_VIEWED: 'product.analytics_viewed',
  SEARCH_PERFORMED: 'search.performed',
  REPORT_GENERATED: 'report.generated',

  // Real-time Events
  SELLER_CONTACTED: 'seller.contacted',
  REAL_TIME_SEARCH: 'search.real_time',

  // Shipping Events
  DELIVERY_REQUESTED: 'delivery.requested',
  DELIVERY_ACCEPTED: 'delivery.accepted',
  DELIVERY_COMPLETED: 'delivery.completed',
  DELIVERY_FAILED: 'delivery.failed',
  PARTNER_REGISTERED: 'partner.registered',

  // Admin Events
  ADMIN_ACTION: 'admin.action',
  USER_BLOCKED: 'user.blocked',
  USER_UNBLOCKED: 'user.unblocked',
  DISPUTE_CREATED: 'dispute.created',
  DISPUTE_RESOLVED: 'dispute.resolved',

  // General Events
  SERVICE_HEALTH_CHECK: 'service.health_check',
  CACHE_INVALIDATED: 'cache.invalidated',
  QUEUE_PROCESSED: 'queue.processed'
};

export default EVENTS;