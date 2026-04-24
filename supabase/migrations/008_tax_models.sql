-- ============================================================
-- Migration 008: tabla tax_models (modelos fiscales: 303, 130, 111, 190, etc.)
-- Ejecuta en el SQL Editor de Supabase. Idempotente.
-- ============================================================

create table if not exists public.tax_models (
  id text primary key,
  code text not null,              -- "303", "130", "111", "190"…
  name text not null,              -- "Modelo 303"
  description text,                -- "IVA trimestral"
  period text not null,            -- "Q1 2026", "2025"
  due_date date not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'pendiente' check (status in ('pendiente','presentado','aplazado')),
  presented_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tax_models_status_idx on public.tax_models (status);
create index if not exists tax_models_due_idx on public.tax_models (due_date);

alter table public.tax_models disable row level security;

drop trigger if exists tax_models_touch on public.tax_models;
create trigger tax_models_touch before update on public.tax_models
  for each row execute function public.touch_updated_at();
