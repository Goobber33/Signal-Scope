import os
import json
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "signalscope"
    SECRET_KEY: str = "your-super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    
    # CORS origins - expects JSON array format: ["http://localhost:5173", "https://signal-scope-psi.vercel.app"]
    # Explicitly read from environment variable as fallback
    cors_origins: str = '["http://localhost:5173"]'
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Explicitly read CORS_ORIGINS from environment if not set by Pydantic
        env_cors = os.getenv("CORS_ORIGINS")
        if env_cors:
            self.cors_origins = env_cors
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS JSON string into list"""
        # Get from environment directly as primary source
        cors_value = os.getenv("CORS_ORIGINS", self.cors_origins).strip()
        
        print(f"[CONFIG] CORS_ORIGINS from env: {os.getenv('CORS_ORIGINS')}")
        print(f"[CONFIG] CORS_ORIGINS raw value: {cors_value}")
        
        # Remove outer quotes if present (Railway might add quotes)
        if cors_value.startswith('"') and cors_value.endswith('"'):
            cors_value = cors_value[1:-1]
            # Unescape inner quotes
            cors_value = cors_value.replace('\\"', '"')
        
        try:
            parsed = json.loads(cors_value)
            if isinstance(parsed, list):
                print(f"[CONFIG] Parsed CORS_ORIGINS successfully: {parsed}")
                return parsed
            else:
                # If it's not a list, wrap it
                print(f"[CONFIG] CORS_ORIGINS is not a list, wrapping: {parsed}")
                return [str(parsed)]
        except json.JSONDecodeError as e:
            print(f"[CONFIG] Failed to parse CORS_ORIGINS as JSON: {cors_value}")
            print(f"[CONFIG] JSON error: {e}")
            # Fallback: treat as single string or comma-separated
            if ',' in cors_value:
                origins = [origin.strip().strip('"').strip("'") for origin in cors_value.split(',')]
                print(f"[CONFIG] Using comma-separated fallback: {origins}")
                return origins
            return [cors_value]

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
print(f"[CONFIG] Final CORS_ORIGINS parsed list: {settings.cors_origins_list}")

