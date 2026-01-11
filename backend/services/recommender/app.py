#!/usr/bin/env python3
"""
Recommender Service - AI-Powered Product Recommendations
==============================================

A production-grade recommendation service using machine learning algorithms
to provide personalized product recommendations for the multivendor marketplace.

Features:
- Collaborative filtering recommendations
- Content-based filtering
- Hybrid recommendation engine
- Real-time personalization
- A/B testing support
- Performance monitoring
- Scalable architecture

Architecture follows MVC pattern with SOLID principles.
"""

import os
import sys
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from contextlib import asynccontextmanager

# Third-party imports
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import mysql.connector
from mysql.connector import Error as MySQLError
import redis.asyncio as redis
import aio_pika
import jwt
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import joblib
import tensorflow as tf
from tensorflow import keras

# Local imports
from models.database import DatabaseConnection
from models.user_model import UserModel
from models.product_model import ProductModel
from models.interaction_model import InteractionModel
from models.recommendation_model import RecommendationModel
from services.recommendation_engine import RecommendationEngine
from services.collaborative_filtering import CollaborativeFiltering
from services.content_based_filtering import ContentBasedFiltering
from services.hybrid_recommender import HybridRecommender
from services.model_trainer import ModelTrainer
from services.cache_service import CacheService
from services.metrics_service import MetricsService
from utils.config import Config
from utils.auth import AuthMiddleware
from utils.monitoring import ServiceMonitor
from utils.event_publisher import EventPublisher
from controllers.recommendation_controller import RecommendationController
from routes.recommendation_routes import router as recommendation_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/recommender.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Global instances
config = Config()
db = DatabaseConnection(config.database_config)
cache = CacheService(config.redis_config)
monitor = ServiceMonitor("recommender-service")
auth_middleware = AuthMiddleware(config.jwt_secret)

# Initialize services
recommendation_engine = None
event_publisher = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    global recommendation_engine, event_publisher

    logger.info("🚀 Starting Recommender Service...")

    try:
        # Initialize database connection
        await db.connect()
        logger.info("✅ Database connected")

        # Initialize Redis cache
        await cache.connect()
        logger.info("✅ Redis cache connected")

        # Initialize RabbitMQ connection
        connection = await aio_pika.connect_robust(config.rabbitmq_url)
        channel = await connection.channel()
        event_publisher = EventPublisher(channel)
        logger.info("✅ Message queue connected")

        # Initialize recommendation engine
        recommendation_engine = RecommendationEngine(
            db=db,
            cache=cache,
            config=config
        )
        await recommendation_engine.initialize()
        logger.info("✅ Recommendation engine initialized")

        # Start background tasks
        asyncio.create_task(monitor_health())
        asyncio.create_task(update_models_periodically())

        logger.info("🎯 Recommender Service started successfully")
        logger.info(f"📊 Models loaded: {len(recommendation_engine.models)}")
        logger.info(f"👥 Active users: {await db.get_user_count()}")
        logger.info(f"📦 Active products: {await db.get_product_count()}")

        yield

    except Exception as e:
        logger.error(f"❌ Failed to start service: {e}")
        raise
    finally:
        # Cleanup
        logger.info("🛑 Shutting down Recommender Service...")
        await db.disconnect()
        await cache.disconnect()
        if event_publisher:
            await event_publisher.close()
        logger.info("✅ Service shut down gracefully")

