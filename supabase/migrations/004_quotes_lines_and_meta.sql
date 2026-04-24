-- ============================================================
-- Migration 004: ampliar quotes con líneas (JSONB) + metadatos
-- Ejecuta en el SQL Editor de Supabase. Idempotente.
-- ============================================================

alter table public.quotes
  add column if not exists lines              jsonb   default '[]'::jsonb,
  add column if not exists vat_pct            numeric(5,2) default 21,
  add column if not exists terms              text,
  add column if not exists tags               text[]  default '{}',
  add column if not exists show_custom_fields boolean default false,
  add column if not exists doc_text           text,
  add column if not exists doc_footer_message text;
