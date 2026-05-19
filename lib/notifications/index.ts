/**
 * Notificaciones derivadas de los datos existentes (tareas, facturas, modelos fiscales).
 *
 * Cliente-side: no hay tabla `notifications` aún — las computamos en vivo
 * desde los hooks de cada entidad. Pensado para alimentar el dropdown
 * de la campana en el Header.
 */
import type { Task } from "@/lib/db/tasks";
import type { Invoice } from "@/lib/db/invoices";
import type { TaxModel } from "@/lib/db/taxModels";

export type NotificationSeverity = "info" | "warning" | "error";

export type NotificationType =
  | "task-overdue"
  | "task-today"
  | "task-soon"
  | "task-urgent"
  | "subtask-overdue"
  | "subtask-soon"
  | "invoice-overdue"
  | "tax-due-soon";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
  severity: NotificationSeverity;
  /** Fecha asociada (vencimiento, due, etc.) — para ordenar. */
  date?: Date;
  /** Cuántos días faltan / pasaron. Negativo = vencido. */
  daysDelta?: number;
}

const TASK_SOON_DAYS = 3;
const TAX_DUE_SOON_DAYS = 7;

const daysBetween = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / 86400000);

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

interface DeriveOpts {
  /** id del miembro del equipo logueado (USERS[].id). null si no se sabe. */
  userRef: string | null;
  tasks: Task[];
  invoices?: Invoice[];
  taxModels?: TaxModel[];
  today?: Date;
}

export function deriveNotifications({
  userRef,
  tasks,
  invoices = [],
  taxModels = [],
  today = new Date(),
}: DeriveOpts): Notification[] {
  const out: Notification[] = [];

  // ---------- Tareas y subtareas asignadas al usuario ----------
  if (userRef) {
    for (const t of tasks) {
      // saltar archivadas y completadas
      if ((t as any).customFields?.archived) continue;
      if (t.status === "done") continue;

      const isAssigned = (t.assignees || []).includes(userRef);

      // Tarea entera asignada
      if (isAssigned) {
        const href = `/clientes/${t.clientId}/${t.moduleId}?task=${t.id}`;

        // Vencimiento
        if (t.dueDate) {
          const delta = daysBetween(t.dueDate, today);
          if (delta < 0) {
            out.push({
              id: `task-overdue-${t.id}`,
              type: "task-overdue",
              title: t.title,
              subtitle: `Vencida hace ${Math.abs(delta)}d`,
              href,
              icon: "alert",
              severity: "error",
              date: t.dueDate,
              daysDelta: delta,
            });
            continue; // no duplicar con "soon" o "today"
          }
          if (sameDay(t.dueDate, today)) {
            out.push({
              id: `task-today-${t.id}`,
              type: "task-today",
              title: t.title,
              subtitle: "Vence hoy",
              href,
              icon: "clock",
              severity: "warning",
              date: t.dueDate,
              daysDelta: 0,
            });
            continue;
          }
          if (delta <= TASK_SOON_DAYS) {
            out.push({
              id: `task-soon-${t.id}`,
              type: "task-soon",
              title: t.title,
              subtitle: `Vence en ${delta}d`,
              href,
              icon: "clock",
              severity: "info",
              date: t.dueDate,
              daysDelta: delta,
            });
            continue;
          }
        }

        // Sin vencimiento próximo pero urgente
        if (t.priority === "urgente") {
          out.push({
            id: `task-urgent-${t.id}`,
            type: "task-urgent",
            title: t.title,
            subtitle: "Prioridad urgente",
            href,
            icon: "flag",
            severity: "warning",
            date: t.dueDate ?? undefined,
          });
        }
      }

      // Subtareas asignadas a mí (tarjeta de subtarea con due distinto)
      for (const s of (t.subtasks as any[]) || []) {
        if (s.assignee !== userRef) continue;
        if (s.done) continue;
        const subHref = `/clientes/${t.clientId}/${t.moduleId}?task=${t.id}`;
        if (s.dueDate) {
          const sd = s.dueDate instanceof Date ? s.dueDate : new Date(s.dueDate);
          const delta = daysBetween(sd, today);
          if (delta < 0) {
            out.push({
              id: `subtask-overdue-${t.id}-${s.id}`,
              type: "subtask-overdue",
              title: s.title,
              subtitle: `Subtarea de "${t.title}" · vencida hace ${Math.abs(delta)}d`,
              href: subHref,
              icon: "alert",
              severity: "error",
              date: sd,
              daysDelta: delta,
            });
          } else if (delta <= TASK_SOON_DAYS) {
            out.push({
              id: `subtask-soon-${t.id}-${s.id}`,
              type: "subtask-soon",
              title: s.title,
              subtitle: `Subtarea de "${t.title}" · vence en ${delta}d`,
              href: subHref,
              icon: "chevronRight",
              severity: "info",
              date: sd,
              daysDelta: delta,
            });
          }
        }
      }
    }
  }

  // ---------- Facturas vencidas (todos los usuarios) ----------
  for (const inv of invoices) {
    if (inv.status !== "vencida" && inv.status !== "pendiente") continue;
    if (!inv.dueDate) continue;
    const delta = daysBetween(inv.dueDate, today);
    if (delta < 0) {
      out.push({
        id: `invoice-overdue-${inv.id}`,
        type: "invoice-overdue",
        title: `Factura ${inv.number} vencida`,
        subtitle: `${Math.abs(delta)}d sin cobrar · ${inv.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`,
        href: `/ventas/facturas/${inv.id}`,
        icon: "receipt",
        severity: "error",
        date: inv.dueDate,
        daysDelta: delta,
      });
    }
  }

  // ---------- Modelos fiscales próximos ----------
  for (const m of taxModels) {
    if (m.status !== "pendiente") continue;
    if (!m.dueDate) continue;
    const delta = daysBetween(m.dueDate, today);
    if (delta < 0 || delta <= TAX_DUE_SOON_DAYS) {
      out.push({
        id: `tax-due-${m.id}`,
        type: "tax-due-soon",
        title: `${m.name} · ${m.period || ""}`.trim(),
        subtitle:
          delta < 0
            ? `Vencido hace ${Math.abs(delta)}d`
            : delta === 0
              ? "Vence hoy"
              : `Vence en ${delta}d`,
        href: "/impuestos",
        icon: "landmark",
        severity: delta < 0 ? "error" : delta <= 2 ? "warning" : "info",
        date: m.dueDate,
        daysDelta: delta,
      });
    }
  }

  // Orden: lo más reciente / próximo a hoy primero (|daysDelta| ASC).
  // Eventos sin daysDelta van al fondo.
  out.sort((a, b) => {
    const aHas = a.daysDelta !== undefined;
    const bHas = b.daysDelta !== undefined;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (!aHas) return 0;
    return Math.abs(a.daysDelta as number) - Math.abs(b.daysDelta as number);
  });

  return out;
}
