# Auditoria Backend — GitHub Time Machine

## Arquitectura General

La estructura del proyecto es solida: separacion en `routes/`, `services/`, `models/`, `core/`, uso de Pydantic para validacion, tree-sitter para parsing, RLS en la base de datos, y proteccion contra prompt injection.

---

## Problemas Criticos

### 1. Schema desincronizado con el codigo

El codigo escribe columnas que no existen en `database/complete_schema.sql`.

La tabla `commits` en el schema solo tiene: `id`, `repository_id`, `commit_sha`, `author`, `message`, `commit_date`.

Pero `app/services/commit_analyzer.py:67-77` inserta columnas adicionales que no existen:
- `author_email`
- `committer_name`
- `committer_email`
- `summary`

**Impacto:** Las inserciones fallan en produccion.

**Fix:** Agregar las columnas faltantes al schema SQL o ajustar el modelo `Commit` en `tables.py` y las queries.

---

### 2. Doble actualizacion de estado (race condition)

`RepoAnalyzer.analyze()` y `CommitAnalyzer.extract_and_store()` ambos setean el estado de `analyses` a `"processing"` y `"completed"`.

Flujo actual:
1. `RepoAnalyzer.analyze()` → setea `"processing"` (linea 64)
2. `CommitAnalyzer.extract_and_store()` → setea `"processing"` otra vez (linea 27-30)
3. `CommitAnalyzer` termina → setea `"completed"` (linea 92-95)
4. `RepoAnalyzer` continua → setea `"completed"` otra vez (linea 74-78)

**Impacto:** El estado se sobreescribe dos veces. Si `CommitAnalyzer` falla, el estado queda en `"error"` pero `RepoAnalyzer` podria sobreescribirlo.

**Fix:** Un unico responsable del estado. `CommitAnalyzer` no deberia tocar el estado de `analyses`.

---

### 3. Codigo muerto — metodos que nunca se llaman

En `app/services/repo_analyzer.py`:
- `_parse_and_store_symbols()` (linea 319) — nunca se invoca desde `analyze()`
- `_build_edges_from_imports()` (linea 363) — nunca se invoca desde `analyze()`

El endpoint `/graph` en `repositories.py:374-439` usa regex (`_extract_imports`) en vez de los datos ya parseados con tree-sitter.

**Impacto:** El knowledge graph no usa los datos estructurados de tree-sitter. Hay logica duplicada y desperdiciada.

**Fix:** Conectar el pipeline de tree-sitter al endpoint `/graph`, o eliminar el codigo muerto.

---

### 4. Auth inconsistente entre rutas

- `app/routes/repos.py` — Valida JWT de Supabase correctamente via `Authorization: Bearer <token>`.
- `app/routes/repositories.py` — Usa un demo user hardcoded (`_get_demo_user_id()`) sin autenticacion real.

Las RLS policies de la BD requieren `auth.uid()` pero el backend usa `service_role` que bypassa todas las policies.

**Impacto:** Cualquier persona puede acceder a cualquier repositorio sin autenticacion. Las RLS policies son inutiles con `service_role`.

**Fix:** Unificar la autenticacion. Si se usa `service_role`, las RLS policies no aplican y se debe filtrar por `user_id` en cada query.

---

## Problemas Moderados

### 5. Rate limiter en memoria — no escala y tiene memory leak

`app/core/rate_limit.py`:
- Almacena timestamps en memoria (`defaultdict(list)`).
- No funciona con multiples workers/procesos (cada uno tiene su propio contador).
- Las entradas antiguas nunca se limpian completamente = memory leak.

**Fix:** Usar Redis o un store compartido. Agregar limpieza periodica de entries expiradas.

---

### 6. Cliente Supabase sincrono en rutas async

El cliente de Supabase (`supabase-py`) es sincrono pero se usa dentro de handlers `async def`. Esto bloquea el event loop de FastAPI.

**Impacto:** Baja concurrencia bajo carga. Cada query de Supabase bloquea todas las peticiones concurrentes.

**Fix:** Usar `asyncio.to_thread()` para las llamadas sincronas, o migrar al cliente async de Supabase.

---

### 7. Cliente OpenAI no es singleton

En `chat_service.py:53` y `repo_analyzer.py:421` se crea un nuevo `OpenAI()` en cada llamada.

**Impacto:** overhead innecesario de inicializacion y conexiones HTTP.

**Fix:** Crear una instancia compartida en `app/core/` o como dependencia de FastAPI.

---

### 8. Embeddings se actualizan uno por uno

`_generate_and_store_embeddings()` en `repo_analyzer.py:416-433` actualiza cada fila individualmente:
```python
for item, emb_data in zip(batch, response.data):
    self.supabase.table("files").update({...}).eq("id", item["id"]).execute()
```

**Impacto:** N queries individuales en vez de 1 batch upsert.

**Fix:** Usar `upsert()` con lista de registros.

---

### 9. `_validate_url` inconsistente

En `repo_analyzer.py:97-104`:
- Si la URL es None → lanza `ValueError`
- Si la URL es invalida → lanza `ValueError`
- Si es valida → retorna `True`

En `repositories.py:72`:
```python
if not RepoAnalyzer._validate_url(injected_url=body.github_url):
    raise HTTPException(...)
```

El caller verifica el return value, pero la funcion lanza excepcion en vez de retornar `False`. El `if not` nunca se ejecuta.

**Fix:** Retornar `bool` consistentemente o lanzar excepcion consistentemente.

---

### 10. Background task puede dejar estado en "processing" para siempre

`_run_analysis()` en `repositories.py:56-62`:
```python
def _run_analysis(repository_id, github_url):
    try:
        analyzer = RepoAnalyzer(repository_id, github_url)
        result = analyzer.analyze()
    except Exception as e:
        logger.error(...)
```

Si la excepcion ocurre antes de que `_set_status("error")` se ejecute (ej: fallo en `_clone()`), el estado queda en `"processing"` indefinidamente.

**Fix:** Agregar un `finally` block o timeout para resetear estados stuck.

---

## Detalles Menores

| Ubicacion | Problema |
|-----------|----------|
| `rate_limit.py:6` | `__import__("os")` en vez de `import os` |
| `schemas.py:36` | `datetime.utcnow()` deprecado en Python 3.12+ |
| `repositories.py:374-439` | `/graph` hace O(files x imports x files) con string matching |
| `config.py` | No hay logging configurado (level, format, handlers) |
| No hay tests | Ningun test unitario o de integracion |
| `repositories.py` y `repos.py` | Dos routers con prefijos `/repositories` y `/repos` — confusion de naming |

---

## Resumen

| Categoria | Cantidad |
|-----------|----------|
| Criticos | 4 |
| Moderados | 6 |
| Menores | 6 |

**Veredicto:** La base es buena — estructura, schema SQL (RLS, indexes, constraints), proteccion de prompts, tree-sitter. Pero los problemas de sincronizacion schema/codigo, auth a medias, y bloqueo del event loop son blockers para produccion.
