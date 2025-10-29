# app/store/mongodb_client.py
import os
from pymongo import MongoClient
from pymongo.errors import ConfigurationError, OperationFailure
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger("mongodb_client")

MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "meeting_assistant")

_client = None
_db = None


def get_mongodb_client():
    """Get MongoDB client instance."""
    global _client, _db
    
    if _client is None:
        try:
            # Create MongoDB client with timeout settings
            _client = MongoClient(
                MONGODB_URL,
                serverSelectionTimeoutMS=5000,  # 5 second timeout
                connectTimeoutMS=5000,
                socketTimeoutMS=5000
            )
            _db = _client[MONGODB_DB_NAME]
            # Test connection
            _client.admin.command('ping')
            logger.info(f"✓ Connected to MongoDB: {MONGODB_DB_NAME}")
        except ConfigurationError as e:
            logger.error(f"✗ MongoDB Configuration Error: {e}")
            logger.error("Check your MONGODB_URL format in .env file")
            _client = None
            _db = None
        except OperationFailure as e:
            logger.error(f"✗ MongoDB Authentication Failed: {e}")
            logger.error("Check your username and password in MONGODB_URL")
            _client = None
            _db = None
        except Exception as e:
            logger.error(f"✗ Failed to connect to MongoDB: {e}")
            _client = None
            _db = None
    
    return _db


def get_collection(collection_name: str):
    """Get a specific collection from MongoDB."""
    db = get_mongodb_client()
    if db is not None:
        return db[collection_name]
    return None
