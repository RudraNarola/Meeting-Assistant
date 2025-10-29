import os
from redis import Redis

def get_redis_client():
    """
    Create and return a Redis client from environment variable.
    Uses decode_responses=True for str I/O.
    """
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    return Redis.from_url(redis_url, decode_responses=True)
