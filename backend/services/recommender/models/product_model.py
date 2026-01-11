"""
Product Model - Handles product data and features for recommendations
===================================================================

Provides product data access and feature extraction for content-based filtering.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler

from models.database import DatabaseConnection

logger = logging.getLogger(__name__)


class ProductModel:
    """Product data model for recommendation system"""

    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.text_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        self.feature_scaler = StandardScaler()

    async def get_product_by_id(self, product_id: int) -> Optional[Dict[str, Any]]:
        """Get product details by ID"""
        query = """
        SELECT p.*,
               c.name as category_name,
               s.business_name as seller_name,
               AVG(pr.rating) as avg_rating,
               COUNT(pr.id) as review_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users s ON p.seller_id = s.id
        LEFT JOIN product_reviews pr ON p.id = pr.product_id
        WHERE p.id = %s AND p.status = 'active'
        GROUP BY p.id
        """
        result = await self.db.execute_query(query, (product_id,))
        return result[0] if result else None

    async def get_products_dataframe(self, limit: int = None) -> pd.DataFrame:
        """Get products data as pandas DataFrame for ML processing"""
        query = """
        SELECT p.id, p.name, p.description, p.price, p.category_id,
               p.seller_id, p.status, p.created_at, p.updated_at,
               c.name as category_name,
               AVG(pr.rating) as avg_rating,
               COUNT(pr.id) as review_count,
               COUNT(DISTINCT o.id) as sales_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_reviews pr ON p.id = pr.product_id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
        WHERE p.status = 'active'
        GROUP BY p.id
        """
        if limit:
            query += f" LIMIT {limit}"

        result = await self.db.execute_query(query)
        df = pd.DataFrame(result)

        # Fill NaN values
        df['avg_rating'] = df['avg_rating'].fillna(0)
        df['review_count'] = df['review_count'].fillna(0)
        df['sales_count'] = df['sales_count'].fillna(0)

        return df

    async def get_products_by_ids(self, product_ids: List[int]) -> List[Dict[str, Any]]:
        """Get multiple products by IDs"""
        if not product_ids:
            return []

        placeholders = ','.join(['%s'] * len(product_ids))
        query = f"""
        SELECT p.*,
               c.name as category_name,
               s.business_name as seller_name,
               AVG(pr.rating) as avg_rating,
               COUNT(pr.id) as review_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users s ON p.seller_id = s.id
        LEFT JOIN product_reviews pr ON p.id = pr.product_id
        WHERE p.id IN ({placeholders}) AND p.status = 'active'
        GROUP BY p.id
        """
        result = await self.db.execute_query(query, tuple(product_ids))
        return result

    async def get_products_by_category(self, category_id: int, limit: int = 20,
                                     exclude_ids: List[int] = None) -> List[Dict[str, Any]]:
        """Get products by category"""
        params = [category_id]
        exclude_clause = ""
        if exclude_ids:
            placeholders = ','.join(['%s'] * len(exclude_ids))
            exclude_clause = f" AND p.id NOT IN ({placeholders})"
            params.extend(exclude_ids)

        query = f"""
        SELECT p.*,
               c.name as category_name,
               AVG(pr.rating) as avg_rating,
               COUNT(pr.id) as review_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_reviews pr ON p.id = pr.product_id
        WHERE p.category_id = %s AND p.status = 'active'{exclude_clause}
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT %s
        """
        params.append(limit)
        result = await self.db.execute_query(query, tuple(params))
        return result

    async def get_popular_products(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get popular products based on sales and ratings"""
        query = """
        SELECT p.*,
               c.name as category_name,
               AVG(pr.rating) as avg_rating,
               COUNT(pr.id) as review_count,
               COUNT(DISTINCT o.id) as sales_count,
               (AVG(pr.rating) * 0.4 + LOG(COUNT(DISTINCT o.id) + 1) * 0.4 + LOG(COUNT(pr.id) + 1) * 0.2) as popularity_score
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_reviews pr ON p.id = pr.product_id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
        WHERE p.status = 'active'
        GROUP BY p.id
        ORDER BY popularity_score DESC
        LIMIT %s
        """
        result = await self.db.execute_query(query, (limit,))
        return result

    async def get_trending_products(self, days: int = 30, limit: int = 20) -> List[Dict[str, Any]]:
        """Get trending products based on recent sales"""
        query = """
        SELECT p.*,
               c.name as category_name,
               COUNT(DISTINCT o.id) as recent_sales,
               SUM(oi.quantity) as recent_quantity,
               AVG(pr.rating) as avg_rating
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
        LEFT JOIN product_reviews pr ON p.id = pr.product_id
        WHERE p.status = 'active'
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
        GROUP BY p.id
        ORDER BY recent_sales DESC, recent_quantity DESC
        LIMIT %s
        """
        result = await self.db.execute_query(query, (days, limit))
        return result

    async def extract_product_features(self, products_df: pd.DataFrame) -> np.ndarray:
        """Extract features from product data for ML models"""
        try:
            # Text features from name and description
            text_data = products_df['name'].fillna('') + ' ' + products_df['description'].fillna('')
            text_features = self.text_vectorizer.fit_transform(text_data).toarray()

            # Numerical features
            numerical_features = products_df[['price', 'avg_rating', 'review_count']].fillna(0).values
            numerical_features = self.feature_scaler.fit_transform(numerical_features)

            # Categorical features (category)
            category_dummies = pd.get_dummies(products_df['category_id'], prefix='cat').values

            # Combine all features
            combined_features = np.concatenate([
                text_features,
                numerical_features,
                category_dummies
            ], axis=1)

            return combined_features

        except Exception as e:
            logger.error(f"Failed to extract product features: {e}")
            return np.array([])

    async def get_similar_products_by_category(self, product_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get similar products from same category"""
        # Get product category
        product = await self.get_product_by_id(product_id)
        if not product or not product.get('category_id'):
            return []

        return await self.get_products_by_category(
            product['category_id'],
            limit=limit + 1,  # +1 to account for excluding self
            exclude_ids=[product_id]
        )[:limit]

    async def update_product_popularity(self, product_id: int) -> bool:
        """Update product popularity metrics"""
        query = """
        UPDATE products p
        SET p.popularity_score = (
            SELECT
                COALESCE(AVG(pr.rating), 0) * 0.4 +
                COALESCE(LOG(COUNT(DISTINCT o.id) + 1), 0) * 0.4 +
                COALESCE(LOG(COUNT(pr.id) + 1), 0) * 0.2
            FROM product_reviews pr
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
        ),
        p.updated_at = NOW()
        WHERE p.id = %s
        """
        try:
            await self.db.execute_update(query, (product_id,))
            return True
        except Exception as e:
            logger.error(f"Failed to update product popularity: {e}")
            return False