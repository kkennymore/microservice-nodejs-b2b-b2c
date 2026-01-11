// backend/services/auth/routes/authRoutes.js
import express from 'express';
const router = express.Router();
import PligsAuthController from '@/controllers/AuthController.js';
import PligsAdminController from '@/controllers/AdminController.js';
import pligsAuthMiddleware from '@/middlewares/authMiddleware.js';

// Initialize controllers (will be set in index.js)
let authController;
let adminController;

export const setController = (sequelize, redisClient, rabbitChannel) => {
  authController = new PligsAuthController(sequelize, redisClient, rabbitChannel);
  adminController = new PligsAdminController(sequelize, redisClient, rabbitChannel);

  // Authentication routes
  router.post('/register',
    authController.pligsValidateRegistration,
    authController.pligsRegister
  );

  router.post('/login', authController.pligsLogin);

  router.post('/refresh', authController.pligsRefreshToken);

  router.post('/logout',
    pligsAuthMiddleware,
    authController.pligsLogout
  );

  router.get('/me',
    pligsAuthMiddleware,
    authController.pligsGetCurrentUser
  );

  // Email verification routes
  router.post('/verify-email', authController.pligsVerifyEmail);

  router.post('/resend-verification', authController.pligsResendVerification);

  // Password reset routes
  router.post('/forgot-password', authController.pligsForgotPassword);

  router.post('/reset-password', authController.pligsResetPasswordWithToken);

  // Profile routes
  router.get('/profile',
    pligsAuthMiddleware,
    authController.pligsGetProfile
  );

  router.put('/profile',
    pligsAuthMiddleware,
    authController.pligsValidateProfileUpdate,
    authController.pligsUpdateProfile
  );

  router.put('/preferences',
    pligsAuthMiddleware,
    authController.pligsUpdatePreferences
  );

  router.post('/change-password',
    pligsAuthMiddleware,
    authController.pligsValidatePasswordChange,
    authController.pligsChangePassword
  );

  router.post('/change-email',
    pligsAuthMiddleware,
    authController.pligsChangeEmail
  );

  router.post('/avatar',
    pligsAuthMiddleware,
    authController.pligsUploadAvatar
  );

  // Social authentication routes
  router.get('/google',
    authController.pligsGoogleAuth
  );

  router.get('/google/callback',
    authController.pligsGoogleAuthCallback
  );

  router.get('/facebook',
    authController.pligsFacebookAuth
  );

  router.get('/facebook/callback',
    authController.pligsFacebookAuthCallback
  );

  // Two-factor authentication routes
  router.post('/2fa/enable',
    pligsAuthMiddleware,
    authController.pligsEnable2FA
  );

  router.post('/2fa/verify',
    pligsAuthMiddleware,
    authController.pligsVerify2FA
  );

  router.post('/2fa/disable',
    pligsAuthMiddleware,
    authController.pligsDisable2FA
  );

  // Subscription routes
  router.get('/subscription',
    pligsAuthMiddleware,
    authController.pligsGetSubscription
  );

  router.post('/subscription/upgrade',
    pligsAuthMiddleware,
    authController.pligsUpgradeSubscription
  );

  // Security routes
  router.get('/security/login-history',
    pligsAuthMiddleware,
    authController.pligsGetLoginHistory
  );

  router.get('/security/sessions',
    pligsAuthMiddleware,
    authController.pligsGetActiveSessions
  );

  router.delete('/security/sessions/:sessionId',
    pligsAuthMiddleware,
    authController.pligsTerminateSession
  );

  router.delete('/security/sessions',
    pligsAuthMiddleware,
    authController.pligsTerminateAllSessions
  );

  // Admin routes (require admin role)
  const adminMiddleware = [pligsAuthMiddleware, (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  }];

  // User management
  router.get('/admin/users',
    adminMiddleware,
    adminController.pligsGetUsers
  );

  router.get('/admin/users/stats',
    adminMiddleware,
    adminController.pligsGetUserStats
  );

  router.get('/admin/users/:id',
    adminMiddleware,
    adminController.pligsGetUserDetails
  );

  router.put('/admin/users/:id',
    adminMiddleware,
    adminController.pligsUpdateUser
  );

  router.put('/admin/users/:id/deactivate',
    adminMiddleware,
    adminController.pligsDeactivateUser
  );
};

export default router;