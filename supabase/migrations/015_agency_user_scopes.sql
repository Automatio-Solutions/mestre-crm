-- ============================================================
-- Migration 015: scopes (permisos) en agency_users
--
-- Cada usuario tiene un array de "scopes" que controla qué
-- secciones del CRM puede ver. `*` significa acceso total.
--
-- Scopes válidos (alineados con el sidebar):
--   *               → acceso total (admin)
--   dashboard       → Inicio
--   contactos       → Contactos
--   ventas          → Ventas (todas sus subsecciones)
--   compras         → Compras (todas sus subsecciones)
--   contabilidad    → Contabilidad (todas sus subsecciones)
--   impuestos       → Impuestos
--   analitica       → Analítica
--   proyectos       → Espacio de trabajo (clientes, proyectos, tareas)
--
-- Default '{*}' para no romper los usuarios existentes (Dani).
-- ============================================================

alter table public.agency_users
  add column if not exists scopes text[] not null default '{*}';

-- Comentario en la columna para la consola SQL
comment on column public.agency_users.scopes is
  'Permisos del usuario. Usa ''{*}'' para admin (todo), o subset como ''{proyectos,impuestos}''.';
