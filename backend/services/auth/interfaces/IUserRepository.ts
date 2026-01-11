import { ModelStatic, Model } from 'sequelize';
import { IUserAttributes, IUserCreationAttributes } from '@/IUser';

export interface IUserRepository {
  model: ModelStatic<Model<IUserAttributes, IUserCreationAttributes>>;

  findById(id: string): Promise<Model<IUserAttributes, IUserCreationAttributes> | null>;
  findByEmail(email: string): Promise<Model<IUserAttributes, IUserCreationAttributes> | null>;
  findByUsername(username: string): Promise<Model<IUserAttributes, IUserCreationAttributes> | null>;
  create(data: IUserCreationAttributes): Promise<Model<IUserAttributes, IUserCreationAttributes>>;
  update(id: string, data: Partial<IUserAttributes>): Promise<Model<IUserAttributes, IUserCreationAttributes>>;
  // Add more methods
}