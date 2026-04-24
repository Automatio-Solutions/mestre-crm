-- ============================================================
-- Migration 006: tabla purchases (gastos / facturas recibidas)
-- Ejecuta en el SQL Editor de Supabase. Idempotente.
-- ============================================================

create table if not exists public.purchases (
  id text primary key,
  supplier_id text references public.contacts(id) on delete set null,
  number text,
  concept text,
  category text,
  issue_date date not null,
  pay_date date,
  base numeric(12,2) not null default 0,
  vat_pct numeric(5,2) not null default 21,
  vat numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'pendiente' check (status in ('borrador','pendiente','pagada','vencida')),
  payment_method text default 'transferencia',
  source text default 'upload' check (source in ('upload','email','scan')),
  account text,
  lines jsonb default '[]'::jsonb,
  tags text[] default '{}',
  attachments text[] default '{}',
  internal_note text,
  doc_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists purchases_supplier_idx on public.purchases (supplier_id);
create index if not exists purchases_status_idx on public.purchases (status);
create index if not exists purchases_issue_idx on public.purchases (issue_date);

alter table public.purchases disable row level security;

drop trigger if exists purchases_touch on public.purchases;
create trigger purchases_touch before update on public.purchases
  for each row execute function public.touch_updated_at();
