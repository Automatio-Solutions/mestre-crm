-- ============================================================
-- Migration 002: tabla quotes (presupuestos / pipeline comercial)
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Es idempotente: lo puedes re-ejecutar sin perder datos.
-- ============================================================

create table if not exists public.quotes (
  id text primary key,
  number text not null,
  client_id text references public.contacts(id) on delete set null,
  concept text,
  amount numeric(12,2) not null default 0,
  status text not null default 'borrador' check (status in ('borrador','enviado','negociando','aceptado','rechazado')),
  issue_date date not null,
  expire_date date,
  owner text,
  probability int not null default 0,
  viewed boolean not null default false,
  view_count int not null default 0,
  accepted_date date,
  rejected_date date,
  reject_reason text,
  internal_note text,
  source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists quotes_status_idx on public.quotes (status);
create index if not exists quotes_client_idx on public.quotes (client_id);
create index if not exists quotes_issue_idx  on public.quotes (issue_date);

-- RLS desactivado por ahora (single-user)
alter table public.quotes disable row level security;

-- Trigger para updated_at (la función touch_updated_at ya existe desde schema.sql)
drop trigger if exists quotes_touch on public.quotes;
create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();
