// backend/services/auth/services/authService.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '@/shared/config.js';

class PligsAuthService {
  static pligsGenerateTokens(user) {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  static pligsVerifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static pligsGenerateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static pligsHashPassword(password) {
    return crypto.createHash('sha256').update(password + config.jwt.secret).digest('hex');
  }

  static pligsGenerateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static pligsValidatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  static pligsSanitizeUser(user) {
    const { password, twoFactorSecret, loginAttempts, lockedUntil, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

export default PligsAuthService;