# Create FastAPI application
app = FastAPI(
    title="Recommender Service API",
    description="AI-Powered Product Recommendation Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add authentication middleware
app.middleware("http")(auth_middleware.authenticate_request)

# Include routers
app.include_router(recommendation_router, prefix="/api/recommendations", tags=["recommendations"])

# Health check endpoint
@app.get("/health")
async def health_check():
    """Service health check endpoint"""
    try:
        # Check database
        db_health = await db.health_check()

        # Check Redis
        redis_health = await cache.health_check()

        # Check recommendation engine
        engine_health = recommendation_engine.is_healthy() if recommendation_engine else False

        health_status = {
            "service": "recommender",
            "status": "healthy" if all([db_health, redis_health, engine_health]) else "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "checks": {
                "database": "healthy" if db_health else "unhealthy",
                "redis": "healthy" if redis_health else "unhealthy",
                "recommendation_engine": "healthy" if engine_health else "unhealthy"
            }
        }

        if recommendation_engine:
            health_status["metrics"] = {
                "models_loaded": len(recommendation_engine.models),
                "active_users": await db.get_user_count(),
                "active_products": await db.get_product_count(),
                "recommendations_served": monitor.get_metric("recommendations_served", 0)
            }

        status_code = 200 if health_status["status"] == "healthy" else 503
        return health_status

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

# Metrics endpoint
@app.get("/metrics")
async def get_metrics():
    """Service metrics endpoint"""
    return monitor.get_detailed_metrics()

# API documentation endpoint
@app.get("/api/docs")
async def get_api_docs():
    """API documentation endpoint"""
    return {
        "title": "Recommender Service API",
        "version": "1.0.0",
        "description": "AI-Powered Product Recommendation Engine for Multivendor Marketplace",
        "endpoints": {
            "recommendations": "/api/recommendations/*",
            "personalized": "/api/recommendations/personalized",
            "similar_products": "/api/recommendations/similar/{product_id}",
            "trending": "/api/recommendations/trending",
            "user_based": "/api/recommendations/user/{user_id}",
            "category_based": "/api/recommendations/category/{category_id}",
            "train": "/api/recommendations/train",
            "performance": "/api/recommendations/performance"
        },
        "features": [
            "Collaborative filtering recommendations",
            "Content-based product similarity",
            "Hybrid recommendation engine",
            "Real-time personalization",
            "A/B testing support",
            "Model performance monitoring",
            "Scalable architecture",
            "Multi-algorithm support"
        ],
        "algorithms": [
            "Matrix Factorization (SVD)",
            "K-Nearest Neighbors",
            "Neural Collaborative Filtering",
            "Content-Based Filtering",
            "Hybrid Approaches"
        ],
        "supported_metrics": [
            "Precision@K",
            "Recall@K",
            "NDCG",
            "Mean Average Precision",
            "Coverage",
            "Diversity"
        ]
    }

# Background tasks
async def monitor_health():
    """Periodic health monitoring"""
    while True:
        try:
            # Update service metrics
            metrics = await recommendation_engine.get_metrics() if recommendation_engine else {}
            monitor.update_metrics(metrics)

            # Publish health events
            if event_publisher:
                await event_publisher.publish_event("service.health", {
                    "service": "recommender",
                    "status": "healthy",
                    "metrics": metrics,
                    "timestamp": datetime.utcnow().isoformat()
                })

        except Exception as e:
            logger.error(f"Health monitoring error: {e}")

        await asyncio.sleep(60)  # Check every minute

async def update_models_periodically():
    """Periodic model updates"""
    while True:
        try:
            if recommendation_engine:
                # Check if models need updating
                if await recommendation_engine.should_update_models():
                    logger.info("🔄 Updating recommendation models...")
                    await recommendation_engine.update_models()

                    # Publish model update event
                    if event_publisher:
                        await event_publisher.publish_event("models.updated", {
                            "service": "recommender",
                            "timestamp": datetime.utcnow().isoformat(),
                            "models_updated": len(recommendation_engine.models)
                        })

        except Exception as e:
            logger.error(f"Model update error: {e}")

        await asyncio.sleep(3600)  # Check every hour

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    monitor.increment_counter("http_errors")
    return {
        "success": False,
        "message": exc.detail,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    monitor.increment_counter("unhandled_errors")
    return {
        "success": False,
        "message": "Internal server error",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    # Create logs directory
    os.makedirs("logs", exist_ok=True)

    # Start server
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("RECOMMENDER_PORT", "3011")),
        reload=config.debug,
        log_level="info"
    )