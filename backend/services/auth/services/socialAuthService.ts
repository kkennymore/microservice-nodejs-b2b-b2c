// backend/services/auth/services/socialAuthService.js
import axios from 'axios';
import config from '@/shared/config.js';
import pligsLogger from '@/utils/logger.js';

/**
 * SocialAuthService handles OAuth authentication with Facebook and Google
 * Manages token exchange, user profile retrieval, and social login/registration
 */
class PligsSocialAuthService {
  constructor() {
    this.facebookAppId = process.env.FACEBOOK_APP_ID;
    this.facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
    this.googleClientId = process.env.GOOGLE_CLIENT_ID;
    this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // OAuth endpoints
    this.endpoints = {
      facebook: {
        token: 'https://graph.facebook.com/oauth/access_token',
        profile: 'https://graph.facebook.com/me',
        fields: 'id,name,email,first_name,last_name,picture'
      },
      google: {
        token: 'https://oauth2.googleapis.com/token',
        profile: 'https://www.googleapis.com/oauth2/v2/userinfo'
      }
    };
  }

  /**
   * Exchange authorization code for access token (Facebook)
   * @param {string} code - Authorization code from Facebook
   * @param {string} redirectUri - Redirect URI used in the OAuth flow
   * @returns {Object} Access token data
   */
  async pligsExchangeFacebookCode(code, redirectUri) {
    try {
      const params = {
        client_id: this.facebookAppId,
        client_secret: this.facebookAppSecret,
        code,
        redirect_uri: redirectUri
      };

      const response = await axios.get(this.endpoints.facebook.token, { params });

      pligsLogger.info('Facebook token exchange successful');
      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      pligsLogger.error('Facebook token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange Facebook authorization code');
    }
  }

