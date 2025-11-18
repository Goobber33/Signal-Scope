import asyncio
from app.schemas import UserCreate
from app.database import get_database
from app.main import register

async def test_register():
    try:
        db = await get_database()
        user = UserCreate(email='test@test.com', password='Test1234!', name='Test')
        print(f'[OK] UserCreate works: {user.email}')
        print(f'Password length: {len(user.password)} bytes')
        
        print('Testing register function...')
        result = await register(user, db)
        print('[OK] Register works!')
        print(f'Response: {result}')
    except Exception as e:
        print(f'[ERROR] Register failed: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_register())

