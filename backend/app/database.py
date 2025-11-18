from motor.motor_asyncio import AsyncIOMotorClient
from urllib.parse import urlparse
from .config import settings

class MongoDB:
    client: AsyncIOMotorClient = None

db = MongoDB()

def get_database_name_from_url(url: str) -> str:
    """Extract database name from MongoDB URL if present"""
    try:
        parsed = urlparse(url)
        if parsed.path and parsed.path != '/':
            # Database name is in the path (e.g., /signalscope)
            db_name = parsed.path.lstrip('/')
            # Remove query parameters if present
            if '?' in db_name:
                db_name = db_name.split('?')[0]
            if db_name:
                return db_name
    except Exception:
        pass
    # Fall back to settings or default
    return settings.DATABASE_NAME or "signalscope"

async def get_database():
    database_name = get_database_name_from_url(settings.DATABASE_URL) or settings.DATABASE_NAME
    return db.client[database_name]

async def connect_to_mongo():
    """Create database connection"""
    db.client = AsyncIOMotorClient(settings.DATABASE_URL)
    # Test connection
    await db.client.admin.command('ping')
    database_name = get_database_name_from_url(settings.DATABASE_URL) or settings.DATABASE_NAME
    print(f"[OK] Connected to MongoDB! Database: {database_name}")

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        print("[OK] Disconnected from MongoDB!")
