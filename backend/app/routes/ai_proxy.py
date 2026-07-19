import logging
from uuid import UUID

import httpx
from fastapi import APIRouter, Request, HTTPException
from starlette.responses import Response

logger = logging.getLogger(__name__)

AI_SERVICE_URL = "http://skillful-growth.railway.internal:8080"

router = APIRouter(prefix="/repositories/{repo_id}", tags=["ai_proxy"])


async def _proxy(verb: str, repo_id: str, path: str, request: Request):
    qs = request.url.query
    ai_path = f"/repos/{repo_id}/{path}{f'?{qs}' if qs else ''}"
    url = f"{AI_SERVICE_URL}{ai_path}"

    body = None
    if verb in ("POST", "PUT", "PATCH"):
        body = await request.body()

    incoming_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length")
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.request(verb, url, content=body, headers=incoming_headers)
        except httpx.TimeoutException:
            logger.error(f"AI proxy timeout ({verb} {url})")
            raise HTTPException(status_code=504, detail="AI service timeout")
        except httpx.RequestError as e:
            logger.error(f"AI proxy error ({verb} {url}): {e}")
            raise HTTPException(status_code=502, detail="AI service unreachable")

    response_headers = {
        k: v for k, v in resp.headers.items()
        if k.lower() not in ("content-encoding", "transfer-encoding", "content-length")
    }

    return Response(
        status_code=resp.status_code,
        content=resp.content,
        headers=response_headers,
        media_type=resp.headers.get("content-type"),
    )


@router.get("/heatmap")
async def proxy_heatmap(repo_id: UUID, request: Request):
    return await _proxy("GET", str(repo_id), "heatmap", request)


@router.get("/file_health")
async def proxy_file_health(repo_id: UUID, request: Request):
    return await _proxy("GET", str(repo_id), "file_health", request)


@router.post("/impact")
async def proxy_impact(repo_id: UUID, request: Request):
    return await _proxy("POST", str(repo_id), "impact", request)


@router.post("/bug_origin")
async def proxy_bug_origin(repo_id: UUID, request: Request):
    return await _proxy("POST", str(repo_id), "bug_origin", request)


@router.post("/refactor_plan")
async def proxy_refactor_plan(repo_id: UUID, request: Request):
    return await _proxy("POST", str(repo_id), "refactor_plan", request)
