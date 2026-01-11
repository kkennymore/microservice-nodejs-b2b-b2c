# System Service

Enterprise-grade system administration and management service for the multivendor marketplace platform. Provides comprehensive admin controls, system monitoring, user management, and platform oversight capabilities.

## Features

- **User Management**: Complete user lifecycle management and oversight
- **System Monitoring**: Real-time health checks and performance metrics
- **Configuration Management**: Dynamic system settings and platform configuration
- **Alert Management**: Automated system alerts and notifications
- **Maintenance Scheduling**: Planned maintenance windows and emergency controls
- **Admin Auditing**: Complete audit trail of all administrative actions
- **Emergency Controls**: Emergency shutdown and system restore capabilities
- **Dashboard Analytics**: Admin dashboard with system insights

## Architecture

### Components

- **Admin Service**: Core business logic for administrative functions
- **System Monitor**: Service health monitoring and metrics collection
- **Models**: Data access layer for system entities
- **Routes**: REST API endpoints for admin operations

### Data Models

- **SystemSettingsModel**: Global platform configuration
- **AdminActionLogModel**: Audit trail of admin activities
- **UserManagementModel**: Extended user management data
- **SystemAlertModel**: System alerts and notifications
- **SystemMaintenanceModel**: Maintenance scheduling
- **PerformanceMetricsModel**: System performance tracking

## API Endpoints

### System Settings (`/api/system`)

#### Platform Configuration
- `GET /api/system/settings` - Get all system settings (admin only)
- `PUT /api/system/settings/:key` - Update system setting (admin only)
- `POST /api/system/maintenance/enable` - Enable maintenance mode (admin only)
- `POST /api/system/maintenance/disable` - Disable maintenance mode (admin only)

#### User Management
- `GET /api/system/users` - List users with filtering (admin only)
- `PUT /api/system/users/:userId/status` - Update user status (admin only)
- `POST /api/system/users/:userId/flag` - Flag user for review (admin only)
- `GET /api/system/users/flagged` - Get flagged users (admin only)
- `GET /api/system/users/stats` - User statistics (admin only)
- `POST /api/system/users/bulk-update` - Bulk user operations (admin only)
- `GET /api/system/users/export` - Export user data (admin only)

#### System Monitoring
- `GET /api/system/health` - Service health status
- `GET /api/system/health/services` - All microservices health (admin only)
- `GET /api/system/health/external` - External services health (admin only)
- `GET /api/system/overview` - System overview dashboard (admin only)
- `GET /api/system/metrics` - Performance metrics (admin only)

#### Alert Management
- `GET /api/system/alerts` - Active system alerts (admin only)
- `POST /api/system/alerts/:alertId/acknowledge` - Acknowledge alert (admin only)
- `POST /api/system/alerts/:alertId/resolve` - Resolve alert (admin only)
- `GET /api/system/alerts/stats` - Alert statistics (admin only)

#### Maintenance Management
- `POST /api/system/maintenance` - Schedule maintenance (admin only)
- `GET /api/system/maintenance` - Upcoming maintenance (admin only)
- `POST /api/system/maintenance/:id/start` - Start maintenance (admin only)
- `POST /api/system/maintenance/:id/complete` - Complete maintenance (admin only)

#### Audit Logging
- `GET /api/system/logs` - Admin action logs (admin only)

#### Admin Dashboard
- `GET /api/system/dashboard/summary` - Dashboard summary data (admin only)
- `GET /api/system/dashboard/metrics` - Dashboard metrics (admin only)

#### Emergency Controls
- `POST /api/system/emergency/shutdown` - Emergency shutdown (admin only)
- `POST /api/system/emergency/restore` - System restore (admin only)
- `POST /api/system/system/restart-service` - Service restart (admin only)
- `POST /api/system/system/clear-cache` - Cache clearing (admin only)

## Installation & Setup

### Prerequisites
- Node.js 16+
- MySQL 8.0+
- Email service (SMTP) for notifications

### Installation
```bash
cd backend/services/system
npm install
```

