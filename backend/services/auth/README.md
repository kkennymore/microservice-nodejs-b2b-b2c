# Auth Service

The Auth Service handles user authentication, registration, profile management, KYC verification, and administrative functions for the multivendor marketplace platform.

## Features

### User Management
- ✅ User registration with email verification
- ✅ Login/logout with JWT tokens
- ✅ Password reset and change
- ✅ Profile management and updates
- ✅ Profile image upload
- ✅ Account security (login attempts, account locking)
- ✅ Social login (Facebook & Google OAuth)
- ✅ Platform-based authentication (local/social)
- ✅ Normalized database with separate password table
- ✅ KYC verification system
- ✅ Business information management
- ✅ Banking information storage
- ✅ Security settings and preferences
- ✅ Admin user management
- ✅ Consistent API response format

### KYC Verification
- ✅ KYC submission for sellers
- ✅ Document upload (ID, business license, etc.)
- ✅ Admin approval/rejection workflow
- ✅ KYC status tracking

### Administrative Functions
- ✅ User management (view, deactivate)
- ✅ KYC approval/rejection
- ✅ System user search and filtering

## API Endpoints

### Authentication
```
POST /api/auth/register - User registration
POST /api/auth/login - User authentication
POST /api/auth/refresh - Refresh access token
POST /api/auth/logout - User logout
POST /api/auth/verify-email/:userId - Email verification
POST /api/auth/forgot-password - Request password reset
POST /api/auth/reset-password/:userId - Password reset
POST /api/auth/verify-reset-token/:userId - Token validation
PUT /api/auth/change-password - Password change
GET /api/auth/verify-token - Token validation

Social Authentication:
GET /api/auth/social/url - Get OAuth authorization URL
POST /api/auth/social/login - Complete social login
```

### Profile Management
```
GET /api/auth/profile - Get user profile
PUT /api/auth/profile - Update user profile
POST /api/auth/profile/upload-image - Upload profile image
```

### KYC Management
```
POST /api/auth/kyc/submit - Submit KYC documents
GET /api/auth/kyc/status - Get KYC status
```

### Admin Functions
```
GET /api/auth/admin/users - Get all users (admin only)
PUT /api/auth/admin/users/:userId/kyc/approve - Approve KYC (admin only)
PUT /api/auth/admin/users/:userId/kyc/reject - Reject KYC (admin only)
GET /api/auth/admin/kyc/pending - Get pending KYC applications (admin only)
PUT /api/auth/admin/users/:userId/deactivate - Deactivate user (admin only)
```

## Data Models

### User Model
- **Basic Info**: username, email, password, firstName, lastName, phone
- **Profile**: bio, dateOfBirth, gender, address, city, country, profileImage
- **KYC Fields**: idType, idNumber, documents, business info, bank details
- **Security**: loginAttempts, lockedUntil, twoFactorEnabled
- **Preferences**: language, currency, timezone, notifications

### KYC Requirements by Role

#### For Sellers
- Personal ID (passport/drivers license/national ID)
- Business registration details
- Tax ID
- Bank account information
- Business license (if applicable)

#### For Buyers
- Basic profile information (optional KYC)

#### For Delivery Partners
- Personal ID
- Vehicle information
- Bank account for payments

## Validation Rules

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### File Upload Limits
- Profile images: 5MB (JPEG, PNG, GIF)
- KYC documents: 10MB (PDF, JPEG, PNG)

### Account Security
- 5 failed login attempts = account locked for 2 hours
- Password change requires current password
- Email verification required for full access

## Database Schema

The database is normalized into separate tables for better maintainability and performance:

