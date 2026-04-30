-- ============================================================
-- Migration 009: client_portal_access
--   Acceso de los clientes a su portal personal.
--   Cada cliente tiene un token único (no adivinable) y unas
--   credenciales username/password.
--   Ejecuta en el SQL Editor de Supabase. Idempotente.
-- ============================================================

create table if not exists public.client_portal_access (
  id text primary key,
  client_id text not null references public.client_spaces(id) on delete cascade,
  token text not null unique,           -- UUID que va en el enlace público
  username text not null,
  password text not null,               -- ⚠️ plain-text por simplicidad (uso interno)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_login_at timestamptz
);

create index if not exists client_portal_access_token_idx on public.client_portal_access (token);
create index if not exists client_portal_access_client_idx on public.client_portal_access (client_id);

-- 1 solo registro por cliente (evita duplicados)
create unique index if not exists client_portal_access_client_unique
  on public.client_portal_access (client_id);

alter table public.client_portal_access disable row level security;

drop trigger if exists client_portal_access_touch on public.client_portal_access;
create trigger client_portal_access_touch before update on public.client_portal_access
  for each row execute function public.touch_updated_at();
