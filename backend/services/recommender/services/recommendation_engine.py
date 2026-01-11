"""
Recommendation Engine
===================

Core recommendation engine that orchestrates different recommendation algorithms.
Provides a unified interface for generating personalized product recommendations.
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import numpy as np

from models.database import DatabaseConnection
from models.user_model import UserModel
from models.product_model import ProductModel
from models.interaction_model import InteractionModel
from models.recommendation_model import RecommendationModel
from services.collaborative_filtering import CollaborativeFiltering
from services.content_based_filtering import ContentBasedFiltering
from services.hybrid_recommender import HybridRecommender
from services.cache_service import CacheService
from utils.config import config

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Main recommendation engine coordinating multiple algorithms"""

    def __init__(self, db: DatabaseConnection, cache: CacheService, config_obj: Any):
        self.db = db
        self.cache = cache
        self.config = config_obj

        # Initialize models
        self.user_model = UserModel(db)
        self.product_model = ProductModel(db)
        self.interaction_model = InteractionModel(db)
        self.recommendation_model = RecommendationModel(db)

        # Initialize algorithms
        self.collaborative_filtering = CollaborativeFiltering()
        self.content_based_filtering = ContentBasedFiltering()
        self.hybrid_recommender = HybridRecommender(
            self.collaborative_filtering,
            self.content_based_filtering,
            config_obj.recommendations.collaborative_weight,
            config_obj.recommendations.content_weight
        )

        # Algorithm registry
        self.algorithms = {
            'collaborative': self.collaborative_filtering,
            'content_based': self.content_based_filtering,
            'hybrid': self.hybrid_recommender
        }

        # Active models
        self.models = {}
        self.last_model_update = None
        self.initialized = False

    async def initialize(self) -> None:
        """Initialize the recommendation engine"""
        try:
            logger.info("🔄 Initializing recommendation engine...")

            # Load or train models
            await self._load_models()

            # Warm up cache with popular items
            await self._warm_cache()

            self.initialized = True
            logger.info("✅ Recommendation engine initialized")

        except Exception as e:
            logger.error(f"❌ Failed to initialize recommendation engine: {e}")
            raise

    async def _load_models(self) -> None:
        """Load or train recommendation models"""
        try:
            # Load interaction data
            interactions_df = await self.interaction_model.get_interactions_dataframe()
            products_df = await self.product_model.get_products_dataframe()
            users_df = await self.user_model.get_users_dataframe()

            if len(interactions_df) == 0:
                logger.warning("⚠️ No interaction data found, using fallback recommendations")
                return

            logger.info(f"📊 Loading models with {len(interactions_df)} interactions, {len(products_df)} products, {len(users_df)} users")

            # Train collaborative filtering model
            await self.collaborative_filtering.train(interactions_df, users_df, products_df)

            # Train content-based filtering model
            await self.content_based_filtering.train(products_df)

            # Initialize hybrid recommender
            await self.hybrid_recommender.initialize()

            self.models = {
                'collaborative': self.collaborative_filtering,
                'content_based': self.content_based_filtering,
                'hybrid': self.hybrid_recommender
            }

            self.last_model_update = datetime.utcnow()
            logger.info(f"✅ Loaded {len(self.models)} recommendation models")

        except Exception as e:
            logger.error(f"❌ Failed to load models: {e}")
            raise

    async def _warm_cache(self) -> None:
        """Warm up cache with popular and trending items"""
        try:
            # Cache popular products
            popular_products = await self.product_model.get_popular_products(limit=100)
            await self.cache.set('popular_products', popular_products, ttl=self.config.recommendations.cache_ttl)

            # Cache trending products
            trending_products = await self.product_model.get_trending_products(limit=100)
            await self.cache.set('trending_products', trending_products, ttl=self.config.recommendations.cache_ttl)

            logger.info("✅ Cache warmed up with popular and trending products")

        except Exception as e:
            logger.error(f"❌ Failed to warm cache: {e}")

    async def get_personalized_recommendations(
        self,
        user_id: int,
        limit: int = None,
        algorithm: str = None,
        exclude_interacted: bool = True
    ) -> Dict[str, Any]:
        """Get personalized recommendations for a user"""
        if not self.initialized:
            return await self._get_fallback_recommendations(limit or self.config.recommendations.max_recommendations)

        limit = limit or self.config.recommendations.max_recommendations
        algorithm = algorithm or self.config.recommendations.default_algorithm

        try:
            # Check cache first
            cache_key = f"personalized:{user_id}:{algorithm}:{limit}"
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                return cached_result

            # Get user interactions
            user_interactions = await self.interaction_model.get_user_interactions(user_id)
            if len(user_interactions) < self.config.recommendations.min_interactions:
                # Use content-based or popular recommendations for new users
                return await self.get_similar_products_to_interacted(user_id, limit)

            # Get recommendations using specified algorithm
            recommender = self.algorithms.get(algorithm)
            if not recommender:
                logger.warning(f"Unknown algorithm: {algorithm}, using hybrid")
                recommender = self.hybrid_recommender

            recommendations = await recommender.recommend(user_id, limit, exclude_interacted)

            # Enhance recommendations with product details
            enhanced_recommendations = await self._enhance_recommendations(recommendations)

            # Cache results
            result = {
                'user_id': user_id,
                'algorithm': algorithm,
                'recommendations': enhanced_recommendations,
                'total': len(enhanced_recommendations),
                'generated_at': datetime.utcnow().isoformat()
            }

            await self.cache.set(cache_key, result, ttl=self.config.recommendations.cache_ttl)

            return result

        except Exception as e:
            logger.error(f"❌ Failed to get personalized recommendations for user {user_id}: {e}")
            return await self._get_fallback_recommendations(limit)

    async def get_similar_products(
        self,
        product_id: int,
        limit: int = None,
        algorithm: str = 'content_based'
    ) -> Dict[str, Any]:
        """Get products similar to a given product"""
        if not self.initialized:
            return await self._get_fallback_similar_products(product_id, limit or 10)

        limit = limit or self.config.recommendations.max_recommendations

        try:
            # Check cache first
            cache_key = f"similar:{product_id}:{algorithm}:{limit}"
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                return cached_result

            # Get similar products
            recommender = self.algorithms.get(algorithm, self.content_based_filtering)
            similar_products = await recommender.get_similar_products(product_id, limit)

            # Enhance with product details
            enhanced_products = await self._enhance_recommendations(similar_products)

            result = {
                'product_id': product_id,
                'algorithm': algorithm,
                'similar_products': enhanced_products,
                'total': len(enhanced_products),
                'generated_at': datetime.utcnow().isoformat()
            }

            await self.cache.set(cache_key, result, ttl=self.config.recommendations.cache_ttl)

            return result

        except Exception as e:
            logger.error(f"❌ Failed to get similar products for {product_id}: {e}")
            return await self._get_fallback_similar_products(product_id, limit)

    async def get_similar_products_to_interacted(
        self,
        user_id: int,
        limit: int = None
    ) -> Dict[str, Any]:
        """Get recommendations based on user's interacted products"""
        limit = limit or self.config.recommendations.max_recommendations

        try:
            # Get user's recently interacted products
            user_products = await self.interaction_model.get_user_recent_products(user_id, limit=5)

            if not user_products:
                return await self.get_trending_products(limit)

            all_similar = []
            for product_id in user_products:
                similar = await self.get_similar_products(product_id, limit=limit//len(user_products) + 1)
                all_similar.extend(similar.get('similar_products', []))

            # Remove duplicates and sort by relevance
            seen = set()
            unique_similar = []
            for product in all_similar:
                if product['id'] not in seen:
                    unique_similar.append(product)
                    seen.add(product['id'])

            # Limit results
            unique_similar = unique_similar[:limit]

            return {
                'user_id': user_id,
                'algorithm': 'content_based_interaction',
                'recommendations': unique_similar,
                'total': len(unique_similar),
                'generated_at': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"❌ Failed to get similar products to interacted for user {user_id}: {e}")
            return await self.get_trending_products(limit)

    async def get_trending_products(self, limit: int = None) -> Dict[str, Any]:
        """Get trending products based on recent interactions"""
        limit = limit or self.config.recommendations.max_recommendations

        try:
            # Check cache first
            cache_key = f"trending:{limit}"
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                return cached_result

            # Get trending products
            trending_products = await self.product_model.get_trending_products(limit=limit)

            # Enhance with product details
            enhanced_products = await self._enhance_recommendations(trending_products)

            result = {
                'algorithm': 'trending',
                'recommendations': enhanced_products,
                'total': len(enhanced_products),
                'generated_at': datetime.utcnow().isoformat()
            }

            await self.cache.set(cache_key, result, ttl=self.config.recommendations.cache_ttl // 4)  # Shorter TTL for trending

            return result

        except Exception as e:
            logger.error(f"❌ Failed to get trending products: {e}")
            return await self._get_fallback_recommendations(limit)

    async def get_popular_products(self, limit: int = None) -> Dict[str, Any]:
        """Get popular products based on overall ratings and sales"""
        limit = limit or self.config.recommendations.max_recommendations

        try:
            # Check cache first
            cache_key = f"popular:{limit}"
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                return cached_result

            # Get popular products
            popular_products = await self.product_model.get_popular_products(limit=limit)

            # Enhance with product details
            enhanced_products = await self._enhance_recommendations(popular_products)

            result = {
                'algorithm': 'popular',
                'recommendations': enhanced_products,
                'total': len(enhanced_products),
                'generated_at': datetime.utcnow().isoformat()
            }

            await self.cache.set(cache_key, result, ttl=self.config.recommendations.cache_ttl)

            return result

        except Exception as e:
            logger.error(f"❌ Failed to get popular products: {e}")
            return await self._get_fallback_recommendations(limit)

    async def _enhance_recommendations(self, recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhance recommendations with full product details"""
        if not recommendations:
            return []

        try:
            product_ids = [r.get('id', r.get('product_id')) for r in recommendations]
            products_details = await self.product_model.get_products_by_ids(product_ids)

            # Create lookup dictionary
            products_dict = {p['id']: p for p in products_details}

            # Enhance recommendations
            enhanced = []
            for rec in recommendations:
                product_id = rec.get('id', rec.get('product_id'))
                product = products_dict.get(product_id)

                if product:
                    enhanced_rec = {
                        **product,
                        **rec,
                        'score': rec.get('score', rec.get('similarity', 0)),
                        'reason': rec.get('reason', 'Recommended for you')
                    }
                    enhanced.append(enhanced_rec)

            return enhanced

        except Exception as e:
            logger.error(f"❌ Failed to enhance recommendations: {e}")
            return recommendations

    async def _get_fallback_recommendations(self, limit: int) -> Dict[str, Any]:
        """Get fallback recommendations when main algorithms fail"""
        logger.warning("🔄 Using fallback recommendations")
        return await self.get_popular_products(limit)

    async def _get_fallback_similar_products(self, product_id: int, limit: int) -> Dict[str, Any]:
        """Get fallback similar products"""
        try:
            # Get products from same category
            product = await self.product_model.get_product_by_id(product_id)
            if product and product.get('category_id'):
                category_products = await self.product_model.get_products_by_category(
                    product['category_id'],
                    limit=limit,
                    exclude_ids=[product_id]
                )
                return {
                    'product_id': product_id,
                    'algorithm': 'category_fallback',
                    'similar_products': category_products,
                    'total': len(category_products),
                    'generated_at': datetime.utcnow().isoformat()
                }
        except Exception as e:
            logger.error(f"❌ Fallback similar products failed: {e}")

        # Ultimate fallback - popular products
        popular = await self.get_popular_products(limit)
        return {
            'product_id': product_id,
            'algorithm': 'popular_fallback',
            'similar_products': popular.get('recommendations', []),
            'total': len(popular.get('recommendations', [])),
            'generated_at': datetime.utcnow().isoformat()
        }

    def is_healthy(self) -> bool:
        """Check if the recommendation engine is healthy"""
        return (
            self.initialized and
            len(self.models) > 0 and
            self.last_model_update is not None
        )

    async def should_update_models(self) -> bool:
        """Check if models should be updated"""
        if not self.last_model_update:
            return True

        time_since_update = datetime.utcnow() - self.last_model_update
        return time_since_update.total_seconds() > self.config.recommendations.model_update_interval

    async def update_models(self) -> None:
        """Update recommendation models with new data"""
        try:
            logger.info("🔄 Updating recommendation models...")

            # Reload models
            await self._load_models()

            # Clear relevant caches
            await self.cache.delete_pattern("personalized:*")
            await self.cache.delete_pattern("similar:*")

            logger.info("✅ Recommendation models updated")

        except Exception as e:
            logger.error(f"❌ Failed to update models: {e}")
            raise

    async def get_metrics(self) -> Dict[str, Any]:
        """Get recommendation engine metrics"""
        return {
            'models_loaded': len(self.models),
            'last_model_update': self.last_model_update.isoformat() if self.last_model_update else None,
            'algorithms': list(self.algorithms.keys()),
            'cache_enabled': True,
            'healthy': self.is_healthy()
        }