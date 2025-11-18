import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

import os
from dotenv import load_dotenv

load_dotenv()

async def test_mongo():
    try:
        url = os.getenv('DATABASE_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(url)
        await client.admin.command('ping')
        print('[OK] MongoDB connection successful!')
        client.close()
    except Exception as e:
        print(f'[ERROR] MongoDB connection failed: {e}')
        print('Check your MongoDB connection string and network access')

if __name__ == "__main__":
    asyncio.run(test_mongo())

