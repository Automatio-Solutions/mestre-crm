// @ts-nocheck
"use client";
import * as React from "react";
import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as D from "@/lib/data";
import {
  Icon, Button, Card, Badge, Input, Tabs, Avatar, AvatarStack,
  Dropdown, DropdownItem, PriorityFlag, Progress, EmptyState,
} from "@/components/ui";
import { useClientSpaces } from "@/lib/db/useClientSpaces";
import { useTasks } from "@/lib/db/useTasks";
import { useAuth } from "@/lib/auth/AuthContext";
import { Clientes } from "@/components/screens/clientes";
import { TaskModal } from "@/components/screens/task-modal";
import { NewTaskModal } from "@/components/screens/new-task-modal";

type View = "clientes" | "proyectos" | "tareas" | "mis-tareas";

const VIEW_DEFS: { id: View; label: string; icon: string; sub: string }[] = [
  { id: "clientes",   label: "Clientes",        icon: "folder", sub: "Rejilla de clientes activos" },
  { id: "proyectos",  label: "Proyectos",       icon: "grid",   sub: "Todos los proyectos" },
  { id: "tareas",     label: "Todas las tareas",icon: "list",   sub: "Visión global del trabajo" },
  { id: "mis-tareas", label: "Mis tareas",      icon: "user",   sub: "Lo asignado a mí" },
];

// 3 columnas globales (compactadas: doing+review = en proceso)
const COLUMNS = [
  { id: "todo",  targetStatus: "todo",  title: "Por hacer",   color: "#9A968D" },
  { id: "doing", targetStatus: "doing", title: "En proceso",  color: "#6A5ACD" },
  { id: "done",  targetStatus: "done",  title: "Terminadas",  color: "#4A7C59" },
] as const;

const colOf = (status: string) => {
  if (status === "doing" || status === "review") return "doing";
  if (status === "done") return "done";
  return "todo";
};

// ============================================================
// PANTALLA PRINCIPAL
// ============================================================
export function WorkspaceScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = (searchParams?.get("vista") as View) || "clientes";
  const [view, setView] = useState<View>(initialView);

  const setRouteForClient = (path: string) => router.push(path);

  const switchView = (v: View) => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === "clientes") url.searchParams.delete("vista");
    else url.searchParams.set("vista", v);
    window.history.replaceState({}, "", url);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "calc(100vh - 64px)" }}>
      {/* Sub-sidebar */}
      <WorkspaceSubSidebar view={view} onChange={switchView} />

      {/* Contenido */}
      <div style={{ overflow: "auto" }}>
        {view === "clientes"   && <Clientes setRoute={setRouteForClient} />}
        {view === "proyectos"  && <ProyectosView setRoute={setRouteForClient} />}
        {view === "tareas"     && <TasksView mineOnly={false} />}
        {view === "mis-tareas" && <TasksView mineOnly={true} />}
      </div>
    </div>
  );
}

