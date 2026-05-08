-- ============================================================
-- Migration 010: agency_users
--   Multi-usuario para el login de la agencia.
--   Reemplaza la auth con env vars (que era para 1 solo usuario).
-- ============================================================

create table if not exists public.agency_users (
  id text primary key,
  email text not null unique,
  name text not null,
  password text not null,             -- ⚠️ plain-text por simplicidad (uso interno)
  user_ref text,                      -- referencia al ID en USERS (u1, u7…)
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_login_at timestamptz
);

create index if not exists agency_users_email_idx on public.agency_users (lower(email));

alter table public.agency_users disable row level security;

drop trigger if exists agency_users_touch on public.agency_users;
create trigger agency_users_touch before update on public.agency_users
  for each row execute function public.touch_updated_at();

-- IMPORTANTE: ejecuta ESTE INSERT por separado en el SQL Editor de Supabase
-- para crear el usuario inicial. Si quieres añadir a Noelia más adelante,
-- ejecuta otro INSERT similar.
--
-- insert into public.agency_users (id, email, name, password, user_ref) values
--   ('au-dani', 'info@danimestre.com', 'Dani Mestre', 'qekfjvqej73-', 'u1');
