# GitHub Time Machine

GitHub Time Machine is an engineering intelligence platform for understanding how a repository changes over time. It combines repository metadata, commit history, code structure, and AI-assisted analysis so teams can answer architecture, impact, timeline, and technical debt questions from one interface.

## Problem Statement

Large codebases lose context quickly. Engineers inherit decisions that are spread across commits, files, issues, and tribal knowledge. Before making a change, they often need to understand which files are risky, why an architecture evolved, and what downstream behavior may break.

## Solution

GitHub Time Machine turns repository history into searchable and visual engineering context. The product indexes repository data, stores analysis state in Supabase, serves all repository workflows through a single FastAPI backend, and exposes the experience through a Next.js frontend with AI-powered panels.

## Features

- **Architect's Memory** — AI chat grounded in real repository data (files, commits, README)
- **Software DNA** — force-directed dependency graph with connection inspection
- **Architecture Timeline** — commit history with fix/merge detection and stats
- **Technical Debt Heatmap** — file-level debt scores with risk indicators
- **Change Intelligence** — blast radius simulator for proposed edits
- **Refactor Planner** — AI-generated refactoring plans from commit history
- **Bug Origin** — traces bugs to their likely origin commit
- **File Health** — per-file complexity, churn, and debt health badges
- **Repository Management** — submit any public GitHub repo URL for analysis

## Architecture

```
Frontend (Next.js 15, Vercel)
    │  landing page, dashboard, panels
    v
Backend (FastAPI, Railway)
    │  all endpoints in one service — repositories, analysis, AI orchestration
    │  tree-sitter parsing, OpenAI chat, GitPython, Supabase client
    v
Supabase (PostgreSQL)
    │  users, repositories, commits, files, analyses, chat_history, functions, edges
    v
OpenAI
    chat, impact, bug origin, refactor planning
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4, Heroicons, Canvas
- **Backend**: FastAPI, Pydantic, Supabase Python client, GitPython, Tree-sitter, OpenAI SDK, Jinja2
- **Database**: Supabase (PostgreSQL + pgvector)
- **Deployment**: Railway (backend), Vercel (frontend)

## Repository Structure

```
github-time-machine/
├── ai/              # Original AI service (deprecated — merged into backend/)
├── backend/         # Core FastAPI API — all endpoints
│   ├── app/
│   │   ├── core/        # Config, Supabase client, rate limiting
│   │   ├── models/      # Pydantic schemas for all endpoints
│   │   ├── routes/      # API endpoints (health, repos, repositories, ai_endpoints)
│   │   ├── services/    # Repo analyzer, chat, commit analyzer, file walker, etc.
│   │   └── prompts/     # Jinja2 templates for AI endpoints
│   └── database/        # SQL schema + migrations
├── data/            # Project data
├── docs/            # Documentation
└── frontend/        # Next.js web application
    └── app/
        ├── components/  # DashboardShell, GraphPanel, TimelinePanel, etc.
        ├── auth/        # GitHub OAuth callback
        ├── api/         # API route handlers
        ├── login/       # Login page
        └── repo/[id]/   # Dashboard page
```

## API Endpoints

All endpoints live at `https://github-time-machine-production.up.railway.app`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/repositories/` | Submit a GitHub URL for analysis |
| `GET` | `/repositories/` | List all analyzed repositories |
| `GET` | `/repositories/{id}` | Repository status + file/commit counts |
| `POST` | `/repositories/{id}/analyze` | Re-trigger analysis |
| `GET` | `/repositories/{id}/graph?depth=2` | Knowledge graph — file nodes + import edges |
| `GET` | `/repositories/{id}/timeline` | Commit timeline with fix/merge detection |
| `GET` | `/repositories/{id}/heatmap` | Technical debt heatmap |
| `GET` | `/repositories/{id}/file_health?path=...` | Per-file health score |
| `POST` | `/repositories/{id}/chat` | AI chat grounded in repository context |
| `GET` | `/repositories/{id}/chat` | Chat history |
| `POST` | `/repositories/{id}/impact` | Change impact simulator |
| `POST` | `/repositories/{id}/bug_origin` | Bug origin tracker |
| `POST` | `/repositories/{id}/refactor_plan` | AI refactoring plan |
| `POST` | `/repos/connect` | GitHub OAuth account sync |

## Quick Start

### Prerequisites

- Node.js 18+, Python 3.10+
- OpenAI API key
- Supabase project (URL + service key)
- GitHub OAuth App (Client ID + Secret)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — set SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Apply the database schema:
```bash
# Run backend/database/complete_schema.sql in Supabase SQL Editor
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=https://github-time-machine-production.up.railway.app
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (bypasses RLS) |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `CHAT_MODEL` | No | Chat model (default: `gpt-4o-mini`) |
| `CORS_ORIGINS` | No | Comma-separated origins (default: `*`) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth App secret |

## Deployment

### Backend (Railway)

- Root directory: `backend/`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`
- URL: `https://github-time-machine-production.up.railway.app`

### Frontend (Vercel)

- Framework: Next.js
- Root directory: `frontend/` (or monorepo root)
- Environment: `NEXT_PUBLIC_API_URL`
- URL: `https://github-time-machine-taupe.vercel.app`

## Design Patterns

| Pattern | Where | Why |
|---------|-------|-----|
| **Dependency Injection** | `Depends(get_db)` | Routes receive Supabase client, don't create it |
| **Facade** | `RepoAnalyzer.analyze()` | Orchestrates clone → walk → parse → store behind one call |
| **Strategy** | `SymbolExtractor` tree-sitter queries | Per-language parsing grammar |
| **Singleton** | `get_supabase()` | Single DB client per process |
| **Template Method** | Analysis pipeline | Fixed sequence: clone → walk → symbols → commits → persist |

## Team

| Name | Role | GitHub |
|------|------|--------|
| Sai Karthik | PM / Product Owner — repo mgmt, architecture, AI prompt design, integration testing, demo | @sai-karthik-dev |
| Anmol | Frontend — landing page, dashboard UI, auth screens, responsive design, component library | @pvtt-anmol2 |
| Foysal Ahmed Pranto | Backend — FastAPI setup, AI orchestration, auth API, Railway deployment | @foysalpranto121 |
| Fernando Rodríguez López | Backend — Git analysis, API architecture, AI endpoints, Vercel deployment, testing | @FerLpz55 |
| Vijay Babu | Database — Supabase setup, schema, connection pooling, backups | @vjbabu3 |
| Rachana | Frontend — UI redesign, landing page, dashboard theming | @adhikaryrachana00428-hash |

## License

MIT License. See `LICENSE` for details.
