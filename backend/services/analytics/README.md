# Analytics Service

Business intelligence and analytics service for the multivendor marketplace platform. Provides comprehensive analytics, real-time dashboards, and detailed reporting capabilities.

## Features

- **Real-time Analytics**: Live data processing and WebSocket streaming
- **Comprehensive Reporting**: Sales, user, and product analytics
- **Dashboard KPIs**: Key performance indicators and metrics
- **Event Tracking**: User behavior and system event logging
- **Data Aggregation**: Automated daily/hourly data processing
- **CSV Export**: Downloadable reports in CSV format
- **Multi-format Support**: JSON and CSV report generation
- **Role-based Access**: Different analytics views for buyers, sellers, and admins

## Architecture

### Components

- **AnalyticsAggregator**: Background service for data aggregation and processing
- **RealTimeProcessor**: WebSocket server and RabbitMQ event consumer
- **Models**: Data access layer for different analytics types
- **Routes**: REST API endpoints for analytics data
- **Middleware**: Authentication, validation, and error handling

### Data Models

- **AnalyticsEventModel**: User behavior tracking and event logging
- **SalesAnalyticsModel**: Revenue, orders, and sales performance
- **UserAnalyticsModel**: User acquisition, retention, and engagement
- **ProductAnalyticsModel**: Product performance and conversion analytics
- **DashboardModel**: Dashboard-specific data and KPIs

## API Endpoints

### Analytics Routes (`/api/analytics`)

#### Overview
- `GET /api/analytics/overview?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
  - Returns analytics overview with event stats and sales summary

#### Sales Analytics
- `GET /api/analytics/sales?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&group_by=day`
  - Returns sales overview, period breakdown, and top products

#### User Analytics
- `GET /api/analytics/users?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
  - Returns user acquisition, retention, engagement, segmentation, and geographic data

#### Product Analytics
- `GET /api/analytics/products?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
  - Returns product performance, category data, inventory analytics, and conversion funnel

#### Customer Analytics
- `GET /api/analytics/customers/lifetime-value`
  - Returns customer lifetime value analysis

#### Real-time Metrics
- `GET /api/analytics/realtime`
  - Returns current active users and real-time metrics

#### Event Tracking
- `POST /api/analytics/event`
  - Records user behavior events (page views, clicks, etc.)
- `GET /api/analytics/events/user/:userId?start_date=...&end_date=...&event_type=...`
  - Returns events for specific user (admin only)

### Dashboard Routes (`/api/dashboard`)

#### KPIs
- `GET /api/dashboard/kpis?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
  - Returns key performance indicators

#### Charts
- `GET /api/dashboard/revenue-chart?start_date=...&end_date=...&group_by=day`
  - Returns revenue chart data grouped by time period

#### Top Metrics
- `GET /api/dashboard/top-metrics`
  - Returns top products, categories, customers, and trending items

#### Real-time Data
- `GET /api/dashboard/realtime`
  - Returns real-time dashboard data with aggregator status

#### Summary
- `GET /api/dashboard/summary`
  - Returns comprehensive dashboard summary with KPIs and real-time data

#### WebSocket
- `GET /api/dashboard/ws`
  - Returns WebSocket endpoint information for real-time updates

### Reports Routes (`/api/reports`)

#### Sales Reports
- `GET /api/reports/sales?start_date=...&end_date=...&format=json|csv`
  - Generates sales performance reports

#### User Reports
- `GET /api/reports/users?start_date=...&end_date=...&format=json|csv`
  - Generates user behavior reports

#### Product Reports
- `GET /api/reports/products?start_date=...&end_date=...&format=json|csv`
  - Generates product performance reports

#### Business Reports
- `GET /api/reports/business?start_date=...&end_date=...&format=json|csv`
  - Generates comprehensive business reports

## Installation & Setup

### Prerequisites
- Node.js 16+
- MySQL 8.0+
- RabbitMQ
- Redis (for session storage)

### Installation
```bash
cd backend/services/analytics
npm install
```

