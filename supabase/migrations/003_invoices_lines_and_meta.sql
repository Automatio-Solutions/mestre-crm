-- ============================================================
-- Migration 003: ampliar invoices con líneas (JSONB) + método de pago + categorización
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Es idempotente: lo puedes re-ejecutar sin perder datos.
-- ============================================================

alter table public.invoices
  add column if not exists lines               jsonb   default '[]'::jsonb,
  add column if not exists payment_method      text    default 'transferencia',
  add column if not exists payment_notes       text,
  add column if not exists account             text,
  add column if not exists account_by_concept  boolean default false,
  add column if not exists internal_note       text,
  add column if not exists tags                text[]  default '{}',
  add column if not exists show_custom_fields  boolean default false,
  add column if not exists doc_text            text,
  add column if not exists doc_footer_message  text;