### Core Tables
```sql
-- Main authentication table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role ENUM('buyer', 'seller', 'admin', 'delivery_partner') DEFAULT 'buyer',
  platformType ENUM('local', 'facebook', 'google') DEFAULT 'local',
  socialId VARCHAR(100),
  socialProvider ENUM('facebook', 'google'),
  socialProfileData JSON,
  isEmailVerified BOOLEAN DEFAULT FALSE,
  isPhoneVerified BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  lastLoginAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Password data for local users only
CREATE TABLE user_passwords (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  passwordResetToken VARCHAR(255),
  passwordResetExpires DATETIME,
  passwordHistory JSON DEFAULT ('[]'),
  lastPasswordChange DATETIME,
  passwordStrength ENUM('weak', 'medium', 'strong'),
  failedLoginAttempts INT DEFAULT 0,
  lockedUntil DATETIME,
  requirePasswordChange BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Extended profile information
CREATE TABLE user_profiles (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL UNIQUE,
  profileImage VARCHAR(500),
  bio TEXT,
  dateOfBirth DATE,
  gender ENUM('male', 'female', 'other'),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- KYC verification data
CREATE TABLE user_kyc (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL UNIQUE,
  status ENUM('pending', 'approved', 'rejected', 'not_submitted') DEFAULT 'not_submitted',
  submittedAt DATETIME,
  approvedAt DATETIME,
  rejectedReason TEXT,
  idType ENUM('passport', 'drivers_license', 'national_id', 'other'),
  idNumber VARCHAR(50),
  idExpiryDate DATE,
  idFrontImage VARCHAR(500),
  idBackImage VARCHAR(500),
  selfieImage VARCHAR(500),
  verificationCode VARCHAR(10),
  verificationCodeExpiresAt DATETIME,
  verifiedBy VARCHAR(36),
  verifiedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Business information for sellers
CREATE TABLE user_business (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL UNIQUE,
  businessName VARCHAR(255),
  businessType VARCHAR(100),
  businessRegistrationNumber VARCHAR(100),
  businessAddress TEXT,
  taxId VARCHAR(50),
  businessLicenseImage VARCHAR(500),
  industry VARCHAR(100),
  website VARCHAR(255),
  employeeCount ENUM('1-10', '11-50', '51-200', '201-500', '500+'),
  annualRevenue ENUM('<$100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M+'),
  businessPhone VARCHAR(20),
  businessEmail VARCHAR(255),
  isVerified BOOLEAN DEFAULT FALSE,
  verifiedAt DATETIME,
  verifiedBy VARCHAR(36),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Banking information
CREATE TABLE user_banks (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL UNIQUE,
  bankName VARCHAR(255),
  bankAccountNumber VARCHAR(50),
  bankAccountName VARCHAR(255),
  bankSwiftCode VARCHAR(20),
  bankRoutingNumber VARCHAR(50),
  bankBranchCode VARCHAR(20),
  bankAddress TEXT,
  accountType ENUM('checking', 'savings', 'business_checking', 'business_savings'),
  currency VARCHAR(3) DEFAULT 'USD',
  isVerified BOOLEAN DEFAULT FALSE,
  verificationMethod ENUM('manual', 'micro_deposit', 'instant_verification'),
  verificationAmount1 DECIMAL(10,2),
  verificationAmount2 DECIMAL(10,2),
  verifiedAt DATETIME,
  verifiedBy VARCHAR(36),
  lastUsedAt DATETIME,
  isPrimary BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Security settings and tracking
CREATE TABLE user_security (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL UNIQUE,
  twoFactorEnabled BOOLEAN DEFAULT FALSE,
  twoFactorSecret VARCHAR(255),
  twoFactorBackupCodes JSON,
  twoFactorMethod ENUM('app', 'sms', 'email') DEFAULT 'app',
  loginAttempts INT DEFAULT 0,
  lockedUntil DATETIME,
  lastLoginAt DATETIME,
  lastFailedLoginAt DATETIME,
  lastPasswordChangeAt DATETIME,
  securityQuestion1 VARCHAR(255),
  securityAnswer1 VARCHAR(255),
  securityQuestion2 VARCHAR(255),
  securityAnswer2 VARCHAR(255),
  maxSessions INT DEFAULT 5,
  sessionTimeout INT DEFAULT 3600,
  passwordExpiryDays INT DEFAULT 90,
  requireStrongPassword BOOLEAN DEFAULT TRUE,
  ipWhitelistEnabled BOOLEAN DEFAULT FALSE,
  ipWhitelist JSON,
  suspiciousActivityCount INT DEFAULT 0,
  lastSuspiciousActivityAt DATETIME,
  trustedDevices JSON DEFAULT ('[]'),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- User preferences and settings
CREATE TABLE user_preferences (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL UNIQUE,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  dateFormat ENUM('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD') DEFAULT 'MM/DD/YYYY',
  timeFormat ENUM('12h', '24h') DEFAULT '12h',
  currency VARCHAR(3) DEFAULT 'USD',
  currencyDisplay ENUM('symbol', 'code', 'name') DEFAULT 'symbol',
  theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
  sidebarCollapsed BOOLEAN DEFAULT FALSE,
  itemsPerPage ENUM('10', '25', '50', '100') DEFAULT '25',
  emailNotifications BOOLEAN DEFAULT TRUE,
  smsNotifications BOOLEAN DEFAULT FALSE,
  pushNotifications BOOLEAN DEFAULT TRUE,
  notificationPreferences JSON DEFAULT ('{"orderUpdates":true,"paymentNotifications":true,"securityAlerts":true,"marketingEmails":false,"productUpdates":true,"systemMaintenance":true}'),
  profileVisibility ENUM('public', 'private', 'friends') DEFAULT 'public',
  showOnlineStatus BOOLEAN DEFAULT TRUE,
  allowDirectMessages BOOLEAN DEFAULT TRUE,
  marketingEmails BOOLEAN DEFAULT FALSE,
  weeklyDigest BOOLEAN DEFAULT TRUE,
  defaultDashboard ENUM('overview', 'sales', 'analytics', 'products') DEFAULT 'overview',
  dashboardWidgets JSON DEFAULT ('["sales_chart","recent_orders","notifications"]'),
  fontSize ENUM('small', 'medium', 'large') DEFAULT 'medium',
  highContrast BOOLEAN DEFAULT FALSE,
  reduceMotion BOOLEAN DEFAULT FALSE,
  autoApproveOrders BOOLEAN DEFAULT FALSE,
  lowStockAlerts BOOLEAN DEFAULT TRUE,
  orderConfirmationEmail BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

## Environment Variables

The auth service uses the root `.env` file located in the project root directory. All environment variables are configured there with section comments separating each service's configuration.

See the root `.env.new` file (rename to `.env`) for all available configuration options. The auth service uses variables from the "AUTH SERVICE CONFIGURATION" section, plus shared variables from other sections like database, Redis, RabbitMQ, and JWT configurations.

## Running the Service

1. **Install dependencies:**
   ```bash
   cd backend/services/auth
   npm install
   ```

2. **Run migrations:**
   ```bash
   npm run db:up
   ```

3. **Start the service:**
   ```bash
   npm start
   ```

The service will be available at `http://localhost:3001`

