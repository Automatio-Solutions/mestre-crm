"use client";
/* @ts-nocheck */
import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import * as D from "@/lib/data";
import {
  Icon, Button, Card, CardHeader, Badge, Avatar, AvatarStack, Input,
  Dropdown, DropdownItem, DropdownSeparator, Tabs, Sheet, Modal,
  Tooltip, EmptyState, Skeleton, PriorityFlag, StatusPill, TagPill,
  Sparkline, Progress, useToast,
} from "@/components/ui";

// ============================================================
// TASK MODAL — rich detail view
// ============================================================
export const TaskModal = ({ task, onClose, updateTask, client }) => {
  const [newComment, setNewComment] = useState('');
  const priority = D.PRIORITIES.find(p => p.id === task.priority);
  const status = D.STATUSES.find(s => s.id === task.status);
  const mod = client?.modules.find(m => m.id === task.moduleId);

  const toggleSub = (i) => {
    const subs = task.subtasks.map((s, j) => j === i ? { ...s, done: !s.done } : s);
    const done = subs.filter(s => s.done).length;
    updateTask({ subtasks: subs, progress: Math.round((done / subs.length) * 100) });
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset: 0, background:'rgba(23, 18, 12, 0.45)', backdropFilter:'blur(3px)', zIndex: 200, display:'flex', alignItems:'center', justifyContent:'center', padding: 40 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background:'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 820, maxHeight:'calc(100vh - 80px)', display:'flex', flexDirection:'column', boxShadow:'0 30px 80px rgba(0,0,0,0.25)', border:'1px solid var(--border)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap: 12 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 12, color:'var(--text-muted)' }}>
            <span>{client?.name}</span><Icon name="chevronRight" size={10}/>
            <span>{mod?.icon} {mod?.name}</span><Icon name="chevronRight" size={10}/>
            <span style={{ fontSize: 11 }}>{task.id.toUpperCase()}</span>
          </div>
          <div style={{ flex: 1 }}/>
          <Button variant="ghost" size="icon"><Icon name="link" size={14}/></Button>
          <Button variant="ghost" size="icon"><Icon name="more" size={14}/></Button>
          <Button variant="ghost" size="icon" onClick={onClose}><Icon name="close" size={14}/></Button>
        </div>

        <div style={{ flex: 1, display:'grid', gridTemplateColumns:'1fr 260px', overflow:'hidden' }}>
          {/* Main */}
          <div style={{ overflow:'auto', padding:'20px 24px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap: 10, marginBottom: 14 }}>
              <button onClick={() => updateTask({ status: task.status === 'done' ? 'todo' : 'done' })}
                style={{ marginTop: 4, width: 20, height: 20, borderRadius: 5, border:'1.5px solid var(--border-strong)', background: task.status === 'done' ? 'var(--success)' : 'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {task.status === 'done' && <Icon name="check" size={13} style={{ color:'#fff' }} stroke={3}/>}
              </button>
              <h2 style={{ flex: 1, fontSize: 21, fontWeight: 500, margin: 0, letterSpacing:'-0.01em', lineHeight: 1.25, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)' }}>{task.title}</h2>
            </div>

            {task.description && (
              <div style={{ fontSize: 13.5, color:'var(--text)', lineHeight: 1.55, marginBottom: 20, paddingLeft: 30 }}>{task.description}</div>
            )}

            {task.subtasks?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Subtareas</div>
                  <div style={{ fontSize: 11.5, color:'var(--text-muted)' }}>{task.subtasks.filter(s=>s.done).length} de {task.subtasks.length}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap: 2 }}>
                  {task.subtasks.map((s, i) => (
                    <label key={i} style={{ display:'flex', alignItems:'center', gap: 10, padding:'7px 8px', borderRadius: 6, fontSize: 13, cursor:'pointer' }}
                      onMouseEnter={(e)=>e.currentTarget.style.background='var(--beige-bg)'}
                      onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                      <input type="checkbox" checked={s.done} onChange={() => toggleSub(i)}/>
                      <span style={{ textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--text-muted)' : 'var(--text)' }}>{s.title}</span>
                    </label>
                  ))}
                  <button style={{ display:'flex', alignItems:'center', gap: 8, padding:'7px 8px', fontSize: 12.5, color:'var(--text-muted)', textAlign:'left' }}>
                    <Icon name="plus" size={12}/> Añadir subtarea
                  </button>
                </div>
              </div>
            )}

            {/* Comments */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 14 }}>Actividad</div>
              <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
                {task.comments?.map((c, i) => {
                  const u = D.USERS.find(x => x.id === c.userId);
                  return (
                    <div key={i} style={{ display:'flex', gap: 10 }}>
                      <Avatar user={u} size={28}/>
                      <div style={{ flex: 1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{u?.name}</span>
                          <span style={{ fontSize: 11, color:'var(--text-muted)' }}>{D.relativeTime(c.when)}</span>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.45 }}>{c.text}</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ display:'flex', gap: 10, marginTop: 4 }}>
                  <Avatar user={D.USERS[0]} size={28}/>
                  <div style={{ flex: 1 }}>
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Añade un comentario, @menciona a alguien…"
                      style={{ width:'100%', minHeight: 60, padding:'8px 10px', border:'1px solid var(--border)', borderRadius: 8, fontSize: 13, resize:'vertical', fontFamily:'inherit', background:'var(--surface)' }}/>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap: 6, marginTop: 6 }}>
                      <Button variant="ghost" size="sm">Cancelar</Button>
                      <Button variant="primary" size="sm" disabled={!newComment.trim()}>Comentar</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right meta panel */}
          <div style={{ borderLeft:'1px solid var(--border)', padding:'20px 20px', overflow:'auto', background:'var(--beige-bg)' }}>
            <MetaRow label="Estado" value={<Badge tone={task.status === 'done' ? 'success' : task.status === 'blocked' ? 'error' : 'neutral'}><span style={{ width: 6, height: 6, borderRadius:'50%', background: status?.color, display:'inline-block', marginRight: 5 }}/>{status?.name}</Badge>}/>
            <MetaRow label="Prioridad" value={<span style={{ display:'inline-flex', alignItems:'center', gap: 6, fontSize: 12.5, fontWeight: 500 }}><PriorityFlag priority={task.priority}/>{priority?.name}</span>}/>
            <MetaRow label="Asignados" value={<AvatarStack userIds={task.assignees} size={22} max={4}/>}/>
            <MetaRow label="Fechas" value={
              <div style={{ fontSize: 12.5 }}>
                {task.startDate && <div>Inicio: <b style={{ fontWeight: 500 }}>{D.fmtDate(task.startDate)}</b></div>}
                {task.dueDate && <div style={{ color: task.dueDate < D.TODAY && task.status !== 'done' ? 'var(--error)' : 'inherit' }}>Vence: <b style={{ fontWeight: 500 }}>{D.fmtDate(task.dueDate)}</b></div>}
              </div>
            }/>
            <MetaRow label="Progreso" value={
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11.5, marginBottom: 5 }}>
                  <span style={{ color:'var(--text-muted)' }}>{task.progress}% completo</span>
                </div>
                <Progress value={task.progress}/>
              </div>
            }/>
            <MetaRow label="Tags" value={
              <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>
                {task.tags.map(t => <TagPill key={t} tag={t} size="sm"/>)}
              </div>
            }/>
            {task.timeTracked != null && <MetaRow label="Tiempo" value={<span style={{ fontSize: 12.5 }}>{task.timeTracked}h <span style={{ color:'var(--text-muted)' }}>/ {task.timeEstimate}h</span></span>}/>}
            {task.attachments?.length > 0 && <MetaRow label="Adjuntos" value={<div style={{ display:'flex', flexDirection:'column', gap: 4 }}>{task.attachments.map((a,i) => <div key={i} style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 12 }}><Icon name="paperclip" size={11}/>{a}</div>)}</div>}/>}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetaRow = ({ label, value }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 500, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 6 }}>{label}</div>
    <div>{value}</div>
  </div>
);

