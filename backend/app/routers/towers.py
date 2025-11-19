from fastapi import APIRouter, Depends
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import get_database
from ..schemas import TowerResponse

router = APIRouter(prefix="/api/towers", tags=["Towers"])


@router.get("/", response_model=List[TowerResponse])
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

