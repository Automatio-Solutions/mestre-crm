-- ============================================================
-- Dani Mestre CRM — schema (Fase 1: tablas core)
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Es idempotente: lo puedes re-ejecutar sin perder datos.
-- ============================================================

-- ------------------------------------------------------------
-- CONTACTS (clientes + proveedores + leads)
-- ------------------------------------------------------------
create table if not exists public.contacts (
  id text primary key,
  type text not null check (type in ('cliente','proveedor','lead')),
  name text not null,
  nif text,
  email text,
  phone text,
  city text,
  tags text[] default '{}',
  facturado numeric(12,2) default 0,
  last_interaction date,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists contacts_type_idx on public.contacts (type);
create index if not exists contacts_status_idx on public.contacts (status);

-- ------------------------------------------------------------
-- CLIENT_SPACES (espacios tipo ClickUp por cliente)
-- ------------------------------------------------------------
create table if not exists public.client_spaces (
  id text primary key,
  contact_id text references public.contacts(id) on delete set null,
  name text not null,
  logo text,
  color text,
  sector text,
  description text,
  active_since text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- MODULES (módulos dentro de un client_space)
-- ------------------------------------------------------------
create table if not exists public.modules (
  id text not null,
  client_id text not null references public.client_spaces(id) on delete cascade,
  icon text,
  name text not null,
  last_updated timestamptz,
  created_at timestamptz default now(),
  primary key (client_id, id)
);
create index if not exists modules_client_idx on public.modules (client_id);

-- ------------------------------------------------------------
-- TASKS (con subtareas/comentarios/actividad en JSONB para ir rápido)
-- ------------------------------------------------------------
create table if not exists public.tasks (
  id text primary key,
  client_id text not null,
  module_id text not null,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'media',
  assignees text[] default '{}',
  tags text[] default '{}',
  start_date date,
  due_date date,
  progress int default 0,
  subtasks jsonb default '[]'::jsonb,
  checklists jsonb default '[]'::jsonb,
  comments jsonb default '[]'::jsonb,
  activity jsonb default '[]'::jsonb,
  custom_fields jsonb default '{}'::jsonb,
  time_tracked numeric,
  time_estimate numeric,
  attachments text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (client_id, module_id) references public.modules(client_id, id) on delete cascade
);
create index if not exists tasks_client_module_idx on public.tasks (client_id, module_id);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_idx on public.tasks (due_date);

-- ------------------------------------------------------------
-- INVOICES (ventas)
-- ------------------------------------------------------------
create table if not exists public.invoices (
  id text primary key,
  number text not null,
  client_id text references public.contacts(id) on delete set null,
  issue_date date not null,
  due_date date,
  base numeric(12,2) not null,
  vat_pct numeric(5,2) not null default 21,
  total numeric(12,2) not null,
  status text not null default 'borrador' check (status in ('borrador','pendiente','pagada','vencida','enviada')),
  concept text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists invoices_client_idx on public.invoices (client_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_issue_idx on public.invoices (issue_date);

-- ------------------------------------------------------------
-- RLS: desactivado por ahora (single-user workspace).
-- Cuando metamos auth, activamos RLS + policies basadas en auth.uid().
-- ------------------------------------------------------------
alter table public.contacts      disable row level security;
alter table public.client_spaces disable row level security;
alter table public.modules       disable row level security;
alter table public.tasks         disable row level security;
alter table public.invoices      disable row level security;

-- ------------------------------------------------------------
-- Trigger para mantener updated_at
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array['contacts','client_spaces','tasks','invoices']) loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;
