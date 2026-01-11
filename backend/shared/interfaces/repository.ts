// Base Repository Pattern Interface
import { DatabaseQueryOptions, BaseEntity, SoftDeleteEntity } from '@/shared/interfaces/common';

export interface IBaseRepository<T extends BaseEntity> {
  model: any;
  
  create(data: Partial<T>): Promise<T>;
  findById(id: string, options?: DatabaseQueryOptions): Promise<T | null>;
  findOne(options: DatabaseQueryOptions): Promise<T | null>;
  findMany(options: DatabaseQueryOptions): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  softDelete(id: string): Promise<T>;
  count(options: DatabaseQueryOptions): Promise<number>;
}

// Repository for soft-deletable entities
export interface ISoftDeleteRepository<T extends SoftDeleteEntity> extends IBaseRepository<T> {
  restore(id: string): Promise<T>;
  findActive(options?: DatabaseQueryOptions): Promise<T[]>;
}