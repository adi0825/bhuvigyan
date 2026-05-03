"""MinIO storage helper: upload + presigned GET URL (1 hour default)."""
from __future__ import annotations

import io
import logging
from datetime import timedelta
from urllib.parse import urlparse

from minio import Minio
from minio.error import S3Error

from ..settings import Settings

logger = logging.getLogger(__name__)


class MinioStorage:
    def __init__(self, settings: Settings):
        parsed = urlparse(settings.minio_endpoint)
        secure = parsed.scheme == "https"
        self._client = Minio(
            parsed.netloc or parsed.path,
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=secure,
        )
        for bucket in (settings.minio_bucket_satellite,
                       settings.minio_bucket_ndvi,
                       settings.minio_bucket_pdf):
            try:
                if not self._client.bucket_exists(bucket):
                    self._client.make_bucket(bucket)
            except S3Error as exc:
                logger.warning("MinIO bucket init %s failed: %s", bucket, exc)

    def put_bytes(self, bucket: str, key: str, data: bytes, content_type: str) -> None:
        self._client.put_object(
            bucket, key, io.BytesIO(data), length=len(data), content_type=content_type)

    def presigned_get(self, bucket: str, key: str, hours: int = 1) -> str:
        return self._client.presigned_get_object(
            bucket, key, expires=timedelta(hours=hours))
