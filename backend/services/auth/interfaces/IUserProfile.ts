import { Optional } from 'sequelize';

export interface IUserProfileAttributes {
  id: string;
  userId: string;
  profileImage?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  city?: string;
  country?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProfileCreationAttributes extends Optional<IUserProfileAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export interface IUserProfile extends IUserProfileAttributes {}