-- ============================================================
-- Migration 005: tabla services (catálogo de servicios)
-- Ejecuta en el SQL Editor de Supabase. Idempotente.
-- ============================================================

create table if not exists public.services (
  id text primary key,
  name text not null,
  category text,
  description text,
  price numeric(12,2) not null default 0,
  vat numeric(5,2) not null default 21,
  active boolean not null default true,
  sort_order int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists services_active_idx on public.services (active);
create index if not exists services_category_idx on public.services (category);

alter table public.services disable row level security;

-- Reutiliza la función touch_updated_at creada en la migración 001
drop trigger if exists services_touch on public.services;
create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();
