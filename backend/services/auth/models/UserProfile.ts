// backend/services/auth/models/UserProfile.js
import { DataTypes } from 'sequelize';

/**
 * UserProfile Model
 * Handles extended user profile information separate from core authentication data
 * This includes personal details, bio, location, and profile image
 */
class PligsUserProfile {
  constructor(sequelize) {
    this.model = sequelize.define('UserProfile', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for user profile record'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'Foreign key reference to users table',
        unique: true // One profile per user
      },
      profileImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL or path to user profile image'
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User biography or description'
      },
      dateOfBirth: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'User date of birth for age verification'
      },
      gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: true,
        comment: 'User gender preference'
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User street address'
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'User city of residence'
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'User country of residence'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Profile creation timestamp'
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Profile last update timestamp'
      }
    }, {
      tableName: 'user_profiles',
      comment: 'Extended user profile information separate from core user data',
      indexes: [
        { fields: ['userId'], unique: true, comment: 'Ensure one profile per user' },
        { fields: ['city'], comment: 'Index for location-based queries' },
        { fields: ['country'], comment: 'Index for country-based queries' }
      ]
    });
  }

  /**
   * Get the Sequelize model instance
   * @returns {Object} Sequelize model
   */
  pligsGetModel() {
    return this.model;
  }

  /**
   * Find user profile by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Profile object or null
   */
  async pligsFindByUserId(userId) {
    return await this.model.findOne({
      where: { userId }
    });
  }

  /**
   * Create or update user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data
   * @returns {Object} Created/updated profile
   */
  async pligsUpsertProfile(userId, profileData) {
    const [profile, created] = await this.model.upsert({
      userId,
      ...profileData
    }, {
      returning: true
    });
    return profile;
  }

  /**
   * Update specific profile fields
   * @param {string} userId - User ID
   * @param {Object} updateData - Fields to update
   * @returns {Object} Updated profile
   */
  async pligsUpdateProfile(userId, updateData) {
    const profile = await this.pligsFindByUserId(userId);
    if (!profile) {
      return await this.pligsUpsertProfile(userId, updateData);
    }
    return await profile.update(updateData);
  }

  /**
   * Delete user profile
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  async pligsDeleteProfile(userId) {
    const deleted = await this.model.destroy({
      where: { userId }
    });
    return deleted > 0;
  }
}

export default PligsUserProfile;