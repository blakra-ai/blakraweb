from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote

from blakrasocial.domain.entities import MediaUploadTicket

UPLOAD_URL_LIFETIME = timedelta(hours=1)


class S3ObjectStorage:
    """`ObjectStorage` on any S3-compatible service (Cloudflare R2, MinIO, AWS S3).

    The presigned PUT signs Content-Type and Content-Length, so the browser can upload only the
    exact file it announced. Objects are read through `public_base_url` (a public bucket domain).
    """

    def __init__(
        self,
        *,
        endpoint_url: str,
        bucket: str,
        region: str,
        access_key_id: str,
        secret_access_key: str,
        public_base_url: str,
        session: Any | None = None,
    ) -> None:
        import aioboto3
        from aiobotocore.config import AioConfig

        self._bucket = bucket
        self._public_base = public_base_url.rstrip("/")
        self._session = session or aioboto3.Session()
        self._endpoint_url = endpoint_url
        self._region = region
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._config = AioConfig(signature_version="s3v4", s3={"addressing_style": "path"})

    def _client(self) -> Any:
        return self._session.client(
            "s3",
            endpoint_url=self._endpoint_url,
            region_name=self._region,
            aws_access_key_id=self._access_key_id,
            aws_secret_access_key=self._secret_access_key,
            config=self._config,
        )

    async def presign_upload(self, key: str, content_type: str, size_bytes: int) -> MediaUploadTicket:
        async with self._client() as s3:
            url: str = await s3.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self._bucket,
                    "Key": key,
                    "ContentType": content_type,
                    "ContentLength": size_bytes,
                },
                ExpiresIn=int(UPLOAD_URL_LIFETIME.total_seconds()),
            )
        return MediaUploadTicket(
            upload_url=url,
            access_url=self.public_url(key),
            content_type=content_type,
            expires_at=datetime.now(UTC) + UPLOAD_URL_LIFETIME,
        )

    def public_url(self, key: str) -> str:
        return f"{self._public_base}/{quote(key)}"

    async def delete(self, key: str) -> None:
        async with self._client() as s3:
            await s3.delete_object(Bucket=self._bucket, Key=key)

    async def delete_prefix(self, prefix: str) -> int:
        if not prefix or not prefix.endswith("/"):
            raise ValueError("prefix must be a folder ending in '/'")  # never wipe the whole bucket
        removed = 0
        async with self._client() as s3:
            paginator = s3.get_paginator("list_objects_v2")
            async for page in paginator.paginate(Bucket=self._bucket, Prefix=prefix):
                keys = [{"Key": item["Key"]} for item in page.get("Contents", [])]
                # One key at a time: works on every S3-compatible service (some lack DeleteObjects).
                for key in keys:
                    await s3.delete_object(Bucket=self._bucket, Key=key["Key"])
                removed += len(keys)
        return removed
