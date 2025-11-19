import os
import json
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "signalscope")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    
    # CORS origins - expects JSON array format: ["http://localhost:5173", "https://signal-scope-psi.vercel.app"]
    cors_origins: str = os.getenv("CORS_ORIGINS", '["http://localhost:5173"]')
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS JSON string into list"""
        try:
            return json.loads(self.cors_origins)
        except:
            return [self.cors_origins]

    class Config:
        env_file = ".env"

settings = Settings()

