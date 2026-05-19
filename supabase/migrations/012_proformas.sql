-- ============================================================
-- Migration 012: tabla proformas (facturas de anticipo no fiscales)
-- Estructura paralela a quotes/invoices. Idempotente.
-- ============================================================

create table if not exists public.proformas (
  id text primary key,
  number text not null,
  client_id text references public.contacts(id) on delete set null,
  concept text,
  amount numeric(12,2) not null default 0,        -- total con IVA
  vat_pct numeric(5,2) not null default 21,
  status text not null default 'pendiente'
    check (status in ('pendiente','facturada','cobrada','vencida')),
  issue_date date not null,
  valid_until date,
  linked_quote_id text references public.quotes(id) on delete set null,
  linked_invoice_id text references public.invoices(id) on delete set null,
  internal_note text,
  lines jsonb default '[]'::jsonb,
  terms text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists proformas_status_idx     on public.proformas (status);
create index if not exists proformas_client_idx     on public.proformas (client_id);
create index if not exists proformas_issue_idx      on public.proformas (issue_date);
create index if not exists proformas_linked_inv_idx on public.proformas (linked_invoice_id);

alter table public.proformas disable row level security;

drop trigger if exists proformas_touch on public.proformas;
create trigger proformas_touch before update on public.proformas
  for each row execute function public.touch_updated_at();
