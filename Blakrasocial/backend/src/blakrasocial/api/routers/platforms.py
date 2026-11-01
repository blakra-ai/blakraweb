from __future__ import annotations

from fastapi import APIRouter, Response

from blakrasocial.api.dependencies import ContainerDep
from blakrasocial.api.schemas.platforms import PlatformRulesResponse

router = APIRouter(prefix="/platforms", tags=["platforms"])


@router.get("/rules", summary="Per-network limits the backend enforces (public, cacheable)")
async def rules(container: ContainerDep, response: Response) -> PlatformRulesResponse:
    response.headers["Cache-Control"] = "public, max-age=3600"
    return PlatformRulesResponse.from_registry(container.rules)
