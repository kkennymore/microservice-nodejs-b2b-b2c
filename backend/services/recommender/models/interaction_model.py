"""
Interaction Model - Handles user-product interaction data
========================================================

Manages user behavior data for collaborative filtering and personalization.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd

from models.database import DatabaseConnection

logger = logging.getLogger(__name__)


class InteractionModel:
    """User-product interaction data model"""

    def __init__(self, db: DatabaseConnection):
        self.db = db

    async def get_interactions_dataframe(self, limit: int = None) -> pd.DataFrame:
        """Get all user-product interactions as DataFrame for ML"""
        query = """
        SELECT user_id, product_id, interaction_type, weight, created_at
        FROM user_product_interactions
        ORDER BY created_at DESC
        """
        if limit:
            query += f" LIMIT {limit}"

        result = await self.db.execute_query(query)
        return pd.DataFrame(result)

    async def get_user_interactions(self, user_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Get all interactions for a specific user"""
        query = """
        SELECT upi.*, p.name as product_name, p.category_id, c.name as category_name
        FROM user_product_interactions upi
        JOIN products p ON upi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE upi.user_id = %s
        ORDER BY upi.created_at DESC
        """
        params = [user_id]
        if limit:
            query += " LIMIT %s"
            params.append(limit)

        result = await self.db.execute_query(query, tuple(params))
        return result

    async def get_product_interactions(self, product_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Get all interactions for a specific product"""
        query = """
        SELECT upi.*, u.username, u.email
        FROM user_product_interactions upi
        JOIN users u ON upi.user_id = u.id
        WHERE upi.product_id = %s
        ORDER BY upi.created_at DESC
        """
        params = [product_id]
        if limit:
            query += " LIMIT %s"
            params.append(limit)

        result = await self.db.execute_query(query, tuple(params))
        return result

    async def get_user_recent_products(self, user_id: int, limit: int = 10) -> List[int]:
        """Get recently interacted products for a user"""
        query = """
        SELECT DISTINCT product_id
        FROM user_product_interactions
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """
        result = await self.db.execute_query(query, (user_id, limit))
        return [row['product_id'] for row in result]

    async def get_popular_products_from_interactions(self, days: int = 30, limit: int = 20) -> List[Dict[str, Any]]:
        """Get popular products based on interaction data"""
        query = """
        SELECT
            product_id,
            COUNT(*) as interaction_count,
            COUNT(DISTINCT user_id) as unique_users,
            SUM(weight) as total_weight,
            AVG(weight) as avg_weight,
            MAX(created_at) as last_interaction
        FROM user_product_interactions
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
        GROUP BY product_id
        ORDER BY total_weight DESC, interaction_count DESC
        LIMIT %s
        """
        result = await self.db.execute_query(query, (days, limit))
        return result

    async def add_interaction(self, user_id: int, product_id: int,
                            interaction_type: str, weight: float = 1.0,
                            metadata: Dict[str, Any] = None) -> bool:
        """Add a new user-product interaction"""
        query = """
        INSERT INTO user_product_interactions
        (user_id, product_id, interaction_type, weight, metadata, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        try:
            metadata_json = str(metadata) if metadata else None
            await self.db.execute_update(query, (
                user_id, product_id, interaction_type, weight,
                metadata_json, datetime.utcnow()
            ))
            return True
        except Exception as e:
            logger.error(f"Failed to add interaction: {e}")
            return False

    async def get_interaction_matrix(self, min_interactions: int = 5) -> pd.DataFrame:
        """Get user-product interaction matrix for collaborative filtering"""
        query = """
        SELECT
            user_id,
            product_id,
            SUM(weight) as interaction_strength,
            COUNT(*) as interaction_count,
            MAX(created_at) as last_interaction
        FROM user_product_interactions
        GROUP BY user_id, product_id
        HAVING interaction_count >= %s
        """
        result = await self.db.execute_query(query, (min_interactions,))
        return pd.DataFrame(result)

    async def get_user_similarity_matrix(self, limit: int = None) -> pd.DataFrame:
        """Get user-user similarity based on interactions"""
        query = """
        SELECT
            u1.user_id as user_a,
            u2.user_id as user_b,
            COUNT(*) as common_products,
            SUM(u1.weight * u2.weight) as similarity_score
        FROM user_product_interactions u1
        JOIN user_product_interactions u2 ON u1.product_id = u2.product_id
        WHERE u1.user_id < u2.user_id
        GROUP BY u1.user_id, u2.user_id
        HAVING common_products >= 3
        ORDER BY similarity_score DESC
        """
        if limit:
            query += f" LIMIT {limit}"

        result = await self.db.execute_query(query)
        return pd.DataFrame(result)

    async def get_product_similarity_matrix(self, limit: int = None) -> pd.DataFrame:
        """Get product-product similarity based on co-interactions"""
        query = """
        SELECT
            p1.product_id as product_a,
            p2.product_id as product_b,
            COUNT(DISTINCT u1.user_id) as common_users,
            SUM(u1.weight * u2.weight) as similarity_score
        FROM user_product_interactions u1
        JOIN user_product_interactions u2 ON u1.user_id = u2.user_id
        JOIN products p1 ON u1.product_id = p1.id
        JOIN products p2 ON u2.product_id = p2.id
        WHERE u1.product_id < u2.product_id
          AND p1.status = 'active'
          AND p2.status = 'active'
        GROUP BY p1.product_id, p2.product_id
        HAVING common_users >= 2
        ORDER BY similarity_score DESC
        """
        if limit:
            query += f" LIMIT {limit}"

        result = await self.db.execute_query(query)
        return pd.DataFrame(result)

    async def get_interaction_stats(self) -> Dict[str, Any]:
        """Get comprehensive interaction statistics"""
        queries = {
            'total_interactions': "SELECT COUNT(*) as count FROM user_product_interactions",
            'unique_users': "SELECT COUNT(DISTINCT user_id) as count FROM user_product_interactions",
            'unique_products': "SELECT COUNT(DISTINCT product_id) as count FROM user_product_interactions",
            'interaction_types': """
                SELECT interaction_type, COUNT(*) as count
                FROM user_product_interactions
                GROUP BY interaction_type
                ORDER BY count DESC
            """,
            'recent_activity': """
                SELECT DATE(created_at) as date, COUNT(*) as interactions
                FROM user_product_interactions
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            """
        }

        stats = {}
        for key, query in queries.items():
            result = await self.db.execute_query(query)
            if key in ['total_interactions', 'unique_users', 'unique_products']:
                stats[key] = result[0]['count'] if result else 0
            else:
                stats[key] = result

        return stats

    async def cleanup_old_interactions(self, days: int = 365) -> int:
        """Clean up old interaction data"""
        query = """
        DELETE FROM user_product_interactions
        WHERE created_at < DATE_SUB(NOW(), INTERVAL %s DAY)
        """
        try:
            result = await self.db.execute_update(query, (days,))
            logger.info(f"Cleaned up {result} old interactions")
            return result
        except Exception as e:
            logger.error(f"Failed to cleanup interactions: {e}")
            return 0