  /**
   * Exchange authorization code for access token (Google)
   * @param {string} code - Authorization code from Google
   * @param {string} redirectUri - Redirect URI used in the OAuth flow
   * @returns {Object} Access token data
   */
  async pligsExchangeGoogleCode(code, redirectUri) {
    try {
      const params = {
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      };

      const response = await axios.post(this.endpoints.google.token, null, { params });

      pligsLogger.info('Google token exchange successful');
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
        scope: response.data.scope
      };
    } catch (error) {
      pligsLogger.error('Google token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange Google authorization code');
    }
  }

  /**
   * Get user profile from Facebook
   * @param {string} accessToken - Facebook access token
   * @returns {Object} User profile data
   */
  async pligsGetFacebookProfile(accessToken) {
    try {
      const params = {
        access_token: accessToken,
        fields: this.endpoints.facebook.fields
      };

      const response = await axios.get(this.endpoints.facebook.profile, { params });
      const profile = response.data;

      pligsLogger.info('Facebook profile retrieved for user:', profile.id);

      return {
        socialId: profile.id,
        provider: 'facebook',
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        fullName: profile.name,
        profilePicture: profile.picture?.data?.url,
        rawProfile: profile
      };
    } catch (error) {
      pligsLogger.error('Failed to get Facebook profile:', error.response?.data || error.message);
      throw new Error('Failed to retrieve Facebook profile');
    }
  }

  /**
   * Get user profile from Google
   * @param {string} accessToken - Google access token
   * @returns {Object} User profile data
   */
  async pligsGetGoogleProfile(accessToken) {
    try {
      const headers = {
        Authorization: `Bearer ${accessToken}`
      };

      const response = await axios.get(this.endpoints.google.profile, { headers });
      const profile = response.data;

      pligsLogger.info('Google profile retrieved for user:', profile.id);

      return {
        socialId: profile.id,
        provider: 'google',
        email: profile.email,
        firstName: profile.given_name,
        lastName: profile.family_name,
        fullName: profile.name,
        profilePicture: profile.picture,
        locale: profile.locale,
        rawProfile: profile
      };
    } catch (error) {
      pligsLogger.error('Failed to get Google profile:', error.response?.data || error.message);
      throw new Error('Failed to retrieve Google profile');
    }
  }

  /**
   * Complete Facebook OAuth flow
   * @param {string} code - Authorization code
   * @param {string} redirectUri - Redirect URI
   * @returns {Object} User profile data
   */
  async pligsAuthenticateFacebook(code, redirectUri) {
    const tokenData = await this.pligsExchangeFacebookCode(code, redirectUri);
    return await this.pligsGetFacebookProfile(tokenData.accessToken);
  }

  /**
   * Complete Google OAuth flow
   * @param {string} code - Authorization code
   * @param {string} redirectUri - Redirect URI
   * @returns {Object} User profile data
   */
  async pligsAuthenticateGoogle(code, redirectUri) {
    const tokenData = await this.pligsExchangeGoogleCode(code, redirectUri);
    return await this.pligsGetGoogleProfile(tokenData.accessToken);
  }

  /**
   * Generate OAuth authorization URLs
   * @param {string} provider - OAuth provider (facebook/google)
   * @param {string} redirectUri - Redirect URI after authorization
   * @param {string} state - State parameter for security
   * @returns {string} Authorization URL
   */
  pligsGenerateAuthUrl(provider, redirectUri, state = null) {
    const baseUrls = {
      facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
      google: 'https://accounts.google.com/oauth/v2/auth'
    };

    const scopes = {
      facebook: 'email,public_profile',
      google: 'openid email profile'
    };

    const params = new URLSearchParams({
      client_id: provider === 'facebook' ? this.facebookAppId : this.googleClientId,
      redirect_uri: redirectUri,
      scope: scopes[provider],
      response_type: 'code',
      ...(state && { state })
    });

    return `${baseUrls[provider]}?${params.toString()}`;
  }

  /**
   * Validate OAuth configuration
   * @returns {Object} Validation results
   */
  pligsValidateConfiguration() {
    const issues = [];

    if (!this.facebookAppId || !this.facebookAppSecret) {
      issues.push('Facebook App ID and Secret not configured');
    }

    if (!this.googleClientId || !this.googleClientSecret) {
      issues.push('Google Client ID and Secret not configured');
    }

    return {
      facebookConfigured: !!(this.facebookAppId && this.facebookAppSecret),
      googleConfigured: !!(this.googleClientId && this.googleClientSecret),
      allConfigured: issues.length === 0,
      issues
    };
  }

  /**
   * Handle social login/registration logic
   * @param {Object} profileData - Social profile data
   * @param {Object} userModel - User model instance
   * @returns {Object} User and action performed
   */
  async pligsHandleSocialLogin(profileData, userModel) {
    const { socialId, provider, email } = profileData;

    // Check if user already exists with this social ID
    let user = await userModel.pligsFindBySocialId(socialId, provider);

    if (user) {
      // Existing social user - update last login
      await userModel.pligsUpdateUser(user.id, { lastLoginAt: new Date() });
      return { user, action: 'login', isNewUser: false };
    }

    // Check if user exists with same email (for account linking)
    if (email) {
      const existingUser = await userModel.pligsFindByEmail(email);
      if (existingUser) {
        // Link social account to existing user
        await userModel.pligsUpdateUser(existingUser.id, {
          platformType: provider,
          socialId,
          socialProvider: provider,
          socialProfileData: profileData.rawProfile,
          lastLoginAt: new Date()
        });

        const updatedUser = await userModel.pligsFindById(existingUser.id);
        return { user: updatedUser, action: 'link', isNewUser: false };
      }
    }

    // Create new social user
    const userData = {
      username: this.pligsGenerateSocialUsername(profileData),
      email: profileData.email,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      phone: '', // Social logins don't provide phone
      role: 'buyer', // Default role
      platformType: provider,
      socialId,
      socialProvider: provider,
      socialProfileData: profileData.rawProfile,
      isEmailVerified: true, // Social emails are pre-verified
      lastLoginAt: new Date()
    };

    user = await userModel.pligsCreateUser(userData);

    // Create related records for new user
    // Note: Social users don't have password records
    // Create default profile, security, and preference records
    const sequelize = userModel.model.sequelize;
    await sequelize.models.UserProfile.create({ userId: user.id });
    await sequelize.models.UserSecurity.create({ userId: user.id });
    await sequelize.models.UserPreference.create({ userId: user.id });

    return { user, action: 'register', isNewUser: true };
  }

  /**
   * Generate unique username for social users
   * @param {Object} profileData - Social profile data
   * @returns {string} Generated username
   */
  pligsGenerateSocialUsername(profileData) {
    const baseName = profileData.firstName?.toLowerCase() || 'user';
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${baseName}_${profileData.socialId.slice(-4)}_${randomSuffix}`;
  }

  /**
   * Refresh social access tokens (if needed)
   * @param {string} provider - OAuth provider
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New token data
   */
  async pligsRefreshToken(provider, refreshToken) {
    try {
      if (provider === 'google') {
        const params = {
          client_id: this.googleClientId,
          client_secret: this.googleClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        };

        const response = await axios.post(this.endpoints.google.token, null, { params });
        return response.data;
      }

      // Facebook tokens are long-lived, refresh not typically needed
      throw new Error(`Token refresh not supported for ${provider}`);
    } catch (error) {
      pligsLogger.error(`Failed to refresh ${provider} token:`, error.response?.data || error.message);
      throw new Error(`Failed to refresh ${provider} token`);
    }
  }
}

export default PligsSocialAuthService;