// ============================================================
// SUB-SIDEBAR
// ============================================================
function WorkspaceSubSidebar({
  view, onChange,
}: { view: View; onChange: (v: View) => void }) {
  return (
    <aside style={{
      borderRight: "1px solid var(--border)",
      background: "var(--beige-bg)",
      padding: "20px 12px",
      position: "sticky", top: 64, height: "calc(100vh - 64px)", overflow: "auto",
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
        letterSpacing: "0.08em", textTransform: "uppercase",
        padding: "0 10px 8px",
      }}>
        Vistas
      </div>
      {VIEW_DEFS.map((v) => {
        const active = view === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "8px 10px", borderRadius: 7, fontSize: 13,
              marginBottom: 2,
              background: active ? "var(--surface)" : "transparent",
              color: "var(--text)", fontWeight: active ? 500 : 400,
              border: active ? "1px solid var(--border)" : "1px solid transparent",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
          >
            <Icon name={v.icon} size={14} style={{ color: active ? "var(--purple)" : "var(--text-muted)" }} />
            <span style={{ flex: 1 }}>{v.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

// ============================================================
// VISTA: PROYECTOS
// ============================================================
function ProyectosView({ setRoute }: { setRoute: (p: string) => void }) {
  const { spaces, loading: loadingSpaces } = useClientSpaces();
  const { tasks: allTasks, loading: loadingTasks } = useTasks();
  const [search, setSearch] = useState("");

  // Aplanar todos los proyectos cross-cliente
  const projects = useMemo(() => {
    const out: any[] = [];
    spaces.forEach((c: any) => {
      (c.modules || []).forEach((m: any) => {
        out.push({ ...m, client: c });
      });
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      return out.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.client.name.toLowerCase().includes(q)
      );
    }
    return out;
  }, [spaces, search]);

  const tasksByModule = useMemo(() => {
    const m = new Map<string, any[]>();
    allTasks.forEach((t: any) => {
      if (t.customFields?.archived) return;
      if (!m.has(t.moduleId)) m.set(t.moduleId, []);
      m.get(t.moduleId)!.push(t);
    });
    return m;
  }, [allTasks]);

  if (loadingSpaces || loadingTasks) {
    return <Loading/>;
  }

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <PageHeader
        title="Proyectos"
        subtitle="Todos los proyectos de todos los clientes"
        right={
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyecto o cliente…"
            leftIcon={<Icon name="search" size={14}/>}
            style={{ width: 280 }}
          />
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<Icon name="grid" size={28}/>}
          title="Sin proyectos"
          description="Crea proyectos desde la vista de cada cliente."
        />
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 12,
        }}>
          {projects.map((p) => {
            const pt = tasksByModule.get(p.id) || [];
            const open = pt.filter((t) => t.status !== "done").length;
            const progress = pt.length > 0
              ? (pt.filter((t) => t.status === "done").length / pt.length) * 100
              : 0;
            return (
              <Card
                key={p.id}
                interactive
                padding={16}
                onClick={() => setRoute(`/clientes/${p.client.id}/${p.id}`)}
              >
                {/* Header con cliente */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                  fontSize: 11, color: "var(--text-muted)",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, background: p.client.color,
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 600,
                  }}>
                    {p.client.logo}
                  </div>
                  {p.client.name}
                </div>

                {/* Proyecto */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 22 }}>{p.icon}</div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                </div>

                {/* Stats */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 11.5, color: "var(--text-muted)", marginBottom: 8,
                }}>
                  <span>{pt.length} tareas · {open} abiertas</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} color="var(--purple)"/>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// VISTA: TODAS LAS TAREAS / MIS TAREAS (kanban + lista + calendario)
// ============================================================
function TasksView({ mineOnly }: { mineOnly: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const { spaces, loading: loadingSpaces } = useClientSpaces();
  const { tasks: allTasks, loading: loadingTasks, update: updateTaskDB, create: createTaskDB } = useTasks();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [layout, setLayout] = useState<"kanban" | "lista" | "calendario">("kanban");
  const [groupBy, setGroupBy] = useState<"none" | "proyecto" | "cliente">("none");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const currentUserRef = user?.userRef || null;

  // Map cliente/proyecto para resolver IDs rápido
  const clientMap = useMemo(() => {
    const m = new Map<string, any>();
    spaces.forEach((c: any) => m.set(c.id, c));
    return m;
  }, [spaces]);
  const moduleMap = useMemo(() => {
    const m = new Map<string, any>();
    spaces.forEach((c: any) =>
      (c.modules || []).forEach((mod: any) => m.set(mod.id, { ...mod, client: c }))
    );
    return m;
  }, [spaces]);

  // Items del tablero: mezcla tareas reales + subtareas asignadas a mí (como tarjetas sintéticas)
  const myRef = user?.userRef || null;
  const tasks = useMemo(() => {
    const liveTasks = allTasks.filter((t: any) => !t.customFields?.archived);
    if (!mineOnly) return liveTasks;
    if (!myRef) return [];

    const out: any[] = [];
    for (const t of liveTasks) {
      // 1) Tarea entera asignada a mí
      const isAssignedToTask = (t.assignees || []).includes(myRef);
      if (isAssignedToTask) out.push(t);

      // 2) Subtareas asignadas a mí → las añadimos como tarjetas independientes
      for (const s of (t.subtasks || [])) {
        if (s.assignee === myRef) {
          out.push({
            // Identidad sintética
            id: `${t.id}::st::${s.id}`,
            __isSubtask: true,
            __parentId: t.id,
            __parentTitle: t.title,
            __subtaskId: s.id,
            // Pintamos como tarea
            title: s.title,
            status: s.done ? "done" : "todo",
            assignees: s.assignee ? [s.assignee] : [],
            dueDate: s.dueDate ? new Date(s.dueDate) : null,
            priority: t.priority,            // hereda de la tarea padre
            clientId: t.clientId,
            moduleId: t.moduleId,
            tags: [],
            subtasks: [],
            comments: [],
            customFields: {},
            progress: s.done ? 100 : 0,
          });
        }
      }
    }
    return out;
  }, [allTasks, mineOnly, myRef]);

  // Wrapper para drag&drop / toggle: detecta tarjetas sintéticas (subtareas) y las trata como tales
  const updateTask = (id: string, patch: any) => {
    if (typeof id === "string" && id.includes("::st::")) {
      const [parentId, , subId] = id.split("::");
      const parent = allTasks.find((t: any) => t.id === parentId);
      if (!parent) return;
      const newSubs = (parent.subtasks || []).map((s: any) => {
        if (s.id !== subId) return s;
        const updated = { ...s };
        // Mapeamos status del kanban a done/no-done de la subtarea
        if (patch.status !== undefined) {
          updated.done = patch.status === "done";
        }
        // Cambio de fecha en calendario
        if (patch.dueDate !== undefined) {
          updated.dueDate = patch.dueDate
            ? new Date(patch.dueDate).toISOString().slice(0, 10)
            : null;
        }
        return updated;
      });
      const doneCount = newSubs.filter((s: any) => s.done).length;
      const newProgress = newSubs.length ? Math.round((doneCount / newSubs.length) * 100) : (parent.progress || 0);
      updateTaskDB(parentId, { subtasks: newSubs, progress: newProgress }).catch((e) => console.error(e));
      return;
    }
    updateTaskDB(id, patch).catch((e) => console.error(e));
  };

  // Para abrir una tarjeta: si es subtarea, abrimos la tarea padre
  const handleOpenItem = (id: string) => {
    if (typeof id === "string" && id.includes("::st::")) {
      const parentId = id.split("::")[0];
      setOpenTaskId(parentId);
    } else {
      setOpenTaskId(id);
    }
  };

  // Lista plana de proyectos cross-cliente para el modal Nueva tarea.
  // Incluye el nombre del cliente en el label para distinguirlos.
  const allProjects = useMemo(() => {
    return spaces.flatMap((s: any) =>
      (s.modules || []).map((m: any) => ({
        id: m.id,
        name: `${m.name}  ·  ${s.name}`,
        icon: m.icon,
        __clientId: s.id,
      }))
    );
  }, [spaces]);

  const handleCreateTask = async (values: any) => {
    const project = allProjects.find((p: any) => p.id === values.moduleId);
    if (!project) {
      alert("Selecciona un proyecto para la tarea.");
      return;
    }
    const clientId = project.__clientId;
    const tags = values.category ? [values.category] : [];

    // En "Mis tareas", si no se elige a nadie, asignar al usuario actual
    let assignees = values.assignees || [];
    if (mineOnly && currentUserRef && assignees.length === 0) {
      assignees = [currentUserRef];
    }

    const created = await createTaskDB({
      clientId,
      moduleId: values.moduleId,
      title: values.title,
      description: values.description,
      status: "todo",
      priority: values.priority || "media",
      assignees,
      tags,
      dueDate: values.dueDate || null,
    });

    // Log de actividad inicial (creación + asignaciones)
    const now = new Date();
    const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const activityUser = currentUserRef || "u1";
    const activity: any[] = [{ id: newId("a"), userId: activityUser, action: "creó la tarea", when: now }];
    assignees.forEach((uid: string, i: number) => {
      const name = (D as any).userById?.(uid)?.name || uid;
      activity.push({
        id: newId("a"),
        userId: activityUser,
        action: `asignó a ${name}`,
        when: new Date(now.getTime() + i + 1),
      });
    });

    if (created) {
      await updateTaskDB(created.id, {
        subtasks: values.subtasks || [],
        attachments: values.attachments || [],
        activity,
      });
    }
  };

  const openTask = openTaskId ? allTasks.find((t: any) => t.id === openTaskId) : null;
  const openTaskClient = openTask ? clientMap.get(openTask.clientId) : null;

  if (loadingSpaces || loadingTasks) return <Loading/>;

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1600, margin: "0 auto" }}>
      <PageHeader
        title={mineOnly ? "Mis tareas" : "Todas las tareas"}
        subtitle={mineOnly
          ? `Tareas asignadas a ${user?.name || "ti"}`
          : `Visión global · ${tasks.length} tareas`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {mineOnly && (
              <GroupByToggle value={groupBy} onChange={setGroupBy}/>
            )}
            <LayoutSwitch value={layout} onChange={setLayout}/>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Icon name="plus" size={13}/>}
              onClick={() => setNewTaskOpen(true)}
              disabled={allProjects.length === 0}
              title={allProjects.length === 0 ? "Crea un proyecto primero" : ""}
            >
              Nueva tarea
            </Button>
          </div>
        }
      />

      {mineOnly && !myRef && (
        <Card padding={18} style={{ background: "#FAF1DC", border: "1px solid #E8D6A8", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="alert" size={16} style={{ color: "#8C6A1E", marginTop: 1, flexShrink: 0 }}/>
            <div style={{ fontSize: 12.5, color: "#8C6A1E", lineHeight: 1.5 }}>
              <b>Tu usuario no tiene `user_ref` asignado.</b> No podemos saber qué tareas son tuyas hasta enlazar tu cuenta con un miembro del equipo. En Supabase ejecuta:
              <pre style={{
                margin: "6px 0 0", padding: "8px 10px", borderRadius: 6,
                background: "rgba(0,0,0,0.05)", fontSize: 11.5, fontFamily: "ui-monospace, monospace",
              }}>
                update agency_users set user_ref = 'u1' where email = '{user?.email || "tu@email.com"}';
              </pre>
            </div>
          </div>
        </Card>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          icon={<Icon name="check" size={28}/>}
          title={mineOnly ? "Nada asignado a ti" : "Sin tareas"}
          description={mineOnly ? "No tienes tareas asignadas." : "No hay tareas activas."}
        />
      ) : layout === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          updateTask={updateTask}
          onOpen={handleOpenItem}
          moduleMap={moduleMap}
          groupBy={mineOnly ? groupBy : "none"}
        />
      ) : layout === "lista" ? (
        <ListLayout
          tasks={tasks}
          updateTask={updateTask}
          onOpen={handleOpenItem}
          moduleMap={moduleMap}
        />
      ) : (
        <CalendarLayout
          tasks={tasks}
          updateTask={updateTask}
          onOpen={handleOpenItem}
          moduleMap={moduleMap}
        />
      )}

      {openTask && (
        <TaskModal
          task={openTask}
          onClose={() => setOpenTaskId(null)}
          updateTask={(patch: any) => updateTask(openTask.id, patch)}
          client={openTaskClient}
        />
      )}

      <NewTaskModal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        projects={allProjects}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}

// ============================================================
// KANBAN
// ============================================================
function KanbanBoard({
  tasks, updateTask, onOpen, moduleMap, groupBy,
}: any) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const onDragStart = (id: string, e: any) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch {}
  };
  const onDragEnd = () => { setDragId(null); setDragOverCol(null); };
  const onDragOver = (colId: string, e: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colId) setDragOverCol(colId);
  };
  const onDrop = (col: any, e: any) => {
    e.preventDefault();
    if (dragId) {
      const t = tasks.find((x: any) => x.id === dragId);
      if (t && colOf(t.status) !== col.id) {
        const patch: any = { status: col.targetStatus };
        if (col.id === "done" && (t.progress || 0) < 100) patch.progress = 100;
        if (col.id === "todo" && t.progress === 100) patch.progress = 0;
        updateTask(dragId, patch);
      }
    }
    onDragEnd();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t: any) => colOf(t.status) === col.id);
        const isOver = dragOverCol === col.id;

        // Aplicar groupBy
        const groups: { key: string; label: string; subLabel?: string; tasks: any[] }[] = [];
        if (groupBy === "none") {
          groups.push({ key: "_all", label: "", tasks: colTasks });
        } else {
          const map = new Map<string, any[]>();
          colTasks.forEach((t: any) => {
            const mod = moduleMap.get(t.moduleId);
            const key = groupBy === "proyecto"
              ? t.moduleId
              : mod?.client?.id || "_no_client";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
          });
          map.forEach((arr, key) => {
            if (groupBy === "proyecto") {
              const m = moduleMap.get(key);
              groups.push({
                key,
                label: m ? `${m.icon} ${m.name}` : "—",
                subLabel: m?.client?.name,
                tasks: arr,
              });
            } else {
              const c = arr[0] && moduleMap.get(arr[0].moduleId)?.client;
              groups.push({
                key,
                label: c?.name || "Sin cliente",
                tasks: arr,
              });
            }
          });
          groups.sort((a, b) => a.label.localeCompare(b.label, "es"));
        }

        return (
          <div
            key={col.id}
            onDragOver={(e) => onDragOver(col.id, e)}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
            onDrop={(e) => onDrop(col, e)}
            style={{
              background: isOver ? "var(--purple-soft)" : "var(--beige-bg)",
              borderRadius: 12, padding: 12, minHeight: 300,
              outline: isOver ? "2px dashed var(--purple)" : "2px dashed transparent",
              outlineOffset: -2,
              transition: "background 140ms, outline-color 140ms",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 12px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }}/>
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>{col.title}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{colTasks.length}</span>
            </div>

            {colTasks.length === 0 && (
              <div style={{ padding: "14px 10px", fontSize: 12, color: "var(--text-faint)" }}>
                {isOver ? "Suelta aquí" : "Sin tareas"}
              </div>
            )}

            {groups.map((g, gi) => (
              <div key={g.key} style={{ marginBottom: gi < groups.length - 1 ? 14 : 0 }}>
                {g.label && (
                  <div style={{
                    display: "flex", alignItems: "baseline", gap: 6,
                    fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
                    padding: "8px 6px 4px",
                  }}>
                    <span>{g.label}</span>
                    {g.subLabel && (
                      <span style={{ fontSize: 10, color: "var(--text-faint)" }}>· {g.subLabel}</span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-faint)" }}>
                      {g.tasks.length}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.tasks.map((t: any) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      moduleMap={moduleMap}
                      onOpen={() => onOpen(t.id)}
                      onDragStart={(e) => onDragStart(t.id, e)}
                      onDragEnd={onDragEnd}
                      isDragging={dragId === t.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TASK CARD (común para kanban y otras vistas)
// ============================================================
function TaskCard({
  task, moduleMap, onOpen, onDragStart, onDragEnd, isDragging,
}: any) {
  const mod = moduleMap.get(task.moduleId);
  const client = mod?.client;
  const overdue = task.dueDate && task.dueDate < D.TODAY && task.status !== "done";
  const isSubtask = !!task.__isSubtask;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => { if (!isDragging) onOpen(); }}
      style={{
        background: "var(--surface)",
        border: `1px solid ${isSubtask ? "var(--purple-soft)" : "var(--border)"}`,
        borderLeft: isSubtask ? "3px solid var(--purple)" : "1px solid var(--border)",
        borderRadius: 9,
        padding: 12, cursor: "grab", boxShadow: "var(--shadow-sm)",
        opacity: isDragging ? 0.4 : (task.status === "done" ? 0.75 : 1),
        transform: isDragging ? "rotate(-1.2deg)" : "none",
        transition: "transform 120ms, opacity 120ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = isSubtask ? "var(--purple-soft)" : "var(--border)")}
    >
      {/* Cliente · Proyecto */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 11, color: "var(--text-muted)" }}>
        <PriorityFlag priority={task.priority} size={11}/>
        {client && (
          <>
            <span style={{
              width: 14, height: 14, borderRadius: 3, background: client.color, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 600,
            }}>{client.logo}</span>
            <span style={{ fontWeight: 500, color: "var(--text)" }}>{client.name}</span>
          </>
        )}
        {mod && (
          <>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 12 }}>{mod.icon}</span>
              {mod.name}
            </span>
          </>
        )}
      </div>

      {/* Si es subtarea: badge "Subtarea de [parent]" */}
      {isSubtask && task.__parentTitle && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 10.5, color: "var(--purple)",
          background: "var(--purple-soft)",
          padding: "2px 8px", borderRadius: 999,
          marginBottom: 6,
        }}>
          <Icon name="chevronRight" size={10}/>
          Subtarea de <b style={{ fontWeight: 500 }}>{task.__parentTitle}</b>
        </div>
      )}

      {/* Título */}
      <div style={{
        fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.35,
        textDecoration: task.status === "done" ? "line-through" : "none",
        color: task.status === "done" ? "var(--text-muted)" : "var(--text)",
      }}>
        {task.title}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {task.subtasks?.length > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Icon name="check" size={11}/>
              {task.subtasks.filter((s: any) => s.done).length}/{task.subtasks.length}
            </span>
          )}
          {task.dueDate && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: overdue ? "var(--error)" : "inherit" }}>
              <Icon name="clock" size={11}/>
              {D.fmtShort(task.dueDate)}
            </span>
          )}
        </div>
        <AvatarStack userIds={task.assignees} size={20} max={2}/>
      </div>
    </div>
  );
}

