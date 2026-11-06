from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx

from blakrasocial.application.dto import MediaMetadata
from blakrasocial.application.errors import MediaRejected
from blakrasocial.domain.enums import MediaKind
from blakrasocial.infrastructure.logging import get_logger

_log = get_logger(__name__)
_IMAGE_CODECS = frozenset({"mjpeg", "png", "gif", "webp", "bmp", "tiff"})


class FfprobeMediaInspector:
    """Measures files with ffprobe (reads only headers through HTTP range requests).

    Dimensions and duration come from the file itself, so a client cannot bypass
    platform limits by sending fake metadata.
    """

    def __init__(self, http: httpx.AsyncClient, ffprobe_path: str = "ffprobe", timeout: float = 30.0) -> None:
        self._http = http
        self._ffprobe = ffprobe_path
        self._timeout = timeout

    async def inspect(self, url: str, content_type_hint: str | None = None) -> MediaMetadata:
        size, header_type = await self._head(url)
        mime = (content_type_hint or header_type or "application/octet-stream").split(";")[0].lower()
        probe = await self._probe(url)

        streams = probe.get("streams") or []
        video = next((s for s in streams if s.get("codec_type") == "video"), None)
        if video is None:
            raise MediaRejected("The uploaded file has no image or video track.")

        is_image = video.get("codec_name") in _IMAGE_CODECS or mime.startswith("image/")
        width, height = _int(video.get("width")), _int(video.get("height"))
        if _rotated(video) and width and height:
            width, height = height, width

        fmt = probe.get("format") or {}
        size = size or _int(fmt.get("size")) or 0
        if is_image:
            return MediaMetadata(MediaKind.IMAGE, mime, size, width, height)
        duration = _float(fmt.get("duration")) or _float(video.get("duration"))
        return MediaMetadata(MediaKind.VIDEO, mime, size, width, height, duration)

    async def _head(self, url: str) -> tuple[int | None, str | None]:
        try:
            response = await self._http.head(url, follow_redirects=False, timeout=self._timeout)
        except httpx.HTTPError as exc:
            raise MediaRejected("The uploaded file could not be reached. Upload it again.") from exc
        if response.status_code >= 400:
            raise MediaRejected("The uploaded file was not found. Upload it again.")
        length = response.headers.get("Content-Length")
        return (int(length) if length and length.isdigit() else None), response.headers.get("Content-Type")

    async def _probe(self, url: str) -> dict[str, Any]:
        process = await asyncio.create_subprocess_exec(
            self._ffprobe,
            "-v",
            "error",
            "-protocol_whitelist",
            "https,tls,tcp",
            "-rw_timeout",
            str(int(self._timeout * 1_000_000)),
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            url,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=self._timeout)
        except TimeoutError as exc:
            process.kill()
            raise MediaRejected("Reading the uploaded file took too long.") from exc
        if process.returncode != 0:
            _log.warning("ffprobe_failed", code=process.returncode, stderr=stderr.decode()[:300])
            raise MediaRejected("The uploaded file is damaged or in an unsupported format.")
        parsed: dict[str, Any] = json.loads(stdout or b"{}")
        return parsed


def _int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _rotated(stream: dict[str, Any]) -> bool:
    rotation = (stream.get("tags") or {}).get("rotate")
    for side in stream.get("side_data_list") or []:
        rotation = side.get("rotation", rotation)
    try:
        return abs(int(rotation or 0)) % 180 == 90
    except (TypeError, ValueError):
        return False
