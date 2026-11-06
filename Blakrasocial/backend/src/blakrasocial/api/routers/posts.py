from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Path, Query, Response, status

from blakrasocial.api.dependencies import ContainerDep, IdempotencyDep, ProfileDep
from blakrasocial.api.schemas.posts import (
    PostListResponse,
    PostStatusOut,
    PublishPostRequest,
    PublishPostResponse,
)
from blakrasocial.application.dto import ListPostsQuery
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.value_objects import PostId

router = APIRouter(prefix="/posts", tags=["posts"])
PostIdPath = Annotated[str, Path(min_length=1, max_length=128, pattern=r"^[A-Za-z0-9_\-]+$")]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Publish now or schedule (send scheduleAt) to one or more networks",
)
async def publish(
    body: PublishPostRequest,
    profile: ProfileDep,
    key: IdempotencyDep,
    container: ContainerDep,
    response: Response,
) -> PublishPostResponse:
    command = body.to_command()
    use_case = container.schedule_post() if command.schedule_at else container.publish_post()
    outcome = await use_case.execute(profile, command, key)
    if outcome.replayed:
        response.headers["Idempotent-Replayed"] = "true"
    return PublishPostResponse.from_outcome(outcome)


@router.get("", summary="Recent posts with per-network status")
async def list_posts(
    profile: ProfileDep,
    container: ContainerDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    platform: Platform | None = None,
    last_days: Annotated[int, Query(alias="lastDays", ge=1, le=365)] = 30,
) -> PostListResponse:
    page = await container.list_posts().execute(profile, ListPostsQuery(limit, platform, last_days))
    return PostListResponse(items=[PostStatusOut.from_domain(p) for p in page.items], total=page.total)


@router.get("/{post_id}", summary="Status per network")
async def get_post(post_id: PostIdPath, profile: ProfileDep, container: ContainerDep) -> PostStatusOut:
    return PostStatusOut.from_domain(await container.get_post_status().execute(profile, PostId(post_id)))


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete or cancel a post")
async def delete_post(post_id: PostIdPath, profile: ProfileDep, container: ContainerDep) -> Response:
    await container.delete_post().execute(profile, PostId(post_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