### Environment Variables
```env
SYSTEM_PORT=3008
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=marketplace
MYSQL_PASSWORD=marketplace123
MYSQL_DATABASE=fenap_marketplace
JWT_SECRET=your_strong_jwt_secret

# Email notifications
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Alert configuration
ALERT_EMAIL_RECIPIENTS=["admin@platform.com","tech@platform.com"]
FRONTEND_URL=https://yourdomain.com
```

### Database Setup
```bash
npm run db:up
```

### Starting the Service
```bash
# Development
npm run dev

# Production
npm start
```

## System Settings

### Default Settings
The service includes comprehensive default settings for platform operation:

- **Platform Configuration**: Name, version, timezone
- **Security Settings**: Rate limits, session timeouts
- **Feature Flags**: Registration, email verification
- **Business Rules**: Currency, file upload limits
- **Maintenance**: Backup retention, log retention

### Dynamic Configuration
Settings can be updated via API without service restart:

```javascript
PUT /api/system/settings/max_file_upload_size
{
  "value": 20971520,
  "type": "number"
}
```

## User Management

### User Lifecycle
- **Registration**: Automatic user management record creation
- **Verification**: Email and phone verification tracking
- **Status Management**: Active, suspended, banned, pending states
- **Risk Scoring**: Automated risk assessment
- **Flagging**: Manual review flags for suspicious activity

### Admin Actions
All admin actions are automatically logged:

```javascript
PUT /api/system/users/123/status
{
  "account_status": "suspended",
  "suspension_reason": "Violation of terms"
}
```

## System Monitoring

### Health Checks
Real-time monitoring of all platform services:

```json
{
  "overall_status": "healthy",
  "services": [
    {
      "name": "auth-service",
      "status": "healthy",
      "response_time": 45,
      "uptime": 3600
    }
  ]
}
```

### Performance Metrics
Comprehensive performance tracking:

- Response times and percentiles
- Error rates and success rates
- Memory and CPU usage
- Request throughput

### Alert System
Automated alerts for system issues:

- Service downtime
- High error rates
- Performance degradation
- Security incidents

## Maintenance Management

### Scheduled Maintenance
Plan and execute system maintenance:

```javascript
POST /api/system/maintenance
{
  "maintenance_type": "upgrade",
  "title": "Database Schema Update",
  "description": "Upgrading user table schema",
  "scheduled_start": "2024-01-15T02:00:00Z",
  "scheduled_end": "2024-01-15T04:00:00Z",
  "affected_services": ["auth-service", "api-gateway"]
}
```

### Emergency Maintenance
Immediate maintenance for critical issues:

```javascript
POST /api/system/emergency/shutdown
{
  "reason": "Critical security vulnerability",
  "scheduled_restart": "2024-01-15T06:00:00Z"
}
```

## Audit Logging

### Comprehensive Auditing
Every admin action is logged:

