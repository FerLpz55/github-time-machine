# GitHub Time Machine AI Service

The `ai` service is the AI orchestration backend for GitHub Time Machine. It exposes FastAPI endpoints that turn repository data into architecture explanations, impact analysis, timelines, graphs, heatmaps, bug-origin hints, and refactor plans.

## Responsibilities

- Serve AI-focused repository intelligence APIs.
- Build prompts from request context and repository data.
- Call OpenAI for chat and analysis workflows.
- Provide a mock data provider for demo and local development.
- Keep AI logic separate from the core Supabase-backed application API.

## Technologies

- FastAPI and Uvicorn for the API server.
- OpenAI SDK for model calls.
- Jinja2 for prompt templates.
- Pydantic settings and models for typed configuration and payloads.
- SSE support for streaming chat responses.

## Folder Structure

```text
ai/
├── app/
│   ├── main.py          # FastAPI app entry point
│   ├── config.py        # Environment-backed settings
│   ├── dependencies.py  # Data provider and service dependencies
│   ├── mock/            # Demo repository data provider
│   ├── models/          # Pydantic request and response models
│   ├── prompts/         # Jinja2 prompt templates
│   ├── routers/         # API routes
│   └── services/        # OpenAI, prompt, cache, and health logic
├── Dockerfile
└── requirements.txt
```

## How To Run

```bash
cd ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

On Windows, activate the virtual environment with:

```bash
venv\Scripts\activate
```

Create `.env` when you need local configuration. Set `OPENAI_API_KEY` before using endpoints that call OpenAI. The service still exposes demo data endpoints without a database.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health and configuration status |
| `POST` | `/repos/{repo_id}/chat` | AI architecture and repository chat |
| `GET` | `/repos/{repo_id}/graph` | Knowledge graph data |
| `POST` | `/repos/{repo_id}/impact` | Change impact analysis |
| `GET` | `/repos/{repo_id}/timeline` | Repository timeline |
| `GET` | `/repos/{repo_id}/heatmap` | Technical debt heatmap |
| `POST` | `/repos/{repo_id}/bug_origin` | Bug origin analysis |
| `POST` | `/repos/{repo_id}/refactor_plan` | Refactor planning |

## Demo Mode

Use `repo_id = "demo"` for local development with mock repository data.

```bash
curl http://localhost:8001/repos/demo/graph?depth=2
curl http://localhost:8001/repos/demo/timeline
curl http://localhost:8001/repos/demo/heatmap
```

Chat requires an OpenAI key:

```bash
curl -X POST http://localhost:8001/repos/demo/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain the auth module", "stream": false}'
```

## Important Notes

- The current data provider is mock-backed. Replace it through `app/dependencies.py` when real indexed repository data is available.
- Prompt behavior lives in `app/prompts/`; keep prompt changes versioned and reviewed like code.
- The API docs are available at `http://localhost:8001/docs` when the service is running.
