<div align="center">

# GitHub Time Machine

### Engineering intelligence dashboard — ask questions about any codebase, travel through commit history, find technical debt and simulate risky changes.

[![Next.js 15](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/GPT--5.6-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)

[![Frontend](https://img.shields.io/badge/LIVE_FRONTEND-github--time--machine--taupe.vercel.app-22c55e?style=flat-square)](https://github-time-machine-taupe.vercel.app)
[![Backend](https://img.shields.io/badge/LIVE_BACKEND-railway.app-78716c?style=flat-square)](https://github-time-machine-production.up.railway.app)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

> *"Every codebase has a story. Most teams just can't read it."*

We built GitHub Time Machine because we've all been there — staring at a legacy codebase with zero documentation, wondering why that one file has 47 commits by someone who left two years ago. Engineering knowledge gets lost in commit messages, stale wikis, and tribal memory. We wanted to fix that.

---

# ENGLISH VERSION

## What it does

GitHub Time Machine is an engineering intelligence dashboard. You point it at any public GitHub repo, and it builds a living map of your codebase:

- **Ask questions about the architecture** — the AI reads the actual source files, README, and commit history to answer
- **See the dependency graph** — a force-directed visual showing how files and modules connect
- **Travel through time** — a commit timeline that highlights fixes, merges, and architectural shifts
- **Find the debt** — a heatmap ranking every file by complexity, churn, and risk
- **Simulate changes** — "What happens if I refactor this file?" with blast radius analysis
- **Trace bugs to their origin** — the AI analyzes fix commits and points to the likely culprit
- **Get a refactoring plan** — based on actual commit patterns in your repo

Everything runs on real data. No mocks. No demos. You submit a GitHub URL, the pipeline clones it, parses every file with Tree-sitter, extracts functions and import edges, indexes commits, and stores it all in Supabase.

## How we built it

### The stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | Next.js 15, React 19, Tailwind, Canvas | Fast SSR, glass-morphism UI, force-directed graph rendering |
| Backend | FastAPI | Single service handling repos, analysis, auth, and AI — no microservice complexity |
| Database | Supabase (PostgreSQL) | Real-time, RLS, serverless — perfect for a hackathon |
| AI | GPT-5.6 via OpenAI | Powers every intelligent feature |
| Deployment | Railway (backend) + Vercel (frontend) | Zero-config deploys from git pushes |

### How we used Codex + GPT-5.6

**Codex (GitHub Copilot / OpenAI Codex) was our sixth team member.** Throughout the entire hackathon, we used Codex to:

- **Scaffold the FastAPI routes** — Copilot generated the initial endpoint structure, parameter validation with Pydantic, and async patterns. We then refined each route for our specific Supabase schema.
- **Write the Tree-sitter integration** — symbol extraction for Python and JavaScript is complex. Codex handled the grammar queries while we focused on the pipeline orchestration.
- **Debug database queries** — when edge case Supabase queries failed, Copilot suggested the correct OR filters and upsert strategies.
- **Generate the Canvas force-directed graph** — the physics simulation (repulsion, attraction, gravity) was pair-programmed with Codex, iterating on damping coefficients and layout quality.
- **Handle CORS and auth edge cases** — the GitHub OAuth flow with state validation, redirect URI matching, and Supabase session exchange was built alongside Copilot suggestions.
- **Write tests and error handling** — every endpoint has fallback responses. Codex helped ensure no unhandled exceptions would crash the deployed service.

**GPT-5.6 powers the product itself:**

| Feature | GPT-5.6 Role |
|---------|-------------|
| Architect's Memory (Chat) | Grounded Q&A using real repository context — files, README, commits |
| Change Intelligence | Analyzes dependency edges and computes blast radius with risk scoring |
| Bug Origin | Reads fix commits, correlates patterns, identifies the culprit SHA |
| Refactor Planner | Studies commit history and generates actionable step-by-step plans |
| Impact Simulation | Combines graph traversal + AI analysis for "what breaks?" scenarios |

The key insight: we didn't bolt AI onto an existing tool. **The product cannot exist without GPT-5.6.** Every analysis panel that adds real value depends on the model's ability to understand code structure, infer relationships from commit messages, and generate engineering insights that a static analysis tool alone could never produce.

### Architecture

```
┌─────────────────────────────────────────┐
│             Vercel (Frontend)             │
│  Next.js 15 · glass UI · Canvas graph    │
│  Landing page · Dashboard · Auth         │
└──────────────┬──────────────────────────┘
               │  HTTPS
┌──────────────▼──────────────────────────┐
│           Railway (Backend)               │
│  FastAPI · tree-sitter · GitPython       │
│  15 endpoints · rate limiting · CORS     │
└──────────────┬──────────────────────────┘
               │  PostgreSQL
┌──────────────▼──────────────────────────┐
│           Supabase (Database)             │
│  users · repos · commits · files          │
│  edges · chat_history · analyses         │
└──────────────┬──────────────────────────┘
               │  API
┌──────────────▼──────────────────────────┐
│         OpenAI (GPT-5.6 + Codex)          │
│  chat · impact · bug_origin · refactor   │
└─────────────────────────────────────────┘
```

## Getting started

### Prerequisites

- Node.js 18+, Python 3.10+
- OpenAI API key (GPT-5.6)
- Supabase project
- GitHub OAuth App (for login)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Then run `backend/database/complete_schema.sql` in the Supabase SQL Editor.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### Live deployments

- **Backend**: `https://github-time-machine-production.up.railway.app`
- **Frontend**: `https://github-time-machine-taupe.vercel.app`

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/repositories/` | Submit a repo for analysis |
| `GET` | `/repositories/` | List analyzed repos |
| `GET` | `/repositories/{id}` | Status + metadata |
| `GET` | `/repositories/{id}/graph` | Dependency graph |
| `GET` | `/repositories/{id}/timeline` | Commit timeline |
| `GET` | `/repositories/{id}/heatmap` | Technical debt |
| `GET` | `/repositories/{id}/file_health` | Per-file health |
| `POST` | `/repositories/{id}/chat` | AI chat |
| `POST` | `/repositories/{id}/impact` | Change simulation |
| `POST` | `/repositories/{id}/bug_origin` | Bug tracker |
| `POST` | `/repositories/{id}/refactor_plan` | Refactor planner |
| `POST` | `/repos/connect` | GitHub OAuth sync |

## What makes this a strong submission

- **AI is the core, not an add-on** — remove GPT-5.6 and the product loses chat, impact analysis, bug origin, and refactor planning. Those four panels are what make the dashboard useful.
- **Codex was used throughout development** — scaffolding, debugging, optimization, edge cases. We coded alongside it, not against it.
- **It's real and working** — deployed on Railway and Vercel. Demo with any public GitHub repo. No smoke and mirrors.
- **It solves a genuine problem** — every engineer has struggled with undocumented codebases. This gives you answers, not just data.
- **Polished UX** — glass-morphism dark theme, force-directed graph, smooth animations. It feels like a product, not a proof of concept.

## Team

We built this in 48 hours for the OpenAI Build Week Hackathon.

| Name | Role | GitHub |
|------|------|--------|
| Sai Karthik | PM — architecture, AI prompt design, testing, demo | @sai-karthik-dev |
| Anmol | Frontend — components, auth, responsive design | @pvtt-anmol2 |
| Pranto | Backend — FastAPI, AI orchestration, Railway | @foysalpranto121 |
| Fernando | Backend — Git analysis, API architecture, endpoints, Vercel | @FerLpz55 |
| Vijay | Database — Supabase, schema, RLS, indexes | @vjbabu3 |
| Rachana | Frontend — UI redesign, landing page, theming | @adhikaryrachana00428-hash |

## License

MIT

---

# VERSIÓN EN ESPAÑOL

## Qué hace

GitHub Time Machine es un dashboard de inteligencia de ingeniería. Le apuntas cualquier repositorio público de GitHub y construye un mapa vivo de tu código:

- **Haz preguntas sobre la arquitectura** — la IA lee los archivos fuente reales, el README y el historial de commits para responder
- **Ve el grafo de dependencias** — una visualización dirigida por fuerzas que muestra cómo se conectan archivos y módulos
- **Viaja en el tiempo** — una línea de tiempo de commits que resalta fixes, merges y cambios arquitectónicos
- **Encuentra la deuda técnica** — un heatmap que rankea cada archivo por complejidad, churn y riesgo
- **Simula cambios** — "¿Qué pasa si refactorizo este archivo?" con análisis de radio de impacto
- **Rastrea bugs hasta su origen** — la IA analiza los commits de fix y apunta al culpable probable
- **Obtén un plan de refactorización** — basado en los patrones reales de commits de tu repo

Todo corre con datos reales. Sin mocks. Sin demos. Envías una URL de GitHub, el pipeline la clona, parsea cada archivo con Tree-sitter, extrae funciones y aristas de imports, indexa commits y lo guarda todo en Supabase.

## Cómo lo construimos

### El stack

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | Next.js 15, React 19, Tailwind, Canvas | SSR rápido, UI glass-morphism, renderizado del grafo dirigido por fuerzas |
| Backend | FastAPI | Un solo servicio para repos, análisis, auth e IA — sin complejidad de microservicios |
| Base de datos | Supabase (PostgreSQL) | Tiempo real, RLS, serverless — perfecto para un hackathon |
| IA | GPT-5.6 vía OpenAI | Potencia cada funcionalidad inteligente |
| Deploy | Railway (backend) + Vercel (frontend) | Deploys sin configuración desde git push |

### Cómo usamos Codex + GPT-5.6

**Codex (GitHub Copilot / OpenAI Codex) fue nuestro sexto integrante.** Durante todo el hackathon usamos Codex para:

- **Scaffoldear las rutas de FastAPI** — Copilot generó la estructura inicial de endpoints, validación de parámetros con Pydantic y patrones async. Después refinamos cada ruta para nuestro schema de Supabase.
- **Escribir la integración con Tree-sitter** — la extracción de símbolos para Python y JavaScript es compleja. Codex manejó las consultas de gramática mientras nosotros orquestábamos el pipeline.
- **Depurar consultas de base de datos** — cuando fallaban casos borde de Supabase, Copilot sugería los filtros OR y las estrategias de upsert correctas.
- **Generar el grafo dirigido por fuerzas en Canvas** — la simulación física (repulsión, atracción, gravedad) se programó en par con Codex, iterando sobre coeficientes de amortiguación y calidad del layout.
- **Manejar casos borde de CORS y auth** — el flujo de OAuth de GitHub con validación de estado, coincidencia de redirect URI e intercambio de sesión con Supabase se construyó junto con sugerencias de Copilot.
- **Escribir tests y manejo de errores** — cada endpoint tiene respuestas de fallback. Codex ayudó a garantizar que ninguna excepción no manejada rompiera el servicio desplegado.

**GPT-5.6 potencia el producto en sí:**

| Función | Rol de GPT-5.6 |
|---------|---------------|
| Architect's Memory (Chat) | Q&A con contexto real del repositorio — archivos, README, commits |
| Change Intelligence | Analiza aristas de dependencias y calcula radio de impacto con scoring de riesgo |
| Bug Origin | Lee commits de fix, correlaciona patrones e identifica el SHA culpable |
| Refactor Planner | Estudia el historial de commits y genera planes accionables paso a paso |
| Impact Simulation | Combina recorrido del grafo + análisis de IA para escenarios de "¿qué se rompe?" |

La idea clave: no pegamos IA a una herramienta existente. **El producto no puede existir sin GPT-5.6.** Cada panel de análisis que aporta valor real depende de la capacidad del modelo de entender la estructura del código, inferir relaciones desde los mensajes de commit y generar insights de ingeniería que una herramienta de análisis estático jamás podría producir.

### Arquitectura

```
┌─────────────────────────────────────────┐
│             Vercel (Frontend)             │
│  Next.js 15 · glass UI · Canvas graph    │
│  Landing page · Dashboard · Auth         │
└──────────────┬──────────────────────────┘
               │  HTTPS
┌──────────────▼──────────────────────────┐
│           Railway (Backend)               │
│  FastAPI · tree-sitter · GitPython       │
│  15 endpoints · rate limiting · CORS     │
└──────────────┬──────────────────────────┘
               │  PostgreSQL
┌──────────────▼──────────────────────────┐
│           Supabase (Database)             │
│  users · repos · commits · files          │
│  edges · chat_history · analyses         │
└──────────────┬──────────────────────────┘
               │  API
┌──────────────▼──────────────────────────┐
│         OpenAI (GPT-5.6 + Codex)          │
│  chat · impact · bug_origin · refactor   │
└─────────────────────────────────────────┘
```

## Cómo empezar

### Requisitos previos

- Node.js 18+, Python 3.10+
- Clave de API de OpenAI (GPT-5.6)
- Proyecto de Supabase
- GitHub OAuth App (para el login)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Configura SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Después ejecuta `backend/database/complete_schema.sql` en el SQL Editor de Supabase.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Configura NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### Deploys en vivo

- **Backend**: `https://github-time-machine-production.up.railway.app`
- **Frontend**: `https://github-time-machine-taupe.vercel.app`

## Endpoints de la API

| Método | Ruta | Propósito |
|--------|------|-----------|
| `POST` | `/repositories/` | Enviar un repo para análisis |
| `GET` | `/repositories/` | Listar repos analizados |
| `GET` | `/repositories/{id}` | Estado + metadata |
| `GET` | `/repositories/{id}/graph` | Grafo de dependencias |
| `GET` | `/repositories/{id}/timeline` | Línea de tiempo de commits |
| `GET` | `/repositories/{id}/heatmap` | Deuda técnica |
| `GET` | `/repositories/{id}/file_health` | Salud por archivo |
| `POST` | `/repositories/{id}/chat` | Chat con IA |
| `POST` | `/repositories/{id}/impact` | Simulación de cambios |
| `POST` | `/repositories/{id}/bug_origin` | Rastreador de bugs |
| `POST` | `/repositories/{id}/refactor_plan` | Planificador de refactoring |
| `POST` | `/repos/connect` | Sincronización OAuth de GitHub |

## Por qué es una entrega fuerte

- **La IA es el núcleo, no un extra** — quita GPT-5.6 y el producto pierde chat, análisis de impacto, bug origin y planificación de refactoring. Esos cuatro paneles son los que hacen útil al dashboard.
- **Codex se usó durante todo el desarrollo** — scaffolding, debugging, optimización, casos borde. Codeamos a la par, no en contra.
- **Es real y funciona** — desplegado en Railway y Vercel. Demo con cualquier repo público de GitHub. Sin humo.
- **Resuelve un problema genuino** — todo ingeniero ha sufrido codebases sin documentar. Esto te da respuestas, no solo datos.
- **UX pulida** — tema oscuro glass-morphism, grafo dirigido por fuerzas, animaciones suaves. Se siente como producto, no como prueba de concepto.

## Equipo

Lo construimos en 48 horas para el OpenAI Build Week Hackathon.

| Nombre | Rol | GitHub |
|--------|-----|--------|
| Sai Karthik | PM — arquitectura, diseño de prompts de IA, testing, demo | @sai-karthik-dev |
| Anmol | Frontend — componentes, auth, diseño responsivo | @pvtt-anmol2 |
| Pranto | Backend — FastAPI, orquestación de IA, Railway | @foysalpranto121 |
| Fernando | Backend — análisis Git, arquitectura de API, endpoints, Vercel | @FerLpz55 |
| Vijay | Base de datos — Supabase, schema, RLS, índices | @vjbabu3 |
| Rachana | Frontend — rediseño de UI, landing page, theming | @adhikaryrachana00428-hash |

## Licencia

MIT
