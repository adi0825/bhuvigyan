from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    GEE_SERVICE_ACCOUNT_KEY: str
    GEE_PROJECT_ID: str
    GEE_ENABLED: bool = True
    KGIS_BASE_URL: str = (
        "https://kgis.ksrsac.in:9000"
        "/genericwebservices/ws"
    )
    KGIS_TIMEOUT: int = 15
    KGIS_RETRY_MAX: int = 3
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000"
    ]
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"
    CACHE_TTL_POLYGON: int = 86400
    CACHE_TTL_NDVI: int = 21600

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
