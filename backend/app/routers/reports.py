from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import get_database
from ..schemas import ReportCreate, ReportResponse
from ..auth.utils import verify_token

router = APIRouter(prefix="/api/reports", tags=["Reports"])
security = HTTPBearer()


@router.post("/", response_model=ReportResponse)
async def create_report(
    report: ReportCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = verify_token(credentials.credentials)

    doc = {
        "user_id": user_id,
        "lat": report.lat,
        "lng": report.lng,
        "carrier": report.carrier,
        "signal_strength": report.signal_strength,
        "device": report.device,
        "timestamp": datetime.utcnow()
    }

    result = await db.reports.insert_one(doc)
    doc["_id"] = result.inserted_id

    return ReportResponse(**doc)


@router.get("/", response_model=List[ReportResponse])
async def get_reports(
    carrier: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {"carrier": carrier} if carrier else {}

    reports = await db.reports.find(query).sort("timestamp", -1).limit(100).to_list(length=100)
    return [ReportResponse(**r) for r in reports]

