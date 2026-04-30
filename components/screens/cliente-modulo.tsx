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
import { ClienteSidebar } from "./clientes";
import { TaskModal } from "./task-modal";
import { NewTaskModal } from "./new-task-modal";
import { NewProjectModal } from "./new-project-modal";
import { useClientSpaces } from "@/lib/db/useClientSpaces";
import { useTasks } from "@/lib/db/useTasks";

// ============================================================
// CLIENTE → MÓDULO (Lista | Kanban | Calendario | Gantt)
// ============================================================
export const ClienteModulo = ({ clientId, moduleId, setRoute, initialTaskId }) => {
  const { spaces, loading: spacesLoading, createModule } = useClientSpaces();
  const { tasks: moduleTasks, loading: tasksLoading, update: updateTaskDB, create: createTaskDB, remove: removeTaskDB } = useTasks({ clientId, moduleId });
  const client = spaces.find(s => s.id === clientId);
  const mod = client?.modules.find(m => m.id === moduleId);
  const [view, setView] = useState('lista');
  const [openTaskId, setOpenTaskId] = useState(initialTaskId || null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const handleCreateProject = async ({ name, icon }) => {
    await createModule({ clientId, name, icon });
  };
  useEffect(() => { if (initialTaskId) setOpenTaskId(initialTaskId); }, [initialTaskId]);

  // Persistente: escribe a Supabase. useTasks hace update optimista.
  const updateTask = (id, patch) => { updateTaskDB(id, patch).catch((e) => console.error(e)); };
  // Filtrar las archivadas de las vistas del proyecto
  const allTasks = moduleTasks.filter(t => !t.customFields?.archived);

  const handleCreateTask = async (values) => {
    // values: { title, description, moduleId, assignees, dueDate, priority, category, subtasks, attachments }
    const tags = values.category ? [values.category] : [];
    const targetModuleId = values.moduleId || moduleId;
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

    // Construir log de actividad inicial (creación + asignaciones)
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

    // Persistir subtareas / adjuntos / actividad
    if (created) {
      await updateTaskDB(created.id, {
        subtasks: values.subtasks || [],
        attachments: values.attachments || [],
        activity,
      });
    }
  };

  if (spacesLoading || tasksLoading) return <div style={{ padding: 40, color:'var(--text-muted)' }}>Cargando…</div>;
  if (!client || !mod) return <div style={{ padding: 40 }}>Módulo no encontrado.</div>;

  // Para abrir una tarea: usar moduleTasks completo (sin filtrar archivadas) por si llega un id de archivada
  const openTask = openTaskId ? moduleTasks.find(t => t.id === openTaskId) : null;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', minHeight:'calc(100vh - 64px)' }}>
      <ClienteSidebar client={client} tasks={allTasks} activeModule={moduleId} setRoute={setRoute} onAddProject={() => setNewProjectOpen(true)}/>
      <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'22px 28px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>{mod.icon}</span>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing:'-0.01em' }}>{mod.name}</h1>
            <span style={{ fontSize: 12, color:'var(--text-muted)' }}>· {allTasks.length} tareas</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16 }}>
            <Tabs value={view} onChange={setView} tabs={[
              { id:'lista', label:'Lista', icon:<Icon name="list" size={13}/> },
              { id:'kanban', label:'Kanban', icon:<Icon name="columns" size={13}/> },
              { id:'calendario', label:'Calendario', icon:<Icon name="calendar" size={13}/> },
              { id:'gantt', label:'Gantt', icon:<Icon name="timeline" size={13}/> },
            ]}/>
            <div style={{ display:'flex', gap: 8 }}>
              <Button variant="outline" size="sm" leftIcon={<Icon name="filter" size={13}/>}>Filtros</Button>
              <Button variant="primary" size="sm" leftIcon={<Icon name="plus" size={13}/>} onClick={() => setNewTaskOpen(true)}>Nueva tarea</Button>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflow:'auto', padding: view === 'kanban' ? '0 28px 28px' : '0 28px 28px' }}>
          {view === 'lista' && <VistaLista tasks={allTasks} onOpen={setOpenTaskId} updateTask={updateTask}/>}
          {view === 'kanban' && <VistaKanban tasks={allTasks} onOpen={setOpenTaskId} updateTask={updateTask}/>}
          {view === 'calendario' && <VistaCalendario tasks={allTasks} onOpen={setOpenTaskId} updateTask={updateTask}/>}
          {view === 'gantt' && <VistaGantt tasks={allTasks} onOpen={setOpenTaskId}/>}
        </div>
      </div>
      {openTask && <TaskModal task={openTask} onClose={() => setOpenTaskId(null)} updateTask={(patch) => updateTask(openTask.id, patch)} client={client}/>}
      <NewTaskModal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onSubmit={handleCreateTask}
        projects={client?.modules || []}
        defaultModuleId={moduleId}
      />
      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

