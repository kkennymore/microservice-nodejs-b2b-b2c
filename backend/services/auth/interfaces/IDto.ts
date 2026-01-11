// DTOs for auth service
import { IUser } from './IUser';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  role?: 'buyer' | 'seller' | 'admin' | 'delivery_partner';
}

export interface SocialLoginDto {
  socialId: string;
  provider: 'facebook' | 'google';
  profileData: Record<string, unknown>;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  // etc.
}

export interface KycSubmitDto {
  documentType: string;
  documentNumber: string;
  documentImage: string;
  // etc.
}