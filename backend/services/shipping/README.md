# Shipping Service

Comprehensive shipping and logistics management service for the multivendor marketplace platform. Provides multi-carrier integration, automated label generation, real-time tracking, and seller shipping management.

## Features

- **Multi-Carrier Support**: FedEx, UPS, USPS, DHL, and Canada Post integration
- **Automated Label Generation**: One-click shipping label creation
- **Real-Time Tracking**: Live package tracking with detailed event history
- **Shipping Rates**: Dynamic rate shopping across carriers
- **Seller Management**: Custom shipping settings and preferences
- **Address Validation**: Built-in address verification
- **Return Shipping**: Complete return shipment workflow
- **Zone-Based Shipping**: Geographic shipping zones and rates
- **Admin Controls**: Carrier management and rate configuration

## Architecture

### Components

- **Carrier Services**: Integration layer for shipping carriers (FedEx, UPS, USPS)
- **Shipping Service**: Main business logic and orchestration
- **Models**: Data access layer for shipping entities
- **Routes**: REST API endpoints for shipping operations

### Data Models

- **ShippingCarrierModel**: Carrier information and API credentials
- **ShippingRateModel**: Rate tables by carrier and zone
- **ShipmentModel**: Shipment records and tracking
- **TrackingEventModel**: Detailed tracking event history
- **SellerShippingSettingsModel**: Seller-specific shipping configuration

## API Endpoints

### Shipping Routes (`/api/shipping`)

#### Rates & Quotes
- `POST /api/shipping/rates`
  - Get shipping rates for a shipment quote
  - Body: `{ seller_id, ship_from, ship_to, items, weight }`

#### Shipments
- `POST /api/shipping/shipments`
  - Create a new shipment (sellers only)
  - Body: `{ order_id, carrier_id, service_type, items, ship_from, ship_to, weight }`
- `GET /api/shipping/shipments/:id`
  - Get shipment details by ID
- `GET /api/shipping/seller/shipments`
  - Get seller's shipments with filters

#### Tracking
- `GET /api/shipping/track/:trackingNumber`
  - Track a package by tracking number

#### Seller Settings
- `PUT /api/shipping/seller/settings`
  - Update seller shipping settings (sellers only)
- `GET /api/shipping/seller/settings`
  - Get seller shipping settings

#### Utilities
- `GET /api/shipping/carriers`
  - Get list of available carriers
- `POST /api/shipping/validate-address`
  - Validate a shipping address
- `GET /api/shipping/zones`
  - Get available shipping zones

#### Admin Routes (Admin Only)
- `GET /api/shipping/admin/shipments`
  - Get all shipments with filters
- `PUT /api/shipping/admin/carriers/:id/status`
  - Enable/disable shipping carriers
- `POST /api/shipping/admin/rates`
  - Create new shipping rates

## Installation & Setup

### Prerequisites
- Node.js 16+
- MySQL 8.0+
- Carrier API credentials (optional for development)

### Installation
```bash
cd backend/services/shipping
npm install
```