### Environment Variables
```env
ANALYTICS_PORT=3009
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=marketplace
MYSQL_PASSWORD=marketplace123
MYSQL_DATABASE=fenap_marketplace
RABBITMQ_URL=amqp://localhost
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
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

## Data Aggregation

The service includes automatic data aggregation that runs daily and hourly:

### Daily Aggregation (2 AM)
- User acquisition and retention metrics
- Sales performance summaries
- Product performance data
- Customer lifetime value calculations

### Hourly Aggregation (Top of hour)
- Real-time metrics updates
- Active user counts
- Recent transaction summaries

### Real-time Processing
- WebSocket connections for live dashboard updates
- RabbitMQ event consumption for immediate data processing
- Event-driven metric updates

## Event Types

The analytics service tracks various user and system events:

- `page_view`: Page visits and navigation
- `product_view`: Product page views
- `add_to_cart`: Shopping cart additions
- `purchase`: Completed transactions
- `user_login`: User authentication events
- `search`: Search query tracking
- `error`: Error and exception tracking

## Security

- JWT token authentication required for all endpoints
- Role-based access control (buyer/seller/admin)
- Input validation and sanitization
- Rate limiting protection
- HTTPS enforcement in production

## Performance

- Connection pooling for database operations
- Redis caching for frequently accessed data
- Asynchronous processing with RabbitMQ
- Optimized queries with proper indexing
- Real-time data streaming with WebSocket

## Monitoring

### Health Check
```
GET /health
```

Returns service status, aggregator status, and real-time processor status.

### API Documentation
```
GET /api/docs
```

Returns API endpoint documentation.

## Integration

### With API Gateway
Routes are prefixed through the API Gateway:
- Analytics: `http://localhost:4000/api/analytics/*`
- Dashboard: `http://localhost:4000/api/dashboard/*`
- Reports: `http://localhost:4000/api/reports/*`

### With Other Services
- **Transactions Service**: Sales and revenue data
- **Messaging Service**: User engagement metrics
- **Notifications Service**: Campaign analytics
- **Frontend**: Dashboard widgets and real-time updates

## Development

### Project Structure
```
backend/services/analytics/
├── index.js              # Main service entry point
├── models/
│   └── index.js         # Analytics data models
├── routes/
│   ├── analyticsRoutes.js
│   ├── dashboardRoutes.js
│   └── reportsRoutes.js
├── services/
│   ├── AnalyticsAggregator.js
│   └── RealTimeProcessor.js
├── middlewares/
│   └── errorHandler.js
├── migrations/
│   └── create_tables.sql
├── package.json
└── README.md
```

### Adding New Analytics
1. Define data model in `models/index.js`
2. Create API routes in appropriate route file
3. Update aggregator service for background processing
4. Add real-time processing if needed
5. Update README documentation

## Testing

```bash
npm test
```

Note: Tests are not fully implemented yet. Basic endpoint testing should be added.

## Deployment

### Docker
```yaml
# Add to docker-compose.yml
analytics:
  build: ./backend/services/analytics
  ports:
    - "3009:3009"
  environment:
    - ANALYTICS_PORT=3009
    - MYSQL_HOST=mysql
    - MYSQL_USER=marketplace
    - MYSQL_PASSWORD=marketplace123
    - MYSQL_DATABASE=fenap_marketplace
    - RABBITMQ_URL=amqp://rabbitmq
    - JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production-minimum-32-characters
  depends_on:
    - mysql
    - rabbitmq
```

### Production Considerations
- Enable HTTPS and SSL certificates
- Configure proper database connection pooling
- Set up monitoring and alerting
- Implement log aggregation
- Configure backup strategies for analytics data
- Set up horizontal scaling with load balancers

## Troubleshooting

### Common Issues

1. **RabbitMQ Connection Failed**
   - Ensure RabbitMQ is running on the specified URL
   - Check connection credentials
   - Verify network connectivity

2. **Database Connection Issues**
   - Verify database credentials
   - Check database server status
   - Ensure proper permissions

3. **WebSocket Connection Problems**
   - Check firewall settings
   - Verify WebSocket port accessibility
   - Ensure CORS configuration

4. **High Memory Usage**
   - Monitor connection pool settings
   - Check for memory leaks in aggregators
   - Adjust batch processing sizes

### Logs
All services log to stdout/stderr. Use log aggregation tools in production.

## Contributing

1. Follow existing code patterns and architecture
2. Add comprehensive error handling
3. Include input validation
4. Update documentation for new features
5. Test thoroughly before submitting

## License

This service is part of the multivendor marketplace platform.