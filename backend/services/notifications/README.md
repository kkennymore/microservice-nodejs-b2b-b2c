# Notifications Service

Comprehensive multi-channel notification service for the multivendor marketplace with email, SMS, and push notifications.

## Features

### 📧 Email Notifications
- **SMTP & Provider Integration**: Support for SMTP, SendGrid, SES
- **Template Engine**: Handlebars-based email templates
- **Rich Content**: HTML emails with text fallbacks
- **Delivery Tracking**: Send status and bounce tracking

### 📱 SMS Notifications
- **Twilio Integration**: Professional SMS delivery
- **Template Support**: Predefined SMS templates
- **Delivery Confirmation**: Status tracking and cost monitoring
- **Phone Validation**: Automatic phone number formatting

### 📲 Push Notifications
- **Firebase Integration**: Cross-platform push delivery
- **Device Management**: Token registration and cleanup
- **Rich Notifications**: Custom titles, bodies, and data payloads
- **Multi-Device Support**: iOS, Android, and web platforms

### 📋 Notification Management
- **In-App Notifications**: Database-stored user notifications
- **Preference System**: Granular user notification preferences
- **Read Receipts**: Mark as read and unread count tracking
- **Priority Levels**: Low, normal, high, and urgent notifications

### 🔄 Queue System
- **RabbitMQ Integration**: Asynchronous notification processing
- **Multiple Queues**: Separate queues for email, SMS, and push
- **Retry Logic**: Automatic retry on delivery failures
- **Rate Limiting**: Prevent service overload

## Database Tables

### notifications
- User notifications with read status and priority
- Support for multiple notification types
- Automatic expiration and cleanup

### email_logs
- Email delivery tracking and analytics
- Provider information and message IDs
- Bounce and failure tracking

### sms_logs
- SMS delivery logs with cost tracking
- Message segments and delivery status
- Provider-specific metadata

### push_tokens
- Device push notification tokens
- Platform-specific handling (iOS/Android/Web)
- Automatic token cleanup

### notification_preferences
- User notification preferences by channel
- Granular control over notification types
- Default preference templates

### notification_templates
- Reusable notification templates
- Handlebars templating support
- Multi-channel template support

## Queue Architecture

### RabbitMQ Queues
```
email_queue      - Email notification processing
sms_queue        - SMS notification processing
push_queue       - Push notification processing
notification_queue - General notification orchestration
```

### Processing Flow
1. **Notification Created** → Queued in appropriate channel
2. **Worker Processes** → Delivers through provider API
3. **Status Updated** → Database tracking updated
4. **Retry on Failure** → Automatic retry with backoff

## API Endpoints

### Notifications
```
GET    /api/notifications         - Get user notifications
GET    /api/notifications/unread  - Get unread count
GET    /api/notifications/stats   - Get notification statistics
PUT    /api/notifications/:id/read - Mark as read
PUT    /api/notifications/read-all - Mark all as read
DELETE /api/notifications/:id     - Delete notification
GET    /api/notifications/preferences - Get user preferences
PUT    /api/notifications/preferences - Update preferences
POST   /api/notifications/test    - Send test notification
POST   /api/notifications/send    - Send notification (admin)
```

### Email
```
POST   /api/emails/send           - Send custom email
POST   /api/emails/template/:name - Send templated email
GET    /api/emails/templates      - Get available templates
```

### SMS
```
POST   /api/sms/send              - Send custom SMS
POST   /api/sms/template/:name    - Send templated SMS
GET    /api/sms/status/:sid       - Get SMS delivery status
GET    /api/sms/templates         - Get available templates
GET    /api/sms/stats             - Get SMS statistics
```

### Push Notifications
```
POST   /api/push/send             - Send custom push
POST   /api/push/template/:name   - Send templated push
POST   /api/push/token            - Register device token
DELETE /api/push/token/:deviceId  - Unregister device token
GET    /api/push/tokens           - Get user tokens
POST   /api/push/test             - Send test push
GET    /api/push/templates        - Get available templates
```

