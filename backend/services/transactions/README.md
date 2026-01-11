# Transactions Service

Handles all payment processing, wallet management, and subscription management for the multivendor marketplace.

## Features

### 💰 Payment Processing
- Transaction creation and management
- Multiple payment gateways (Stripe, PayPal)
- Payment status tracking and webhooks
- Refund processing
- PayPal payment confirmation

### 👛 Wallet Management
- User wallet balance management with atomic operations
- Credit/debit operations with transaction history
- Wallet transaction logging with balance tracking
- Secure balance updates with database transactions

### 📅 Subscription Management
- Premium seller subscriptions with payment integration
- Multiple subscription plans (Basic, Pro, Enterprise)
- Monthly and yearly billing cycles
- Subscription lifecycle management (create, cancel, renew)
- Payment processing for subscription purchases

### 🛡️ Escrow System
- Buyer protection through payment holding
- Automatic release after buyer confirmation
- Auto-release after configurable period
- Dispute creation and resolution system
- Admin dispute management
- Secure fund transfers between buyer and seller wallets

## Database Tables

### transactions
- Payment records with external gateway references
- Status tracking (pending, completed, failed, refunded)
- Support for payments, refunds, withdrawals, deposits, subscriptions

### wallets
- User balance storage with automatic wallet creation
- Currency support (currently USD)
- Thread-safe balance updates

### wallet_transactions
- Detailed wallet operation history
- Balance before/after tracking for audit trails
- Links to main transactions for reconciliation

### subscription_plans
- Available subscription tiers (Basic, Pro, Enterprise)
- Pricing, features, and billing intervals
- Monthly and yearly plan support

### subscriptions
- User subscription records with payment integration
- Active status and renewal tracking
- Auto-renewal functionality

### escrow
- Buyer protection through fund holding
- Auto-release dates and conditions
- Dispute tracking and resolution
- Status management (held, released, refunded, disputed)

## API Endpoints

### Transactions
```
POST   /api/transactions          - Create transaction
GET    /api/transactions          - Get user transactions
GET    /api/transactions/:id      - Get transaction by ID
PATCH  /api/transactions/:id/status - Update status (admin)
GET    /api/transactions/admin/stats - Get statistics (admin)
```

### Wallets
```
GET    /api/wallets               - Get user wallet
POST   /api/wallets/credit        - Credit wallet
POST   /api/wallets/debit         - Debit wallet
GET    /api/wallets/transactions  - Get wallet transactions
POST   /api/wallets/transfer      - Transfer money (future)
```

### Subscriptions
```
GET    /api/subscriptions/plans    - Get available plans
GET    /api/subscriptions/current - Get user subscription
POST   /api/subscriptions/subscribe - Subscribe to plan (with payment)
POST   /api/subscriptions/cancel   - Cancel subscription
POST   /api/subscriptions/renew    - Renew subscription
PATCH  /api/subscriptions/:id      - Update subscription (admin)
GET    /api/subscriptions/admin/all - Get all subscriptions (admin)
```

### Escrow
```
POST   /api/escrow                   - Create escrow for transaction
GET    /api/escrow                   - Get user's escrows
GET    /api/escrow/:id              - Get escrow details
POST   /api/escrow/:id/release      - Release escrow (buyer action)
POST   /api/escrow/:id/dispute      - Create dispute
POST   /api/escrow/:id/resolve      - Resolve dispute (admin)
POST   /api/escrow/admin/auto-release - Auto-release expired escrows (admin)
```

## Subscription Plans

| Plan | Monthly | Yearly | Features |
|------|---------|--------|----------|
| Basic | $9.99 | $99.99 | 50 products, email support |
| Pro | $29.99 | $299.99 | 500 products, priority support, marketing tools |
| Enterprise | $99.99 | $999.99 | Unlimited products, dedicated support, API access |

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up database:
```bash
npm run db:up
```

3. Configure environment variables in `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=fenap_marketplace
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
```

4. Start the service:
```bash
npm start
```

## Payment Integration

### Stripe Integration
- Credit card payments
- Webhook handling for payment confirmations
- Refund processing

### PayPal Integration
- PayPal checkout
- Subscription payments
- Instant payment notifications

## Security Features

- JWT authentication required for all endpoints
- Admin-only endpoints for sensitive operations
- Transaction rollback on wallet errors
- Input validation and sanitization

## Escrow Workflow

The escrow system provides buyer protection by holding payments until transactions are completed:

### 1. **Payment & Escrow Creation**
- Buyer makes payment for an order
- Funds are held in escrow (not released to seller)
- Auto-release date is set (default: 30 days)

### 2. **Transaction Completion**
- Buyer receives goods/services
- Buyer confirms receipt by releasing escrow
- Funds are transferred to seller's wallet

### 3. **Auto-Release**
- If buyer doesn't act, funds auto-release after deadline
- Ensures sellers get paid for completed transactions

### 4. **Dispute Resolution**
- Buyers/sellers can create disputes
- Admin reviews and resolves disputes
- Funds released to winner or partially refunded

## Security Features

- JWT authentication required for all endpoints
- Admin-only endpoints for sensitive operations
- Database transactions for atomic wallet operations
- Escrow prevents premature fund releases
- Comprehensive audit trails for all financial operations
- Input validation and sanitization
- Secure payment gateway integrations

## Future Enhancements

- [ ] Cryptocurrency payments
- [ ] Multi-currency support
- [ ] Advanced analytics dashboard
- [ ] Automated billing cycles
- [ ] Subscription upgrade/downgrade
- [ ] Escrow analytics and reporting
- [ ] Payment method preferences
- [ ] Recurring payment scheduling