// ============================================================
// VISTA LISTA (agrupada por estado, con drag & drop)
// ============================================================
const VistaLista = ({ tasks, onOpen, updateTask }) => {
  const [collapsed, setCollapsed] = useState({});
  const [dragId, setDragId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

  const handleDragStart = (id, e) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch {}
  };
  const handleDragOver = (statusId, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStatus !== statusId) setDragOverStatus(statusId);
  };
  const handleDrop = (statusId, e) => {
    e.preventDefault();
    if (dragId) {
      const t = tasks.find(x => x.id === dragId);
      if (t && t.status !== statusId) {
        const patch = { status: statusId };
        if (statusId === 'done' && (t.progress || 0) < 100) patch.progress = 100;
        if (statusId === 'todo' && t.progress === 100) patch.progress = 0;
        updateTask(dragId, patch);
      }
    }
    setDragId(null);
    setDragOverStatus(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverStatus(null); };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 18 }}>
      {D.STATUSES.map(st => {
        const list = tasks.filter(t => t.status === st.id);
        const open = !collapsed[st.id];
        const isOver = dragOverStatus === st.id;
        return (
          <div
            key={st.id}
            onDragOver={(e) => handleDragOver(st.id, e)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStatus(null);
            }}
            onDrop={(e) => handleDrop(st.id, e)}
            style={{
              borderRadius: 10,
              outline: isOver ? '2px dashed var(--purple)' : '2px dashed transparent',
              outlineOffset: 4,
              background: isOver ? 'var(--purple-soft)' : 'transparent',
              transition: 'background 140ms ease, outline-color 140ms ease',
              padding: isOver ? '4px' : '0',
              margin: isOver ? '-4px' : '0',
            }}
          >
            <button onClick={() => setCollapsed(c => ({ ...c, [st.id]: !c[st.id] }))}
              style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 8, fontSize: 12, fontWeight: 500 }}>
              <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12} style={{ color:'var(--text-muted)' }}/>
              <span style={{ width: 8, height: 8, borderRadius:'50%', background: st.color }}/>
              <span>{st.name}</span>
              <span style={{ color:'var(--text-muted)', fontWeight: 400 }}>{list.length}</span>
              {isOver && (
                <span style={{ color: 'var(--purple)', fontWeight: 500, marginLeft: 6 }}>
                  · Suelta aquí
                </span>
              )}
            </button>
            {open && (
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 10, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'26px 1fr 140px 160px 110px 80px 40px', padding:'8px 14px', background:'var(--beige-bg)', fontSize: 10.5, fontWeight: 500, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>
                  <div/>
                  <div>Tarea</div>
                  <div>Asignado</div>
                  <div>Tags</div>
                  <div>Vence</div>
                  <div>Progreso</div>
                  <div/>
                </div>
                {list.length === 0 && (
                  <div style={{ padding: '14px', fontSize: 12, color: 'var(--text-faint)' }}>
                    {isOver ? 'Suelta aquí para mover la tarea' : 'Sin tareas en este estado'}
                  </div>
                )}
                {list.map((t, i) => {
                  const isDragging = dragId === t.id;
                  return (
                  <div key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStart(t.id, e)}
                    onDragEnd={handleDragEnd}
                    onClick={() => { if (!isDragging) onOpen(t.id); }}
                    style={{
                      display:'grid', gridTemplateColumns:'26px 1fr 140px 160px 110px 80px 40px',
                      alignItems:'center', padding:'10px 14px',
                      borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      fontSize: 13,
                      opacity: isDragging ? 0.4 : 1,
                      transition:'background 120ms, opacity 120ms',
                    }}
                    onMouseEnter={(e)=>{ if (!isDragging) e.currentTarget.style.background='var(--beige-bg)'; }}
                    onMouseLeave={(e)=>{ if (!isDragging) e.currentTarget.style.background='transparent'; }}>
                    <div onClick={(e) => { e.stopPropagation(); updateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' }); }} style={{ cursor:'pointer' }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, border:'1.5px solid var(--border-strong)', background: t.status === 'done' ? 'var(--success)' : 'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {t.status === 'done' && <Icon name="check" size={11} style={{ color:'#fff' }} stroke={3}/>}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, minWidth: 0 }}>
                      <PriorityFlag priority={t.priority}/>
                      <span style={{ fontWeight: 500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--text-muted)' : 'var(--text)' }}>{t.title}</span>
                      {t.subtasks?.length > 0 && <span style={{ fontSize: 11, color:'var(--text-muted)', display:'inline-flex', alignItems:'center', gap: 2 }}><Icon name="list" size={10}/>{t.subtasks.filter(s=>s.done).length}/{t.subtasks.length}</span>}
                      {t.comments?.length > 0 && <span style={{ fontSize: 11, color:'var(--text-muted)', display:'inline-flex', alignItems:'center', gap: 2 }}><Icon name="message" size={10}/>{t.comments.length}</span>}
                    </div>
                    <AvatarStack userIds={t.assignees} size={22} max={3}/>
                    <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>{t.tags.slice(0, 2).map(tag => <TagPill key={tag} tag={tag} size="sm"/>)}</div>
                    <div style={{ fontSize: 12, color: t.dueDate && t.dueDate < D.TODAY && t.status !== 'done' ? 'var(--error)' : 'var(--text-muted)' }}>{t.dueDate ? D.fmtShort(t.dueDate) : '—'}</div>
                    <div style={{ fontSize: 11, color:'var(--text-muted)', fontVariantNumeric:'tabular-nums' }}>{t.progress}%</div>
                    <button onClick={(e) => e.stopPropagation()} style={{ color:'var(--text-faint)' }}><Icon name="moreV" size={13}/></button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// VISTA KANBAN con drag & drop
// ============================================================
const VistaKanban = ({ tasks, onOpen, updateTask }) => {
  const [dragId, setDragId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  return (
    <div style={{ display:'flex', gap: 12, overflowX:'auto', paddingBottom: 8, minHeight:'calc(100vh - 240px)' }}>
      {D.STATUSES.map(st => {
        const list = tasks.filter(t => t.status === st.id);
        const isOver = dragOverStatus === st.id;
        return (
          <div key={st.id}
            onDragOver={(e) => { e.preventDefault(); setDragOverStatus(st.id); }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => { e.preventDefault(); if (dragId) updateTask(dragId, { status: st.id }); setDragId(null); setDragOverStatus(null); }}
            style={{ width: 300, flexShrink: 0, background:'var(--beige-bg)', borderRadius: 10, padding: 10, border: `1px solid ${isOver ? 'var(--purple)' : 'var(--border)'}`, transition:'border 120ms' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'4px 8px 10px' }}>
              <span style={{ width: 8, height: 8, borderRadius:'50%', background: st.color }}/>
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>{st.name}</span>
              <span style={{ fontSize: 11, color:'var(--text-muted)' }}>{list.length}</span>
              <button style={{ marginLeft:'auto', color:'var(--text-muted)' }}><Icon name="plus" size={13}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              {list.map(t => (
                <div key={t.id} draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => { setDragId(null); setDragOverStatus(null); }}
                  onClick={() => onOpen(t.id)}
                  style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 9, padding: 12, cursor:'grab', boxShadow: dragId === t.id ? '0 8px 20px rgba(0,0,0,0.15)' : 'var(--shadow-sm)', transform: dragId === t.id ? 'rotate(-1.5deg)' : 'none', transition:'box-shadow 120ms, transform 120ms' }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 8 }}>
                    <PriorityFlag priority={t.priority} size={12}/>
                    <span style={{ fontSize: 10.5, color:'var(--text-muted)', fontWeight: 500 }}>{D.PRIORITIES.find(p=>p.id===t.priority)?.name}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, lineHeight: 1.35 }}>{t.title}</div>
                  {t.tags.length > 0 && (
                    <div style={{ display:'flex', gap: 4, flexWrap:'wrap', marginBottom: 10 }}>
                      {t.tags.slice(0, 3).map(tag => <TagPill key={tag} tag={tag} size="sm"/>)}
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize: 11, color:'var(--text-muted)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                      {t.subtasks?.length > 0 && <span style={{ display:'inline-flex', alignItems:'center', gap: 3 }}><Icon name="list" size={11}/>{t.subtasks.filter(s=>s.done).length}/{t.subtasks.length}</span>}
                      {t.comments?.length > 0 && <span style={{ display:'inline-flex', alignItems:'center', gap: 3 }}><Icon name="message" size={11}/>{t.comments.length}</span>}
                      {t.dueDate && <span style={{ display:'inline-flex', alignItems:'center', gap: 3, color: t.dueDate < D.TODAY ? 'var(--error)' : 'inherit' }}><Icon name="clock" size={11}/>{D.fmtShort(t.dueDate)}</span>}
                    </div>
                    <AvatarStack userIds={t.assignees} size={20} max={2}/>
                  </div>
                </div>
              ))}
              <button style={{ padding:'8px 10px', borderRadius: 8, fontSize: 12, color:'var(--text-muted)', textAlign:'left', border:'1px dashed var(--border-strong)', background:'transparent' }}
                onMouseEnter={(e)=>e.currentTarget.style.background='rgba(0,0,0,0.03)'}
                onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                + Añadir tarea
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// VISTA CALENDARIO (month view, draggable)
// ============================================================
const VistaCalendario = ({ tasks, onOpen, updateTask }) => {
  const [cursor, setCursor] = useState(new Date(D.TODAY.getFullYear(), D.TODAY.getMonth(), 1));
  const [dragId, setDragId] = useState(null);

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const sameDay = (a, b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
          <Button variant="ghost" size="iconSm" onClick={() => setCursor(new Date(year, month - 1, 1))}><Icon name="chevronLeft" size={14}/></Button>
          <div style={{ fontSize: 15, fontWeight: 500, minWidth: 180, textAlign:'center', letterSpacing:'-0.01em' }}>{cursor.toLocaleDateString('es-ES', { month:'long', year:'numeric' })}</div>
          <Button variant="ghost" size="iconSm" onClick={() => setCursor(new Date(year, month + 1, 1))}><Icon name="chevronRight" size={14}/></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(D.TODAY.getFullYear(), D.TODAY.getMonth(), 1))}>Hoy</Button>
        </div>
        <Tabs value="mes" onChange={() => {}} size="sm" tabs={[
          { id:'mes', label:'Mes' }, { id:'semana', label:'Semana' }, { id:'dia', label:'Día' },
        ]}/>
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 10, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', background:'var(--beige-bg)', borderBottom:'1px solid var(--border)' }}>
          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
            <div key={d} style={{ padding:'8px 10px', fontSize: 11, fontWeight: 500, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gridAutoRows: 'minmax(110px, 1fr)' }}>
          {cells.map((cell, i) => {
            const dayTasks = cell ? tasks.filter(t => sameDay(t.dueDate, cell)) : [];
            const isToday = cell && sameDay(cell, D.TODAY);
            return (
              <div key={i}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragId && cell) updateTask(dragId, { dueDate: cell }); setDragId(null); }}
                style={{ borderRight: (i % 7) < 6 ? '1px solid var(--border)' : 'none', borderTop: i >= 7 ? '1px solid var(--border)' : 'none', padding: 6, background: isToday ? 'var(--beige-bg)' : 'transparent', minHeight: 110, overflow:'hidden' }}>
                {cell && <div style={{ fontSize: 11.5, fontWeight: isToday ? 600 : 500, color: isToday ? 'var(--purple)' : 'var(--text)', marginBottom: 4 }}>{cell.getDate()}</div>}
                <div style={{ display:'flex', flexDirection:'column', gap: 3 }}>
                  {dayTasks.slice(0, 3).map(t => {
                    const p = D.PRIORITIES.find(x => x.id === t.priority);
                    return (
                      <div key={t.id} draggable
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => onOpen(t.id)}
                        style={{ background:'var(--surface)', borderLeft: `3px solid ${p?.color || 'var(--purple)'}`, padding:'3px 6px', borderRadius: 4, fontSize: 11, fontWeight: 500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', cursor:'grab', boxShadow:'var(--shadow-sm)', border:'1px solid var(--border)' }}>
                        {t.title}
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && <div style={{ fontSize: 10.5, color:'var(--text-muted)', paddingLeft: 4 }}>+{dayTasks.length - 3} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// VISTA GANTT
// ============================================================
const VistaGantt = ({ tasks, onOpen }) => {
  const withDates = tasks.filter(t => t.startDate && t.dueDate).sort((a,b) => a.startDate - b.startDate);
  if (withDates.length === 0) return <EmptyState icon={<Icon name="timeline" size={28}/>} title="Sin fechas" description="Añade fechas de inicio y fin a las tareas para verlas en Gantt."/>;
  const minDate = new Date(Math.min(...withDates.map(t => t.startDate)));
  const maxDate = new Date(Math.max(...withDates.map(t => t.dueDate)));
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);
  const totalDays = Math.round((maxDate - minDate) / 86400000);
  const dayWidth = 30;
  const totalWidth = totalDays * dayWidth;

  const depMap = new Map();
  D.TASK_DEPENDENCIES.forEach(([from, to]) => {
    if (!depMap.has(to)) depMap.set(to, []);
    depMap.get(to).push(from);
  });

  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minDate); d.setDate(d.getDate() + i);
    days.push(d);
  }

  const offset = (d) => Math.round((d - minDate) / 86400000) * dayWidth;

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 10, overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr' }}>
        {/* Left column */}
        <div style={{ borderRight:'1px solid var(--border)' }}>
          <div style={{ height: 48, display:'flex', alignItems:'center', padding:'0 14px', borderBottom:'1px solid var(--border)', background:'var(--beige-bg)', fontSize: 11, fontWeight: 500, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Tarea</div>
          {withDates.map(t => (
            <div key={t.id} onClick={() => onOpen(t.id)} style={{ height: 40, display:'flex', alignItems:'center', gap: 8, padding:'0 14px', borderBottom:'1px solid var(--border)', fontSize: 12.5, cursor:'pointer' }}
              onMouseEnter={(e)=>e.currentTarget.style.background='var(--beige-bg)'}
              onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
              <PriorityFlag priority={t.priority} size={12}/>
              <span style={{ flex: 1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight: 450 }}>{t.title}</span>
              <AvatarStack userIds={t.assignees} size={18} max={2}/>
            </div>
          ))}
        </div>
        {/* Right column — timeline */}
        <div style={{ overflowX:'auto' }}>
          <div style={{ width: totalWidth, position:'relative' }}>
            <div style={{ display:'flex', height: 48, borderBottom:'1px solid var(--border)', background:'var(--beige-bg)' }}>
              {days.map((d, i) => {
                const isMonthStart = d.getDate() === 1 || i === 0;
                const isToday = D.iso(d) === D.iso(D.TODAY);
                return (
                  <div key={i} style={{ width: dayWidth, flexShrink: 0, borderLeft: isMonthStart ? '1px solid var(--border-strong)' : '1px solid transparent', padding: '4px 2px', fontSize: 9.5, textAlign:'center', color: isToday ? 'var(--purple)' : 'var(--text-muted)' }}>
                    {isMonthStart && <div style={{ fontSize: 10, fontWeight: 600, color:'var(--text)', marginBottom: 2 }}>{d.toLocaleDateString('es-ES', { month:'short' })}</div>}
                    <div style={{ fontWeight: isToday ? 600 : 400 }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            {/* Rows */}
            <svg style={{ position:'absolute', top: 48, left: 0, width: totalWidth, height: withDates.length * 40, pointerEvents:'none' }}>
              {withDates.map((t, rowIdx) => {
                const deps = depMap.get(t.id) || [];
                return deps.map((fromId, di) => {
                  const fromIdx = withDates.findIndex(x => x.id === fromId);
                  if (fromIdx < 0) return null;
                  const from = withDates[fromIdx];
                  const x1 = offset(from.dueDate);
                  const y1 = fromIdx * 40 + 20;
                  const x2 = offset(t.startDate);
                  const y2 = rowIdx * 40 + 20;
                  return <path key={di} d={`M${x1},${y1} L${x1+8},${y1} L${x1+8},${y2} L${x2-4},${y2}`} stroke="var(--text-faint)" strokeWidth="1" fill="none" strokeDasharray="3,3" markerEnd="url(#arrow)"/>;
                });
              })}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-faint)"/>
                </marker>
              </defs>
            </svg>
            {withDates.map((t, i) => {
              const x = offset(t.startDate);
              const w = Math.max(dayWidth, (Math.round((t.dueDate - t.startDate) / 86400000) + 1) * dayWidth);
              const p = D.PRIORITIES.find(x => x.id === t.priority);
              const todayX = offset(D.TODAY);
              return (
                <div key={t.id} style={{ height: 40, borderBottom:'1px solid var(--border)', position:'relative' }}>
                  {/* weekend stripes */}
                  {days.map((d, di) => {
                    const wd = d.getDay();
                    if (wd === 0 || wd === 6) return <div key={di} style={{ position:'absolute', left: di * dayWidth, top: 0, bottom: 0, width: dayWidth, background:'rgba(0,0,0,0.015)' }}/>;
                    return null;
                  })}
                  {/* today line */}
                  {i === 0 && <div style={{ position:'absolute', left: todayX, top: -48, bottom: -withDates.length * 40 + 40, width: 1, background:'var(--purple)', opacity: 0.5 }}/>}
                  {/* bar */}
                  <div onClick={() => onOpen(t.id)} style={{ position:'absolute', left: x + 3, top: 8, height: 24, width: w - 6, background: p?.color + '20', border: `1.5px solid ${p?.color}`, borderRadius: 6, cursor:'pointer', overflow:'hidden', display:'flex', alignItems:'center', padding:'0 8px' }}>
                    <div style={{ position:'absolute', left: 0, top: 0, bottom: 0, width: `${t.progress}%`, background: p?.color + '55' }}/>
                    <span style={{ position:'relative', fontSize: 11, fontWeight: 500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