## Configuration

### Environment Variables
```env
# Service Configuration
NOTIFICATIONS_PORT=3005
FRONTEND_URL=http://localhost:3000

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM_NAME=Marketplace
EMAIL_FROM=your_email@gmail.com

# Alternative Email Providers
EMAIL_PROVIDER=sendgrid  # or 'ses'
SENDGRID_API_KEY=your_sendgrid_key

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Push Notifications (Firebase)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
# or
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json

# Queue Configuration
RABBITMQ_URL=amqp://localhost
```

## Email Templates

### Available Templates
- `order_placed` - Order confirmation emails
- `order_shipped` - Shipping notification
- `payment_received` - Payment confirmation
- `welcome_email` - User welcome message
- `password_reset` - Password reset instructions

### Template Variables
```javascript
// Order Placed Template
{
  customer_name: "John Doe",
  order_id: "ORD-12345",
  order_details: "Product A x2, Product B x1",
  total_amount: "299.99"
}
```

## SMS Templates

### Available Templates
- `order_placed_sms` - Order confirmation SMS
- `payment_failed_sms` - Payment failure alert
- `delivery_update_sms` - Delivery status updates

## Push Notification Templates

### Available Templates
- `new_message` - New chat message alert
- `order_update` - Order status changes
- `payment_failed` - Payment failure notifications

## Usage Examples

### Send Email
```javascript
const response = await fetch('/api/emails/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome!',
    html: '<h1>Welcome to our platform!</h1>',
    userId: userId
  })
});
```

### Send SMS
```javascript
const response = await fetch('/api/sms/template/order_placed_sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    to: '+1234567890',
    templateData: {
      order_id: 'ORD-12345',
      total: '299.99'
    }
  })
});
```

### Register Push Token
```javascript
const response = await fetch('/api/push/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    device_type: 'android',
    token: 'fcm_token_here',
    device_id: 'unique_device_id',
    app_version: '1.0.0'
  })
});
```

### Send Push Notification
```javascript
const response = await fetch('/api/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'New Message',
    body: 'You have a new message from John',
    data: {
      type: 'message',
      senderId: 123,
      conversationId: 456
    }
  })
});
```

## Notification Preferences

### Default Preferences
```javascript
{
  email: {
    order_updates: true,
    payment_notifications: true,
    security_alerts: true,
    marketing_emails: false,
    product_updates: true,
    system_maintenance: true
  },
  sms: {
    order_updates: false,
    payment_notifications: true,
    security_alerts: true,
    marketing_messages: false
  },
  push: {
    order_updates: true,
    payment_notifications: true,
    security_alerts: true,
    marketing_push: false,
    product_updates: true,
    new_messages: true
  }
}
```

## Security Features

- **JWT Authentication**: Required for all notification operations
- **Rate Limiting**: Prevent notification spam
- **Input Validation**: Sanitize all user inputs
- **Template Injection Protection**: Safe variable replacement
- **Device Token Validation**: Secure push token management

## Monitoring & Analytics

- **Delivery Tracking**: Success/failure rates by channel
- **Queue Monitoring**: RabbitMQ queue status and processing rates
- **User Engagement**: Notification read rates and preferences
- **Cost Tracking**: SMS delivery costs and email analytics

## Setup Instructions

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment**
```bash
# Copy and update environment variables
cp .env.example .env
# Edit .env with your provider credentials
```

3. **Database Setup**
```bash
npm run db:up
```

4. **Start Service**
```bash
npm start
```

## Provider Setup

### Email Providers
- **Gmail SMTP**: Requires app password
- **SendGrid**: API key configuration
- **AWS SES**: IAM credentials required

### SMS Providers
- **Twilio**: Account SID, auth token, and phone number
- **Phone Validation**: Automatic E.164 formatting

### Push Notifications
- **Firebase**: Service account key or JSON file
- **Multi-Platform**: iOS, Android, Web support
- **Token Management**: Automatic cleanup of expired tokens

