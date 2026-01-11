// Interfaces for products service
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sellerId: string;
  categoryId: string;
  brand?: string;
  model?: string;
  sku?: string;
  condition: 'new' | 'used' | 'refurbished';
  images: string[];
  specifications: Record<string, unknown>;
  tags: string[];
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulVotes: number;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductLike {
  id: string;
  productId: string;
  userId: string;
  createdAt: Date;
}

export interface ProductOffer {
  id: string;
  productId: string;
  buyerId: string;
  offerPrice: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for product operations
export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  brand?: string;
  model?: string;
  sku?: string;
  condition: 'new' | 'used' | 'refurbished';
  specifications?: Record<string, unknown>;
  tags?: string[];
  stock: number;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  brand?: string;
  model?: string;
  sku?: string;
  condition?: 'new' | 'used' | 'refurbished';
  specifications?: Record<string, unknown>;
  tags?: string[];
  stock?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface ProductQuery {
  categoryId?: string;
  sellerId?: string;
  brand?: string;
  condition?: 'new' | 'used' | 'refurbished';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  tags?: string[];
}

export interface ProductSearchQuery {
  query?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: 'new' | 'used' | 'refurbished';
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'created_desc' | 'rating_desc';
  page?: number;
  limit?: number;
}