// ============================================================
// LISTA (agrupada por estado, drag entre grupos)
// ============================================================
function ListLayout({ tasks, updateTask, onOpen, moduleMap }: any) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const onDragStart = (id: string, e: any) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; };
  const onDragEnd = () => { setDragId(null); setDragOverCol(null); };
  const onDragOver = (colId: string, e: any) => { e.preventDefault(); if (dragOverCol !== colId) setDragOverCol(colId); };
  const onDrop = (col: any, e: any) => {
    e.preventDefault();
    if (dragId) {
      const t = tasks.find((x: any) => x.id === dragId);
      if (t && colOf(t.status) !== col.id) {
        updateTask(dragId, { status: col.targetStatus });
      }
    }
    onDragEnd();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t: any) => colOf(t.status) === col.id);
        const isOver = dragOverCol === col.id;
        return (
          <div
            key={col.id}
            onDragOver={(e) => onDragOver(col.id, e)}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
            onDrop={(e) => onDrop(col, e)}
            style={{
              borderRadius: 10,
              outline: isOver ? "2px dashed var(--purple)" : "2px dashed transparent",
              outlineOffset: 4,
              background: isOver ? "var(--purple-soft)" : "transparent",
              transition: "background 140ms, outline-color 140ms",
              padding: isOver ? 4 : 0,
              margin: isOver ? -4 : 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }}/>
              <span>{col.title}</span>
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{colTasks.length}</span>
            </div>
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, overflow: "hidden",
            }}>
              {colTasks.length === 0 ? (
                <div style={{ padding: 14, fontSize: 12, color: "var(--text-faint)" }}>
                  {isOver ? "Suelta aquí" : "Sin tareas en este estado"}
                </div>
              ) : (
                colTasks.map((t: any, i: number) => {
                  const mod = moduleMap.get(t.moduleId);
                  const client = mod?.client;
                  const overdue = t.dueDate && t.dueDate < D.TODAY && t.status !== "done";
                  const isDragging = dragId === t.id;
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => onDragStart(t.id, e)}
                      onDragEnd={onDragEnd}
                      onClick={() => { if (!isDragging) onOpen(t.id); }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "26px 1fr 200px 100px 80px 60px",
                        alignItems: "center", padding: "10px 14px", fontSize: 13,
                        borderTop: i === 0 ? "none" : "1px solid var(--border)",
                        cursor: isDragging ? "grabbing" : "grab",
                        opacity: isDragging ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => { if (!isDragging) (e.currentTarget as HTMLDivElement).style.background = "var(--beige-bg)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <div onClick={(e) => { e.stopPropagation(); updateTask(t.id, { status: t.status === "done" ? "todo" : "done" }); }} style={{ cursor: "pointer" }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, border: "1.5px solid var(--border-strong)",
                          background: t.status === "done" ? "var(--success)" : "var(--surface)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {t.status === "done" && <Icon name="check" size={11} style={{ color: "#fff" }} stroke={3}/>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <PriorityFlag priority={t.priority}/>
                        <span style={{
                          fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          textDecoration: t.status === "done" ? "line-through" : "none",
                          color: t.status === "done" ? "var(--text-muted)" : "var(--text)",
                        }}>{t.title}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-muted)" }}>
                        {client && (
                          <span style={{
                            width: 14, height: 14, borderRadius: 3, background: client.color, color: "#fff",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            fontSize: 8, fontWeight: 600,
                          }}>{client.logo}</span>
                        )}
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {mod ? `${mod.icon} ${mod.name}` : "—"}
                        </span>
                      </div>
                      <AvatarStack userIds={t.assignees} size={20} max={3}/>
                      <div style={{ fontSize: 12, color: overdue ? "var(--error)" : "var(--text-muted)" }}>
                        {t.dueDate ? D.fmtShort(t.dueDate) : "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {t.progress}%
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// CALENDARIO (vista mensual, drag para mover fecha)
// ============================================================
function CalendarLayout({ tasks, updateTask, onOpen, moduleMap }: any) {
  const [cursor, setCursor] = useState(new Date(D.TODAY.getFullYear(), D.TODAY.getMonth(), 1));
  const [dragId, setDragId] = useState<string | null>(null);

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const sameDay = (a: Date, b: Date) =>
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button variant="ghost" size="iconSm" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <Icon name="chevronLeft" size={14}/>
          </Button>
          <div style={{ fontSize: 15, fontWeight: 500, minWidth: 180, textAlign: "center", letterSpacing: "-0.01em" }}>
            {cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
          </div>
          <Button variant="ghost" size="iconSm" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <Icon name="chevronRight" size={14}/>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(D.TODAY.getFullYear(), D.TODAY.getMonth(), 1))}>
            Hoy
          </Button>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--beige-bg)", borderBottom: "1px solid var(--border)" }}>
          {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => (
            <div key={d} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(110px, 1fr)" }}>
          {cells.map((cell, i) => {
            const dayTasks = cell ? tasks.filter((t: any) => sameDay(t.dueDate, cell)) : [];
            const isToday = cell && sameDay(cell, D.TODAY);
            return (
              <div
                key={i}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragId && cell) updateTask(dragId, { dueDate: cell }); setDragId(null); }}
                style={{
                  borderRight: (i % 7) < 6 ? "1px solid var(--border)" : "none",
                  borderTop: i >= 7 ? "1px solid var(--border)" : "none",
                  padding: 6, background: isToday ? "var(--beige-bg)" : "transparent",
                  minHeight: 110, overflow: "hidden",
                }}
              >
                {cell && (
                  <div style={{ fontSize: 11.5, fontWeight: isToday ? 600 : 500, color: isToday ? "var(--purple)" : "var(--text)", marginBottom: 4 }}>
                    {cell.getDate()}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {dayTasks.slice(0, 3).map((t: any) => {
                    const p = D.PRIORITIES.find((x: any) => x.id === t.priority);
                    const mod = moduleMap.get(t.moduleId);
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => onOpen(t.id)}
                        style={{
                          background: "var(--surface)",
                          borderLeft: `3px solid ${p?.color || "var(--purple)"}`,
                          padding: "3px 6px", borderRadius: 4, fontSize: 11,
                          fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          cursor: "grab", boxShadow: "var(--shadow-sm)",
                          border: "1px solid var(--border)",
                        }}
                        title={`${t.title}${mod ? ` · ${mod.client?.name} / ${mod.name}` : ""}`}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)", paddingLeft: 4 }}>
                      +{dayTasks.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HELPERS UI
// ============================================================
function PageHeader({ title, subtitle, right }: { title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>{title}</h1>
        <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function LayoutSwitch({ value, onChange }: { value: "kanban" | "lista" | "calendario"; onChange: (v: any) => void }) {
  const opts = [
    { id: "kanban",     label: "Tablero",    icon: "columns" },
    { id: "lista",      label: "Lista",      icon: "list" },
    { id: "calendario", label: "Calendario", icon: "calendar" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--text)" : "var(--text-muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
            }}
          >
            <Icon name={o.icon} size={12}/> {o.label}
          </button>
        );
      })}
    </div>
  );
}

function GroupByToggle({ value, onChange }: { value: "none" | "proyecto" | "cliente"; onChange: (v: any) => void }) {
  return (
    <Dropdown
      align="end"
      trigger={
        <button style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
          border: "1px solid var(--border)", background: "var(--surface)",
        }}>
          <Icon name="filter" size={11}/>
          Agrupar: {value === "none" ? "Ninguno" : value === "proyecto" ? "Proyecto" : "Cliente"}
          <Icon name="chevronDown" size={11} style={{ color: "var(--text-muted)" }}/>
        </button>
      }
    >
      <DropdownItem onClick={() => onChange("none")}>Sin agrupar</DropdownItem>
      <DropdownItem onClick={() => onChange("proyecto")}>Por proyecto</DropdownItem>
      <DropdownItem onClick={() => onChange("cliente")}>Por cliente</DropdownItem>
    </Dropdown>
  );
}

function Loading() {
  return (
    <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
      Cargando…
    </div>
  );
}
