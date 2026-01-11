// Base repository implementation
import { IBaseRepository, ISoftDeleteRepository } from '@/shared/interfaces/repository';
import { DatabaseQueryOptions, BaseEntity, SoftDeleteEntity } from '@/shared/interfaces/common';

export abstract class BaseRepository<T extends BaseEntity> implements IBaseRepository<T> {
  protected model: any;

  constructor(model: any) {
    this.model = model;
  }

  async create(data: Partial<T>): Promise<T> {
    return await this.model.create(data);
  }

  async findById(id: string, options: DatabaseQueryOptions = {}): Promise<T | null> {
    return await this.model.findByPk(id, options);
  }

  async findOne(options: DatabaseQueryOptions): Promise<T | null> {
    return await this.model.findOne(options);
  }

  async findMany(options: DatabaseQueryOptions = {}): Promise<T[]> {
    return await this.model.findAll(options);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const [rowsAffected, [updatedRecord]] = await this.model.update(data, {
      where: { id },
      returning: true
    });
    
    if (rowsAffected === 0) {
      throw new Error(`Record with id ${id} not found or not updated`);
    }
    
    return updatedRecord;
  }

  async delete(id: string): Promise<boolean> {
    const rowsAffected = await this.model.destroy({ where: { id } });
    return rowsAffected > 0;
  }

  async count(options: DatabaseQueryOptions = {}): Promise<number> {
    return await this.model.count(options);
  }
}

export abstract class SoftDeleteRepository<T extends SoftDeleteEntity> extends BaseRepository<T> implements ISoftDeleteRepository<T> {
  async softDelete(id: string): Promise<T> {
    const [rowsAffected, [updatedRecord]] = await this.model.update(
      { deletedAt: new Date(), isActive: false },
      {
        where: { id },
        returning: true
      }
    );
    
    if (rowsAffected === 0) {
      throw new Error(`Record with id ${id} not found or not updated`);
    }
    
    return updatedRecord;
  }

  async restore(id: string): Promise<T> {
    const [rowsAffected, [updatedRecord]] = await this.model.update(
      { deletedAt: null, isActive: true },
      {
        where: { id },
        returning: true
      }
    );
    
    if (rowsAffected === 0) {
      throw new Error(`Record with id ${id} not found or not updated`);
    }
    
    return updatedRecord;
  }

  async findActive(options: DatabaseQueryOptions = {}): Promise<T[]> {
    return await this.model.findAll({
      ...options,
      where: {
        ...options.where,
        isActive: true,
        deletedAt: null
      }
    });
  }
}