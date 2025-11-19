from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

from ..config import settings
from ..database import get_database
from ..schemas import UserCreate, UserLogin, UserResponse, Token
from ..auth.utils import (
    get_password_hash, verify_password,
    create_access_token
)

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer()

# ---------------------------------------------------------
# OPTIONS PREFLIGHT HANDLER FOR ALL /auth ROUTES
# REQUIRED FOR CORS !!!
# ---------------------------------------------------------
@router.options("/{path:path}")
async def options_auth(request: Request, path: str = ""):
    origin_header = request.headers.get("origin", "")
    allowed = settings.cors_origins_list

    # Decide which origin to send back
    if origin_header and origin_header in allowed:
        origin = origin_header
    elif allowed:
        origin = allowed[0]  # fallback allowed origin
    else:
        origin = "*"

    print(f"[AUTH OPTIONS] Path: {path} | Origin: {origin_header} | Responding: {origin}")

    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# ---------------------------------------------------------
# REGISTER
# ---------------------------------------------------------
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

# ---------------------------------------------------------
# LOGIN
# ---------------------------------------------------------
@router.post("/login", response_model=Token)
async def login(user: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    uid = str(db_user["_id"])
    db_user["_id"] = uid  # Convert ObjectId → str

    token = create_access_token({"sub": uid})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse(**db_user),
    }
