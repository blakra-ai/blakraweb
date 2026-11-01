from __future__ import annotations

from fastapi import APIRouter, Request, Response, status

from blakrasocial.api.dependencies import ContainerDep

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
_MAX_BODY = 256 * 1024


@router.post("/ayrshare", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
async def ayrshare_webhook(request: Request, container: ContainerDep) -> Response:
    raw = await request.body()
    if len(raw) > _MAX_BODY:
        return Response(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    await container.handle_webhook().execute(raw, dict(request.headers))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
