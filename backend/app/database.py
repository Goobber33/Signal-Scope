from motor.motor_asyncio import AsyncIOMotorClient
from urllib.parse import urlparse
from fastapi import HTTPException
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
    # Ensure connection is established
    if db.client is None:
        try:
            await connect_to_mongo()
        except Exception as e:
            print(f"[ERROR] Failed to connect to MongoDB: {e}")
            raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    database_name = get_database_name_from_url(settings.DATABASE_URL) or settings.DATABASE_NAME
    return db.client[database_name]

async def connect_to_mongo():
    """Create database connection"""
    # MongoDB Atlas requires TLS/SSL - ensure it's enabled
    connection_url = settings.DATABASE_URL
    # If it's an Atlas connection (mongodb+srv://), ensure TLS is enabled
    if connection_url.startswith('mongodb+srv://'):
        # MongoDB Atlas automatically uses TLS, but we can be explicit
        if 'tls=' not in connection_url and 'ssl=' not in connection_url:
            # Add tls=true if not present
            separator = '&' if '?' in connection_url else '?'
            connection_url = f"{connection_url}{separator}tls=true"
    
    db.client = AsyncIOMotorClient(
        connection_url,
        tls=True if connection_url.startswith('mongodb+srv://') else None,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000
    )
    # Test connection
    await db.client.admin.command('ping')
    database_name = get_database_name_from_url(settings.DATABASE_URL) or settings.DATABASE_NAME
    print(f"[OK] Connected to MongoDB! Database: {database_name}")

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        print("[OK] Disconnected from MongoDB!")
