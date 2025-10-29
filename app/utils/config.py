import os

class Config:
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    SERVICE_NAME = "action-item-service"
    VERSION = "1.0"
