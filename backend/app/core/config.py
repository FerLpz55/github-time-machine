import os

from dotenv import load_dotenv

load_dotenv()

# ── Supabase ──────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# ── CORS ──────────────────────────────────────────────────────────────
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

# ── Embeddings / pgvector ─────────────────────────────────────────────
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "1536"))
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

# ── Repository Analysis ───────────────────────────────────────────────
ANALYSIS_MAX_FILE_SIZE = int(os.getenv("ANALYSIS_MAX_FILE_SIZE", str(1_000_000)))
ANALYSIS_EMBED_BATCH_SIZE = int(os.getenv("ANALYSIS_EMBED_BATCH_SIZE", "20"))
ANALYSIS_CLONE_DEPTH = int(os.getenv("ANALYSIS_CLONE_DEPTH", "1"))

# ── Analysis filter constants (centralized, single source of truth) ───
ANALYSIS_EXCLUDE_DIRS: set[str] = {
    ".git", "node_modules", "venv", ".venv", "__pycache__",
    "dist", "build", ".next", ".turbo", "target", "vendor",
    ".idea", ".vscode", ".DS_Store",
}

ANALYSIS_SKIP_EXTENSIONS: set[str] = {
    ".min.js", ".bundle.js", ".map", ".lock", ".pyc", ".pyo",
    ".bin", ".exe", ".dll", ".so", ".dylib", ".class",
    ".jar", ".war", ".zip", ".tar", ".gz", ".bz2", ".7z",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv",
    ".ttf", ".woff", ".woff2", ".eot", ".otf",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
}

ANALYSIS_SOURCE_EXTENSIONS: set[str] = {".py", ".js", ".ts", ".tsx", ".jsx"}

EXTENSION_LANGUAGE_MAP: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "typescriptreact",
    ".jsx": "javascriptreact",
}
