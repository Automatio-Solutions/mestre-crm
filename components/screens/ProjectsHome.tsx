"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardHeader, Icon, Badge, Avatar, AvatarStack,
  Button, EmptyState, PriorityFlag, Progress,
} from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { useTasks } from "@/lib/db/useTasks";
import { useClientSpaces } from "@/lib/db/useClientSpaces";
import * as D from "@/lib/data";

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const daysBetween = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / 86400000);

/**
 * Inicio para usuarios cuyo scope es solo "proyectos".
 * Muestra sus tareas, sus proyectos y un resumen.
 */
export function ProjectsHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { tasks, loading: loadingTasks } = useTasks();
  const { spaces, loading: loadingSpaces } = useClientSpaces();

  const userRef = user?.userRef || null;
  const today = D.TODAY;

  // Mapa de proyectos para resolver IDs
  const moduleMap = useMemo(() => {
    const m = new Map<string, any>();
    spaces.forEach((s: any) => (s.modules || []).forEach((mod: any) => m.set(mod.id, { ...mod, client: s })));
    return m;
  }, [spaces]);

  // Tareas + subtareas asignadas al usuario (no archivadas)
  const myItems = useMemo(() => {
    if (!userRef) return [];
    const out: any[] = [];
    tasks.forEach((t: any) => {
      if (t.customFields?.archived) return;
      const assignedToTask = (t.assignees || []).includes(userRef);
      if (assignedToTask) out.push({ kind: "task", task: t });
      (t.subtasks || []).forEach((s: any) => {
        if (s.assignee === userRef && !s.done) {
          out.push({ kind: "subtask", task: t, sub: s });
        }
      });
    });
    return out;
  }, [tasks, userRef]);

  // Tareas (no subtareas) abiertas → para KPIs principales
  const myOpenTasks = myItems
    .filter((i) => i.kind === "task" && i.task.status !== "done")
    .map((i) => i.task);

  const myDoneTasks = myItems
    .filter((i) => i.kind === "task" && i.task.status === "done")
    .map((i) => i.task);

  // KPIs
  const stats = useMemo(() => {
    let todayCount = 0, overdue = 0, inProgress = 0;
    myOpenTasks.forEach((t: any) => {
      if (t.status === "doing" || t.status === "review") inProgress++;
      if (t.dueDate) {
        const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        if (sameDay(d, today)) todayCount++;
        else if (d < today) overdue++;
      }
    });
    return {
      todayCount, overdue, inProgress,
      doneTotal: myDoneTasks.length,
    };
  }, [myOpenTasks, myDoneTasks, today]);

  // Próximas (vencen en los próximos 14 días, no vencidas, no hoy) ordenadas por fecha
  const upcoming = useMemo(() => {
    return myOpenTasks
      .filter((t: any) => {
        if (!t.dueDate) return false;
        const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        const delta = daysBetween(d, today);
        return delta >= 0 && delta <= 14;
      })
      .sort((a: any, b: any) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 6);
  }, [myOpenTasks, today]);

  // Sin fecha pero urgente
  const urgentNoDate = useMemo(() => {
    return myOpenTasks
      .filter((t: any) => !t.dueDate && t.priority === "urgente")
      .slice(0, 4);
  }, [myOpenTasks]);

  // Proyectos donde tengo alguna tarea (abierta o cerrada)
  const myProjects = useMemo(() => {
    if (!userRef) return [];
    const moduleIds = new Set<string>();
    tasks.forEach((t: any) => {
      const assigned = (t.assignees || []).includes(userRef);
      const subAssigned = (t.subtasks || []).some((s: any) => s.assignee === userRef);
      if (assigned || subAssigned) moduleIds.add(t.moduleId);
    });
    return Array.from(moduleIds)
      .map((id) => moduleMap.get(id))
      .filter(Boolean)
      .map((m: any) => {
        const projectTasks = tasks.filter((t: any) =>
          t.moduleId === m.id && !t.customFields?.archived
        );
        const myProjectTasks = projectTasks.filter((t: any) => (t.assignees || []).includes(userRef));
        const open = myProjectTasks.filter((t: any) => t.status !== "done").length;
        const done = myProjectTasks.filter((t: any) => t.status === "done").length;
        const total = myProjectTasks.length || 1;
        return {
          ...m,
          myOpen: open,
          myDone: done,
          progress: (done / total) * 100,
        };
      });
  }, [tasks, userRef, moduleMap]);

  const hour = today.getHours();
  const greeting =
    hour < 14 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const name = user?.name?.split(" ")[0] || "";

  if (loadingTasks || loadingSpaces) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Cargando tu espacio…
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      {/* ===== Greeting ===== */}
      <div style={{ marginBottom: 26 }}>
        <div style={{
          fontSize: 11, color: "var(--text-muted)",
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6,
        }}>
          {today.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h1 style={{
          fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em",
          margin: 0, lineHeight: 1.15,
        }}>
          {greeting}{name && `, ${name}`}.
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8, maxWidth: 620 }}>
          {!userRef ? (
            <>Tu cuenta aún no está enlazada al equipo. Pide a un admin que asigne tu <code>user_ref</code>.</>
          ) : myOpenTasks.length === 0 ? (
            <>No tienes tareas abiertas. Buen momento para descansar o revisar tus proyectos.</>
          ) : (
            <>
              Tienes <b style={{ color: "var(--text)" }}>{myOpenTasks.length} tarea{myOpenTasks.length === 1 ? "" : "s"} abierta{myOpenTasks.length === 1 ? "" : "s"}</b>
              {stats.todayCount > 0 && (
                <>, <b style={{ color: "var(--warning)" }}>{stats.todayCount} para hoy</b></>
              )}
              {stats.overdue > 0 && (
                <>, <b style={{ color: "var(--error)" }}>{stats.overdue} vencida{stats.overdue === 1 ? "" : "s"}</b></>
              )}
              .
            </>
          )}
        </p>
      </div>

      {/* ===== KPIs ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <KpiCard
          label="Para hoy"
          value={stats.todayCount}
          icon="clock"
          color={stats.todayCount > 0 ? "var(--warning)" : "var(--text-muted)"}
        />
        <KpiCard
          label="Vencidas"
          value={stats.overdue}
          icon="alert"
          color={stats.overdue > 0 ? "var(--error)" : "var(--text-muted)"}
        />
        <KpiCard
          label="En proceso"
          value={stats.inProgress}
          icon="play"
          color="var(--purple)"
        />
        <KpiCard
          label="Terminadas"
          value={stats.doneTotal}
          icon="check"
          color="var(--success)"
          sub="histórico"
        />
      </div>

      {/* ===== Layout en 2 columnas ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        {/* IZQUIERDA: Próximas tareas + Urgentes sin fecha */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padding={0} style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Próximos vencimientos</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>Tus tareas en los próximos 14 días</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<Icon name="chevronRight" size={12}/>}
                onClick={() => router.push("/clientes?vista=mis-tareas")}
              >
                Ver todo
              </Button>
            </div>
            {upcoming.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Sin vencimientos próximos. ✨
              </div>
            ) : (
              <div>
                {upcoming.map((t: any, i: number) => {
                  const mod = moduleMap.get(t.moduleId);
                  const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
                  const delta = daysBetween(d, today);
                  const dayLabel =
                    delta === 0 ? "Hoy" :
                    delta === 1 ? "Mañana" :
                    delta < 7 ? `En ${delta}d` :
                    D.fmtShort(d);
                  const dayColor =
                    delta === 0 ? "var(--warning)" :
                    delta <= 2 ? "var(--purple)" :
                    "var(--text-muted)";
                  return (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/clientes/${t.clientId}/${t.moduleId}?task=${t.id}`)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 20px", width: "100%", textAlign: "left",
                        borderTop: i === 0 ? "none" : "1px solid var(--border)",
                        background: "transparent", cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <PriorityFlag priority={t.priority} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {t.title}
                        </div>
                        {mod && (
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                            <span style={{ fontSize: 12 }}>{mod.icon}</span> {mod.name} · {mod.client?.name}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11.5, fontWeight: 500, color: dayColor,
                        minWidth: 60, textAlign: "right",
                      }}>
                        {dayLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {urgentNoDate.length > 0 && (
            <Card padding={0} style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="flag" size={13} style={{ color: "var(--error)" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Urgentes sin fecha</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                    Asigna un vencimiento para que no se te escapen
                  </div>
                </div>
              </div>
              {urgentNoDate.map((t: any, i: number) => {
                const mod = moduleMap.get(t.moduleId);
                return (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/clientes/${t.clientId}/${t.moduleId}?task=${t.id}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 20px", width: "100%", textAlign: "left",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                      background: "transparent", cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <PriorityFlag priority={t.priority}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.title}
                      </div>
                      {mod && (
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                          <span style={{ fontSize: 12 }}>{mod.icon}</span> {mod.name}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </Card>
          )}
        </div>

        {/* DERECHA: Mis proyectos */}
        <Card padding={0} style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Tus proyectos</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                {myProjects.length} proyecto{myProjects.length === 1 ? "" : "s"} activo{myProjects.length === 1 ? "" : "s"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<Icon name="chevronRight" size={12}/>}
              onClick={() => router.push("/clientes?vista=proyectos")}
            >
              Ver todos
            </Button>
          </div>
          {myProjects.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Aún no tienes proyectos asignados.
            </div>
          ) : (
            <div>
              {myProjects.map((p: any, i: number) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/clientes/${p.client.id}/${p.id}`)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "14px 20px",
                    borderTop: i === 0 ? "none" : "1px solid var(--border)",
                    background: "transparent", cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 18 }}>{p.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        <span style={{
                          width: 12, height: 12, borderRadius: 3, background: p.client?.color, color: "#fff",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: 7, fontWeight: 600,
                        }}>{p.client?.logo}</span>
                        {p.client?.name}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                      {p.progress.toFixed(0)}%
                    </div>
                  </div>
                  <Progress value={p.progress} color="var(--purple)"/>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                    {p.myOpen} abierta{p.myOpen === 1 ? "" : "s"} · {p.myDone} terminada{p.myDone === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ===== Accesos rápidos ===== */}
      <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Icon name="grid" size={13}/>}
          onClick={() => router.push("/clientes?vista=mis-tareas")}
        >
          Mi tablero completo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="folder" size={13}/>}
          onClick={() => router.push("/clientes?vista=clientes")}
        >
          Ver clientes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="calendar" size={13}/>}
          onClick={() => router.push("/clientes?vista=mis-tareas")}
        >
          Calendario
        </Button>
      </div>
    </div>
  );
}

// ----- helpers -----
function KpiCard({
  label, value, icon, color, sub,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  sub?: string;
}) {
  return (
    <Card padding={18}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 8,
          background: "var(--beige-bg)", color,
        }}>
          <Icon name={icon} size={14} />
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
          {sub}
        </div>
      )}
    </Card>
  );
}
