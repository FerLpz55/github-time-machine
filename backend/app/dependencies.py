from app.core.supabase import get_supabase
from supabase import Client


def get_db() -> Client:
    return get_supabase()