```json
{
  "admin_id": 1,
  "action_type": "update",
  "resource_type": "user",
  "resource_id": 123,
  "action_description": "Updated user status to suspended",
  "old_values": {"account_status": "active"},
  "new_values": {"account_status": "suspended"},
  "ip_address": "192.168.1.100",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Audit Reports
Generate audit reports for compliance:

```javascript
GET /api/system/logs?action_type=user_management&date_from=2024-01-01
```

## Alert Management

### Alert Types
- **Critical**: Service down, security breaches
- **Warning**: Performance issues, high error rates
- **Info**: Routine notifications, updates

### Alert Lifecycle
1. **Detection**: Automatic monitoring detects issues
2. **Alert Creation**: System creates alert record
3. **Notification**: Email/SMS alerts sent to admins
4. **Acknowledgment**: Admin acknowledges alert
5. **Resolution**: Admin resolves the issue

## Emergency Controls

### Emergency Shutdown
Graceful system shutdown for critical situations:

```javascript
POST /api/system/emergency/shutdown
{
  "reason": "Critical database corruption detected",
  "estimated_downtime": "4 hours"
}
```

### System Restore
Restore from backup during emergencies:

```javascript
POST /api/system/emergency/restore
{
  "backup_id": "backup_20240115_020000",
  "reason": "Rolling back failed deployment"
}
```

## Admin Dashboard

### Dashboard Data
Comprehensive admin dashboard with:

```json
{
  "user_stats": {
    "total_users": 15420,
    "active_users": 14250,
    "suspended_users": 120,
    "flagged_users": 15
  },
  "alert_stats": [
    {"alert_type": "error", "count": 3},
    {"alert_type": "warning", "count": 12}
  ],
  "recent_activity": [...],
  "system_overview": {...}
}
```

### Real-time Updates
WebSocket integration for real-time dashboard updates.

## Security Features

### Access Control
- JWT authentication required for all endpoints
- Role-based access control (admin only)
- IP-based rate limiting
- Request validation and sanitization

### Audit Trail
- Complete logging of all admin actions
- IP address and user agent tracking
- Before/after value logging for changes
- Tamper-proof audit records

### Emergency Controls
- Emergency shutdown capabilities
- Maintenance mode activation
- System restore procedures
- Service restart controls

## Performance & Scalability

### Monitoring Features
- Real-time performance metrics
- Automated health checks
- Resource usage tracking
- Response time monitoring

### Caching Strategy
- Redis integration for session storage
- Cache invalidation controls
- Performance metric caching

### Database Optimization
- Connection pooling
- Query optimization
- Index management
- Read/write separation ready

## Development

### Project Structure
```
backend/services/system/
├── index.js              # Main service entry point
├── models/
│   └── index.js         # System data models
├── routes/
│   └── systemRoutes.js  # API routes
├── services/
│   ├── adminService.js  # Admin business logic
│   └── systemMonitorService.js # Monitoring logic
├── middlewares/
│   ├── errorHandler.js  # Error handling
│   └── rateLimiter.js   # Rate limiting
├── utils/
│   ├── monitoring.js    # Monitoring utilities
│   └── environment.js   # Environment validation
├── migrations/
│   ├── up.js           # Database migration
│   └── create_tables.sql # Schema definition
├── package.json
└── README.md
```

### Adding New Admin Features
1. Define data model in `models/index.js`
2. Create business logic in `services/adminService.js`
3. Add API routes in `routes/systemRoutes.js`
4. Update audit logging
5. Add monitoring metrics

### Testing
```bash
npm test
```

Note: Integration tests require full platform setup.

## Deployment

### Docker Configuration
```yaml
system:
  build: ./backend/services/system
  ports:
    - "3008:3008"
  environment:
    - MYSQL_HOST=mysql
    - MYSQL_USER=marketplace
    - MYSQL_PASSWORD=marketplace123
    - MYSQL_DATABASE=fenap_marketplace
    - JWT_SECRET=${JWT_SECRET}
    - EMAIL_HOST=${EMAIL_HOST}
  depends_on:
    - mysql
    - redis
```

### Production Considerations
- Configure proper database credentials
- Set up email service for notifications
- Configure monitoring and alerting
- Set up log aggregation (ELK stack)
- Implement backup strategies
- Configure SSL/TLS certificates

## API Documentation

### Health Check
```
GET /health
```

Returns service health status and metrics.

### API Docs
```
GET /api/docs
```

Returns comprehensive API documentation.

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify database credentials
   - Check database server status
   - Ensure proper network connectivity

2. **Email Notifications Not Working**
   - Verify SMTP credentials
   - Check email service configuration
   - Review email logs

3. **High Memory Usage**
   - Monitor metrics endpoint
   - Check for memory leaks
   - Adjust monitoring retention

4. **Rate Limiting Issues**
   - Review rate limit configurations
   - Check client IP addresses
   - Monitor request patterns

### Logs
All admin actions are logged with full details for troubleshooting.

## Contributing

1. Follow existing code patterns and architecture
2. Add comprehensive error handling
3. Include input validation for all endpoints
4. Update audit logging for new features
5. Test thoroughly before submitting

## License

This service is part of the multivendor marketplace platform.