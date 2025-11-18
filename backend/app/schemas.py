from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Optional
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return str(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    email: str
    name: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True
        arbitrary_types_allowed = True

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
    id: str = Field(alias="_id")
    user_id: str
    lat: float
    lng: float
    carrier: str
    signal_strength: int
    device: str
    timestamp: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True
        arbitrary_types_allowed = True

