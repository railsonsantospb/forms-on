"""Rate limiting para a aplicação."""
from __future__ import annotations

import time
from collections import defaultdict
from functools import wraps
from typing import Callable

from fastapi import Request, HTTPException


class RateLimiter:
    """Rate limiter simples baseado em memória (IP-based) com auto-limpeza."""
    
    MAX_IPS = 10_000  # Limite para evitar memory leak em ataques distribuídos
    CLEANUP_INTERVAL = 300  # Segundos entre limpezas globais
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.time()
    
    def _cleanup_old(self, now: float) -> None:
        """Remove entradas expiradas e limita número total de IPs."""
        window_start = now - 60
        keys_to_remove = []
        for key, timestamps in self.requests.items():
            valid = [ts for ts in timestamps if ts > window_start]
            if valid:
                self.requests[key] = valid
            else:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.requests[key]
        
        # Se ainda há muitos IPs, remove os mais antigos (LRU-like)
        if len(self.requests) > self.MAX_IPS:
            sorted_keys = sorted(
                self.requests.keys(),
                key=lambda k: self.requests[k][-1] if self.requests[k] else 0
            )
            for key in sorted_keys[:len(self.requests) - self.MAX_IPS]:
                del self.requests[key]
        
        self._last_cleanup = now
    
    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - 60  # janela de 1 minuto
        
        # Limpa requisições antigas
        self.requests[key] = [
            ts for ts in self.requests[key] 
            if ts > window_start
        ]
        
        # Limpeza global periódica para evitar memory leak
        if now - self._last_cleanup > self.CLEANUP_INTERVAL:
            self._cleanup_old(now)
        
        if len(self.requests[key]) >= self.requests_per_minute:
            return False
        
        self.requests[key].append(now)
        return True
    
    def get_remaining(self, key: str) -> int:
        now = time.time()
        window_start = now - 60
        self.requests[key] = [
            ts for ts in self.requests[key] 
            if ts > window_start
        ]
        return max(0, self.requests_per_minute - len(self.requests[key]))


# Instância global
limiter = RateLimiter(requests_per_minute=30)


def rate_limit(requests_per_minute: int = 30):
    """Decorator para rate limiting em endpoints específicos."""
    endpoint_limiter = RateLimiter(requests_per_minute=requests_per_minute)
    
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
                client_ip = request.client.host if request.client else "unknown"
                if not endpoint_limiter.is_allowed(client_ip):
                    raise HTTPException(
                        status_code=429,
                        detail="Muitas requisições. Tente novamente em alguns segundos."
                    )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator
