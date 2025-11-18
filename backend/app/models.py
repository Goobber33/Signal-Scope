# Models are now handled by Pydantic schemas in schemas.py
# MongoDB doesn't require ORM models - documents are stored as dictionaries
# This file is kept for backward compatibility but is no longer needed

from typing import Optional
from datetime import datetime
from bson import ObjectId

def PyObjectId(v):
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError("Invalid ObjectId")