## Production Considerations

- **Rate Limiting**: Configure provider rate limits
- **Cost Monitoring**: Track SMS and email delivery costs
- **Queue Scaling**: Multiple worker instances for high volume
- **Backup Queues**: Dead letter queues for failed deliveries
- **Monitoring**: Comprehensive logging and alerting
- **Compliance**: GDPR and privacy regulation compliance

## ✅ Advanced Features Implemented

### 📱 WhatsApp Business API Integration
- **Message Templates**: Pre-approved WhatsApp templates with variable support
- **Template Management**: Upload and manage WhatsApp message templates
- **Delivery Tracking**: WhatsApp message status and delivery confirmation
- **Rich Messaging**: Support for text, media, and interactive messages

**API Endpoints:**
```
POST   /api/whatsapp/send           - Send WhatsApp message
POST   /api/whatsapp/custom         - Send custom WhatsApp message
GET    /api/whatsapp/status/:id     - Get message status
GET    /api/whatsapp/templates      - Get available templates
GET    /api/whatsapp/stats          - Get WhatsApp statistics
```

### 📊 Advanced Analytics & Reporting
- **Real-Time Metrics**: Live notification delivery statistics
- **Performance Insights**: AI-powered recommendations and alerts
- **Channel Comparison**: Detailed performance metrics by channel
- **Campaign Analytics**: Campaign-specific delivery and engagement tracking
- **Export Capabilities**: CSV/JSON export for external analysis

**Analytics Endpoints:**
```
GET    /api/analytics/dashboard     - Get dashboard overview
GET    /api/analytics/range         - Get analytics by date range
GET    /api/analytics/realtime      - Get real-time metrics
GET    /api/analytics/insights      - Get performance insights
GET    /api/analytics/channels      - Get channel performance
GET    /api/analytics/export        - Export analytics data
GET    /api/analytics/campaigns/top - Get top performing campaigns
```

### 📅 Notification Scheduling & Campaigns
- **Campaign Management**: Create, schedule, and manage notification campaigns
- **Bulk Messaging**: Send notifications to user segments
- **Scheduling**: Time-based campaign execution
- **Target Segmentation**: User segmentation based on criteria
- **Campaign Analytics**: Detailed campaign performance tracking

**Campaign Endpoints:**
```
POST   /api/campaigns                - Create campaign
GET    /api/campaigns               - Get user campaigns
GET    /api/campaigns/:id           - Get campaign details
POST   /api/campaigns/:id/start     - Start campaign
POST   /api/campaigns/:id/cancel    - Cancel campaign
GET    /api/campaigns/:id/analytics - Get campaign analytics
GET    /api/campaigns/stats/overview - Get campaign statistics
DELETE /api/campaigns/:id           - Delete campaign
```

### 🌍 Multi-Language Template Support
- **Template Translations**: Multi-language support for all templates
- **Language Detection**: Automatic language detection from user preferences
- **Dynamic Translation**: Real-time template rendering in user language
- **Translation Management**: Admin interface for template translations

**Supported Languages:**
- English (en) - Default
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar)

### 🎯 Advanced Segmentation & Targeting
- **User Segmentation**: Target users based on behavior, preferences, and demographics
- **Dynamic Criteria**: Real-time user segmentation for campaigns
- **A/B Testing**: Test different message variants for optimization
- **Personalization**: Dynamic content based on user data

**Segmentation Criteria:**
- User registration date
- Last login date
- Purchase history
- Geographic location
- Device preferences
- Notification engagement
- Subscription status

### 🤖 Marketing Automation Integration
- **Triggered Campaigns**: Automatic notifications based on user actions
- **Welcome Series**: Automated onboarding notification sequences
- **Re-engagement**: Smart re-engagement campaigns for inactive users
- **Lifecycle Marketing**: Notifications based on user lifecycle stage

**Automation Triggers:**
- User registration
- Purchase completion
- Cart abandonment
- Password reset
- Account verification
- Subscription changes
- Order status updates

