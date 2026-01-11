"""
Recommendation Routes - FastAPI routes for recommendation endpoints
===================================================================

Defines all API endpoints for the recommendation service.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from controllers.recommendation_controller import (
    RecommendationController,
    get_recommendation_controller,
    RecommendationResponse,
    SimilarProductsResponse
)

router = APIRouter()

# Personalized recommendations
@router.get("/personalized", response_model=RecommendationResponse)
async def get_personalized_recommendations(
    user_id: int = Query(..., description="User ID for recommendations"),
    limit: int = Query(10, ge=1, le=50, description="Number of recommendations"),
    algorithm: str = Query("hybrid", description="Recommendation algorithm"),
    exclude_interacted: bool = Query(True, description="Exclude already interacted products"),
    controller: RecommendationController = Depends(get_recommendation_controller)
):
    """Get personalized product recommendations for a user"""
    return await controller.get_personalized_recommendations(
        user_id=user_id,
        limit=limit,
        algorithm=algorithm,
        exclude_interacted=exclude_interacted
    )

# Similar products
@router.get("/similar/{product_id}", response_model=SimilarProductsResponse)
async def get_similar_products(
    product_id: int,
    limit: int = Query(10, ge=1, le=50, description="Number of similar products"),
    algorithm: str = Query("content_based", description="Similarity algorithm"),
    controller: RecommendationController = Depends(get_recommendation_controller)
):
    """Get products similar to a given product"""
    return await controller.get_similar_products(
        product_id=product_id,
        limit=limit,
        algorithm=algorithm
    )

# Trending products
@router.get("/trending", response_model=RecommendationResponse)
async def get_trending_products(
    limit: int = Query(20, ge=1, le=50, description="Number of trending products"),
    controller: RecommendationController = Depends(get_recommendation_controller)
):
    """Get trending products based on recent activity"""
    return await controller.get_trending_products(limit=limit)

# Popular products
@router.get("/popular", response_model=RecommendationResponse)
async def get_popular_products(
    limit: int = Query(20, ge=1, le=50, description="Number of popular products"),
    controller: RecommendationController = Depends(get_recommendation_controller)
):
    """Get popular products based on ratings and sales"""
    return await controller.get_popular_products(limit=limit)

# User-based recommendations
@router.get("/user/{user_id}", response_model=RecommendationResponse)
async def get_user_recommendations(
    user_id: int,
    limit: int = Query(10, ge=1, le=50, description="Number of recommendations"),
    algorithm: str = Query("hybrid", description="Recommendation algorithm"),
    controller: RecommendationController = Depends(get_recommendation_controller)
):
    """Get recommendations for a specific user (alias for personalized)"""
    return await controller.get_personalized_recommendations(
        user_id=user_id,
        limit=limit,
        algorithm=algorithm
    )

# Category-based recommendations
@router.get("/category/{category_id}")
async def get_category_recommendations(
    category_id: int,
    limit: int = Query(20, ge=1, le=50, description="Number of recommendations"),
    controller: RecommendationController = Depends(get_recommendation_controller)
):
    """Get popular products from a specific category"""
    # This would be implemented to get category-specific recommendations
    # For now, return trending products as placeholder
    return await controller.get_trending_products(limit=limit)

# Model training and management (admin endpoints)
@router.post("/train")
async def train_models(
    controller: RecommendationController = Depends(get_recommendation_controller)
):
    """Trigger model retraining (admin only)"""
    # In production, add authentication check here
    return await controller.retrain_models()

# Performance monitoring
@router.get("/performance")
async def get_model_performance(
    controller: RecommendationController = Depends(get_recommendation_controller)
):
    """Get model performance metrics"""
    return await controller.get_model_performance()

# Health check for recommendations
@router.get("/health")
async def recommendation_health(
    controller: RecommendationController = Depends(get_recommendation_controller)
):
    """Check if recommendation service is healthy"""
    try:
        # Simple health check - try to get a small recommendation
        if controller and hasattr(controller, 'engine') and controller.engine:
            is_healthy = controller.engine.is_healthy()
            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "service": "recommendation-engine",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return {
                "status": "unhealthy",
                "service": "recommendation-engine",
                "message": "Engine not initialized",
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "recommendation-engine",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }