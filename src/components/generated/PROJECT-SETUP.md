# 🚀 SignalScope - Complete Full-Stack Setup Guide

## 📋 Project Overview

**SignalScope** is a secure, full-stack Network Coverage & Signal Quality Dashboard with:
- ✅ JWT Authentication (Login/Register)
- ✅ Protected Routes
- ✅ Interactive Map Dashboard
- ✅ User Signal Reports
- ✅ Analytics & Visualizations
- ✅ PostgreSQL Database
- ✅ FastAPI Backend
- ✅ React + TypeScript Frontend

---

## 🎯 Frontend Setup (Already Complete!)

The React frontend is already built with:
- **AuthContext**: JWT token management
- **LoginPage**: Beautiful auth interface
- **RegisterPage**: User registration with validation
- **ProtectedRoute**: Route protection
- **SignalScopeDashboard**: Full dashboard with map, reports, analytics

### Run Frontend

```bash
npm install
npm run dev
```

Frontend runs on: **http://localhost:5173**

---

## 🔧 Backend Setup (Follow These Steps)

### 1. Create Backend Directory

```bash
# In your project root
mkdir backend
cd backend
```

### 2. Create Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth/
│   │   ├── __init__.py
│   │   └── utils.py
│   └── utils/
│       ├── __init__.py
│       └── haversine.py
├── seed_towers.py
├── requirements.txt
└── .env
```

### 3. Install Dependencies

Create `requirements.txt`:
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
pydantic==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
email-validator==2.1.0
```

Install:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Setup PostgreSQL Database

```bash
# Install PostgreSQL (if not installed)
# Mac: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: Download from postgresql.org

# Start PostgreSQL
# Mac: brew services start postgresql
# Linux: sudo service postgresql start

# Create database
psql -U postgres
CREATE DATABASE signalscope;
\q
```

### 5. Configure Environment

Create `.env`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/signalscope
SECRET_KEY=change-this-to-a-very-secure-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

### 6. Create Backend Files

**See the complete backend code in the next section** ⬇️

---

## 📁 Complete Backend Code

### `app/__init__.py`
```python
# Empty file - just create it
```

### `app/config.py`
```python
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/signalscope")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    class Config:
        env_file = ".env"

settings = Settings()
```

### `app/database.py`
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### `app/models.py`
```python
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    reports = relationship("Report", back_populates="user")

class Tower(Base):
    __tablename__ = "towers"
    
    id = Column(String, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    operator = Column(String, nullable=False)
    height = Column(Integer, nullable=False)
    tech = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    carrier = Column(String, nullable=False)
    signal_strength = Column(Integer, nullable=False)
    device = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="reports")
```

### `app/schemas.py`
```python
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TowerResponse(BaseModel):
    id: str
    lat: float
    lng: float
    operator: str
    height: int
    tech: List[str]
    
    class Config:
        from_attributes = True

class ReportCreate(BaseModel):
    lat: float
    lng: float
    carrier: str
    signal_strength: int
    device: str

class ReportResponse(BaseModel):
    id: int
    user_id: int
    lat: float
    lng: float
    carrier: str
    signal_strength: int
    device: str
    timestamp: datetime
    
    class Config:
        from_attributes = True
```

### `app/auth/__init__.py`
```python
# Empty file
```

### `app/auth/utils.py`
```python
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from typing import Optional
from ..config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        return int(user_id)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
```

### `app/utils/__init__.py`
```python
# Empty file
```

### `app/utils/haversine.py`
```python
import math

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in kilometers"""
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # Earth radius in km
    return c * r

def estimate_signal_strength(tower_lat: float, tower_lng: float, 
                            tower_height: int, point_lat: float, 
                            point_lng: float) -> int:
    """Estimate signal strength in dBm"""
    distance = haversine_distance(tower_lat, tower_lng, point_lat, point_lng)
    base_signal = -40
    height_bonus = min(tower_height / 50, 10)
    distance_penalty = distance * 8
    signal = base_signal + height_bonus - distance_penalty
    return max(-120, min(-50, int(signal)))
```

### `app/main.py` (MAIN FILE - COPY ALL OF THIS)
```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn

from .database import get_db, Base, engine
from .models import User, Tower, Report
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

# Create tables
Base.metadata.create_all(bind=engine)

# AUTH ENDPOINTS
@app.post("/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        name=user.name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@app.post("/auth/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

# TOWER ENDPOINTS
@app.get("/api/towers", response_model=List[TowerResponse])
def get_towers(
    operator: Optional[str] = None,
    tech: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Tower)
    if operator and operator != "All":
        query = query.filter(Tower.operator == operator)
    if tech:
        query = query.filter(Tower.tech.contains([tech]))
    return query.all()

# REPORT ENDPOINTS
@app.post("/api/reports", response_model=ReportResponse)
def create_report(
    report: ReportCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user_id = verify_token(credentials.credentials)
    db_report = Report(
        user_id=user_id,
        lat=report.lat,
        lng=report.lng,
        carrier=report.carrier,
        signal_strength=report.signal_strength,
        device=report.device
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@app.get("/api/reports", response_model=List[ReportResponse])
def get_reports(carrier: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Report)
    if carrier:
        query = query.filter(Report.carrier == carrier)
    return query.order_by(Report.timestamp.desc()).limit(100).all()

# ANALYTICS ENDPOINT
@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    towers_by_carrier = {}
    for operator in ["T-Mobile", "Verizon", "AT&T"]:
        towers_by_carrier[operator] = db.query(Tower).filter(Tower.operator == operator).count()
    
    return {
        "towers_by_carrier": towers_by_carrier,
        "total_towers": db.query(Tower).count(),
        "total_reports": db.query(Report).count()
    }

@app.get("/")
def root():
    return {"message": "SignalScope API", "version": "1.0.0", "docs": "/docs"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### `seed_towers.py`
```python
from app.database import SessionLocal
from app.models import Tower

def seed_towers():
    db = SessionLocal()
    
    towers_data = [
        {"id": "t1", "lat": 40.7128, "lng": -74.0060, "operator": "T-Mobile", "height": 150, "tech": ["LTE", "5G"]},
        {"id": "t2", "lat": 34.0522, "lng": -118.2437, "operator": "Verizon", "height": 120, "tech": ["LTE", "5G"]},
        {"id": "t3", "lat": 41.8781, "lng": -87.6298, "operator": "AT&T", "height": 180, "tech": ["LTE"]},
        {"id": "t4", "lat": 29.7604, "lng": -95.3698, "operator": "T-Mobile", "height": 140, "tech": ["LTE", "5G"]},
        {"id": "t5", "lat": 33.4484, "lng": -112.0740, "operator": "Verizon", "height": 160, "tech": ["LTE", "5G"]},
        {"id": "t6", "lat": 39.7392, "lng": -104.9903, "operator": "T-Mobile", "height": 130, "tech": ["5G"]},
        {"id": "t7", "lat": 47.6062, "lng": -122.3321, "operator": "AT&T", "height": 170, "tech": ["LTE", "5G"]},
        {"id": "t8", "lat": 37.7749, "lng": -122.4194, "operator": "T-Mobile", "height": 145, "tech": ["LTE", "5G"]},
    ]
    
    for tower_data in towers_data:
        existing = db.query(Tower).filter(Tower.id == tower_data["id"]).first()
        if not existing:
            tower = Tower(**tower_data)
            db.add(tower)
    
    db.commit()
    print(f"✅ Seeded {len(towers_data)} towers!")
    db.close()

if __name__ == "__main__":
    seed_towers()
```

---

## 🚀 Running the Complete Application

### Terminal 1: Backend
```bash
cd backend
source venv/bin/activate
python seed_towers.py  # Seed database (first time only)
uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend
```bash
npm run dev
```

---

## 🎉 Testing the Application

1. **Open Frontend**: http://localhost:5173
2. **Register**: Create a new account
3. **Login**: Sign in with your credentials
4. **Dashboard**: Access the protected dashboard
5. **Submit Reports**: Add signal quality reports
6. **View Analytics**: See tower distribution and signal data

### Test API Directly
```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","name":"Test User"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Get Towers
curl http://localhost:8000/api/towers

# View API Docs
# Open: http://localhost:8000/docs
```

---

## 🔐 Security Features

✅ **Password Hashing** - Bcrypt with salt  
✅ **JWT Tokens** - Secure authentication  
✅ **Protected Routes** - Authorization required  
✅ **CORS Configuration** - Controlled access  
✅ **SQL Injection Protection** - SQLAlchemy ORM  
✅ **Input Validation** - Pydantic schemas  

---

## 📦 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render/Heroku)
```bash
# Set environment variables in dashboard
# Deploy from GitHub
```

---

## 🎨 Features Implemented

✅ Secure Authentication (JWT)  
✅ User Registration & Login  
✅ Protected Dashboard Routes  
✅ Interactive Map Interface  
✅ Signal Quality Reports  
✅ Tower Database  
✅ Analytics & Charts  
✅ Responsive Design  
✅ Dark Mode  
✅ Password Validation  
✅ Error Handling  

---

## 📝 Next Steps

- [ ] Integrate real map (Mapbox/Leaflet)
- [ ] Add email verification
- [ ] Implement password reset
- [ ] Add more analytics
- [ ] Real-time updates with WebSockets
- [ ] Mobile app version
- [ ] Export data to CSV
- [ ] Admin dashboard

---

## 🤝 Support

For issues or questions:
1. Check API docs: http://localhost:8000/docs
2. Review console logs
3. Verify database connection
4. Check CORS settings

**🎉 Congratulations! Your SignalScope full-stack app is ready!**
