# GitHub Time Machine — Core Backend

Single FastAPI service that handles repository analysis, AI orchestration, and user authentication.

## Architecture

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                   # App entry, CORS, router mounting, rate limiting
│   ├── dependencies.py           # FastAPI DI: get_db()
│   ├── utils.py                  # Shared: parse_github_url()
│   ├── core/
│   │   ├── config.py             # Env vars + analysis constants
│   │   ├── supabase.py           # Singleton Supabase client (service_role)
│   │   └── rate_limit.py         # 60 req/min per IP middleware
│   ├── models/
│   │   ├── schemas.py            # Repository, Chat, Graph, Timeline schemas
│   │   ├── tables.py             # DB table models
│   │   ├── embeddings.py         # FileEmbedding, CodeChunk
│   │   ├── heatmap.py            # DebtScore, HeatmapResponse
│   │   ├── health.py             # FileHealthScore
│   │   ├── impact.py             # ImpactRequest, ImpactResult, AffectedFile
│   │   ├── bug_origin.py         # BugOriginRequest, BugOriginResponse
│   │   └── refactor_plan.py      # RefactorPlanRequest, RefactorPlanResponse
│   ├── routes/
│   │   ├── health.py             # GET /health, GET /
│   │   ├── repositories.py       # Repo CRUD, graph, timeline, chat
│   │   ├── repos.py              # POST /repos/connect (GitHub OAuth)
│   │   └── ai_endpoints.py       # Heatmap, file_health, impact, bug_origin, refactor_plan
│   ├── services/
│   │   ├── repo_analyzer.py      # Facade — orchestrates analysis pipeline
│   │   ├── repo_cloner.py        # Validate URL + git clone
│   │   ├── file_walker.py        # Walk tree, filter vendored/binary files
│   │   ├── symbol_extractor.py   # Tree-sitter (functions/classes/imports)
│   │   ├── embedding_generator.py # OpenAI embeddings (optional)
│   │   ├── commit_analyzer.py    # GitPython extraction + Supabase upsert
│   │   └── chat_service.py       # OpenAI chat + prompt injection + moderation
│   └── prompts/
│       ├── impact_analysis.j2     # Change impact prompt template
│       ├── bug_origin.j2          # Bug origin prompt template
│       └── refactor_plan.j2       # Refactor plan prompt template
├── database/
│   ├── complete_schema.sql       # Full DDL (users, repos, commits, files, edges, etc.)
│   └── migration_functions_edges.sql
├── main.py                       # Entry: from app.main import app
├── pre_seed.py                   # Pre-seed demo repo into Supabase
├── Procfile                      # Railway start command
├── railway.json                  # Railway deploy config
├── nixpacks.toml                 # apt packages (git)
├── requirements.txt
└── .env.example
```

## Quick Start

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for Swagger UI.

## Environment

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | — | Service role key (bypasses RLS) |
| `OPENAI_API_KEY` | No | — | OpenAI key for chat + AI endpoints |
| `CHAT_MODEL` | No | `gpt-4o-mini` | Chat completion model |
| `CHAT_MAX_TOKENS` | No | `1024` | Max tokens per chat response |
| `CHAT_TEMPERATURE` | No | `0.4` | Chat temperature |
| `CORS_ORIGINS` | No | `*` | Comma-separated allowed origins |

## Endpoints

All endpoints use the prefix `https://github-time-machine-production.up.railway.app`

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/` | API info |

### Repositories

| Method | Path | Body/Query | Description |
|--------|------|------------|-------------|
| `POST` | `/repositories/` | `{"github_url": "..."}` | Submit repo for analysis |
| `GET` | `/repositories/` | — | List all repos |
| `GET` | `/repositories/{id}` | — | Status + file/commit counts |
| `POST` | `/repositories/{id}/analyze` | — | Re-trigger analysis |

### AI Panels

| Method | Path | Body/Query | Description |
|--------|------|------------|-------------|
| `GET` | `/repositories/{id}/graph?depth=2` | — | Knowledge graph (files + edges) |
| `GET` | `/repositories/{id}/timeline` | — | Commit timeline |
| `GET` | `/repositories/{id}/heatmap` | — | Technical debt heatmap |
| `GET` | `/repositories/{id}/file_health?path=...` | — | Per-file health score |
| `POST` | `/repositories/{id}/chat` | `{"repository_id": "...", "question": "..."}` | AI chat |
| `GET` | `/repositories/{id}/chat` | — | Chat history |
| `POST` | `/repositories/{id}/impact` | `{"target": "...", "change_type": "modify"}` | Change impact |
| `POST` | `/repositories/{id}/bug_origin` | `{"file_path": "..."}` | Bug origin |
| `POST` | `/repositories/{id}/refactor_plan` | `{"since_days": 30}` | Refactor plan |

### Auth

| Method | Path | Headers | Body | Description |
|--------|------|---------|------|-------------|
| `POST` | `/repos/connect` | `Authorization: Bearer <jwt>` | `{"github_access_token": "..."}` | Sync GitHub user |

## Database

Apply `database/complete_schema.sql` in Supabase SQL Editor before analyzing any repo. Tables:

- `users` — GitHub-authenticated users
- `repositories` — Analyzed repos with status
- `commits` — Commit history per repo
- `files` — Source files with paths and metadata
- `analyses` — Analysis run metadata
- `chat_history` — Persisted chat messages
- `functions` — Extracted functions/classes per file
- `edges` — Import/dependency edges between files

## Design Patterns

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Facade** | `RepoAnalyzer.analyze()` | Single call orchestrates clone → walk → symbols → commits |
| **Singleton** | `get_supabase()` | One DB client per process |
| **Strategy** | `SymbolExtractor` | Per-language tree-sitter queries |
| **DI** | `Depends(get_db)` | Routes receive client, don't create it |
| **Template Method** | Analysis pipeline | Fixed sequence delegated to collaborators |

## Deployment

Deployed on Railway via Nixpacks:
- Root: `backend/`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- URL: `https://github-time-machine-production.up.railway.app`

## Notes

- Run `database/complete_schema.sql` in Supabase before use — the `functions`/`edges` tables with UNIQUE constraints are required
- Without `OPENAI_API_KEY`, AI endpoints fall back gracefully
- Rate limit: 60 req/min per IP (health/docs bypassed)
- Pre-seed: `python pre_seed.py` clones a repo and runs full analysis locally
- RLS enabled on all tables; backend uses `service_role` key to bypass
