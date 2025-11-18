from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

class MongoDB:
    client: AsyncIOMotorClient = None

db = MongoDB()

async def get_database():
    return db.client[settings.DATABASE_NAME]

async def connect_to_mongo():
    """Create database connection"""
    db.client = AsyncIOMotorClient(settings.DATABASE_URL)
    # Test connection
    await db.client.admin.command('ping')
    print("✅ Connected to MongoDB!")

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        print("✅ Disconnected from MongoDB!")
