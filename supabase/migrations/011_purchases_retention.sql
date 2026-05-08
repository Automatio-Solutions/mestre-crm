-- ============================================================
-- Migration 011: retención IRPF en purchases
-- Añade dos columnas para soportar facturas recibidas de profesionales
-- (autónomos) que retienen IRPF.
--
-- - retention_pct: % retención (típico 15 o 7)
-- - retention:    importe retenido en €
--
-- Las facturas existentes quedan a 0 (sin retención), comportamiento idéntico.
-- Idempotente. Ejecuta en SQL Editor de Supabase.
-- ============================================================

alter table public.purchases
  add column if not exists retention_pct numeric(5,2) not null default 0,
  add column if not exists retention numeric(12,2) not null default 0;
