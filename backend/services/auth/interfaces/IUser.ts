import { Optional } from 'sequelize';

export interface IUserAttributes {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'buyer' | 'seller' | 'admin' | 'delivery_partner';
  platformType: 'local' | 'facebook' | 'google';
  socialId?: string;
  socialProvider?: 'facebook' | 'google';
  socialProfileData?: Record<string, unknown>;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  subscriptionPlan: 'free' | 'silver' | 'gold' | 'platinum';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'trial';
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreationAttributes extends Optional<IUserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export interface IUser extends IUserAttributes {
  // associations can be added here if needed
}