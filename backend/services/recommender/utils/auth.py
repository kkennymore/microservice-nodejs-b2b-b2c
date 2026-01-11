"""
Authentication Middleware - JWT token validation for recommender service
========================================================================

Handles authentication and authorization for the recommender API endpoints.
"""

import logging
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

logger = logging.getLogger(__name__)


class AuthMiddleware:
    """JWT authentication middleware"""

    def __init__(self, jwt_secret: str):
        self.jwt_secret = jwt_secret
        self.security = HTTPBearer(auto_error=False)

    async def authenticate_request(self, request: Request, call_next):
        """Middleware to authenticate requests"""
        # Skip authentication for health check and docs
        if request.url.path in ["/health", "/metrics", "/api/docs"]:
            response = await call_next(request)
            return response

        # Extract token
        credentials: Optional[HTTPAuthorizationCredentials] = await self.security(request)

        if not credentials:
            raise HTTPException(status_code=401, detail="Authorization header missing")

        try:
            # Decode JWT token
            payload = jwt.decode(credentials.credentials, self.jwt_secret, algorithms=["HS256"])

            # Add user info to request state
            request.state.user = {
                'id': payload.get('userId'),
                'email': payload.get('email'),
                'role': payload.get('role'),
                'username': payload.get('username')
            }

        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Continue with request
        response = await call_next(request)
        return response

    def get_current_user(self, request: Request) -> Dict[str, Any]:
        """Get current authenticated user"""
        return getattr(request.state, 'user', None)