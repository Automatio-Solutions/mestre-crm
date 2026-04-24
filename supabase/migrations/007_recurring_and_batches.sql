-- ============================================================
-- Migration 007: facturas recurrentes + remesas SEPA
-- Ejecuta en el SQL Editor de Supabase. Idempotente.
-- ============================================================

-- ---------------- Recurring invoices ----------------
create table if not exists public.recurring_invoices (
  id text primary key,
  client_id text references public.contacts(id) on delete set null,
  concept text,
  amount numeric(12,2) not null default 0,
  vat_pct numeric(5,2) not null default 21,
  frequency text not null default 'Mensual' check (frequency in ('Mensual','Trimestral','Anual')),
  next_date date,
  active boolean not null default true,
  issued_count int not null default 0,
  payment_method text default 'transferencia',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists recurring_invoices_active_idx on public.recurring_invoices (active);
create index if not exists recurring_invoices_next_idx on public.recurring_invoices (next_date);

alter table public.recurring_invoices disable row level security;

drop trigger if exists recurring_invoices_touch on public.recurring_invoices;
create trigger recurring_invoices_touch before update on public.recurring_invoices
  for each row execute function public.touch_updated_at();

-- ---------------- Payment batches (remesas SEPA) ----------------
create table if not exists public.payment_batches (
  id text primary key,
  ref text not null,
  date date not null default current_date,
  invoice_ids text[] default '{}',
  count int not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'generada' check (status in ('generada','enviada','cobrada','devuelta')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists payment_batches_status_idx on public.payment_batches (status);
create index if not exists payment_batches_date_idx on public.payment_batches (date);

alter table public.payment_batches disable row level security;

drop trigger if exists payment_batches_touch on public.payment_batches;
create trigger payment_batches_touch before update on public.payment_batches
  for each row execute function public.touch_updated_at();
