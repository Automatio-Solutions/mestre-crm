-- ============================================================
-- Migration 013: tabla employees (empleados + nóminas v1)
--
-- Modelo simple para v1: cada empleado guarda directamente los
-- importes mensuales (bruto / neto / IRPF / SS patronal / SS trabajador).
-- Los totales mensuales de "Nóminas" se agregan sumando estos campos
-- de los empleados activos.
--
-- Más adelante podemos añadir una tabla `payrolls` (una fila por
-- empleado · mes) para soportar variaciones mensuales, pagas
-- extra, finiquitos, etc.
-- ============================================================

create table if not exists public.employees (
  id text primary key,
  name text not null,
  role text,
  contract_type text default 'Indefinido',
  active boolean not null default true,
  gross_month numeric(12,2) not null default 0,
  net_month numeric(12,2) not null default 0,
  irpf numeric(12,2) not null default 0,
  ss_employer numeric(12,2) not null default 0,
  ss_employee numeric(12,2) not null default 0,
  email text,
  dni text,
  hire_date date,
  end_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists employees_active_idx on public.employees (active);
create index if not exists employees_name_idx   on public.employees (name);

alter table public.employees disable row level security;

drop trigger if exists employees_touch on public.employees;
create trigger employees_touch before update on public.employees
  for each row execute function public.touch_updated_at();
