from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from ..database import get_database
from ..schemas import UserCreate, UserLogin, UserResponse, Token
from ..auth.utils import (
    get_password_hash, verify_password,
    create_access_token
)

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer()


@router.post("/register", response_model=Token)
async def register(user: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(user.password)

    doc = {
        "email": user.email,
        "password_hash": hashed,
        "name": user.name,
        "created_at": datetime.utcnow(),
    }

    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)

    token = create_access_token({"sub": uid})

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse(_id=uid, **user.dict(), created_at=doc["created_at"])
    )


@router.post("/login", response_model=Token)
async def login(user: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    uid = str(db_user["_id"])
    db_user["_id"] = uid

    token = create_access_token({"sub": uid})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse(**db_user),
    }

