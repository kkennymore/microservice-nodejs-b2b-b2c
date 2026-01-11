"""
Database Connection Management
============================

Handles database connections and provides a clean interface for database operations.
Supports connection pooling, health checks, and automatic reconnection.
"""

import logging
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import mysql.connector
from mysql.connector import Error as MySQLError
from mysql.connector.pooling import MySQLConnectionPool
from utils.config import config

logger = logging.getLogger(__name__)


class DatabaseConnection:
    """Database connection manager with connection pooling"""

    def __init__(self, db_config: Dict[str, Any]):
        self.config = db_config
        self.pool: Optional[MySQLConnectionPool] = None
        self.connected = False

    async def connect(self) -> None:
        """Establish database connection pool"""
        try:
            self.pool = MySQLConnectionPool(
                pool_name="recommender_pool",
                pool_size=self.config.get('pool_size', 10),
                host=self.config['host'],
                port=self.config['port'],
                user=self.config['user'],
                password=self.config['password'],
                database=self.config['database'],
                connect_timeout=self.config.get('connect_timeout', 10),
                autocommit=True
            )

            # Test connection
            connection = self.pool.get_connection()
            connection.close()

            self.connected = True
            logger.info(f"✅ Database connected to {self.config['host']}:{self.config['port']}")

        except MySQLError as e:
            logger.error(f"❌ Database connection failed: {e}")
            raise

    async def disconnect(self) -> None:
        """Close database connection pool"""
        if self.pool:
            self.pool._remove_connections()
            self.connected = False
            logger.info("✅ Database disconnected")

    @asynccontextmanager
    async def get_connection(self):
        """Get a database connection from the pool"""
        if not self.connected or not self.pool:
            raise Exception("Database not connected")

        connection = None
        try:
            connection = self.pool.get_connection()
            yield connection
        finally:
            if connection:
                connection.close()

    async def health_check(self) -> bool:
        """Check database health"""
        try:
            async with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                cursor.close()
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

    async def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results"""
        async with self.get_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute(query, params or ())
                results = cursor.fetchall()
                return results
            finally:
                cursor.close()

    async def execute_update(self, query: str, params: tuple = None) -> int:
        """Execute an INSERT/UPDATE/DELETE query and return affected rows"""
        async with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(query, params or ())
                affected_rows = cursor.rowcount
                return affected_rows
            finally:
                cursor.close()

    async def get_user_count(self) -> int:
        """Get total number of active users"""
        result = await self.execute_query("SELECT COUNT(*) as count FROM users WHERE status = 'active'")
        return result[0]['count'] if result else 0

    async def get_product_count(self) -> int:
        """Get total number of active products"""
        result = await self.execute_query("SELECT COUNT(*) as count FROM products WHERE status = 'active'")
        return result[0]['count'] if result else 0

    async def get_interaction_count(self) -> int:
        """Get total number of user-product interactions"""
        result = await self.execute_query("SELECT COUNT(*) as count FROM user_product_interactions")
        return result[0]['count'] if result else 0