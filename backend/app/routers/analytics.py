from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import get_database

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/analytics")
async def get_analytics(db: AsyncIOMotorDatabase = Depends(get_database)):
    carriers = ["T-Mobile", "Verizon", "AT&T"]

    towers_by_carrier = {
        operator: await db.towers.count_documents({"operator": operator})
        for operator in carriers
    }

    total_towers = await db.towers.count_documents({})
    total_reports = await db.reports.count_documents({})

    return {
        "towers_by_carrier": towers_by_carrier,
        "total_towers": total_towers,
        "total_reports": total_reports
    }

