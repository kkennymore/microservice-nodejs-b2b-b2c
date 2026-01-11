// backend/services/products/models/Category.js
import { DataTypes } from 'sequelize';

class PligsCategory {
  constructor(sequelize) {
    this.model = sequelize.define('Category', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true
      },
      parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Categories',
          key: 'id'
        }
      },
      level: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      seoTitle: {
        type: DataTypes.STRING,
        allowNull: true
      },
      seoDescription: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'categories',
      indexes: [
        { fields: ['parentId'] },
        { fields: ['level'] },
        { fields: ['isActive'] },
        { fields: ['sortOrder'] }
      ]
    });

    // Self-referencing relationship for subcategories
    this.model.belongsTo(this.model, { as: 'parent', foreignKey: 'parentId' });
    this.model.hasMany(this.model, { as: 'subcategories', foreignKey: 'parentId' });
  }

  pligsGetModel() {
    return this.model;
  }

  // Business logic methods
  async pligsFindById(id) {
    return await this.model.findByPk(id, {
      include: [
        { model: this.model, as: 'subcategories' },
        { model: this.model, as: 'parent' }
      ]
    });
  }

  async pligsFindAllActive() {
    return await this.model.findAll({
      where: { isActive: true },
      include: [{ model: this.model, as: 'subcategories' }],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });
  }

  async pligsFindTopLevel() {
    return await this.model.findAll({
      where: { parentId: null, isActive: true },
      include: [{ model: this.model, as: 'subcategories' }],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });
  }

  async pligsFindByParent(parentId) {
    return await this.model.findAll({
      where: { parentId, isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });
  }

  async pligsCreateCategory(categoryData) {
    // Calculate level
    let level = 1;
    if (categoryData.parentId) {
      const parent = await this.model.findByPk(categoryData.parentId);
      if (parent) level = parent.level + 1;
    }

    return await this.model.create({ ...categoryData, level });
  }

  async pligsUpdateCategory(id, updateData) {
    const category = await this.model.findByPk(id);
    if (!category) throw new Error('Category not found');

    // Recalculate level if parent changed
    if (updateData.parentId !== undefined) {
      let level = 1;
      if (updateData.parentId) {
        const parent = await this.model.findByPk(updateData.parentId);
        if (parent) level = parent.level + 1;
      }
      updateData.level = level;
    }

    return await category.update(updateData);
  }

  async pligsDeleteCategory(id) {
    const category = await this.model.findByPk(id, {
      include: [{ model: this.model, as: 'subcategories' }]
    });
    if (!category) throw new Error('Category not found');

    // Check if has subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      throw new Error('Cannot delete category with subcategories');
    }

    return await category.destroy();
  }

  async pligsGetCategoryTree() {
    const topLevel = await this.pligsFindTopLevel();

    const buildTree = async (categories) => {
      for (const category of categories) {
        category.dataValues.subcategories = await this.pligsFindByParent(category.id);
        if (category.dataValues.subcategories.length > 0) {
          await buildTree(category.dataValues.subcategories);
        }
      }
    };

    await buildTree(topLevel);
    return topLevel;
  }
}

export default PligsCategory;