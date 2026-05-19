-- ============================================================
-- Migration 014: Cuadro de cuentas + Libro diario (PGC español)
--
-- Dos conceptos distintos:
-- 1. chart_of_accounts: estructura/catálogo de cuentas (estático).
-- 2. journal_entries + journal_entry_lines: asientos contables
--    cronológicos con doble partida (suma debe = suma haber).
-- ============================================================

-- ------------------------------------------------------------
-- CUADRO DE CUENTAS — Plan General Contable
-- ------------------------------------------------------------
create table if not exists public.chart_of_accounts (
  id text primary key,
  code text not null unique,           -- código PGC, ej. "572", "430", "700"
  name text not null,
  account_type text not null
    check (account_type in ('activo','pasivo','patrimonio','ingreso','gasto')),
  group_code text,                     -- grupo PGC: "1"–"9"
  parent_code text,                    -- código de la cuenta padre (jerarquía)
  description text,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists chart_of_accounts_code_idx   on public.chart_of_accounts (code);
create index if not exists chart_of_accounts_type_idx   on public.chart_of_accounts (account_type);
create index if not exists chart_of_accounts_group_idx  on public.chart_of_accounts (group_code);
create index if not exists chart_of_accounts_parent_idx on public.chart_of_accounts (parent_code);

alter table public.chart_of_accounts disable row level security;

drop trigger if exists chart_of_accounts_touch on public.chart_of_accounts;
create trigger chart_of_accounts_touch before update on public.chart_of_accounts
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- LIBRO DIARIO — cabecera del asiento
-- ------------------------------------------------------------
create table if not exists public.journal_entries (
  id text primary key,
  number text not null unique,         -- ej. "A-0001"
  date date not null,
  description text,
  doc_ref text,                        -- referencia documento origen (FV xx, FC yy, etc.)
  source_type text,                    -- manual | invoice | purchase | payroll | bank
  source_id text,                      -- id del documento origen (opcional)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists journal_entries_date_idx   on public.journal_entries (date);
create index if not exists journal_entries_source_idx on public.journal_entries (source_type, source_id);

alter table public.journal_entries disable row level security;

drop trigger if exists journal_entries_touch on public.journal_entries;
create trigger journal_entries_touch before update on public.journal_entries
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- LIBRO DIARIO — líneas del asiento (partida doble)
-- ------------------------------------------------------------
create table if not exists public.journal_entry_lines (
  id text primary key,
  entry_id text not null references public.journal_entries(id) on delete cascade,
  line_no int not null,
  account_code text not null,          -- referencia "blanda" a chart_of_accounts.code
  concept text,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  created_at timestamptz default now()
);

create index if not exists journal_entry_lines_entry_idx   on public.journal_entry_lines (entry_id);
create index if not exists journal_entry_lines_account_idx on public.journal_entry_lines (account_code);

alter table public.journal_entry_lines disable row level security;
