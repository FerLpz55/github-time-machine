# GitHub Time Machine Core Backend

The `backend` service is the core application API for GitHub Time Machine. It handles repository submission, repository status, persisted chat history, CORS, and Supabase access for the application workflow.

## Responsibilities

- Create repository records from submitted GitHub URLs.
- Create and read analysis status records.
- List repositories with latest analysis status.
- Return repository status details, including indexed file and commit counts.
- Store and retrieve repository chat history.
- Centralize Supabase client configuration.

## Technologies

- FastAPI and Uvicorn for the API server.
- Pydantic models for request and response contracts.
- Supabase Python client for database access.
- `python-dotenv` for local environment configuration.

## Folder Structure

```text
backend/
├── app/
│   ├── main.py             # FastAPI app and router registration
│   ├── core/
│   │   ├── config.py       # Environment configuration
│   │   └── supabase.py     # Supabase client factory
│   ├── models/
│   │   ├── schemas.py      # API request/response schemas
│   │   ├── tables.py       # Database table models
│   │   └── embeddings.py   # Embedding-related models
│   └── routes/
│       ├── health.py       # Health route
│       └── repositories.py # Repository and chat routes
├── main.py
└── requirements.txt
```

## How To Run

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

On Windows, activate the virtual environment with:

```bash
venv\Scripts\activate
```

## Environment

Configure these values in `backend/.env`:

```bash
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_KEY=your-service-role-key
CORS_ORIGINS=http://localhost:3000
```

The backend expects Supabase tables for repositories, analyses, files, commits, and chat history to exist.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Backend health check |
| `POST` | `/repositories/` | Submit a repository URL and create a pending analysis |
| `GET` | `/repositories/` | List repositories with latest status |
| `GET` | `/repositories/{repo_id}` | Get repository analysis status and counts |
| `POST` | `/repositories/{repo_id}/chat` | Store a placeholder repository chat response |
| `GET` | `/repositories/{repo_id}/chat` | Read repository chat history |

## Important Notes

- This service currently stores a placeholder chat answer. AI-generated chat belongs in the `ai` service.
- Supabase credentials are required before repository routes can operate.
- The repository analysis worker is not part of this service yet; submitted repositories are created with `pending` analysis state.
