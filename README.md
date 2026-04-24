# Dani Mestre CRM

Migración a producción del prototipo de diseño `Prueba_22_04_26`. Stack: **Next.js 14 (App Router)** + **React 18** + **TypeScript** + **Tailwind CSS** + datos mock en memoria.

## Requisitos

- Node.js **20.10+** (no detectado en el sistema al migrar — instálalo desde https://nodejs.org/)
- npm 10+ (viene con Node)

## Arranque

```bash
cd "C:\Users\Agrotrust\CRM Dani"
npm install
npm run dev
```

Abre http://localhost:3000.

## Estructura

```
app/                        Rutas App Router (cada carpeta = ruta)
  layout.tsx                Layout raíz (inyecta AppShell: sidebar + header + ⌘K + Tweaks)
  page.tsx                  Dashboard (/)
  contactos/                /contactos  (acepta ?open=<contactId>)
  clientes/
    page.tsx                /clientes
    [clientId]/             /clientes/:id  (overview del cliente)
      [moduleId]/           /clientes/:id/:modulo  (Lista/Kanban/Calendario/Gantt + modal)
  ventas/, compras/, contabilidad/, impuestos/, analitica/, escaner/
components/
  ui/                       Primitives (Button, Card, Badge, Avatar, Input, Tabs, Sheet, Modal, Tooltip, EmptyState, Skeleton, StatusPill, PriorityFlag, TagPill, Sparkline, Progress, Toast, Icon)
  shell/                    AppShell + Sidebar + Header + CommandPalette + TweaksPanel
  screens/                  Una pantalla por archivo (.tsx)
lib/
  data.ts                   Todos los datos mock (contacts, invoices, tasks, cashflow, accounting, bank, analytics, etc.)
public/assets/              Logo MESTRE (icon + wordmark)
```

## Notas de migración

1. **Tokens de diseño** (`app/globals.css`): CSS variables del prototipo (beige #DCD1C0, púrpura #6A5ACD, sombras, radii). Tailwind las referencia vía `tailwind.config.ts` para que puedas usar `bg-beige`, `text-purple`, etc. si amplías.
2. **Estilos**: se mantienen inline como en el prototipo — es 100% fiel al diseño. Migrar a Tailwind por clases es un paso opcional posterior.
3. **Ruteo**: hash-based del prototipo → App Router. Todos los `setRoute(...)` se inyectan como prop que llama a `router.push`. Las pantallas siguen siendo agnósticas.
4. **⌘K**: paleta de comandos global en el `AppShell`, búsqueda sobre páginas + contactos + clientes + tareas.
5. **Tweaks**: panel flotante (botón ⚙︎ abajo-izquierda) con acento / beige / densidad. Se persiste en `localStorage` — no se necesita Supabase aún.
6. **Tipos**: `@ts-nocheck` en screens portadas y `lib/data.ts` para no bloquear el build. Progresivamente podemos ir tipando.
7. **Dibujos**: Tesorería, Pérdidas/Ganancias forecast, donut Analítica, bar charts… todos son SVG inline, 0 dependencias.

## Próximos pasos (Fase 2)

- Wire-up Supabase (auth + tablas espejando `lib/data.ts`).
- Reemplazar mock data por queries a Supabase desde RSC + mutaciones desde client.
- Tipar progresivamente los screens (quitar `@ts-nocheck`).
- Migrar a CSS modules / Tailwind utility classes para reducir inline styles.
- Tests (Playwright para flujos críticos: login, crear factura, drag&drop tarea).

## Verificación manual

Después de `npm install && npm run dev`, valida:

- [ ] `/` renderiza dashboard con greeting, 4 KPIs, tesorería, próximos vencimientos, top clientes, timeline, tareas, objetivos.
- [ ] Sidebar navega entre todas las secciones (Ventas/Compras/Contabilidad tienen sub-items).
- [ ] ⌘K abre paleta; ↑↓ + Enter navega.
- [ ] `/contactos` — filtros por tipo, abrir contacto en sheet lateral.
- [ ] `/clientes` — listado + click abre overview → click en módulo entra al ClickUp-like (4 vistas + modal).
- [ ] `/clientes/c1/m-rrss` — Kanban acepta drag&drop; Calendario acepta drag; Gantt muestra dependencias.
- [ ] `/compras/escaner` — drop zone + lista con estados.
- [ ] Tweaks (botón ⚙︎): cambiar acento/beige/densidad se aplica en caliente y persiste al recargar.
