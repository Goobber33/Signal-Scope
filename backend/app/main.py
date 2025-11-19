from fastapi import FastAPI, Depends, HTTPException
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

app = FastAPI(
    title="SignalScope API",
    description="Network Coverage & Signal Quality Analytics API",
    version="1.0.0"
)

# CORS configuration - simple and clean
# Get CORS origins list (will read from environment)
cors_origins_list = settings.cors_origins_list
print(f"[MAIN] Setting up CORS with origins: {cors_origins_list}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,   # comes from CORS_ORIGINS env variable
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

@app.on_event("startup")
async def startup_db_client():
    print("[INFO] SignalScope API starting up...")
    print(f"[INFO] CORS origins: {settings.cors_origins_list}")
    try:
        await connect_to_mongo()
    except Exception as e:
        print(f"[WARNING] MongoDB connection failed on startup: {e}")
        print("[INFO] App will continue, but database operations may fail")
        print("[INFO] Connection will be retried on first database request")
    print("[INFO] SignalScope API startup complete!")

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# AUTH ENDPOINTS
@app.post("/auth/register")
async def register(user: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    try:
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
        user_id_str = str(result.inserted_id)  # Convert ObjectId to string
        
        # Prepare user response data
        user_response_data = {
            "_id": user_id_str,
            "email": user_doc["email"],
            "name": user_doc["name"],
            "created_at": user_doc["created_at"]
        }
        
        access_token = create_access_token(data={"sub": user_id_str})
        
        # Create response manually to avoid validation errors
        user_obj = UserResponse(**user_response_data)
        token_response = Token(
            access_token=access_token,
            token_type="bearer",
            user=user_obj
        )
        return token_response
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in register: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/auth/login", response_model=Token)
async def login(user: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Convert ObjectId to string for Pydantic
    db_user["_id"] = str(db_user["_id"])
    
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

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring"""
    return {
        "status": "healthy",
        "service": "SignalScope API",
        "version": "1.0.0"
    }

@app.get("/")
def root():
    return {
        "message": "SignalScope API", 
        "version": "1.0.0", 
        "docs": "/docs",
        "endpoints": {
            "register": "/auth/register",
            "login": "/auth/login",
            "health": "/health"
        }
    }

@app.get("/test")
def test():
    """Test endpoint to verify app is running"""
    return {"status": "ok", "message": "API is responding"}

# Debug endpoint to list all routes
@app.get("/routes")
def list_routes():
    """List all registered routes for debugging"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods)
            })
    return {"routes": routes, "total": len(routes)}

# Debug endpoint to check CORS configuration
@app.get("/debug/cors")
def debug_cors():
    """Debug endpoint to check CORS configuration"""
    import os
    env_value = os.getenv("CORS_ORIGINS", "NOT SET")
    return {
        "cors_origins_raw": settings.cors_origins,
        "cors_origins_list": settings.cors_origins_list,
        "env_CORS_ORIGINS": env_value,
        "env_length": len(env_value) if env_value != "NOT SET" else 0
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
