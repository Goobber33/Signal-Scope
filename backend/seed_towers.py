import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from datetime import datetime

async def seed_towers():
    client = AsyncIOMotorClient(settings.DATABASE_URL)
    db = client[settings.DATABASE_NAME]
    
    towers_data = [
        {"id": "t1", "lat": 40.7128, "lng": -74.0060, "operator": "T-Mobile", "height": 150, "tech": ["LTE", "5G"], "created_at": datetime.utcnow()},
        {"id": "t2", "lat": 34.0522, "lng": -118.2437, "operator": "Verizon", "height": 120, "tech": ["LTE", "5G"], "created_at": datetime.utcnow()},
        {"id": "t3", "lat": 41.8781, "lng": -87.6298, "operator": "AT&T", "height": 180, "tech": ["LTE"], "created_at": datetime.utcnow()},
        {"id": "t4", "lat": 29.7604, "lng": -95.3698, "operator": "T-Mobile", "height": 140, "tech": ["LTE", "5G"], "created_at": datetime.utcnow()},
        {"id": "t5", "lat": 33.4484, "lng": -112.0740, "operator": "Verizon", "height": 160, "tech": ["LTE", "5G"], "created_at": datetime.utcnow()},
        {"id": "t6", "lat": 39.7392, "lng": -104.9903, "operator": "T-Mobile", "height": 130, "tech": ["5G"], "created_at": datetime.utcnow()},
        {"id": "t7", "lat": 47.6062, "lng": -122.3321, "operator": "AT&T", "height": 170, "tech": ["LTE", "5G"], "created_at": datetime.utcnow()},
        {"id": "t8", "lat": 37.7749, "lng": -122.4194, "operator": "T-Mobile", "height": 145, "tech": ["LTE", "5G"], "created_at": datetime.utcnow()},
    ]
    
    seeded_count = 0
    for tower_data in towers_data:
        existing = await db.towers.find_one({"id": tower_data["id"]})
        if not existing:
            await db.towers.insert_one(tower_data)
            seeded_count += 1
    
    client.close()
    print(f"✅ Seeded {seeded_count} towers!")

if __name__ == "__main__":
    asyncio.run(seed_towers())
