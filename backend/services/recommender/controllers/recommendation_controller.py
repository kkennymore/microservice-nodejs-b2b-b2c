"""
Recommendation Controller - API endpoints for recommendation service
====================================================================

Handles HTTP requests and responses for the recommendation API.
"""

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.recommendation_engine import RecommendationEngine
from utils.monitoring import request_timer, ServiceMonitor

logger = logging.getLogger(__name__)

# Initialize monitor (would be injected in production)
monitor = ServiceMonitor("recommender-controller")

# Pydantic models for request/response validation
class RecommendationRequest(BaseModel):
    user_id: int = Field(..., description="User ID for recommendations")
    limit: int = Field(10, ge=1, le=50, description="Number of recommendations")
    algorithm: str = Field("hybrid", description="Recommendation algorithm")
    exclude_interacted: bool = Field(True, description="Exclude already interacted products")

class SimilarProductsRequest(BaseModel):
    product_id: int = Field(..., description="Product ID to find similar products for")
    limit: int = Field(10, ge=1, le=50, description="Number of similar products")
    algorithm: str = Field("content_based", description="Similarity algorithm")

class RecommendationResponse(BaseModel):
    user_id: Optional[int]
    algorithm: str
    recommendations: List[Dict[str, Any]]
    total: int
    generated_at: str

class SimilarProductsResponse(BaseModel):
    product_id: int
    algorithm: str
    similar_products: List[Dict[str, Any]]
    total: int
    generated_at: str

class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    timestamp: str


class RecommendationController:
    """Controller for recommendation endpoints"""

    def __init__(self, recommendation_engine: RecommendationEngine):
        self.engine = recommendation_engine

    @request_timer(monitor)
    async def get_personalized_recommendations(
        self,
        user_id: int,
        limit: int = 10,
        algorithm: str = "hybrid",
        exclude_interacted: bool = True
    ) -> RecommendationResponse:
        """Get personalized recommendations for a user"""
        try:
            if not self.engine or not self.engine.is_healthy():
                raise HTTPException(status_code=503, detail="Recommendation service unavailable")

            result = await self.engine.get_personalized_recommendations(
                user_id=user_id,
                limit=limit,
                algorithm=algorithm,
                exclude_interacted=exclude_interacted
            )

            if not result.get('success', False):
                raise HTTPException(status_code=400, detail=result.get('message', 'Recommendation failed'))

            return RecommendationResponse(**result)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting personalized recommendations for user {user_id}: {e}")
            monitor.increment_counter("personalized_recommendations_error")
            raise HTTPException(status_code=500, detail="Internal server error")

    @request_timer(monitor)
    async def get_similar_products(
        self,
        product_id: int,
        limit: int = 10,
        algorithm: str = "content_based"
    ) -> SimilarProductsResponse:
        """Get products similar to a given product"""
        try:
            if not self.engine or not self.engine.is_healthy():
                raise HTTPException(status_code=503, detail="Recommendation service unavailable")

            result = await self.engine.get_similar_products(
                product_id=product_id,
                n_similar=limit
            )

            return SimilarProductsResponse(
                product_id=product_id,
                algorithm=algorithm,
                similar_products=result,
                total=len(result),
                generated_at=datetime.utcnow().isoformat()
            )

        except Exception as e:
            logger.error(f"Error getting similar products for {product_id}: {e}")
            monitor.increment_counter("similar_products_error")
            raise HTTPException(status_code=500, detail="Internal server error")

    @request_timer(monitor)
    async def get_trending_products(self, limit: int = 20) -> RecommendationResponse:
        """Get trending products"""
        try:
            if not self.engine or not self.engine.is_healthy():
                raise HTTPException(status_code=503, detail="Recommendation service unavailable")

            result = await self.engine.get_trending_products(limit=limit)

            return RecommendationResponse(
                user_id=None,
                algorithm="trending",
                recommendations=result.get('recommendations', []),
                total=result.get('total', 0),
                generated_at=result.get('generated_at', datetime.utcnow().isoformat())
            )

        except Exception as e:
            logger.error(f"Error getting trending products: {e}")
            monitor.increment_counter("trending_products_error")
            raise HTTPException(status_code=500, detail="Internal server error")

    @request_timer(monitor)
    async def get_popular_products(self, limit: int = 20) -> RecommendationResponse:
        """Get popular products"""
        try:
            if not self.engine or not self.engine.is_healthy():
                raise HTTPException(status_code=503, detail="Recommendation service unavailable")

            result = await self.engine.get_popular_products(limit=limit)

            return RecommendationResponse(
                user_id=None,
                algorithm="popular",
                recommendations=result.get('recommendations', []),
                total=result.get('total', 0),
                generated_at=result.get('generated_at', datetime.utcnow().isoformat())
            )

        except Exception as e:
            logger.error(f"Error getting popular products: {e}")
            monitor.increment_counter("popular_products_error")
            raise HTTPException(status_code=500, detail="Internal server error")

    @request_timer(monitor)
    async def get_model_performance(self) -> Dict[str, Any]:
        """Get model performance metrics"""
        try:
            if not self.engine:
                raise HTTPException(status_code=503, detail="Recommendation service unavailable")

            metrics = await self.engine.get_metrics()
            return {
                "success": True,
                "metrics": metrics,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting model performance: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")

    @request_timer(monitor)
    async def retrain_models(self) -> Dict[str, Any]:
        """Trigger model retraining (admin only)"""
        try:
            if not self.engine:
                raise HTTPException(status_code=503, detail="Recommendation service unavailable")

            # In production, this would be an async background task
            await self.engine.update_models()

            return {
                "success": True,
                "message": "Model retraining initiated",
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error retraining models: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")


# Global controller instance (would be dependency injected in production)
controller = None

def get_recommendation_controller() -> RecommendationController:
    """Dependency injection for controller"""
    if controller is None:
        raise HTTPException(status_code=503, detail="Controller not initialized")
    return controller

def set_controller(rec_engine: RecommendationEngine) -> None:
    """Set the global controller instance"""
    global controller
    controller = RecommendationController(rec_engine)