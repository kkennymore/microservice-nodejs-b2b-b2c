"""
User Model - Handles user data and profiles for recommendations
===============================================================

Provides user data access and preprocessing for recommendation algorithms.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd

from models.database import DatabaseConnection

logger = logging.getLogger(__name__)


class UserModel:
    """User data model for recommendation system"""

    def __init__(self, db: DatabaseConnection):
        self.db = db

    async def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user details by ID"""
        query = """
        SELECT u.id, u.username, u.email, u.status, u.created_at,
               up.first_name, up.last_name, up.date_of_birth, up.gender,
               up.location, up.interests, up.preferences
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = %s AND u.status = 'active'
        """
        result = await self.db.execute_query(query, (user_id,))
        return result[0] if result else None

    async def get_users_dataframe(self, limit: int = None) -> pd.DataFrame:
        """Get users data as pandas DataFrame for ML processing"""
        query = """
        SELECT u.id, u.username, u.email, u.created_at,
               up.first_name, up.last_name, up.date_of_birth, up.gender,
               up.location, up.interests, up.preferences
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.status = 'active'
        """
        if limit:
            query += f" LIMIT {limit}"

        result = await self.db.execute_query(query)
        return pd.DataFrame(result)

    async def get_user_preferences(self, user_id: int) -> Dict[str, Any]:
        """Get user preferences for personalization"""
        query = """
        SELECT preferences, interests, location, gender
        FROM user_profiles
        WHERE user_id = %s
        """
        result = await self.db.execute_query(query, (user_id,))
        if result:
            prefs = result[0]
            return {
                'preferences': prefs.get('preferences', {}),
                'interests': prefs.get('interests', []),
                'location': prefs.get('location'),
                'gender': prefs.get('gender')
            }
        return {}

    async def update_user_interaction(self, user_id: int, product_id: int,
                                    interaction_type: str, weight: float = 1.0) -> bool:
        """Update user-product interaction for learning"""
        query = """
        INSERT INTO user_product_interactions
        (user_id, product_id, interaction_type, weight, created_at)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        weight = weight + VALUES(weight),
        updated_at = VALUES(created_at)
        """
        try:
            await self.db.execute_update(query, (
                user_id, product_id, interaction_type, weight, datetime.utcnow()
            ))
            return True
        except Exception as e:
            logger.error(f"Failed to update user interaction: {e}")
            return False

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

    async def get_similar_users(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Find users with similar interaction patterns"""
        query = """
        SELECT u2.user_id,
               COUNT(*) as common_interactions,
               AVG(u1.weight) as avg_weight
        FROM user_product_interactions u1
        JOIN user_product_interactions u2 ON u1.product_id = u2.product_id
        WHERE u1.user_id = %s AND u2.user_id != %s
        GROUP BY u2.user_id
        ORDER BY common_interactions DESC, avg_weight DESC
        LIMIT %s
        """
        result = await self.db.execute_query(query, (user_id, user_id, limit))
        return result

    async def get_user_segments(self) -> List[Dict[str, Any]]:
        """Get user segments for targeted recommendations"""
        query = """
        SELECT
            CASE
                WHEN total_orders >= 10 THEN 'high_value'
                WHEN total_orders >= 5 THEN 'medium_value'
                WHEN total_orders >= 1 THEN 'low_value'
                ELSE 'new_user'
            END as segment,
            COUNT(*) as user_count,
            AVG(total_spent) as avg_spent,
            AVG(total_orders) as avg_orders
        FROM (
            SELECT u.id,
                   COUNT(o.id) as total_orders,
                   COALESCE(SUM(o.total_amount), 0) as total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.customer_id AND o.status = 'completed'
            GROUP BY u.id
        ) user_stats
        GROUP BY segment
        """
        result = await self.db.execute_query(query)
        return result