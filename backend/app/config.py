import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "signalscope")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    
    # CORS origins - supports comma-separated list or default localhost
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list, including wildcard for Vercel"""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        # Add common Vercel patterns
        if os.getenv("ENVIRONMENT") == "production":
            origins.extend([
                "https://*.vercel.app",
                "https://*.vercel.dev",
            ])
        return origins

    class Config:
        env_file = ".env"

settings = Settings()

