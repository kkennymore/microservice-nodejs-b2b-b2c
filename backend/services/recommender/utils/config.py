"""
Configuration Management
=======================

Centralized configuration management for the recommender service.
Loads settings from environment variables and provides typed configuration.
"""

import os
from typing import List, Dict, Any
from pydantic_settings import BaseSettings
from pydantic import Field


class DatabaseConfig(BaseSettings):
    """Database configuration settings"""

    host: str = Field(default="mysql", env="DB_HOST")
    port: int = Field(default=3306, env="DB_PORT")
    user: str = Field(default="marketplace", env="DB_USER")
    password: str = Field(default="marketplace123", env="DB_PASSWORD")
    database: str = Field(default="fenap_marketplace", env="DB_NAME")
    pool_size: int = Field(default=10, env="DB_POOL_SIZE")
    connect_timeout: int = Field(default=10, env="DB_CONNECT_TIMEOUT")


class RedisConfig(BaseSettings):
    """Redis configuration settings"""

    host: str = Field(default="redis", env="REDIS_HOST")
    port: int = Field(default=6379, env="REDIS_PORT")
    password: str = Field(default="", env="REDIS_PASSWORD")
    db: int = Field(default=0, env="REDIS_DB")
    max_connections: int = Field(default=20, env="REDIS_MAX_CONNECTIONS")


class RabbitMQConfig(BaseSettings):
    """RabbitMQ configuration settings"""

    url: str = Field(default="amqp://admin:admin123@rabbitmq:5672/marketplace", env="RABBITMQ_URL")
    exchange: str = Field(default="marketplace.events", env="RABBITMQ_EXCHANGE")


class RecommendationConfig(BaseSettings):
    """Recommendation engine configuration"""

    default_algorithm: str = Field(default="hybrid", env="DEFAULT_ALGORITHM")
    cache_ttl: int = Field(default=3600, env="CACHE_TTL")  # 1 hour
    min_interactions: int = Field(default=5, env="MIN_INTERACTIONS")
    max_recommendations: int = Field(default=20, env="MAX_RECOMMENDATIONS")
    similarity_threshold: float = Field(default=0.1, env="SIMILARITY_THRESHOLD")
    model_update_interval: int = Field(default=3600, env="MODEL_UPDATE_INTERVAL")  # 1 hour

    # Algorithm weights for hybrid approach
    collaborative_weight: float = Field(default=0.6, env="COLLABORATIVE_WEIGHT")
    content_weight: float = Field(default=0.4, env="CONTENT_WEIGHT")

    # Neural network configuration
    embedding_dim: int = Field(default=64, env="EMBEDDING_DIM")
    hidden_layers: List[int] = Field(default=[128, 64, 32], env="HIDDEN_LAYERS")
    learning_rate: float = Field(default=0.001, env="LEARNING_RATE")
    batch_size: int = Field(default=256, env="BATCH_SIZE")
    epochs: int = Field(default=50, env="EPOCHS")


class Config(BaseSettings):
    """Main configuration class"""

    # Service configuration
    service_name: str = "recommender-service"
    version: str = "1.0.0"
    port: int = Field(default=3011, env="RECOMMENDER_PORT")
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="production", env="NODE_ENV")

    # Authentication
    jwt_secret: str = Field(default="your-secret-key", env="JWT_SECRET")

    # CORS
    cors_origins: List[str] = Field(default=["http://localhost:3000", "https://marketplace.example.com"], env="CORS_ORIGINS")

    # External service URLs
    auth_service_url: str = Field(default="http://localhost:3001", env="AUTH_SERVICE_URL")
    products_service_url: str = Field(default="http://localhost:3002", env="PRODUCTS_SERVICE_URL")
    analytics_service_url: str = Field(default="http://localhost:3009", env="ANALYTICS_SERVICE_URL")

    # Component configurations
    database: DatabaseConfig = DatabaseConfig()
    redis: RedisConfig = RedisConfig()
    rabbitmq: RabbitMQConfig = RabbitMQConfig()
    recommendations: RecommendationConfig = RecommendationConfig()

    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: str = Field(default="logs/recommender.log", env="LOG_FILE")

    # Model storage
    model_dir: str = Field(default="models/", env="MODEL_DIR")
    data_dir: str = Field(default="data/", env="DATA_DIR")

    class Config:
        env_file = ".env"
        case_sensitive = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure directories exist
        os.makedirs(self.model_dir, exist_ok=True)
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)

    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment.lower() == "development"


# Global configuration instance
config = Config()