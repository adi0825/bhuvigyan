import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "Bhuvigyan"
    APP_VERSION: str = "7.0.0"
    DEBUG: bool = True
    PORT: int = 8000

    KAFKA_BROKERS: str = "localhost:9092"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minio"
    MINIO_SECRET_KEY: str = "minio123"
    MINIO_BUCKET: str = "bhuvigyan-evidence"

    DATABASE_URL: str = "postgresql+asyncpg://bhuvigyan:bhuvigyan123@localhost:5432/bhuvigyan"
    DATABASE_URL_SYNC: str = "postgresql://bhuvigyan:bhuvigyan123@localhost:5432/bhuvigyan"

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "bhuvigyan-jwt-secret-key-2026-very-long-string-must-be-at-least-64-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    OTP_EXPIRE_MINUTES: int = 5
    DEV_OTP: str = "123456"
    DEV_MODE: bool = True

    FRAUD_ENGINE_PATH: str = "./fraud_engine/build/fraud_engine"

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]

    OTP_RATE_LIMIT: int = 5
    CSC_DAILY_CLAIM_LIMIT: int = 50

    OPENWEATHER_API_KEY: str = "1aa9b133b2445b647a1e2f056811a276"

    GEE_PROJECT_ID: str = "agri-494914"
    SUREPASS_TOKEN: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()