## Testing

```bash
npm test
```

## File Structure

```
backend/services/auth/
├── index.js                    # Main service entry point
├── package.json               # Dependencies & scripts
├── README.md                  # Comprehensive documentation
├── models/
│   ├── User.js               # Core user authentication model
│   ├── UserProfile.js        # Extended profile information
│   ├── UserKyc.js            # KYC verification data
│   ├── UserBusiness.js       # Business information for sellers
│   ├── UserBank.js           # Banking information
│   ├── UserSecurity.js       # Security settings and tracking
│   └── UserPreference.js     # User preferences and settings
├── controllers/
│   └── AuthController.js     # All business logic and API handlers
├── routes/
│   └── authRoutes.js         # All API endpoints and routing
├── services/
│   ├── authService.js        # JWT token management and utilities
│   ├── emailService.js       # Email sending and templates
│   └── fileService.js        # File upload and management
├── middlewares/
│   ├── authMiddleware.js     # JWT authentication validation
│   └── errorHandler.js       # Centralized error handling
├── utils/
│   ├── logger.js             # Logging system with Winston
│   └── socketHandler.js      # WebSocket event handling
├── migrations/
│   ├── up.js                 # Database table creation
│   └── down.js               # Database rollback/cleanup
└── tests/
    └── auth.test.js          # Unit and integration tests
```
backend/services/auth/
├── index.js                 # Main service entry
├── package.json            # Dependencies
├── models/
│   └── User.js            # User data model
├── controllers/
│   └── AuthController.js  # Business logic
├── routes/
│   └── authRoutes.js      # API routes
├── services/
│   ├── authService.js     # JWT utilities
│   ├── emailService.js    # Email handling
│   └── fileService.js     # File uploads
├── middlewares/
│   ├── authMiddleware.js  # JWT validation
│   └── errorHandler.js    # Error handling
├── utils/
│   ├── logger.js          # Logging
│   └── socketHandler.js   # WebSocket handling
├── migrations/
│   ├── up.js              # DB setup
│   └── down.js            # DB rollback
└── README.md               # This file
```

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Access and refresh token system
- **Rate Limiting**: Login attempt restrictions
- **Account Locking**: Temporary lock after failed attempts
- **Input Validation**: Joi schema validation
- **File Validation**: Type and size restrictions
- **CORS**: Configured for frontend access

## Error Handling

All errors are caught and returned in a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Events

The service publishes the following events:
- `user.registered`
- `user.logged_in`
- `user.logged_out`
- `user.profile_updated`
- `user.password_changed`
- `user.email_verified`
- `user.deleted`
- `kyc.submitted`
- `kyc.approved`
- `kyc.rejected`

## Default Admin Account

After running migrations, a default admin account is created:
- **Email**: admin@marketplace.com
- **Password**: Admin123!
- **Role**: admin

## Production Considerations

1. **File Storage**: Implement cloud storage (AWS S3, Google Cloud Storage)
2. **Email Service**: Use dedicated email service (SendGrid, Mailgun)
3. **Rate Limiting**: Implement Redis-based rate limiting
4. **Monitoring**: Add health checks and metrics
5. **Backup**: Regular database backups
6. **SSL/TLS**: HTTPS in production
7. **Environment**: Separate staging/production configs