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
    # Pydantic Settings will automatically read from CORS_ORIGINS environment variable
    cors_origins: str = '["http://localhost:5173"]'
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS JSON string into list"""
        cors_value = self.cors_origins.strip()
        
        # Remove outer quotes if present (Railway might add quotes)
        if cors_value.startswith('"') and cors_value.endswith('"'):
            cors_value = cors_value[1:-1]
            # Unescape inner quotes
            cors_value = cors_value.replace('\\"', '"')
        
        try:
            parsed = json.loads(cors_value)
            if isinstance(parsed, list):
                print(f"[CONFIG] Parsed CORS_ORIGINS: {parsed}")
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
print(f"[CONFIG] CORS_ORIGINS raw value: {settings.cors_origins}")
print(f"[CONFIG] CORS_ORIGINS parsed list: {settings.cors_origins_list}")

