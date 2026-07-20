import os
from fastapi import APIRouter, Depends, HTTPException, Request
from app.dependencies import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")


def require_admin(request: Request):
    """Verify admin token. Set ADMIN_TOKEN env var to enable admin endpoints."""
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Admin endpoints disabled. Set ADMIN_TOKEN env var.")
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {ADMIN_TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid or missing admin token")


@router.get("/users")
def list_users(supabase=Depends(get_db), _: None = Depends(require_admin)):
    users = supabase.table("users").select("id, github_id, username, email, created_at").execute()
    return {"users": users.data or []}


@router.delete("/users/{user_id}")
def delete_user(user_id: str, supabase=Depends(get_db), _: None = Depends(require_admin)):
    repos = supabase.table("repositories").select("id").eq("user_id", user_id).execute()
    if repos.data:
        for r in repos.data:
            rid = r["id"]
            supabase.table("commits").delete().eq("repository_id", rid).execute()
            supabase.table("files").delete().eq("repository_id", rid).execute()
            supabase.table("analyses").delete().eq("repository_id", rid).execute()
            supabase.table("chat_history").delete().eq("repository_id", rid).execute()
            supabase.table("edges").delete().eq("repository_id", rid).execute()
            supabase.table("functions").delete().eq("repository_id", rid).execute()
            supabase.table("repositories").delete().eq("id", rid).execute()
    supabase.table("users").delete().eq("id", user_id).execute()
    return {"deleted": user_id}
