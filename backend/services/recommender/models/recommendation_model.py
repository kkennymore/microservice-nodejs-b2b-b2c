"""
Recommendation Model - Stores and manages recommendation results
================================================================

Handles persistence and retrieval of recommendation data and analytics.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

from models.database import DatabaseConnection

logger = logging.getLogger(__name__)


class RecommendationModel:
    """Recommendation results and analytics model"""

    def __init__(self, db: DatabaseConnection):
        self.db = db

    async def save_recommendation(self, user_id: int, product_ids: List[int],
                                algorithm: str, context: Dict[str, Any] = None) -> bool:
        """Save a recommendation result"""
        query = """
        INSERT INTO recommendation_results
        (user_id, recommended_products, algorithm, context, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """
        try:
            await self.db.execute_update(query, (
                user_id,
                json.dumps(product_ids),
                algorithm,
                json.dumps(context or {}),
                datetime.utcnow()
            ))
            return True
        except Exception as e:
            logger.error(f"Failed to save recommendation: {e}")
            return False

    async def get_user_recommendations(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent recommendations for a user"""
        query = """
        SELECT id, recommended_products, algorithm, context, created_at
        FROM recommendation_results
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """
        result = await self.db.execute_query(query, (user_id, limit))

        # Parse JSON fields
        for row in result:
            row['recommended_products'] = json.loads(row['recommended_products'])
            row['context'] = json.loads(row['context'])

        return result

    async def log_recommendation_click(self, user_id: int, product_id: int,
                                     recommendation_id: int, position: int) -> bool:
        """Log when a user clicks on a recommendation"""
        query = """
        INSERT INTO recommendation_clicks
        (user_id, product_id, recommendation_id, position, clicked_at)
        VALUES (%s, %s, %s, %s, %s)
        """
        try:
            await self.db.execute_update(query, (
                user_id, product_id, recommendation_id, position, datetime.utcnow()
            ))
            return True
        except Exception as e:
            logger.error(f"Failed to log recommendation click: {e}")
            return False

    async def get_recommendation_performance(self, days: int = 30) -> Dict[str, Any]:
        """Get recommendation performance metrics"""
        queries = {
            'total_recommendations': f"""
                SELECT COUNT(*) as count
                FROM recommendation_results
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
            """,
            'total_clicks': f"""
                SELECT COUNT(*) as count
                FROM recommendation_clicks
                WHERE clicked_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
            """,
            'algorithm_performance': f"""
                SELECT
                    rr.algorithm,
                    COUNT(rr.id) as recommendations_shown,
                    COUNT(rc.id) as clicks_received,
                    ROUND(COUNT(rc.id) / COUNT(rr.id) * 100, 2) as click_rate
                FROM recommendation_results rr
                LEFT JOIN recommendation_clicks rc ON rr.id = rc.recommendation_id
                WHERE rr.created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
                GROUP BY rr.algorithm
                ORDER BY click_rate DESC
            """,
            'position_performance': f"""
                SELECT
                    position,
                    COUNT(*) as impressions,
                    COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicks,
                    ROUND(COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) / COUNT(*) * 100, 2) as click_rate
                FROM (
                    SELECT
                        rc.position,
                        rc.clicked_at
                    FROM recommendation_results rr
                    CROSS JOIN JSON_TABLE(
                        rr.recommended_products,
                        '$[*]' COLUMNS (product_id INT PATH '$', position INT PATH '$')
                    ) AS rc
                    WHERE rr.created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
                ) position_data
                GROUP BY position
                ORDER BY position
            """
        }

        performance = {}
        for key, query in queries.items():
            result = await self.db.execute_query(query)
            if key in ['total_recommendations', 'total_clicks']:
                performance[key] = result[0]['count'] if result else 0
            else:
                performance[key] = result

        # Calculate overall metrics
        total_recs = performance.get('total_recommendations', 0)
        total_clicks = performance.get('total_clicks', 0)
        performance['overall_click_rate'] = round(total_clicks / total_recs * 100, 2) if total_recs > 0 else 0

        return performance

    async def get_user_recommendation_history(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get detailed recommendation history for a user"""
        query = """
        SELECT
            rr.id,
            rr.recommended_products,
            rr.algorithm,
            rr.context,
            rr.created_at,
            GROUP_CONCAT(
                CONCAT(rc.product_id, ':', rc.position, ':', rc.clicked_at)
                ORDER BY rc.clicked_at
            ) as click_details
        FROM recommendation_results rr
        LEFT JOIN recommendation_clicks rc ON rr.id = rc.recommendation_id
        WHERE rr.user_id = %s
        GROUP BY rr.id
        ORDER BY rr.created_at DESC
        LIMIT %s
        """
        result = await self.db.execute_query(query, (user_id, limit))

        # Parse and enhance results
        for row in result:
            row['recommended_products'] = json.loads(row['recommended_products'])
            row['context'] = json.loads(row['context'])

            # Parse click details
            if row['click_details']:
                clicks = []
                for click_detail in row['click_details'].split(','):
                    product_id, position, clicked_at = click_detail.split(':')
                    clicks.append({
                        'product_id': int(product_id),
                        'position': int(position),
                        'clicked_at': clicked_at
                    })
                row['clicks'] = clicks
            else:
                row['clicks'] = []

        return result

    async def get_popular_recommended_products(self, days: int = 30, limit: int = 20) -> List[Dict[str, Any]]:
        """Get products that are frequently recommended and clicked"""
        query = f"""
        SELECT
            rc.product_id,
            p.name as product_name,
            COUNT(rc.id) as click_count,
            COUNT(DISTINCT rc.user_id) as unique_click_users,
            AVG(rc.position) as avg_position,
            MAX(rc.clicked_at) as last_clicked
        FROM recommendation_clicks rc
        JOIN products p ON rc.product_id = p.id
        WHERE rc.clicked_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
          AND p.status = 'active'
        GROUP BY rc.product_id, p.name
        ORDER BY click_count DESC, unique_click_users DESC
        LIMIT {limit}
        """
        result = await self.db.execute_query(query)
        return result

    async def cleanup_old_recommendations(self, days: int = 90) -> int:
        """Clean up old recommendation data"""
        queries = [
            f"DELETE FROM recommendation_clicks WHERE clicked_at < DATE_SUB(NOW(), INTERVAL {days} DAY)",
            f"DELETE FROM recommendation_results WHERE created_at < DATE_SUB(NOW(), INTERVAL {days} DAY)"
        ]

        total_deleted = 0
        for query in queries:
            try:
                result = await self.db.execute_update(query)
                total_deleted += result
            except Exception as e:
                logger.error(f"Failed to cleanup recommendations: {e}")

        logger.info(f"Cleaned up {total_deleted} old recommendation records")
        return total_deleted

    async def get_recommendation_analytics(self, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """Get comprehensive recommendation analytics"""
        date_filter = ""
        params = []

        if start_date and end_date:
            date_filter = " AND rr.created_at BETWEEN %s AND %s"
            params.extend([start_date, end_date])

        query = f"""
        SELECT
            DATE(rr.created_at) as date,
            rr.algorithm,
            COUNT(DISTINCT rr.id) as recommendations_shown,
            COUNT(DISTINCT rc.id) as clicks,
            COUNT(DISTINCT rr.user_id) as unique_users_reached,
            ROUND(AVG(JSON_LENGTH(rr.recommended_products)), 2) as avg_recommendations_per_user
        FROM recommendation_results rr
        LEFT JOIN recommendation_clicks rc ON rr.id = rc.recommendation_id
        WHERE 1=1 {date_filter}
        GROUP BY DATE(rr.created_at), rr.algorithm
        ORDER BY date DESC, algorithm
        """

        result = await self.db.execute_query(query, tuple(params))

        # Aggregate by algorithm
        algorithm_stats = {}
        for row in result:
            algo = row['algorithm']
            if algo not in algorithm_stats:
                algorithm_stats[algo] = {
                    'total_recommendations': 0,
                    'total_clicks': 0,
                    'total_users': 0,
                    'avg_recommendations_per_user': 0,
                    'dates': []
                }

            algorithm_stats[algo]['total_recommendations'] += row['recommendations_shown']
            algorithm_stats[algo]['total_clicks'] += row['clicks'] or 0
            algorithm_stats[algo]['total_users'] += row['unique_users_reached']
            algorithm_stats[algo]['avg_recommendations_per_user'] += row['avg_recommendations_per_user']
            algorithm_stats[algo]['dates'].append(row['date'].isoformat() if hasattr(row['date'], 'isoformat') else str(row['date']))

        # Calculate rates
        for algo, stats in algorithm_stats.items():
            total_recs = stats['total_recommendations']
            stats['click_rate'] = round(stats['total_clicks'] / total_recs * 100, 2) if total_recs > 0 else 0
            stats['avg_recommendations_per_user'] = round(stats['avg_recommendations_per_user'] / len(stats['dates']), 2) if stats['dates'] else 0

        return {
            'algorithm_performance': algorithm_stats,
            'daily_breakdown': result,
            'summary': {
                'total_recommendations': sum(stats['total_recommendations'] for stats in algorithm_stats.values()),
                'total_clicks': sum(stats['total_clicks'] for stats in algorithm_stats.values()),
                'total_users_reached': sum(stats['total_users'] for stats in algorithm_stats.values()),
                'overall_click_rate': round(
                    sum(stats['total_clicks'] for stats in algorithm_stats.values()) /
                    sum(stats['total_recommendations'] for stats in algorithm_stats.values()) * 100, 2
                ) if sum(stats['total_recommendations'] for stats in algorithm_stats.values()) > 0 else 0
            }
        }