### 📈 Real-Time Delivery Analytics
- **Live Monitoring**: Real-time notification delivery tracking
- **Performance Alerts**: Automatic alerts for delivery issues
- **Trend Analysis**: Historical performance trends and predictions
- **Quality Metrics**: Message quality and engagement scoring

**Real-Time Metrics:**
- Delivery rates by channel
- Open and click rates
- Bounce and complaint rates
- Geographic performance
- Time-based delivery patterns
- Device and platform analytics

## Configuration Examples

### WhatsApp Setup
```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### Multi-Language Setup
```javascript
// Template translation
{
  template_id: 1,
  language_code: 'es',
  subject: 'Confirmación de Pedido',
  content: 'Hola {{customer_name}}, tu pedido #{{order_id}} ha sido confirmado.',
  variables: ['customer_name', 'order_id']
}
```

### Campaign Creation
```javascript
const campaign = {
  name: 'Welcome Series',
  type: 'email',
  template_id: 1,
  target_criteria: {
    user_type: 'buyer',
    registration_date_after: '2024-01-01'
  },
  content: {
    title: 'Welcome to Our Marketplace!',
    message: 'Thank you for joining us...'
  },
  scheduled_at: '2024-01-15T10:00:00Z'
};
```

### Analytics Query
```javascript
const analytics = await fetch('/api/analytics/range?start_date=2024-01-01&end_date=2024-01-07&channel=email');
const data = await analytics.json();

// Returns detailed analytics with:
// - Delivery rates
// - Open rates
// - Click rates
// - Geographic breakdown
// - Time-based trends
```

## Advanced Usage Examples

### A/B Testing Campaign
```javascript
// Create A/B test campaign
const abTestCampaign = {
  name: 'Subject Line A/B Test',
  type: 'email',
  variants: [
    { subject: 'Flash Sale: 50% Off!', content: 'variant_a_content' },
    { subject: 'Limited Time: Half Price Sale!', content: 'variant_b_content' }
  ],
  target_criteria: { segment: 'high_value_customers' },
  test_percentage: 50
};
```

### Automated Re-engagement
```javascript
// Trigger-based campaign
const reengagementCampaign = {
  name: 'Cart Abandonment Recovery',
  type: 'email',
  trigger: 'cart_abandoned',
  delay_hours: 24,
  template_id: 15,
  target_criteria: {
    cart_value: { min: 50 },
    last_activity_days: 7
  }
};
```

### Multi-Language Campaign
```javascript
// Campaign with translations
const multilingualCampaign = {
  name: 'New Feature Announcement',
  type: 'push',
  translations: {
    en: { title: 'New Feature Available!', body: 'Check out our latest update...' },
    es: { title: '¡Nueva Función Disponible!', body: 'Descubre nuestra última actualización...' },
    fr: { title: 'Nouvelle Fonction Disponible!', body: 'Découvrez notre dernière mise à jour...' }
  },
  target_criteria: { all_active_users: true }
};
```

## Enterprise Features

### Compliance & Security
- **GDPR Compliance**: User consent management and data portability
- **Data Encryption**: End-to-end encryption for sensitive notifications
- **Audit Logging**: Complete audit trail for all notification activities
- **Rate Limiting**: Protection against notification abuse

### Scalability
- **Queue Partitioning**: Separate queues for different priority levels
- **Load Balancing**: Distributed processing across multiple instances
- **Caching**: Redis integration for frequently accessed data
- **Database Optimization**: Indexed queries for high-performance analytics

### Integration Capabilities
- **Webhook Support**: Real-time notifications to external systems
- **API Callbacks**: Custom callback URLs for delivery events
- **Third-Party Integrations**: CRM, marketing automation, and analytics platforms
- **Custom Plugins**: Extensible architecture for custom integrations

This comprehensive notification system provides enterprise-grade communication capabilities essential for modern marketplace platforms! 🚀📧📱💼