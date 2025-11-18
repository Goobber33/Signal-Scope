from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import uvicorn

from .database import get_database, connect_to_mongo, close_mongo_connection
from .schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    TowerResponse, ReportCreate, ReportResponse
)
from .auth.utils import (
    get_password_hash, verify_password, 
    create_access_token, verify_token
)
from .utils.haversine import haversine_distance, estimate_signal_strength

app = FastAPI(
    title="SignalScope API",
    description="Network Coverage & Signal Quality Analytics API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# AUTH ENDPOINTS
@app.post("/auth/register", response_model=Token)
async def register(user: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_doc = {
        "email": user.email,
        "password_hash": hashed_password,
        "name": user.name,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user_doc)
    }

@app.post("/auth/login", response_model=Token)
async def login(user: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": str(db_user["_id"])})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**db_user)
    }

# TOWER ENDPOINTS
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
    # Convert MongoDB documents to TowerResponse
    # Towers use custom 'id' field (like "t1"), not MongoDB _id
    return [TowerResponse(**tower) for tower in towers]

# REPORT ENDPOINTS
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

# ANALYTICS ENDPOINT
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

@app.get("/")
def root():
    return {"message": "SignalScope API", "version": "1.0.0", "docs": "/docs"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
