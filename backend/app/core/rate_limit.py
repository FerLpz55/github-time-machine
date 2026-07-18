import os
import time
from collections import defaultdict

from fastapi import Request, HTTPException

MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX", "60"))
WINDOW_SECONDS = 60

_requests: dict[str, list[float]] = defaultdict(list)


def rate_limit_middleware():
    """Return an ASGI middleware that limits requests per IP.

    Default: 60 requests per 60-second window. Override with RATE_LIMIT_MAX env var.
    """

    async def middleware(request: Request, call_next):
        if request.url.path in ("/health", "/docs", "/openapi.json", "/favicon.ico"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - WINDOW_SECONDS

        _requests[client_ip] = [t for t in _requests[client_ip] if t > window_start]

        if len(_requests[client_ip]) >= MAX_REQUESTS:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {MAX_REQUESTS} requests per {WINDOW_SECONDS}s.",
            )

        _requests[client_ip].append(now)
        return await call_next(request)

    return middleware
