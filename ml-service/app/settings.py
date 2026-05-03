"""Environment-driven settings (12-factor)."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, case_sensitive=False, extra="ignore")

    # -------- Adapter modes --------
    gee_mode: str = "dev"            # dev | real
    state_api_mode: str = "dev"

    # -------- Redis (Celery broker + result backend) --------
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_url:  str | None = None

    # -------- Kafka --------
    kafka_bootstrap_servers: str = "kafka:9092"

    # -------- MinIO --------
    minio_endpoint: str = "http://minio:9000"
    minio_root_user: str = "bhuvigyan"
    minio_root_password: str = "change_me"
    minio_bucket_satellite: str = "satellite-images"
    minio_bucket_ndvi: str = "ndvi-reports"
    minio_bucket_pdf: str = "pdf-evidence"

    # -------- Google Earth Engine --------
    gee_service_account_key: str = "/secrets/gee-sa.json"
    gee_project_id: str | None = None

    # -------- Internal auth (Spring -> ML) --------
    ml_service_internal_key: str = "change_me_shared_secret_between_spring_and_ml"

    # -------- Model artifacts --------
    model_dir: str = "/app/models"

    # -------- Logging --------
    log_level: str = "INFO"

    @property
    def computed_redis_url(self) -> str:
        if self.redis_url:
            return self.redis_url
        return f"redis://{self.redis_host}:{self.redis_port}/0"


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Runtime override for GEE mode (toggled via dev endpoint)
_OVERRIDE_GEE_MODE: str | None = None


def set_gee_mode(mode: str) -> None:
    global _OVERRIDE_GEE_MODE
    _OVERRIDE_GEE_MODE = mode if mode in ("dev", "real") else None


def get_gee_mode() -> str:
    if _OVERRIDE_GEE_MODE:
        return _OVERRIDE_GEE_MODE
    return get_settings().gee_mode
