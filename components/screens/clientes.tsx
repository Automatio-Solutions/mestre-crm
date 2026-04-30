// @ts-nocheck
"use client";
import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import * as D from "@/lib/data";
import {
  Icon, Button, Card, CardHeader, Badge, Avatar, AvatarStack, Input,
  Dropdown, DropdownItem, DropdownSeparator, Tabs, Sheet, Modal,
  Tooltip, EmptyState, Skeleton, PriorityFlag, StatusPill, TagPill,
  Sparkline, Progress, useToast,
} from "@/components/ui";
import { useClientSpaces } from "@/lib/db/useClientSpaces";
import { useTasks } from "@/lib/db/useTasks";
import { ClientSpaceFormModal } from "./client-space-form";
import { TaskModal } from "./task-modal";
import { NewTaskModal } from "./new-task-modal";
import { NewProjectModal } from "./new-project-modal";
import { SharePortalModal } from "./portal/SharePortalModal";
import { ensureAccess } from "@/lib/db/clientPortalAccess";

// ============================================================
// CLIENTES — listado + overview
// ============================================================
export const Clientes = ({ setRoute }) => {
  const { spaces, loading, createSpace, updateSpace, removeSpace } = useClientSpaces();
  const { tasks: ALL_TASKS } = useTasks();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const filtered = spaces.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ padding:'28px 32px 48px', maxWidth: 1440, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 20, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing:'-0.02em', margin: 0 }}>Clientes</h1>
          <p style={{ color:'var(--text-muted)', margin:'4px 0 0', fontSize: 13 }}>Espacios de trabajo por cliente — módulos, tareas y reporting</p>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <div style={{ width: 260 }}>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente…" leftIcon={<Icon name="search" size={14}/>}/>
          </div>
          <Button variant="primary" leftIcon={<Icon name="plus" size={14}/>} onClick={() => { setEditing(null); setFormOpen(true); }}>Nuevo cliente</Button>
        </div>
      </div>
      {loading && <div style={{ padding: 40, textAlign:'center', color:'var(--text-muted)', fontSize: 13 }}>Cargando clientes…</div>}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={<Icon name="folder" size={28}/>}
          title={spaces.length === 0 ? "Sin clientes todavía" : "Sin resultados"}
          description={spaces.length === 0 ? "Crea tu primer espacio de cliente." : "Prueba con otra búsqueda."}
          action={spaces.length === 0 && <Button variant="primary" leftIcon={<Icon name="plus" size={14}/>} onClick={() => { setEditing(null); setFormOpen(true); }}>Nuevo cliente</Button>}
        />
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filtered.map(c => {
          const tasks = ALL_TASKS.filter(t => t.clientId === c.id);
          const openTasks = tasks.filter(t => t.status !== 'done').length;
          const progress = tasks.length > 0 ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 : 0;
          return (
            <Card key={c.id} interactive onClick={() => setRoute(`/clientes/${c.id}`)} padding={20}>
              <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 16, fontWeight: 600 }}>{c.logo}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color:'var(--text-muted)' }}>{c.sector}</div>
                </div>
                <button style={{ color:'var(--text-faint)', padding: 4 }}><Icon name="more" size={14}/></button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12, marginBottom: 14, fontSize: 12 }}>
                <div><div style={{ color:'var(--text-muted)', marginBottom: 2 }}>Módulos</div><div style={{ fontSize: 16, fontWeight: 500 }}>{c.modules.length}</div></div>
                <div><div style={{ color:'var(--text-muted)', marginBottom: 2 }}>Tareas abiertas</div><div style={{ fontSize: 16, fontWeight: 500 }}>{openTasks}</div></div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11.5, marginBottom: 5, color:'var(--text-muted)' }}>
                <span>Progreso global</span><span style={{ fontVariantNumeric:'tabular-nums' }}>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} color="var(--purple)"/>
              <div style={{ fontSize: 11, color:'var(--text-faint)', marginTop: 12 }}>{c.activeSince ? `Activo desde ${c.activeSince}` : '—'}</div>
            </Card>
          );
        })}
      </div>
      <ClientSpaceFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing}
        onSubmit={async (values: any) => {
          if (editing) await updateSpace(editing.id, values);
          else await createSpace(values);
          setFormOpen(false); setEditing(null);
        }}
      />
    </div>
  );
};

