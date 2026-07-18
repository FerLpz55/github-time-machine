-- ============================================================================
-- Migration: create functions + edges tables (Knowledge Graph)
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
--
-- Scoped on purpose: only touches the new `functions`/`edges` tables, so it
-- won't collide with existing policies on users/repositories/etc. like
-- re-running the whole complete_schema.sql would (CREATE POLICY has no
-- IF NOT EXISTS in Postgres).
--
-- This same DDL is already folded into complete_schema.sql (section 3), so a
-- fresh database created from that file doesn't need this migration too.
--
-- After running: if GET /repositories/{id}/graph still 500s with
-- "Could not find the table 'public.edges' in the schema cache" (PGRST205),
-- PostgREST's schema cache just hasn't refreshed yet — wait ~30s or force it
-- via Project Settings -> API -> "Reload schema", or:
--   NOTIFY pgrst, 'reload schema';
-- ============================================================================

create table if not exists functions (
    id uuid primary key default gen_random_uuid(),
    file_id uuid not null references files(id) on delete cascade,
    repository_id uuid not null references repositories(id) on delete cascade,
    name text not null,
    signature text,
    start_line integer not null,
    end_line integer not null,
    is_exported boolean default false,
    created_at timestamptz default now(),
    unique (file_id, name, start_line)
);

create table if not exists edges (
    id uuid primary key default gen_random_uuid(),
    repository_id uuid not null references repositories(id) on delete cascade,
    source_id uuid not null,
    target_id uuid not null,
    edge_type text not null
        check (edge_type in ('calls', 'imports', 'extends', 'implements', 'depends_on')),
    source_name text,
    target_name text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    unique (repository_id, source_id, target_id, edge_type)
);

create index if not exists idx_functions_repo on functions(repository_id);
create index if not exists idx_functions_file on functions(file_id);
create index if not exists idx_edges_repo on edges(repository_id);
create index if not exists idx_edges_source on edges(source_id);
create index if not exists idx_edges_target on edges(target_id);
create index if not exists idx_edges_type on edges(edge_type);

alter table functions force row level security;
alter table edges force row level security;

create policy "functions_select_own" on functions for select using (
    exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid())
);
create policy "functions_insert_own" on functions for insert with check (
    exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid())
);

create policy "edges_select_own" on edges for select using (
    exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid())
);
create policy "edges_insert_own" on edges for insert with check (
    exists (select 1 from repositories r where r.id = repository_id and r.user_id = auth.uid())
);
