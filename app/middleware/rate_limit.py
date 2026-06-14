"""Rate limiting com Redis para persistência entre restarts e workers."""

from __future__ import annotations

import logging
import os
from functools import wraps
from typing import Callable

import redis.asyncio as aioredis
from fastapi import Request, HTTPException

logger = logging.getLogger("security")


class RedisRateLimiter:
    """Rate limiter baseado em Redis com janela deslizante de 1 minuto."""

    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.redis_url = os.getenv(
            "REDIS_URL",
            "redis://redis:6379/0",
        )
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
        return self._redis

    async def is_allowed(self, key: str) -> bool:
        try:
            r = await self._get_redis()
            window = 60
            now = __import__("time").time()
            pipe = r.pipeline()

            # Remove entradas fora da janela
            await pipe.zremrangebyscore(key, 0, now - window)
            # Conta requisições atuais
            await pipe.zcard(key)
            # Adiciona requisição atual
            await pipe.zadd(key, {str(now): now})
            # Expira a chave após 60s (auto-limpeza)
            await pipe.expire(key, window)

            results = await pipe.execute()
            count = results[1]  # zcard result

            return count < self.requests_per_minute
        except Exception as e:
            logger.error("redis_rate_limit_error: %s", e)
            # Falha do Redis não bloqueia o usuário (fail open)
            return True

    async def get_remaining(self, key: str) -> int:
        try:
            r = await self._get_redis()
            now = __import__("time").time()
            window = 60

            await r.zremrangebyscore(key, 0, now - window)
            count = await r.zcard(key)
            return max(0, self.requests_per_minute - count)
        except Exception:
            return self.requests_per_minute

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None


# Instância global
limiter = RedisRateLimiter(requests_per_minute=30)


def rate_limit(requests_per_minute: int = 30):
    """Decorator para rate limiting em endpoints específicos com Redis."""
    endpoint_limiter = RedisRateLimiter(requests_per_minute=requests_per_minute)

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if request is None:
                for key, val in kwargs.items():
                    if isinstance(val, Request):
                        request = val
                        break

            if request:
                client_ip = request.headers.get("x-real-ip") or (
                    request.client.host if request.client else "unknown"
                )
                if not await endpoint_limiter.is_allowed(client_ip):
                    logger.warning(
                        "rate_limit_exceeded ip=%s endpoint=%s",
                        client_ip,
                        request.url.path,
                    )
                    raise HTTPException(
                        status_code=429,
                        detail="Muitas requisições. Tente novamente em alguns segundos.",
                    )

            return await func(*args, **kwargs)

        return wrapper

    return decorator
