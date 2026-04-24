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
import { useClientSpaces } from "@/lib/db/useClientSpaces";
import { useTasks } from "@/lib/db/useTasks";
import { ClientSpaceFormModal } from "./client-space-form";

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
  const { tasks: allTasks } = useTasks();
  const c = spaces.find(s => s.id === clientId);
  if (loading) return <div style={{ padding: 40, color:'var(--text-muted)' }}>Cargando…</div>;
  if (!c) return <div style={{ padding: 40 }}>Cliente no encontrado.</div>;
  const tasks = allTasks.filter(t => t.clientId === clientId);
  const addModule = async () => {
    const name = prompt("Nombre del módulo");
    if (!name?.trim()) return;
    const icon = prompt("Icono (emoji opcional)", "📁") || "📁";
    await createModule({ clientId, name: name.trim(), icon });
  };
  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', minHeight:'calc(100vh - 64px)' }}>
      <ClienteSidebar client={c} tasks={tasks} activeModule={null} setRoute={setRoute}/>
      <div style={{ padding:'28px 32px 48px', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: c.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 22, fontWeight: 600 }}>{c.logo}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 500, margin: 0, letterSpacing:'-0.02em' }}>{c.name}</h1>
            <div style={{ fontSize: 13, color:'var(--text-muted)', marginTop: 4 }}>{c.sector} · Activo desde {c.activeSince}</div>
          </div>
          <Button variant="outline" leftIcon={<Icon name="eye" size={14}/>}>Acceder como cliente</Button>
        </div>
        <p style={{ fontSize: 14, color:'var(--text-muted)', maxWidth: 640, marginBottom: 24 }}>{c.description}</p>

        <h2 style={{ fontSize: 15, fontWeight: 500, margin:'24px 0 12px' }}>Módulos</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {c.modules.map(m => {
            const mTasks = tasks.filter(t => t.moduleId === m.id);
            const open = mTasks.filter(t => t.status !== 'done').length;
            return (
              <Card key={m.id} interactive padding={16} onClick={() => setRoute(`/clientes/${clientId}/${m.id}`)}>
                <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 20 }}>{m.icon}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11.5, color:'var(--text-muted)' }}>
                  <span>{mTasks.length} tareas · {open} abiertas</span>
                  <span>Act. {D.relativeTime(m.lastUpdated)}</span>
                </div>
              </Card>
            );
          })}
          <Card padding={16} interactive onClick={addModule} style={{ border:'1px dashed var(--border-strong)', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', minHeight: 80, color:'var(--text-muted)' }}>
            <Icon name="plus" size={14} style={{ marginRight: 6 }}/> Nuevo módulo
          </Card>
        </div>
      </div>
    </div>
  );
};

export const ClienteSidebar = ({ client, tasks, activeModule, setRoute }) => {
  return (
    <aside style={{ width: 240, borderRight:'1px solid var(--border)', background:'var(--beige-bg)', padding:'20px 12px', position:'sticky', top: 64, height:'calc(100vh - 64px)', overflow:'auto' }}>
      <div style={{ padding:'0 10px 14px', borderBottom:'1px solid var(--border)', marginBottom: 10 }}>
        <button onClick={() => setRoute('/clientes')} style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 12, color:'var(--text-muted)', marginBottom: 10 }}>
          <Icon name="chevronLeft" size={12}/> Todos los clientes
        </button>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: client.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 12, fontWeight: 600 }}>{client.logo}</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{client.name}</div>
        </div>
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
      <button style={{ display:'flex', alignItems:'center', gap: 8, width:'100%', padding:'8px 10px', borderRadius: 7, fontSize: 12.5, color:'var(--text-muted)', marginTop: 4 }}>
        <Icon name="plus" size={12}/> Nuevo módulo
      </button>
    </aside>
  );
};

