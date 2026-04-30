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
import { StatCard } from "./ventas";
import { Th, Td } from "./contactos";

// ============================================================
// COMPRAS & ESCÁNER
// ============================================================
export const Compras = ({ setRoute }) => {
  const [tab, setTab] = useState('gastos');

  return (
    <div style={{ padding:'28px 32px 48px', maxWidth: 1440, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing:'-0.02em', margin: 0 }}>Compras</h1>
          <p style={{ color:'var(--text-muted)', margin:'4px 0 0', fontSize: 13 }}>Facturas recibidas, tickets y gastos</p>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <Button variant="outline" leftIcon={<Icon name="scan" size={14}/>} onClick={() => setRoute('/escaner')}>Escanear ticket</Button>
          <Button variant="primary" leftIcon={<Icon name="plus" size={14}/>}>Nuevo gasto</Button>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 16 }}>
        <Tabs value={tab} onChange={setTab} tabs={[
          { id:'gastos', label:'Gastos', count: D.PURCHASES.length },
          { id:'recurrentes', label:'Recurrentes' },
          { id:'pendientes-pago', label:'Pendientes de pago' },
          { id:'proveedores', label:'Proveedores' },
        ]}/>
      </div>

      {tab === 'gastos' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
            <StatCard label="Total mes" value={D.PURCHASES.filter(p => p.date >= D.daysAgo(30)).reduce((s,p)=>s+p.total,0)} sub={`${D.PURCHASES.filter(p=>p.date>=D.daysAgo(30)).length} gastos`}/>
            <StatCard label="IVA soportado" value={D.PURCHASES.reduce((s,p)=>s+p.vat,0)} sub="deducible"/>
            <StatCard label="Pendiente pago" value={D.PURCHASES.filter(p=>p.status==='pendiente').reduce((s,p)=>s+p.total,0)} color="var(--warning)" sub={`${D.PURCHASES.filter(p=>p.status==='pendiente').length} facturas`}/>
          </div>
          <Card padding={0} style={{ overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'separate', borderSpacing: 0, fontSize: 13 }}>
              <thead><tr style={{ background:'var(--beige-bg)' }}>
                <Th style={{ width: 40 }}/>
                <Th>Proveedor</Th><Th>Concepto</Th><Th>Categoría</Th><Th>Fecha</Th>
                <Th align="right">Base</Th><Th align="right">IVA</Th><Th align="right">Total</Th>
                <Th>Estado</Th><Th>Método</Th>
              </tr></thead>
              <tbody>
                {D.PURCHASES.map((p, i) => {
                  const prov = D.CONTACTS.find(c => c.id === p.providerId);
                  return (
                    <tr key={p.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <Td><Icon name={p.source === 'scan' ? 'scan' : p.source === 'email' ? 'mail' : 'upload'} size={13} style={{ color:'var(--text-muted)' }}/></Td>
                      <Td><b style={{ fontWeight: 500 }}>{prov?.name || p.providerName}</b></Td>
                      <Td muted>{p.concept}</Td>
                      <Td><TagPill tag={p.category}/></Td>
                      <Td muted>{D.fmtShort(p.date)}</Td>
                      <Td align="right" mono>{p.base.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</Td>
                      <Td align="right" mono muted>{p.vat.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</Td>
                      <Td align="right" mono style={{ fontWeight: 500 }}>{p.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</Td>
                      <Td><Badge tone={p.status === 'pagada' ? 'success' : 'warning'}>{p.status}</Badge></Td>
                      <Td muted>{p.method}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'recurrentes' && <EmptyState icon={<Icon name="refresh" size={28}/>} title="Gastos recurrentes" description="Programa gastos que se repiten automáticamente cada mes."/>}
      {tab === 'pendientes-pago' && <EmptyState icon={<Icon name="clock" size={28}/>} title="Pendientes de pago" description="No hay facturas pendientes de pago."/>}
      {tab === 'proveedores' && <EmptyState icon={<Icon name="users" size={28}/>} title="Proveedores" description="Accede a tus proveedores desde la vista de Contactos."/>}
    </div>
  );
};

// ============================================================
// ESCÁNER DOCUMENTAL
// ============================================================
export const Escaner = ({ setRoute }) => {
  const [files, setFiles] = useState([
    { id:1, name:'ticket-gasolina-marzo.jpg', size:'248 KB', status:'parsed', extracted:{ provider:'Repsol', total: 58.40, base: 48.26, iva: 10.14, date: D.daysAgo(2), category:'combustible' } },
    { id:2, name:'factura-notion.pdf', size:'124 KB', status:'parsed', extracted:{ provider:'Notion Labs', total: 20.00, base: 16.53, iva: 3.47, date: D.daysAgo(4), category:'software' } },
    { id:3, name:'restaurante-cliente.pdf', size:'98 KB', status:'processing', extracted: null },
    { id:4, name:'amazon-papeleria.pdf', size:'312 KB', status:'review', extracted:{ provider:'Amazon EU', total: 46.80, base: 38.68, iva: 8.12, date: D.daysAgo(6), category:'material' } },
  ]);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState(1);

  const sel = files.find(f => f.id === selected);

  return (
    <div style={{ padding:'28px 32px 48px', maxWidth: 1440, margin:'0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing:'-0.02em', margin: 0 }}>Escáner documental</h1>
        <p style={{ color:'var(--text-muted)', margin:'4px 0 0', fontSize: 13 }}>Sube tickets o facturas y los campos se rellenan automáticamente con OCR</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); }}
        style={{
          border: `2px dashed ${dragging ? 'var(--purple)' : 'var(--border-strong)'}`,
          background: dragging ? 'var(--purple-soft)' : 'var(--beige-bg)',
          borderRadius: 14, padding:'36px 24px', textAlign:'center', marginBottom: 20, transition:'all 160ms'
        }}>
        <div style={{ width: 56, height: 56, borderRadius:'50%', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', color:'var(--purple)', border:'1px solid var(--border)' }}>
          <Icon name="upload" size={22}/>
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 5 }}>Arrastra tickets o facturas aquí</div>
        <div style={{ fontSize: 12.5, color:'var(--text-muted)', marginBottom: 14 }}>PDF, JPG, PNG, HEIC · hasta 20 MB · también puedes reenviarlos a recibos@daniela.co</div>
        <div style={{ display:'flex', gap: 8, justifyContent:'center' }}>
          <Button variant="primary" size="sm" leftIcon={<Icon name="upload" size={13}/>}>Seleccionar archivos</Button>
          <Button variant="outline" size="sm" leftIcon={<Icon name="camera" size={13}/>}>Hacer foto</Button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap: 16 }}>
        <Card padding={0} style={{ overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontSize: 12.5, fontWeight: 500, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>En cola ({files.length})</div>
          {files.map(f => {
            const statusMeta = {
              parsed:{ label:'Procesado', tone:'success', icon:'check' },
              processing:{ label:'Procesando', tone:'purple', icon:'loader' },
              review:{ label:'Revisar', tone:'warning', icon:'alert' },
              error:{ label:'Error', tone:'error', icon:'x' },
            }[f.status];
            return (
              <button key={f.id} onClick={() => setSelected(f.id)}
                style={{ display:'flex', alignItems:'center', gap: 10, padding:'12px 14px', width:'100%', textAlign:'left', borderBottom:'1px solid var(--border)', background: selected === f.id ? 'var(--beige-bg)' : 'transparent', cursor:'pointer' }}>
                <div style={{ width: 36, height: 44, borderRadius: 4, background:'var(--beige)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexShrink: 0, fontSize: 9, fontWeight: 600 }}>PDF</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name}</div>
                  <div style={{ fontSize: 11, color:'var(--text-muted)', marginTop: 2 }}>{f.size}</div>
                  <div style={{ marginTop: 6 }}>
                    <Badge tone={statusMeta.tone}>
                      {f.status === 'processing' && <span style={{ width: 7, height: 7, borderRadius:'50%', background: 'var(--purple)', display:'inline-block', marginRight: 4, animation:'pulse 1.2s infinite' }}/>}
                      {statusMeta.label}
                    </Badge>
                  </div>
                </div>
              </button>
            );
          })}
        </Card>

        <Card padding={0} style={{ overflow:'hidden' }}>
          {sel && (
            <>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{sel.name}</div>
                  <div style={{ fontSize: 11.5, color:'var(--text-muted)' }}>{sel.status === 'processing' ? 'Procesando con OCR…' : 'Revisa y confirma los datos extraídos'}</div>
                </div>
                <div style={{ display:'flex', gap: 6 }}>
                  <Button variant="ghost" size="sm">Descartar</Button>
                  <Button variant="primary" size="sm" disabled={sel.status === 'processing'} leftIcon={<Icon name="check" size={13}/>}>Guardar como gasto</Button>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                {/* Doc preview */}
                <div style={{ background:'var(--beige-bg)', padding: 24, display:'flex', alignItems:'flex-start', justifyContent:'center', borderRight:'1px solid var(--border)', minHeight: 440 }}>
                  <div style={{ background:'#fff', width:'100%', maxWidth: 320, aspectRatio:'0.707', padding: 24, boxShadow:'0 8px 24px rgba(0,0,0,0.08)', fontSize: 10, color:'#333', lineHeight: 1.5 }}>
                    {sel.status === 'processing' ? (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)' }}>OCR en curso…</div>
                    ) : sel.extracted ? (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700, color:'#111', marginBottom: 8, fontFamily:'var(--font-sans)' }}>{sel.extracted.provider}</div>
                        <div style={{ fontSize: 9, color:'#666', marginBottom: 14 }}>FACTURA / TICKET</div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}><span>Fecha</span><span>{D.fmtDate(sel.extracted.date)}</span></div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}><span>Concepto</span><span>Servicios</span></div>
                        <div style={{ height: 1, background:'#eee', margin:'12px 0' }}/>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}><span>Base</span><span>{sel.extracted.base.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span></div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}><span>IVA 21%</span><span>{sel.extracted.iva.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span></div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontWeight: 700, marginTop: 6, fontFamily:'var(--font-sans)' }}><span>TOTAL</span><span>{sel.extracted.total.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span></div>
                      </>
                    ) : null}
                  </div>
                </div>
                {/* Extracted fields */}
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 14, display:'flex', alignItems:'center', gap: 6 }}>
                    <Icon name="sparkles" size={12} style={{ color:'var(--purple)' }}/> Datos extraídos
                  </div>
                  {sel.extracted ? (
                    <div style={{ display:'flex', flexDirection:'column', gap: 12 }}>
                      <FieldInput label="Proveedor" value={sel.extracted.provider} confidence={0.98}/>
                      <FieldInput label="Fecha" value={D.fmtDate(sel.extracted.date)} confidence={0.95}/>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
                        <FieldInput label="Base imponible" value={sel.extracted.base.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'} confidence={0.92}/>
                        <FieldInput label="IVA" value={sel.extracted.iva.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'} confidence={0.90}/>
                      </div>
                      <FieldInput label="Total" value={sel.extracted.total.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'} confidence={0.99} emphasis/>
                      <FieldInput label="Categoría" value={sel.extracted.category} confidence={sel.status === 'review' ? 0.68 : 0.88} tag/>
                      <FieldInput label="Método de pago" value="Tarjeta" confidence={0.72}/>
                      {sel.status === 'review' && (
                        <div style={{ padding: 10, background:'#FDF6E3', border:'1px solid #EAD9A8', borderRadius: 8, fontSize: 12, color:'#7A5E00', display:'flex', gap: 8 }}>
                          <Icon name="alert" size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
                          <div>La categoría detectada tiene baja confianza. Revisa antes de guardar.</div>
                        </div>
                      )}
                    </div>
                  ) : <EmptyState title="Procesando" description="Extrayendo campos del documento…"/>}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }` }}/>
    </div>
  );
};

const FieldInput = ({ label, value, confidence, emphasis, tag }) => {
  const conf = Math.round(confidence * 100);
  const confColor = confidence > 0.9 ? 'var(--success)' : confidence > 0.75 ? 'var(--warning)' : 'var(--error)';
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, color:'var(--text-muted)', marginBottom: 4 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: confColor }}>{conf}%</span>
      </div>
      <div style={{ position:'relative' }}>
        {tag ? (
          <div style={{ padding:'7px 10px', border:'1px solid var(--border)', borderRadius: 7, background:'var(--surface)' }}>
            <TagPill tag={value}/>
          </div>
        ) : (
          <input type="text" defaultValue={value}
            style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border)', borderRadius: 7, background:'var(--surface)', fontSize: emphasis ? 14 : 13, fontWeight: emphasis ? 600 : 450, fontFamily:'inherit' }}/>
        )}
      </div>
    </div>
  );
};

