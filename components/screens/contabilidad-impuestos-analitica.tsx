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
// CONTABILIDAD, IMPUESTOS & ANALÍTICA
// ============================================================
export const Contabilidad = ({ setRoute }) => {
  const [tab, setTab] = useState('asientos');
  const entries = D.ACCOUNTING;

  return (
    <div style={{ padding:'28px 32px 48px', maxWidth: 1440, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing:'-0.02em', margin: 0 }}>Contabilidad</h1>
          <p style={{ color:'var(--text-muted)', margin:'4px 0 0', fontSize: 13 }}>Libro diario, bancos, conciliación y balances</p>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <Button variant="outline" leftIcon={<Icon name="download" size={14}/>}>Exportar libro diario</Button>
          <Button variant="primary" leftIcon={<Icon name="plus" size={14}/>}>Asiento manual</Button>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 16 }}>
        <Tabs value={tab} onChange={setTab} tabs={[
          { id:'asientos', label:'Libro diario', count: entries.length },
          { id:'bancos', label:'Bancos', count: D.BANK_ACCOUNTS.length },
          { id:'conciliacion', label:'Conciliación', count: 4 },
          { id:'balance', label:'Balance' },
          { id:'pyg', label:'Pérdidas y Ganancias' },
          { id:'plan', label:'Plan contable' },
        ]}/>
      </div>

      {tab === 'asientos' && (
        <Card padding={0} style={{ overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing: 0, fontSize: 13 }}>
            <thead><tr style={{ background:'var(--beige-bg)' }}>
              <Th>Nº asiento</Th><Th>Fecha</Th><Th>Cuenta</Th><Th>Concepto</Th>
              <Th align="right">Debe</Th><Th align="right">Haber</Th><Th>Doc.</Th>
            </tr></thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} style={{ borderTop:'1px solid var(--border)' }}>
                  <Td mono>{e.number}</Td>
                  <Td muted>{D.fmtShort(e.date)}</Td>
                  <Td mono><span style={{ color:'var(--purple)', fontWeight: 500 }}>{e.account}</span> <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-sans)' }}>{e.accountName}</span></Td>
                  <Td>{e.concept}</Td>
                  <Td align="right" mono>{e.debit > 0 ? e.debit.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' : '—'}</Td>
                  <Td align="right" mono>{e.credit > 0 ? e.credit.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' : '—'}</Td>
                  <Td><span style={{ fontSize: 11, color:'var(--text-muted)' }}>{e.docRef || '—'}</span></Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:'1.5px solid var(--border-strong)', background:'var(--beige-bg)' }}>
                <Td colSpan={4}><span style={{ fontSize: 11.5, fontWeight: 500, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Suma y saldo</span></Td>
                <Td align="right" mono style={{ fontWeight: 600 }}>{entries.reduce((s,e)=>s+e.debit,0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</Td>
                <Td align="right" mono style={{ fontWeight: 600 }}>{entries.reduce((s,e)=>s+e.credit,0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</Td>
                <Td/>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      {tab === 'bancos' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginBottom: 24 }}>
            {D.BANK_ACCOUNTS.map(acc => (
              <Card key={acc.id} padding={20}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: acc.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight: 700, fontSize: 11 }}>{acc.logo}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{acc.name}</div>
                      <div style={{ fontSize: 11, color:'var(--text-muted)' }}>{acc.iban}</div>
                    </div>
                  </div>
                  <Badge tone={acc.synced ? 'success' : 'warning'}>{acc.synced ? 'Sincronizada' : 'Sincronizar'}</Badge>
                </div>
                <div style={{ fontSize: 24, fontWeight: 500, letterSpacing:'-0.01em' }}>{acc.balance.toLocaleString('es-ES', { style:'currency', currency:'EUR' })}</div>
                <div style={{ fontSize: 11.5, color:'var(--text-muted)', marginTop: 4 }}>Última actualización: {D.relativeTime(acc.lastSync)}</div>
              </Card>
            ))}
            <Card padding={20} style={{ border:'1px dashed var(--border-strong)', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', minHeight: 140, cursor:'pointer', color:'var(--text-muted)', fontSize: 13 }}>
              <Icon name="plus" size={14} style={{ marginRight: 6 }}/> Conectar banco
            </Card>
          </div>

          <Card padding={0} style={{ overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize: 13, fontWeight: 500 }}>Movimientos recientes</div>
            <table style={{ width:'100%', borderCollapse:'separate', borderSpacing: 0, fontSize: 13 }}>
              <thead><tr style={{ background:'var(--beige-bg)' }}><Th>Fecha</Th><Th>Concepto</Th><Th>Categoría</Th><Th>Cuenta</Th><Th align="right">Importe</Th><Th>Conciliado</Th></tr></thead>
              <tbody>
                {D.BANK_MOVEMENTS.map((m, i) => {
                  const acc = D.BANK_ACCOUNTS.find(a => a.id === m.accountId);
                  return (
                    <tr key={m.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <Td muted>{D.fmtShort(m.date)}</Td>
                      <Td><b style={{ fontWeight: 500 }}>{m.concept}</b></Td>
                      <Td><TagPill tag={m.category}/></Td>
                      <Td muted>{acc?.name}</Td>
                      <Td align="right" mono style={{ color: m.amount >= 0 ? 'var(--success)' : 'var(--text)', fontWeight: 500 }}>
                        {m.amount >= 0 ? '+' : ''}{m.amount.toLocaleString('es-ES', { style:'currency', currency:'EUR' })}
                      </Td>
                      <Td>{m.matched ? <Badge tone="success"><Icon name="check" size={10} stroke={3} style={{ marginRight: 3 }}/>Conciliado</Badge> : <Badge tone="warning">Sin conciliar</Badge>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'conciliacion' && <ConciliacionView/>}
      {tab === 'balance' && <BalanceView/>}
      {tab === 'pyg' && <PyGView/>}
      {tab === 'plan' && <EmptyState title="Plan General Contable" description="Explorar cuentas del PGC 2008. Próximamente."/>}
    </div>
  );
};

const ConciliacionView = () => {
  const pending = D.BANK_MOVEMENTS.filter(m => !m.matched);
  return (
    <div>
      <Card padding={18} style={{ background: 'var(--purple-soft)', marginBottom: 16, border:'1px solid rgba(106,90,205,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background:'var(--purple)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="sparkles" size={18}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Tenemos <b>7 sugerencias</b> de conciliación automática</div>
            <div style={{ fontSize: 12, color:'var(--text-muted)' }}>Revisa y acepta las coincidencias entre movimientos bancarios y facturas.</div>
          </div>
          <Button variant="primary" size="sm">Revisar sugerencias</Button>
        </div>
      </Card>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
        <Card padding={0} style={{ overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontSize: 12, fontWeight: 500, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Movimientos sin conciliar ({pending.length})</div>
          {pending.map(m => (
            <div key={m.id} style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.concept}</div>
                <div style={{ fontSize: 11, color:'var(--text-muted)' }}>{D.fmtShort(m.date)}</div>
              </div>
              <div style={{ fontVariantNumeric:'tabular-nums', fontWeight: 500, fontSize: 13, color: m.amount >= 0 ? 'var(--success)' : 'var(--text)' }}>
                {m.amount >= 0 ? '+' : ''}{m.amount.toLocaleString('es-ES', { style:'currency', currency:'EUR' })}
              </div>
              <Button variant="outline" size="sm">Emparejar</Button>
            </div>
          ))}
        </Card>
        <Card padding={0} style={{ overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontSize: 12, fontWeight: 500, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Facturas sin cobro registrado</div>
          {D.INVOICES.filter(i => i.status === 'pendiente' || i.status === 'vencida').slice(0, 4).map(inv => {
            const cli = D.CONTACTS.find(c => c.id === inv.clientId);
            return (
              <div key={inv.id} style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{inv.number} · {cli?.name}</div>
                  <div style={{ fontSize: 11, color:'var(--text-muted)' }}>Vence {D.fmtShort(inv.dueDate)}</div>
                </div>
                <div style={{ fontVariantNumeric:'tabular-nums', fontWeight: 500, fontSize: 13 }}>{inv.total.toLocaleString('es-ES', { style:'currency', currency:'EUR' })}</div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
};

const BalanceView = () => (
  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
    <Card padding={22}>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>ACTIVO</div>
      <BalLine label="Inmovilizado material" v={12400} indent={1}/>
      <BalLine label="Deudores comerciales" v={18650} indent={1}/>
      <BalLine label="Efectivo y equivalentes" v={48320} indent={1}/>
      <BalLine label="TOTAL ACTIVO" v={79370} bold/>
    </Card>
    <Card padding={22}>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>PASIVO + PATRIMONIO NETO</div>
      <BalLine label="Capital social" v={3000} indent={1}/>
      <BalLine label="Reservas" v={42150} indent={1}/>
      <BalLine label="Resultado del ejercicio" v={18420} indent={1}/>
      <BalLine label="Acreedores comerciales" v={9800} indent={1}/>
      <BalLine label="H.P. acreedora IVA" v={6000} indent={1}/>
      <BalLine label="TOTAL PASIVO + PN" v={79370} bold/>
    </Card>
  </div>
);
const BalLine = ({ label, v, indent = 0, bold }) => (
  <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop: bold ? '1.5px solid var(--border-strong)' : '1px solid var(--border)', fontSize: 13, fontWeight: bold ? 600 : 400, paddingLeft: indent * 12 }}>
    <span style={{ color: bold ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontVariantNumeric:'tabular-nums' }}>{v.toLocaleString('es-ES', { style:'currency', currency:'EUR', maximumFractionDigits: 0 })}</span>
  </div>
);

const PyGView = () => (
  <Card padding={22}>
    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Cuenta de Pérdidas y Ganancias · acumulado 2026</div>
    <BalLine label="Ingresos por ventas" v={142800}/>
    <BalLine label="Otros ingresos" v={3200}/>
    <BalLine label="TOTAL INGRESOS" v={146000} bold/>
    <div style={{ height: 14 }}/>
    <BalLine label="Aprovisionamientos" v={-18400}/>
    <BalLine label="Gastos de personal" v={-52000}/>
    <BalLine label="Servicios exteriores" v={-31800}/>
    <BalLine label="Amortizaciones" v={-2400}/>
    <BalLine label="TOTAL GASTOS" v={-104600} bold/>
    <div style={{ height: 14 }}/>
    <BalLine label="RESULTADO DE EXPLOTACIÓN" v={41400} bold/>
    <BalLine label="Impuesto sobre beneficios" v={-10350}/>
    <BalLine label="RESULTADO DEL EJERCICIO" v={31050} bold/>
  </Card>
);

// ============================================================
// IMPUESTOS
// ============================================================
export const Impuestos = ({ setRoute }) => {
  const [tab, setTab] = useState('calendario');

  return (
    <div style={{ padding:'28px 32px 48px', maxWidth: 1440, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing:'-0.02em', margin: 0 }}>Impuestos</h1>
          <p style={{ color:'var(--text-muted)', margin:'4px 0 0', fontSize: 13 }}>Calendario fiscal, modelos y presentaciones</p>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <Button variant="outline" leftIcon={<Icon name="download" size={14}/>}>Exportar histórico</Button>
          <Button variant="primary" leftIcon={<Icon name="sparkles" size={14}/>}>Preparar modelo</Button>
        </div>
      </div>

      <div style={{ display:'flex', gap: 12, marginBottom: 16 }}>
        <Tabs value={tab} onChange={setTab} tabs={[
          { id:'calendario', label:'Calendario', count: D.TAX_MODELS.filter(m=>m.status==='pendiente').length },
          { id:'historico', label:'Histórico' },
          { id:'libros', label:'Libros registro' },
        ]}/>
      </div>

      {tab === 'calendario' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {D.TAX_MODELS.map(m => {
            const days = Math.round((m.dueDate - D.TODAY) / 86400000);
            const urgent = days < 7 && m.status === 'pendiente';
            return (
              <Card key={m.id} padding={20} style={{ borderColor: urgent ? 'var(--warning)' : 'var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background:'var(--beige)', color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 14, fontWeight: 700 }}>{m.code}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 11.5, color:'var(--text-muted)' }}>{m.description}</div>
                    </div>
                  </div>
                  <Badge tone={m.status === 'pendiente' ? (urgent ? 'warning' : 'neutral') : m.status === 'presentado' ? 'success' : 'outline'}>{m.status}</Badge>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10, marginTop: 10, padding:'10px 0', borderTop:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 10.5, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Importe</div>
                    <div style={{ fontSize: 17, fontWeight: 500, marginTop: 3, color: m.amount > 0 ? 'var(--text)' : 'var(--success)' }}>
                      {m.amount >= 0 ? '' : '−'}{Math.abs(m.amount).toLocaleString('es-ES', { style:'currency', currency:'EUR', maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Vencimiento</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginTop: 3 }}>{D.fmtDate(m.dueDate)}</div>
                    <div style={{ fontSize: 11, color: urgent ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {m.status === 'presentado' ? 'Presentado ' + D.relativeTime(m.presentedDate) : (days < 0 ? `${Math.abs(days)}d vencido` : `en ${days} días`)}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap: 6, marginTop: 10 }}>
                  {m.status === 'pendiente' ? (
                    <>
                      <Button variant="primary" size="sm" style={{ flex: 1 }}>Preparar</Button>
                      <Button variant="outline" size="sm">Detalles</Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" style={{ flex: 1 }} leftIcon={<Icon name="download" size={12}/>}>Justificante</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'historico' && (
        <Card padding={0} style={{ overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing: 0, fontSize: 13 }}>
            <thead><tr style={{ background:'var(--beige-bg)' }}><Th>Modelo</Th><Th>Período</Th><Th>Presentado</Th><Th align="right">Importe</Th><Th>Referencia AEAT</Th><Th>Justificante</Th></tr></thead>
            <tbody>
              {D.TAX_MODELS.filter(m => m.status === 'presentado').concat([
                { code:'303', name:'IVA', period:'4T 2025', presentedDate: new Date(2026, 0, 28), amount: 2840, ref:'123456789012345' },
                { code:'111', name:'Retenciones', period:'4T 2025', presentedDate: new Date(2026, 0, 20), amount: 1280, ref:'223456789012345' },
                { code:'190', name:'Resumen retenciones', period:'Anual 2025', presentedDate: new Date(2026, 0, 25), amount: 5180, ref:'323456789012345' },
              ]).map((m, i) => (
                <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                  <Td><b style={{ color:'var(--purple)' }}>{m.code}</b> · {m.name}</Td>
                  <Td muted>{m.period || m.description}</Td>
                  <Td muted>{D.fmtDate(m.presentedDate)}</Td>
                  <Td align="right" mono>{m.amount.toLocaleString('es-ES', { style:'currency', currency:'EUR' })}</Td>
                  <Td mono muted>{m.ref || '—'}</Td>
                  <Td><Button variant="ghost" size="sm" leftIcon={<Icon name="download" size={11}/>}>PDF</Button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'libros' && <EmptyState icon={<Icon name="book" size={28}/>} title="Libros registro" description="Libros de facturas emitidas, recibidas, bienes de inversión y operaciones intracomunitarias."/>}
    </div>
  );
};

// ============================================================
// ANALÍTICA
// ============================================================
export const Analitica = ({ setRoute }) => {
  const [tab, setTab] = useState('resumen');

  return (
    <div style={{ padding:'28px 32px 48px', maxWidth: 1440, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing:'-0.02em', margin: 0 }}>Analítica</h1>
          <p style={{ color:'var(--text-muted)', margin:'4px 0 0', fontSize: 13 }}>Rendimiento de negocio, márgenes y proyecciones</p>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <div style={{ display:'flex', gap: 4, background:'var(--beige-bg)', padding: 3, borderRadius: 8, border:'1px solid var(--border)' }}>
            {['Mes','Trimestre','Año','YTD'].map((l, i) => (
              <button key={l} style={{ padding:'5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: i === 1 ? 'var(--surface)' : 'transparent', color: i === 1 ? 'var(--text)' : 'var(--text-muted)', boxShadow: i === 1 ? 'var(--shadow-sm)' : 'none' }}>{l}</button>
            ))}
          </div>
          <Button variant="outline" leftIcon={<Icon name="download" size={14}/>}>Exportar</Button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard label="Facturación Q1" value={142800} sub="+18% vs Q4 anterior"/>
        <StatCard label="Margen bruto" value={72400} color="var(--success)" sub="50.7% margen"/>
        <StatCard label="Gasto medio/cliente" value={3420} sub="12 clientes activos"/>
        <StatCard label="Runway estimado" value={9.4} format="raw" suffix=" meses" sub="al ritmo actual"/>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id:'resumen', label:'Resumen' },
        { id:'clientes', label:'Por cliente' },
        { id:'categorias', label:'Por categoría' },
        { id:'proyeccion', label:'Proyección' },
      ]}/>
      <div style={{ height: 14 }}/>

      {tab === 'resumen' && (
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap: 14 }}>
          <Card padding={22}>
            <CardHeader title="Facturación por mes" subtitle="Últimos 12 meses"/>
            <BarChart data={D.ANALYTICS_MONTHLY}/>
          </Card>
          <Card padding={22}>
            <CardHeader title="Distribución de ingresos" subtitle="Por tipo de servicio"/>
            <DonutChart data={D.ANALYTICS_SERVICES}/>
          </Card>
        </div>
      )}

      {tab === 'clientes' && (
        <Card padding={0} style={{ overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing: 0, fontSize: 13 }}>
            <thead><tr style={{ background:'var(--beige-bg)' }}><Th>Cliente</Th><Th align="right">Facturado Q1</Th><Th align="right">Nº facturas</Th><Th align="right">Ticket medio</Th><Th align="right">Margen</Th><Th>Tendencia</Th></tr></thead>
            <tbody>
              {D.CONTACTS.filter(c => c.type === 'cliente' && c.facturado > 0).sort((a,b) => b.facturado - a.facturado).map((c, i) => (
                <tr key={c.id} style={{ borderTop:'1px solid var(--border)' }}>
                  <Td><b style={{ fontWeight: 500 }}>{c.name}</b></Td>
                  <Td align="right" mono style={{ fontWeight: 500 }}>{c.facturado.toLocaleString('es-ES', { style:'currency', currency:'EUR', maximumFractionDigits: 0 })}</Td>
                  <Td align="right" mono>{Math.max(1, Math.round(c.facturado / 2800))}</Td>
                  <Td align="right" mono muted>{Math.round(c.facturado / Math.max(1, Math.round(c.facturado / 2800))).toLocaleString('es-ES', { style:'currency', currency:'EUR' })}</Td>
                  <Td align="right" mono style={{ color:'var(--success)' }}>+{(30 + i * 4) % 55}%</Td>
                  <Td><Sparkline data={[3,5,4,6,8,7,9].map(x => x + (i%3))} color={i < 2 ? 'var(--success)' : 'var(--purple)'} width={80} height={22}/></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'categorias' && (
        <Card padding={22}>
          <CardHeader title="Gasto por categoría" subtitle="Trimestre actual"/>
          {D.ANALYTICS_CATEGORIES.map((c, i) => {
            const max = Math.max(...D.ANALYTICS_CATEGORIES.map(x => x.amount));
            return (
              <div key={c.name} style={{ marginBottom: 14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontVariantNumeric:'tabular-nums' }}>{c.amount.toLocaleString('es-ES', { style:'currency', currency:'EUR' })}</span>
                </div>
                <Progress value={c.amount} max={max} color={c.color}/>
              </div>
            );
          })}
        </Card>
      )}

      {tab === 'proyeccion' && (
        <Card padding={22}>
          <CardHeader title="Proyección de tesorería" subtitle="Próximos 6 meses · basado en recurrentes y facturas emitidas"/>
          <ForecastChart/>
        </Card>
      )}
    </div>
  );
};

const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value));
  const W = 620, H = 220, pad = { l: 30, r: 10, t: 10, b: 24 };
  const bw = (W - pad.l - pad.r) / data.length - 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%' }}>
      {[0, 0.5, 1].map(g => <line key={g} x1={pad.l} x2={W-pad.r} y1={pad.t + (H-pad.t-pad.b) * g} y2={pad.t + (H-pad.t-pad.b) * g} stroke="var(--border)" strokeDasharray={g === 0 || g === 1 ? '0' : '2,3'}/>)}
      {data.map((d, i) => {
        const h = (d.value / max) * (H - pad.t - pad.b);
        const x = pad.l + i * ((W - pad.l - pad.r) / data.length) + 3;
        return (
          <g key={i}>
            <rect x={x} y={H - pad.b - h} width={bw} height={h} fill="var(--purple)" opacity={d.actual ? 1 : 0.35} rx="2"/>
            <text x={x + bw/2} y={H - 8} fontSize="10" fill="var(--text-muted)" textAnchor="middle">{d.month}</text>
          </g>
        );
      })}
    </svg>
  );
};

const DonutChart = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const R = 68, r = 44, cx = 90, cy = 90;
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 20 }}>
      <svg viewBox="0 0 180 180" style={{ width: 180, height: 180 }}>
        {data.map((d, i) => {
          const frac = d.value / total;
          const a0 = acc * Math.PI * 2 - Math.PI / 2;
          acc += frac;
          const a1 = acc * Math.PI * 2 - Math.PI / 2;
          const large = frac > 0.5 ? 1 : 0;
          const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
          const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
          const x0i = cx + r * Math.cos(a0), y0i = cy + r * Math.sin(a0);
          const x1i = cx + r * Math.cos(a1), y1i = cy + r * Math.sin(a1);
          return <path key={i} d={`M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x1i},${y1i} A${r},${r} 0 ${large} 0 ${x0i},${y0i} Z`} fill={d.color} stroke="var(--surface)" strokeWidth="1.5"/>;
        })}
        <text x={90} y={86} textAnchor="middle" fontSize="11" fill="var(--text-muted)">Total</text>
        <text x={90} y={104} textAnchor="middle" fontSize="16" fill="var(--text)" fontWeight="600">{(total/1000).toFixed(0)}k€</text>
      </svg>
      <div style={{ flex: 1, display:'flex', flexDirection:'column', gap: 8 }}>
        {data.map(d => (
          <div key={d.name} style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }}/>
            <span style={{ flex: 1 }}>{d.name}</span>
            <span style={{ fontVariantNumeric:'tabular-nums', fontWeight: 500 }}>{(d.value/1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k€</span>
            <span style={{ color:'var(--text-muted)', fontSize: 11, width: 36, textAlign:'right' }}>{((d.value/total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ForecastChart = () => {
  const data = [48320, 51200, 47800, 52400, 58900, 54200, 61800];
  const projected = 4; // first 4 are actual
  const W = 720, H = 220, pad = { l: 40, r: 10, t: 10, b: 26 };
  const max = Math.max(...data), min = Math.min(...data) * 0.85;
  const xAt = (i) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
  const yAt = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min));
  const linePath = data.map((v, i) => `${i===0?'M':'L'}${xAt(i)},${yAt(v)}`).join('');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%' }}>
      <path d={linePath} stroke="var(--purple)" strokeWidth="2.5" fill="none" strokeDasharray={`${xAt(projected-1)-pad.l} 9999`}/>
      <path d={linePath} stroke="var(--purple)" strokeWidth="2" strokeDasharray="4,4" fill="none" opacity="0.6" transform={`translate(0,0)`}/>
      {data.map((v, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(v)} r="4" fill={i < projected ? 'var(--purple)' : 'var(--surface)'} stroke="var(--purple)" strokeWidth="2"/>
          <text x={xAt(i)} y={H - 8} fontSize="10.5" fill="var(--text-muted)" textAnchor="middle">{months[i]}</text>
          <text x={xAt(i)} y={yAt(v) - 10} fontSize="10" fill="var(--text)" textAnchor="middle" fontWeight="500">{(v/1000).toFixed(0)}k</text>
        </g>
      ))}
    </svg>
  );
};

