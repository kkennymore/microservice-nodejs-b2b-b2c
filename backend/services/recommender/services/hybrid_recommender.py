"""
Hybrid Recommender - Combines multiple recommendation algorithms
===============================================================

Implements hybrid approaches combining collaborative filtering,
content-based filtering, and other techniques for optimal recommendations.
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


class HybridRecommender:
    """Hybrid recommendation engine combining multiple algorithms"""

    def __init__(self, collaborative_filtering, content_based_filtering,
                 cf_weight: float = 0.6, cb_weight: float = 0.4):
        self.cf = collaborative_filtering
        self.cb = content_based_filtering
        self.cf_weight = cf_weight
        self.cb_weight = cb_weight
        self.is_initialized = False

    async def initialize(self) -> None:
        """Initialize the hybrid recommender"""
        try:
            if not (self.cf.is_trained and self.cb.is_trained):
                logger.warning("⚠️ Both CF and CB models should be trained for hybrid approach")
                return

            self.is_initialized = True
            logger.info("✅ Hybrid recommender initialized")

        except Exception as e:
            logger.error(f"Failed to initialize hybrid recommender: {e}")
            raise

    async def recommend(self, user_id: int, n_recommendations: int = 10,
                       exclude_interacted: bool = True) -> List[Dict[str, Any]]:
        """Generate hybrid recommendations for a user"""
        if not self.is_initialized:
            logger.warning("Hybrid recommender not initialized")
            # Fallback to collaborative filtering
            return await self.cf.recommend(user_id, n_recommendations, exclude_interacted)

        try:
            # Get recommendations from both algorithms
            cf_recs = await self.cf.recommend(user_id, n_recommendations * 2, exclude_interacted)
            cb_recs = await self._get_content_based_for_user(user_id, n_recommendations * 2)

            # Combine and score recommendations
            combined_recs = self._combine_recommendations(cf_recs, cb_recs)

            # Sort by combined score and return top N
            combined_recs.sort(key=lambda x: x['score'], reverse=True)

            # Remove duplicates while preserving order
            seen_products = set()
            unique_recs = []

            for rec in combined_recs:
                if rec['product_id'] not in seen_products:
                    unique_recs.append(rec)
                    seen_products.add(rec['product_id'])
                    if len(unique_recs) >= n_recommendations:
                        break

            return unique_recs

        except Exception as e:
            logger.error(f"Failed to generate hybrid recommendations for user {user_id}: {e}")
            # Fallback to collaborative filtering
            return await self.cf.recommend(user_id, n_recommendations, exclude_interacted)

    async def _get_content_based_for_user(self, user_id: int, n_recommendations: int) -> List[Dict[str, Any]]:
        """Get content-based recommendations for a user based on their interaction history"""
        try:
            # This is a simplified implementation
            # In practice, you'd build a user profile from their interactions
            # and find products similar to their preferences

            # For now, return empty list - this would be enhanced with user profiling
            return []

        except Exception as e:
            logger.error(f"Failed to get content-based recommendations for user {user_id}: {e}")
            return []

    def _combine_recommendations(self, cf_recs: List[Dict[str, Any]],
                               cb_recs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Combine recommendations from different algorithms"""
        try:
            # Create a dictionary to combine scores
            product_scores = defaultdict(lambda: {'cf_score': 0, 'cb_score': 0, 'count': 0})

            # Add collaborative filtering scores
            for rec in cf_recs:
                product_id = rec['product_id']
                product_scores[product_id]['cf_score'] = rec.get('score', 0)
                product_scores[product_id]['count'] += 1

            # Add content-based scores
            for rec in cb_recs:
                product_id = rec['product_id']
                product_scores[product_id]['cb_score'] = rec.get('similarity', 0)
                product_scores[product_id]['count'] += 1

            # Calculate combined scores
            combined_recommendations = []
            for product_id, scores in product_scores.items():
                combined_score = (
                    self.cf_weight * scores['cf_score'] +
                    self.cb_weight * scores['cb_score']
                )

                combined_recommendations.append({
                    'product_id': product_id,
                    'score': combined_score,
                    'cf_score': scores['cf_score'],
                    'cb_score': scores['cb_score'],
                    'method': 'hybrid',
                    'confidence': min(scores['count'] / 2.0, 1.0)  # Higher confidence if both algorithms agree
                })

            return combined_recommendations

        except Exception as e:
            logger.error(f"Failed to combine recommendations: {e}")
            return cf_recs  # Fallback to CF recommendations

    async def get_similar_products(self, product_id: int, n_similar: int = 10) -> List[Dict[str, Any]]:
        """Get products similar to the given product using hybrid approach"""
        if not self.is_initialized:
            # Fallback to content-based filtering
            return await self.cb.get_similar_products(product_id, n_similar)

        try:
            # Get similar products from content-based filtering
            cb_similar = await self.cb.get_similar_products(product_id, n_similar * 2)

            # Get similar products from collaborative filtering
            cf_similar = await self.cf.get_similar_products(product_id, n_similar * 2)

            # Combine results
            combined_similar = self._combine_similar_products(cb_similar, cf_similar)

            # Sort by combined similarity and return top N
            combined_similar.sort(key=lambda x: x['combined_similarity'], reverse=True)

            return combined_similar[:n_similar]

        except Exception as e:
            logger.error(f"Failed to get hybrid similar products for {product_id}: {e}")
            return await self.cb.get_similar_products(product_id, n_similar)

    def _combine_similar_products(self, cb_similar: List[Dict[str, Any]],
                                cf_similar: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Combine similar products from different algorithms"""
        try:
            product_similarities = defaultdict(lambda: {'cb_similarity': 0, 'cf_similarity': 0})

            # Add content-based similarities
            for rec in cb_similar:
                product_id = rec['product_id']
                product_similarities[product_id]['cb_similarity'] = rec.get('similarity', 0)

            # Add collaborative similarities
            for rec in cf_similar:
                product_id = rec['product_id']
                product_similarities[product_id]['cf_similarity'] = rec.get('similarity', 0)

            # Calculate combined similarities
            combined_similar = []
            for product_id, similarities in product_similarities.items():
                combined_similarity = (
                    self.cb_weight * similarities['cb_similarity'] +
                    self.cf_weight * similarities['cf_similarity']
                )

                combined_similar.append({
                    'product_id': product_id,
                    'combined_similarity': combined_similarity,
                    'cb_similarity': similarities['cb_similarity'],
                    'cf_similarity': similarities['cf_similarity'],
                    'method': 'hybrid_similarity'
                })

            return combined_similar

        except Exception as e:
            logger.error(f"Failed to combine similar products: {e}")
            return cb_similar

    def get_algorithm_weights(self) -> Dict[str, float]:
        """Get current algorithm weights"""
        return {
            'collaborative_filtering': self.cf_weight,
            'content_based_filtering': self.cb_weight
        }

    def update_weights(self, cf_weight: float, cb_weight: float) -> bool:
        """Update algorithm weights"""
        try:
            if not (0 <= cf_weight <= 1 and 0 <= cb_weight <= 1):
                logger.error("Weights must be between 0 and 1")
                return False

            if abs(cf_weight + cb_weight - 1.0) > 0.001:
                logger.error("Weights must sum to 1.0")
                return False

            self.cf_weight = cf_weight
            self.cb_weight = cb_weight

            logger.info(f"✅ Updated hybrid weights: CF={cf_weight}, CB={cb_weight}")
            return True

        except Exception as e:
            logger.error(f"Failed to update weights: {e}")
            return False

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for the hybrid approach"""
        return {
            'is_initialized': self.is_initialized,
            'algorithm_weights': self.get_algorithm_weights(),
            'cf_model_stats': self.cf.get_model_stats() if hasattr(self.cf, 'get_model_stats') else {},
            'cb_model_stats': self.cb.get_model_stats() if hasattr(self.cb, 'get_model_stats') else {}
        }