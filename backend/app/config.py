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
    
    # CORS origins - supports both JSON array format: ["http://localhost:5173"] 
    # or comma-separated: http://localhost:5173,https://signal-scope-psi.vercel.app
    cors_origins: str = ""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Explicitly read CORS_ORIGINS from environment if not set by Pydantic
        env_cors = os.getenv("CORS_ORIGINS")
        if env_cors:
            self.cors_origins = env_cors
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS - supports both JSON array and comma-separated values"""
        # Get from environment directly as primary source
        cors_value = os.getenv("CORS_ORIGINS", self.cors_origins).strip()
        
        print(f"[CONFIG] CORS_ORIGINS from env: {os.getenv('CORS_ORIGINS')}")
        print(f"[CONFIG] CORS_ORIGINS raw value: {cors_value}")
        
        # Empty string returns empty list
        if not cors_value:
            print(f"[CONFIG] CORS_ORIGINS is empty, returning empty list")
            return []
        
        # Remove outer quotes if present (Railway might add quotes)
        if cors_value.startswith('"') and cors_value.endswith('"'):
            cors_value = cors_value[1:-1]
            # Unescape inner quotes
            cors_value = cors_value.replace('\\"', '"')
        
        # Try parsing as JSON array first (e.g., ["https://example.com"])
        try:
            parsed = json.loads(cors_value)
            if isinstance(parsed, list):
                print(f"[CONFIG] Parsed CORS_ORIGINS as JSON array: {parsed}")
                return parsed
            else:
                # If it's not a list, wrap it
                print(f"[CONFIG] CORS_ORIGINS is not a list, wrapping: {parsed}")
                return [str(parsed)]
        except json.JSONDecodeError:
            # Not JSON, try comma-separated values (e.g., https://example.com,http://localhost:5173)
            if ',' in cors_value:
                origins = [origin.strip().strip('"').strip("'") for origin in cors_value.split(',')]
                print(f"[CONFIG] Parsed CORS_ORIGINS as comma-separated: {origins}")
                return origins
            # Single value
            print(f"[CONFIG] Using single CORS_ORIGINS value: {cors_value}")
            return [cors_value]

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
print(f"[CONFIG] Final CORS_ORIGINS parsed list: {settings.cors_origins_list}")

