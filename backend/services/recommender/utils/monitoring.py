"""
Monitoring Utilities - Service monitoring and metrics
====================================================

Provides monitoring, logging, and metrics collection for the recommender service.
"""

import logging
import time
import os
from typing import Dict, Any, Optional
from collections import defaultdict
from datetime import datetime

logger = logging.getLogger(__name__)


class ServiceMonitor:
    """Service monitoring and metrics collection"""

    def __init__(self, service_name: str):
        self.service_name = service_name
        self.start_time = time.time()
        self.counters = defaultdict(int)
        self.timers = defaultdict(list)
        self.gauges = {}

    def increment_counter(self, name: str, value: int = 1) -> None:
        """Increment a counter metric"""
        self.counters[name] += value

    def record_timer(self, name: str, duration: float) -> None:
        """Record a timing metric"""
        self.timers[name].append(duration)

    def set_gauge(self, name: str, value: Any) -> None:
        """Set a gauge metric"""
        self.gauges[name] = value

    def get_metric(self, name: str, default: Any = 0) -> Any:
        """Get a metric value"""
        if name in self.counters:
            return self.counters[name]
        elif name in self.gauges:
            return self.gauges[name]
        elif name in self.timers:
            return sum(self.timers[name]) / len(self.timers[name]) if self.timers[name] else 0
        return default

    def update_metrics(self, metrics: Dict[str, Any]) -> None:
        """Update metrics from external source"""
        for key, value in metrics.items():
            if isinstance(value, (int, float)):
                self.set_gauge(key, value)
            elif isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    self.set_gauge(f"{key}_{sub_key}", sub_value)

    def get_detailed_metrics(self) -> Dict[str, Any]:
        """Get detailed metrics report"""
        uptime = time.time() - self.start_time

        return {
            'service': self.service_name,
            'uptime_seconds': uptime,
            'counters': dict(self.counters),
            'gauges': dict(self.gauges),
            'timers': {name: {
                'count': len(times),
                'avg': sum(times) / len(times) if times else 0,
                'min': min(times) if times else 0,
                'max': max(times) if times else 0
            } for name, times in self.timers.items()},
            'timestamp': datetime.utcnow().isoformat()
        }


class RequestTimer:
    """Request timing middleware"""

    def __init__(self, monitor: ServiceMonitor):
        self.monitor = monitor

    def __call__(self, name: str = "request"):
        def decorator(func):
            async def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = await func(*args, **kwargs)
                    duration = time.time() - start_time
                    self.monitor.record_timer(f"{name}_duration", duration)
                    self.monitor.increment_counter(f"{name}_success")
                    return result
                except Exception as e:
                    duration = time.time() - start_time
                    self.monitor.record_timer(f"{name}_duration", duration)
                    self.monitor.increment_counter(f"{name}_error")
                    raise e
            return wrapper
        return decorator


def request_timer(monitor: ServiceMonitor):
    """Create request timer decorator"""
    return RequestTimer(monitor)


def error_tracker(monitor: ServiceMonitor):
    """Error tracking middleware"""
    def middleware(func):
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                monitor.increment_counter("errors_total")
                monitor.set_gauge("last_error", str(e))
                raise e
        return wrapper
    return middleware


async def check_database_health(db_connection):
    """Check database health"""
    try:
        # This would implement actual database health check
        return True
    except Exception:
        return False


def validate_environment():
    """Validate environment configuration"""
    required_vars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD']
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        raise ValueError(f"Missing required environment variables: {missing}")


def get_environment_info() -> Dict[str, Any]:
    """Get environment information for logging"""
    return {
        'service': 'recommender',
        'port': os.getenv('RECOMMENDER_PORT', '3011'),
        'environment': os.getenv('NODE_ENV', 'production'),
        'database_host': os.getenv('DB_HOST', 'mysql'),
        'redis_host': os.getenv('REDIS_HOST', 'redis'),
        'rabbitmq_url': os.getenv('RABBITMQ_URL', 'amqp://localhost')
    }