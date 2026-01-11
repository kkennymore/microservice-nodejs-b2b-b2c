"""
Cache Service - Redis-based caching for recommendation system
============================================================

Provides high-performance caching for recommendation results and model data.
"""

import logging
import json
import redis.asyncio as redis
from typing import Any, Optional, Dict
from datetime import timedelta

logger = logging.getLogger(__name__)


class CacheService:
    """Redis-based caching service"""

    def __init__(self, redis_config: Dict[str, Any]):
        self.config = redis_config
        self.redis: Optional[redis.Redis] = None
        self.connected = False

    async def connect(self) -> None:
        """Connect to Redis"""
        try:
            self.redis = redis.Redis(
                host=self.config['host'],
                port=self.config['port'],
                password=self.config.get('password'),
                db=self.config.get('db', 0),
                max_connections=self.config.get('max_connections', 20),
                decode_responses=True
            )

            # Test connection
            await self.redis.ping()
            self.connected = True
            logger.info(f"✅ Redis cache connected to {self.config['host']}:{self.config['port']}")

        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            raise

    async def disconnect(self) -> None:
        """Disconnect from Redis"""
        if self.redis:
            await self.redis.close()
            self.connected = False
            logger.info("✅ Redis cache disconnected")

    async def health_check(self) -> bool:
        """Check Redis health"""
        try:
            if not self.connected or not self.redis:
                return False
            await self.redis.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if not self.connected or not self.redis:
                return None

            value = await self.redis.get(key)
            if value:
                return json.loads(value)
            return None

        except Exception as e:
            logger.error(f"Failed to get cache key {key}: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache"""
        try:
            if not self.connected or not self.redis:
                return False

            json_value = json.dumps(value)
            if ttl:
                await self.redis.setex(key, ttl, json_value)
            else:
                await self.redis.set(key, json_value)
            return True

        except Exception as e:
            logger.error(f"Failed to set cache key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            if not self.connected or not self.redis:
                return False

            await self.redis.delete(key)
            return True

        except Exception as e:
            logger.error(f"Failed to delete cache key {key}: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete keys matching pattern"""
        try:
            if not self.connected or not self.redis:
                return 0

            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
            return len(keys)

        except Exception as e:
            logger.error(f"Failed to delete cache pattern {pattern}: {e}")
            return 0

    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            if not self.connected or not self.redis:
                return False

            return await self.redis.exists(key) > 0

        except Exception as e:
            logger.error(f"Failed to check cache key {key}: {e}")
            return False

    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter"""
        try:
            if not self.connected or not self.redis:
                return None

            return await self.redis.incrby(key, amount)

        except Exception as e:
            logger.error(f"Failed to increment cache key {key}: {e}")
            return None

    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration time for key"""
        try:
            if not self.connected or not self.redis:
                return False

            return await self.redis.expire(key, ttl)

        except Exception as e:
            logger.error(f"Failed to set expiration for cache key {key}: {e}")
            return False

    async def get_ttl(self, key: str) -> Optional[int]:
        """Get time-to-live for key"""
        try:
            if not self.connected or not self.redis:
                return None

            return await self.redis.ttl(key)

        except Exception as e:
            logger.error(f"Failed to get TTL for cache key {key}: {e}")
            return None

    # Recommendation-specific cache methods
    async def cache_recommendations(self, user_id: int, recommendations: Dict[str, Any],
                                  ttl: int = None) -> bool:
        """Cache user recommendations"""
        if ttl is None:
            ttl = 3600  # 1 hour default
        key = f"recommendations:{user_id}"
        return await self.set(key, recommendations, ttl)

    async def get_cached_recommendations(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get cached user recommendations"""
        key = f"recommendations:{user_id}"
        return await self.get(key)

    async def cache_similar_products(self, product_id: int, similar_products: List[Dict[str, Any]],
                                   ttl: int = None) -> bool:
        """Cache similar products"""
        if ttl is None:
            ttl = 7200  # 2 hours default
        key = f"similar:{product_id}"
        return await self.set(key, similar_products, ttl)

    async def get_cached_similar_products(self, product_id: int) -> Optional[List[Dict[str, Any]]]:
        """Get cached similar products"""
        key = f"similar:{product_id}"
        return await self.get(key)

    async def invalidate_user_cache(self, user_id: int) -> bool:
        """Invalidate all cache entries for a user"""
        try:
            pattern = f"recommendations:{user_id}"
            deleted = await self.delete_pattern(pattern)
            logger.info(f"Invalidated {deleted} cache entries for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to invalidate user cache for {user_id}: {e}")
            return False

    async def invalidate_product_cache(self, product_id: int) -> bool:
        """Invalidate all cache entries for a product"""
        try:
            pattern = f"similar:{product_id}"
            deleted = await self.delete_pattern(pattern)
            logger.info(f"Invalidated {deleted} cache entries for product {product_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to invalidate product cache for {product_id}: {e}")
            return False

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            if not self.connected or not self.redis:
                return {'status': 'disconnected'}

            info = await self.redis.info()
            return {
                'status': 'connected',
                'used_memory': info.get('used_memory_human', 'unknown'),
                'connected_clients': info.get('connected_clients', 0),
                'total_keys': await self.redis.dbsize(),
                'uptime_days': info.get('uptime_in_days', 0)
            }

        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {'status': 'error', 'error': str(e)}