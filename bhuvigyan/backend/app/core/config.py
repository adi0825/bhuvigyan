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

    # Bhuvan API (NRSC village geocoding)
    BHUVAN_API_KEY: str = "d079c826eed3ad22c3e6c140cb74b83802133292"
    BHUVAN_BASE_URL: str = "https://bhuvan-app1.nrsc.gov.in/api"

    # Bhoonidhi API (ISRO satellite data STAC)
    BHOONIDHI_BASE_URL: str = "https://bhoonidhi-api.nrsc.gov.in"
    BHOONIDHI_USER_ID: str = ""
    BHOONIDHI_PASSWORD: str = ""

    # Copernicus Open Access Hub (Sentinel direct)
    COPERNICUS_HUB_URL: str = "https://scihub.copernicus.eu/dhus"
    COPERNICUS_HUB_USER: str = ""
    COPERNICUS_HUB_PASSWORD: str = ""

    # NASA Earthdata (Landsat)
    EARTHDATA_USERNAME: str = ""
    EARTHDATA_PASSWORD: str = ""

    CACHE_TTL_BHUVAN: int = 86400
    CACHE_TTL_BHOONIDHI_TOKEN: int = 1100
    CACHE_TTL_SATELLITE_SCENE: int = 21600

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
