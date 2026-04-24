-- ============================================================
-- Migration 001: extiende contacts con website + dirección
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Es idempotente: lo puedes re-ejecutar sin perder datos.
-- ============================================================

alter table public.contacts
  add column if not exists website text,
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists province text,
  add column if not exists country text default 'ES';
