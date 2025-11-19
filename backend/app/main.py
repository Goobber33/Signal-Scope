from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
import uvicorn

from .database import get_database, connect_to_mongo, close_mongo_connection
from .config import settings
from .schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    TowerResponse, ReportCreate, ReportResponse
)
from .auth.utils import (
    get_password_hash, verify_password,
    create_access_token, verify_token
)

app = FastAPI()

# --------------------------------------------------------------------
# 1. ONE AND ONLY CORS MIDDLEWARE
# --------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400
)

# --------------------------------------------------------------------
# 2. EXACT OPTIONS PREFLIGHT FOR AUTH + API ROUTES
# --------------------------------------------------------------------
@app.options("/auth/{subpath}")
@app.options("/api/{subpath}")
async def preflight(subpath: str, request: Request):
    # Use origin from request header if it's in allowed origins
    origin_header = request.headers.get("origin", "")
    allowed_origins = settings.cors_origins_list
    
    # If request origin is allowed, use it; otherwise use first allowed origin or "*"
    if origin_header and origin_header in allowed_origins:
        origin = origin_header
    elif allowed_origins:
        origin = allowed_origins[0]
    else:
        origin = "*"

    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    )

security = HTTPBearer()

# --------------------------------------------------------------------
# STARTUP / SHUTDOWN
# --------------------------------------------------------------------
@app.on_event("startup")
async def startup_db_client():
    print("[INFO] Starting API...")
    print("CORS:", settings.cors_origins_list)
    await connect_to_mongo()
    print("[INFO] Startup complete")

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# --------------------------------------------------------------------
# AUTH ENDPOINTS
# --------------------------------------------------------------------
@app.post("/auth/register")
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
        user=UserResponse(_id=uid, email=user.email, name=user.name, created_at=doc["created_at"])
    )


@app.post("/auth/login", response_model=Token)
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

# --------------------------------------------------------------------
# TOWER ENDPOINTS
# --------------------------------------------------------------------
@app.get("/api/towers", response_model=List[TowerResponse])
async def get_towers(
    operator: Optional[str] = None,
    tech: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if operator and operator != "All":
        query["operator"] = operator
    if tech:
        query["tech"] = {"$in": [tech]}

    towers_cursor = db.towers.find(query)
    towers = await towers_cursor.to_list(length=1000)

    return [TowerResponse(**tower) for tower in towers]

# --------------------------------------------------------------------
# REPORT ENDPOINTS
# --------------------------------------------------------------------
@app.post("/api/reports", response_model=ReportResponse)
async def create_report(
    report: ReportCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = verify_token(credentials.credentials)

    report_doc = {
        "user_id": user_id,
        "lat": report.lat,
        "lng": report.lng,
        "carrier": report.carrier,
        "signal_strength": report.signal_strength,
        "device": report.device,
        "timestamp": datetime.utcnow()
    }

    result = await db.reports.insert_one(report_doc)
    report_doc["_id"] = result.inserted_id

    return ReportResponse(**report_doc)

@app.get("/api/reports", response_model=List[ReportResponse])
async def get_reports(
    carrier: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if carrier:
        query["carrier"] = carrier

    reports = await db.reports.find(query).sort("timestamp", -1).limit(100).to_list(length=100)
    return [ReportResponse(**report) for report in reports]

# --------------------------------------------------------------------
# ANALYTICS
# --------------------------------------------------------------------
@app.get("/api/analytics")
async def get_analytics(db: AsyncIOMotorDatabase = Depends(get_database)):
    towers_by_carrier = {}
    for operator in ["T-Mobile", "Verizon", "AT&T"]:
        count = await db.towers.count_documents({"operator": operator})
        towers_by_carrier[operator] = count

    total_towers = await db.towers.count_documents({})
    total_reports = await db.reports.count_documents({})

    return {
        "towers_by_carrier": towers_by_carrier,
        "total_towers": total_towers,
        "total_reports": total_reports
    }

# --------------------------------------------------------------------
# DEBUG ENDPOINTS
# --------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/")
def root():
    return {"message": "SignalScope API running"}

