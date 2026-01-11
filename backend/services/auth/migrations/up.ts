// backend/services/auth/migrations/up.js
import { Sequelize } from 'sequelize';
import config from '/app/shared/config.js';

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect
  }
);

async function pligsRunMigrations() {
  try {
    // Create users table (core authentication data)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
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
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_role (role),
        INDEX idx_isActive (isActive),
        INDEX idx_phone (phone),
        INDEX idx_platformType (platformType),
        INDEX idx_socialId (socialId),
        INDEX idx_socialProvider (socialProvider)
      ) COMMENT 'Core user authentication and basic information';
    `);

    // Create user_passwords table (password-related data for local users only)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_passwords (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_passwordResetToken (passwordResetToken),
        INDEX idx_passwordResetExpires (passwordResetExpires),
        INDEX idx_failedLoginAttempts (failedLoginAttempts),
        INDEX idx_lockedUntil (lockedUntil)
      ) COMMENT 'Password-related data for local platform users';
    `);

    // Create user_profiles table (extended profile information)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        userId VARCHAR(36) NOT NULL UNIQUE,
        profileImage VARCHAR(500),
        bio TEXT,
        dateOfBirth DATE,
        gender ENUM('male', 'female', 'other'),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_city (city),
        INDEX idx_country (country)
      ) COMMENT 'Extended user profile information separate from core data';
    `);

    // Create user_kyc table (KYC verification data)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_kyc (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_userId (userId),
        INDEX idx_status (status),
        INDEX idx_submittedAt (submittedAt),
        INDEX idx_approvedAt (approvedAt),
        INDEX idx_idNumber (idNumber),
        INDEX idx_verifiedBy (verifiedBy)
      ) COMMENT 'KYC verification information and document storage';
    `);

    // Create user_business table (business information for sellers)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_business (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
        taxCertificateImage VARCHAR(500),
        incorporationDocumentImage VARCHAR(500),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_userId (userId),
        INDEX idx_businessName (businessName),
        INDEX idx_businessRegistrationNumber (businessRegistrationNumber),
        INDEX idx_taxId (taxId),
        INDEX idx_isVerified (isVerified),
        INDEX idx_industry (industry)
      ) COMMENT 'Business information for sellers and service providers';
    `);

    // Create user_banks table (banking information)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_banks (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
        bankStatementImage VARCHAR(500),
        proofOfAddressImage VARCHAR(500),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_userId (userId),
        INDEX idx_bankAccountNumber (bankAccountNumber),
        INDEX idx_isVerified (isVerified),
        INDEX idx_isPrimary (isPrimary),
        INDEX idx_currency (currency)
      ) COMMENT 'User banking information for payouts and financial verification';
    `);

    // Create user_security table (security settings and tracking)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_security (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_twoFactorEnabled (twoFactorEnabled),
        INDEX idx_loginAttempts (loginAttempts),
        INDEX idx_lockedUntil (lockedUntil),
        INDEX idx_lastLoginAt (lastLoginAt)
      ) COMMENT 'User security settings, 2FA, login tracking, and security preferences';
    `);

    // Create user_preferences table (user settings and preferences)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_language (language),
        INDEX idx_theme (theme),
        INDEX idx_currency (currency)
      ) COMMENT 'User preferences and settings for personalization';
    `);

    // Create default admin user with minimal required fields
    await sequelize.query(`
      INSERT IGNORE INTO users (
        id, username, email, firstName, lastName, phone, role, platformType,
        isEmailVerified, isPhoneVerified, isActive
      ) VALUES (
        'admin-uuid-12345',
        'admin',
        'admin@marketplace.com',
        'System',
        'Administrator',
        '+1234567890',
        'admin',
        'local',
        TRUE,
        TRUE,
        TRUE
      );
    `);

    // Create admin password record (password: Admin123!)
    await sequelize.query(`
      INSERT IGNORE INTO user_passwords (
        id, userId, password, lastPasswordChange
      ) VALUES (
        'admin-pass-uuid',
        'admin-uuid-12345',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj0K2JvqVzJe',
        NOW()
      );
    `);

    // Create default preferences for admin
    await sequelize.query(`
      INSERT IGNORE INTO user_preferences (userId) VALUES ('admin-uuid-12345');
    `);

    // Create default security settings for admin
    await sequelize.query(`
      INSERT IGNORE INTO user_security (userId) VALUES ('admin-uuid-12345');
    `);

    // Create default profile for admin
    await sequelize.query(`
      INSERT IGNORE INTO user_profiles (userId) VALUES ('admin-uuid-12345');
    `);

    console.log('Auth service migrations completed successfully - all tables created');
    console.log('Default admin user created: admin@marketplace.com / Admin123!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

pligsRunMigrations();