export const ClienteOverview = ({ clientId, setRoute }) => {
  const { spaces, loading, createModule } = useClientSpaces();
  const { tasks: allTasks, update: updateTaskDB, create: createTaskDB } = useTasks();
  const [openTaskId, setOpenTaskId] = useState(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const c = spaces.find(s => s.id === clientId);
  if (loading) return <div style={{ padding: 40, color:'var(--text-muted)' }}>Cargando…</div>;
  if (!c) return <div style={{ padding: 40 }}>Cliente no encontrado.</div>;
  const tasks = allTasks.filter(t => t.clientId === clientId && !t.customFields?.archived);
  const updateTask = (id, patch) => { updateTaskDB(id, patch).catch((e) => console.error(e)); };
  // Para abrir una tarea: incluso archivada (por si se abre desde un enlace)
  const openTask = openTaskId ? allTasks.find(t => t.id === openTaskId && t.clientId === clientId) : null;

  const handleCreateProject = async ({ name, icon }) => {
    await createModule({ clientId, name, icon });
  };

  // Crear tarea desde el dashboard. El proyecto se elige en el propio modal.
  const handleCreateTask = async (values) => {
    const targetModuleId = values.moduleId;
    if (!targetModuleId) {
      alert("Selecciona un proyecto antes de crear la tarea.");
      return;
    }
    const tags = values.category ? [values.category] : [];
    const created = await createTaskDB({
      clientId,
      moduleId: targetModuleId,
      title: values.title,
      description: values.description,
      status: "todo",
      priority: values.priority || "media",
      assignees: values.assignees || [],
      tags,
      dueDate: values.dueDate || null,
    });

    // Log de actividad inicial (creación + asignaciones)
    const now = new Date();
    const newId = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const activity = [{ id: newId("a"), userId: "u1", action: "creó la tarea", when: now }];
    (values.assignees || []).forEach((uid, i) => {
      const name = D.userById(uid)?.name || uid;
      activity.push({
        id: newId("a"),
        userId: "u1",
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

  // Agrupar tareas en 3 columnas: por hacer (todo) | en proceso (doing + review) | terminadas (done)
  // Cada columna tiene un targetStatus que es lo que se aplicará al soltar una tarjeta.
  const columns = [
    { id: 'todo',  targetStatus: 'todo',  title: 'Por hacer',   color: '#9A968D', tasks: tasks.filter(t => t.status === 'todo') },
    { id: 'doing', targetStatus: 'doing', title: 'En proceso',  color: '#6A5ACD', tasks: tasks.filter(t => t.status === 'doing' || t.status === 'review') },
    { id: 'done',  targetStatus: 'done',  title: 'Terminadas',  color: '#4A7C59', tasks: tasks.filter(t => t.status === 'done') },
  ];

  const totalAbiertas = columns[0].tasks.length + columns[1].tasks.length;
  const moduleById = (id) => c.modules.find(m => m.id === id);

  const handleDragStart = (taskId, e) => {
    setDragId(taskId);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", taskId); } catch {}
  };
  const handleDragEnd = () => { setDragId(null); setDragOverColumn(null); };
  const handleDragOver = (colId, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colId) setDragOverColumn(colId);
  };
  const handleDrop = (col, e) => {
    e.preventDefault();
    if (dragId) {
      const t = tasks.find(x => x.id === dragId);
      if (t && t.status !== col.targetStatus) {
        // Si está marcando hecha y la tarea tiene progreso 0 → 100, y viceversa
        const patch = { status: col.targetStatus };
        if (col.targetStatus === 'done' && t.progress < 100) patch.progress = 100;
        if (col.targetStatus === 'todo' && t.progress === 100) patch.progress = 0;
        updateTask(dragId, patch);
      }
    }
    setDragId(null);
    setDragOverColumn(null);
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', minHeight:'calc(100vh - 64px)' }}>
      <ClienteSidebar client={c} tasks={tasks} activeModule={null} setRoute={setRoute} onAddProject={() => setNewProjectOpen(true)}/>
      <div style={{ padding:'28px 32px 48px', overflow:'auto' }}>
        {/* Header del cliente */}
        <div style={{ display:'flex', alignItems:'center', gap: 16, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: c.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 22, fontWeight: 600 }}>{c.logo}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 500, margin: 0, letterSpacing:'-0.02em' }}>{c.name}</h1>
            <div style={{ fontSize: 13, color:'var(--text-muted)', marginTop: 4 }}>{c.sector} · Activo desde {c.activeSince}</div>
          </div>
          <Button
            variant="outline"
            leftIcon={<Icon name="eye" size={14}/>}
            onClick={async () => {
              try {
                const access = await ensureAccess({ clientId, username: "123", password: "123" });
                window.open(`/portal/c/${access.token}?preview=1`, "_blank", "noopener,noreferrer");
              } catch (e: any) {
                console.error(e);
                alert("No se pudo abrir el portal: " + (e?.message || "error desconocido"));
              }
            }}
          >
            Acceder como cliente
          </Button>
          <Button
            variant="primary"
            leftIcon={<Icon name="link" size={14}/>}
            onClick={() => setShareOpen(true)}
          >
            Compartir portal
          </Button>
        </div>
        {c.description && (
          <p style={{ fontSize: 14, color:'var(--text-muted)', maxWidth: 640, marginBottom: 24 }}>{c.description}</p>
        )}

        {/* === DASHBOARD DE TAREAS === */}
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', margin:'8px 0 12px', gap: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Tareas del cliente</h2>
          <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
            <span style={{ fontSize: 12, color:'var(--text-muted)' }}>
              {tasks.length} en total · {totalAbiertas} abiertas · {columns[2].tasks.length} terminadas
            </span>
            <Button variant="primary" size="sm" leftIcon={<Icon name="plus" size={13}/>} onClick={() => setNewTaskOpen(true)}>
              Nueva tarea
            </Button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
          {columns.map(col => {
            const isOver = dragOverColumn === col.id;
            return (
              <div key={col.id}
                onDragOver={(e) => handleDragOver(col.id, e)}
                onDragLeave={(e) => {
                  // sólo limpiar si salimos por completo de la columna
                  if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null);
                }}
                onDrop={(e) => handleDrop(col, e)}
                style={{
                  background: isOver ? 'var(--purple-soft)' : 'var(--beige-bg)',
                  borderRadius: 12, padding: 12, minHeight: 200,
                  outline: isOver ? '2px dashed var(--purple)' : '2px dashed transparent',
                  outlineOffset: -2,
                  transition: 'background 140ms ease, outline-color 140ms ease',
                }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'4px 6px 12px' }}>
                  <span style={{ width: 8, height: 8, borderRadius:'50%', background: col.color }}/>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{col.title}</span>
                  <span style={{ fontSize: 11, color:'var(--text-muted)', fontVariantNumeric:'tabular-nums' }}>{col.tasks.length}</span>
                </div>
                {col.tasks.length === 0 ? (
                  <div style={{ padding:'14px 10px', fontSize: 12, color:'var(--text-faint)' }}>
                    {isOver ? 'Suelta aquí para mover la tarea' : 'Sin tareas en esta columna.'}
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
                    {col.tasks.map(t => {
                      const mod = moduleById(t.moduleId);
                      const overdue = t.dueDate && t.dueDate < D.TODAY && t.status !== 'done';
                      const isDragging = dragId === t.id;
                      return (
                        <div key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(t.id, e)}
                          onDragEnd={handleDragEnd}
                          onClick={() => { if (!isDragging) setOpenTaskId(t.id); }}
                          style={{
                            background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 9,
                            padding: 12, cursor: 'grab', boxShadow:'var(--shadow-sm)',
                            opacity: isDragging ? 0.4 : (t.status === 'done' ? 0.75 : 1),
                            transform: isDragging ? 'rotate(-1.2deg)' : 'none',
                            transition: 'box-shadow 120ms, transform 120ms, opacity 120ms',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                          <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 6 }}>
                            <PriorityFlag priority={t.priority} size={12}/>
                            {mod && (
                              <span style={{ fontSize: 11, color:'var(--text-muted)', display:'inline-flex', alignItems:'center', gap: 3 }}>
                                <span style={{ fontSize: 12 }}>{mod.icon}</span>
                                {mod.name}
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.35,
                            textDecoration: t.status === 'done' ? 'line-through' : 'none',
                            color: t.status === 'done' ? 'var(--text-muted)' : 'var(--text)',
                          }}>
                            {t.title}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize: 11, color:'var(--text-muted)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                              {t.subtasks?.length > 0 && (
                                <span style={{ display:'inline-flex', alignItems:'center', gap: 3 }}>
                                  <Icon name="check" size={11}/>
                                  {t.subtasks.filter(s => s.done).length}/{t.subtasks.length}
                                </span>
                              )}
                              {t.dueDate && (
                                <span style={{ display:'inline-flex', alignItems:'center', gap: 3, color: overdue ? 'var(--error)' : 'inherit' }}>
                                  <Icon name="clock" size={11}/>
                                  {D.fmtShort(t.dueDate)}
                                </span>
                              )}
                            </div>
                            <AvatarStack userIds={t.assignees} size={20} max={2}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* === PROYECTOS === */}
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', margin:'8px 0 12px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Proyectos</h2>
          <span style={{ fontSize: 12, color:'var(--text-muted)' }}>{c.modules.length} en total</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {c.modules.map(m => {
            const mTasks = tasks.filter(t => t.moduleId === m.id);
            const open = mTasks.filter(t => t.status !== 'done').length;
            const progress = mTasks.length > 0 ? (mTasks.filter(t => t.status === 'done').length / mTasks.length) * 100 : 0;
            return (
              <Card key={m.id} interactive padding={16} onClick={() => setRoute(`/clientes/${clientId}/${m.id}`)}>
                <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 20 }}>{m.icon}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11.5, color:'var(--text-muted)', marginBottom: 8 }}>
                  <span>{mTasks.length} tareas · {open} abiertas</span>
                  <span style={{ fontVariantNumeric:'tabular-nums' }}>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} color="var(--purple)"/>
              </Card>
            );
          })}
          <Card padding={16} interactive onClick={() => setNewProjectOpen(true)} style={{ border:'1px dashed var(--border-strong)', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', minHeight: 80, color:'var(--text-muted)' }}>
            <Icon name="plus" size={14} style={{ marginRight: 6 }}/> Nuevo proyecto
          </Card>
        </div>
      </div>
      {openTask && <TaskModal task={openTask} onClose={() => setOpenTaskId(null)} updateTask={(patch) => updateTask(openTask.id, patch)} client={c}/>}
      <NewTaskModal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onSubmit={handleCreateTask}
        projects={c.modules || []}
      />
      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onSubmit={handleCreateProject}
      />
      <SharePortalModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        clientId={clientId}
        clientName={c.name}
      />
    </div>
  );
};

export const ClienteSidebar = ({ client, tasks, activeModule, setRoute, onAddProject }) => {
  return (
    <aside style={{ width: 240, borderRight:'1px solid var(--border)', background:'var(--beige-bg)', padding:'20px 12px', position:'sticky', top: 64, height:'calc(100vh - 64px)', overflow:'auto' }}>
      <div style={{ padding:'0 10px 14px', borderBottom:'1px solid var(--border)', marginBottom: 10 }}>
        <button onClick={() => setRoute('/clientes')} style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 12, color:'var(--text-muted)', marginBottom: 10 }}>
          <Icon name="chevronLeft" size={12}/> Todos los clientes
        </button>
        <button
          onClick={() => setRoute(`/clientes/${client.id}`)}
          title={`Ir al panel de ${client.name}`}
          style={{
            display:'flex', alignItems:'center', gap: 10, width:'100%',
            padding: '6px 4px', margin: '-2px -4px', borderRadius: 7,
            background: 'transparent', cursor: 'pointer',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 28, height: 28, borderRadius: 7, background: client.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{client.logo}</div>
          <div style={{ fontSize: 13, fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>
        </button>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 500, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 10px 6px' }}>Módulos</div>
      {client.modules.map(m => {
        const active = activeModule === m.id;
        const open = tasks.filter(t => t.moduleId === m.id && t.status !== 'done').length;
        return (
          <button key={m.id} onClick={() => setRoute(`/clientes/${client.id}/${m.id}`)}
            style={{ display:'flex', alignItems:'center', gap: 10, width:'100%', padding:'8px 10px', borderRadius: 7, fontSize: 13, marginBottom: 1,
              background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text)' : 'var(--text)', fontWeight: active ? 500 : 400,
              border: active ? '1px solid var(--border)' : '1px solid transparent' }}
            onMouseEnter={(e)=>{ if (!active) e.currentTarget.style.background='rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e)=>{ if (!active) e.currentTarget.style.background='transparent'; }}>
            <span style={{ fontSize: 15 }}>{m.icon}</span>
            <span style={{ flex: 1, textAlign:'left', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.name}</span>
            {open > 0 && <span style={{ fontSize: 11, color:'var(--text-muted)', fontVariantNumeric:'tabular-nums' }}>{open}</span>}
          </button>
        );
      })}
      <button
        onClick={() => onAddProject?.()}
        style={{ display:'flex', alignItems:'center', gap: 8, width:'100%', padding:'8px 10px', borderRadius: 7, fontSize: 12.5, color:'var(--text-muted)', marginTop: 4, cursor: onAddProject ? 'pointer' : 'default' }}
        onMouseEnter={(e) => { if (onAddProject) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Icon name="plus" size={12}/> Nuevo módulo
      </button>
    </aside>
  );
};

