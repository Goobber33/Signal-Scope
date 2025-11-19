from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import uvicorn
import traceback
import os

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
from .utils.haversine import haversine_distance, estimate_signal_strength

app = FastAPI(
    title="SignalScope API",
    description="Network Coverage & Signal Quality Analytics API",
    version="1.0.0"
)

# CORS configuration - must be before routes
# Get CORS origins from environment or use defaults
cors_origins = settings.cors_origins_list

# Always add Vercel patterns for production deployment
vercel_regex = r"https://.*\.vercel\.(app|dev)"

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=vercel_regex,  # Allow all Vercel deployments
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Custom middleware to ensure CORS headers on ALL responses including errors
class EnsureCORSHeadersMiddleware(BaseHTTPMiddleware):
    def is_allowed_origin(self, origin: Optional[str]) -> bool:
        """Check if origin is allowed"""
        if not origin:
            return False
        
        # In production, allow all origins (Vercel deployments vary)
        if os.getenv("ENVIRONMENT") == "production" or os.getenv("VERCEL") == "1":
            return True
        
        # For development, check specific origins
        allowed_origins = settings.cors_origins_list
        if "*" in allowed_origins:
            return True
        
        # Check exact match or Vercel pattern
        if origin in allowed_origins:
            return True
        
        # Check Vercel pattern
        import re
        vercel_pattern = r"https://.*\.vercel\.(app|dev)"
        if re.match(vercel_pattern, origin):
            return True
        
        return False
    
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        try:
            response = await call_next(request)
        except Exception as exc:
            # Handle any exception and create response with CORS headers
            headers = {}
            if self.is_allowed_origin(origin):
                headers["Access-Control-Allow-Origin"] = origin or "*"
                headers["Access-Control-Allow-Credentials"] = "true"
                headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
                headers["Access-Control-Allow-Headers"] = "*"
                headers["Access-Control-Expose-Headers"] = "*"
            print(f"Error in middleware: {exc}")
            print(traceback.format_exc())
            response = JSONResponse(
                {"detail": f"Internal server error: {str(exc)}"},
                status_code=500,
                headers=headers
            )
            return response
        
        # Add CORS headers to all successful responses
        if self.is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin or "*"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Expose-Headers"] = "*"
        
        return response

# Add middleware AFTER CORSMiddleware (so it runs first/last in the chain)
app.add_middleware(EnsureCORSHeadersMiddleware)

security = HTTPBearer()

@app.on_event("startup")
async def startup_db_client():
    try:
        await connect_to_mongo()
    except Exception as e:
        print(f"[WARNING] MongoDB connection failed on startup: {e}")
        print("[INFO] App will continue, but database operations may fail")
        print("[INFO] Connection will be retried on first database request")

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Exception handlers to ensure CORS headers on all responses
def add_cors_headers(response: JSONResponse, origin: str = None) -> JSONResponse:
    """Add CORS headers to a response"""
    allowed_origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"]
    if origin and origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "*"
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin")
    headers = dict(exc.headers) if exc.headers else {}
    
    # Add CORS headers
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Expose-Headers"] = "*"
    
    return JSONResponse(
        {"detail": exc.detail},
        status_code=exc.status_code,
        headers=headers
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin")
    headers = {}
    
    # Add CORS headers
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Expose-Headers"] = "*"
    
    # Log error
    print(f"Unhandled error: {exc}")
    print(traceback.format_exc())
    
    return JSONResponse(
        {"detail": f"Internal server error: {str(exc)}"},
        status_code=500,
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    origin = request.headers.get("origin")
    headers = {}
    
    # Add CORS headers
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Expose-Headers"] = "*"
    
    return JSONResponse(
        {"detail": exc.errors(), "body": exc.body},
        status_code=422,
        headers=headers
    )

# CORS preflight handlers
@app.options("/auth/register")
@app.options("/auth/login")
async def options_handler():
    return Response(status_code=200)

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