### Environment Variables
```env
SHIPPING_PORT=3010
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=marketplace
MYSQL_PASSWORD=marketplace123
MYSQL_DATABASE=fenap_marketplace

# Carrier API Keys (optional for development)
FEDEX_API_KEY=your_fedex_key
FEDEX_SECRET=your_fedex_secret
UPS_ACCESS_KEY=your_ups_key
USPS_USERNAME=your_usps_username
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

## Carrier Integration

### Supported Carriers

#### FedEx
- Services: Ground, Express, Freight
- Features: Label generation, tracking, address validation
- API: FedEx Shipping API

#### UPS
- Services: Ground, 3 Day Select, Next Day Air
- Features: Label generation, tracking, quantum view
- API: UPS Shipping API

#### USPS
- Services: Priority Mail, First Class, Ground Advantage
- Features: Label generation, tracking, address validation
- API: USPS Web Tools API

### Carrier Configuration

Carriers are configured in the `shipping_carriers` table:

```sql
INSERT INTO shipping_carriers (name, code, api_endpoint, api_key, is_active) VALUES
('FedEx', 'fedex', 'https://apis.fedex.com', 'your_api_key', 1),
('UPS', 'ups', 'https://onlinetools.ups.com', 'your_access_key', 1);
```

## Shipping Zones

### Default Zones
- **United States**: Domestic US shipping
- **Canada**: Cross-border to Canada
- **Europe**: EU countries
- **Asia Pacific**: Japan, China, Australia, Singapore
- **Rest of World**: All other destinations

### Zone Configuration
Zones are defined in the `shipping_zones` table with associated countries.

## Shipping Rates

### Rate Structure
- **By Carrier**: Different carriers have different pricing
- **By Zone**: Geographic zones affect pricing
- **By Weight**: Weight-based pricing tiers
- **By Service**: Ground, Express, Overnight options

### Rate Shopping
The service automatically compares rates across all active carriers to find the best price for each shipment.

## Shipment Workflow

### 1. Rate Shopping
```javascript
POST /api/shipping/rates
{
  "seller_id": 1,
  "ship_from": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  },
  "ship_to": {
    "street": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "postal_code": "90210",
    "country": "US"
  },
  "items": [
    {
      "weight": 2.5,
      "quantity": 1,
      "length": 12,
      "width": 8,
      "height": 4
    }
  ]
}
```

### 2. Create Shipment
```javascript
POST /api/shipping/shipments
{
  "order_id": 12345,
  "carrier_id": 1,
  "service_type": "GROUND",
  "items": [...],
  "ship_from": {...},
  "ship_to": {...}
}
```

### 3. Track Package
```javascript
GET /api/shipping/track/1Z999AA1234567890
```

## Seller Features

### Shipping Settings
Sellers can configure:
- **Default Carrier**: Preferred shipping carrier
- **Free Shipping Threshold**: Minimum order for free shipping
- **Handling Time**: Days to prepare orders
- **Return Policy**: Return shipping preferences

### Seller Dashboard
- View all shipments
- Track order fulfillment
- Manage shipping costs
- Monitor delivery performance

## Tracking Events

### Event Types
- `PICKUP`: Package picked up by carrier
- `IN_TRANSIT`: Package in transit
- `OUT_FOR_DELIVERY`: Package out for delivery
- `DELIVERED`: Package delivered successfully
- `RETURNED`: Package returned to sender
- `EXCEPTION`: Delivery exception occurred

### Tracking History
All tracking events are stored and can be retrieved for audit and customer service purposes.

## Address Validation

### Validation Features
- **Format Validation**: Proper address formatting
- **Postal Code Verification**: Valid postal codes by country
- **Carrier Validation**: Real-time validation with carriers
- **Geographic Coverage**: Ensure service availability

## Return Shipping

### Return Process
1. **Request Return**: Customer initiates return
2. **Generate Label**: System creates return shipping label
3. **Track Return**: Monitor return shipment progress
4. **Process Refund**: Complete return and refund workflow

## Performance & Scalability

### Optimization Features
- **Connection Pooling**: Efficient database connections
- **Rate Caching**: Cache carrier rates for performance
- **Async Processing**: Non-blocking carrier API calls
- **Batch Operations**: Bulk shipment processing

### Monitoring
- Health check endpoint: `GET /health`
- API documentation: `GET /api/docs`
- Comprehensive logging for all operations

## Security

- JWT authentication required for all endpoints
- Role-based access control (buyer/seller/admin)
- Input validation and sanitization
- Secure storage of carrier API credentials
- Rate limiting protection

## Error Handling

### Common Errors
- **Invalid Address**: Address validation failures
- **Carrier Unavailable**: Carrier service outages
- **Rate Not Found**: No shipping rates available
- **Tracking Failed**: Unable to retrieve tracking information

### Error Responses
All errors return standardized JSON format:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Development

### Project Structure
```
backend/services/shipping/
├── index.js              # Main service entry point
├── models/
│   └── index.js         # Shipping data models
├── routes/
│   └── shippingRoutes.js # API routes
├── services/
│   ├── shippingService.js # Main business logic
│   └── carrierServices.js # Carrier integrations
├── migrations/
│   ├── up.js            # Database migration
│   └── create_tables.sql # Schema definition
├── package.json
└── README.md
```

### Adding New Carriers
1. Create carrier service class extending `BaseCarrierService`
2. Implement required methods: `getRates`, `createLabel`, `trackPackage`
3. Add carrier configuration to database
4. Register carrier in factory function

### Testing
```bash
npm test
```

Note: Integration tests with carrier APIs require API credentials.

## Deployment

### Docker Configuration
```yaml
shipping:
  build: ./backend/services/shipping
  ports:
    - "3010:3010"
  environment:
    - SHIPPING_PORT=3010
    - MYSQL_HOST=mysql
    - MYSQL_USER=marketplace
    - MYSQL_PASSWORD=marketplace123
    - MYSQL_DATABASE=fenap_marketplace
    - JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production-minimum-32-characters
  depends_on:
    - mysql
```

### Production Considerations
- Configure carrier API credentials securely
- Set up monitoring and alerting for carrier API failures
- Implement retry logic for carrier service outages
- Configure proper rate limiting for API endpoints
- Set up backup and recovery procedures

## Contributing

1. Follow existing code patterns and architecture
2. Add comprehensive error handling
3. Include input validation for all endpoints
4. Update documentation for new features
5. Test integrations thoroughly

## License

This service is part of the multivendor marketplace platform.