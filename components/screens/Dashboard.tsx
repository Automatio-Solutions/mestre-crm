"use client";
import { useRouter } from "next/navigation";
import {
  Card, CardHeader, Icon, Sparkline, Progress, Badge,
  Button, EmptyState, PriorityFlag, AvatarStack,
} from "@/components/ui";
import * as D from "@/lib/data";
import { useInvoices } from "@/lib/db/useInvoices";
import { useContacts } from "@/lib/db/useContacts";
import { useTasks } from "@/lib/db/useTasks";
import { useClientSpaces } from "@/lib/db/useClientSpaces";

export function Dashboard() {
  const router = useRouter();
  const { invoices } = useInvoices();
  const { contacts } = useContacts();
  const { tasks } = useTasks();
  const { spaces } = useClientSpaces();

  const totalMes = invoices
    .filter((i) => i.issueDate >= D.daysAgo(30) && i.status !== "borrador")
    .reduce((s, i) => s + i.total, 0);
  // Compras todavía usa mock (no hemos migrado esa tabla)
  const gastosMes = D.PURCHASES
    .filter((p: any) => p.date >= D.daysAgo(30))
    .reduce((s: number, i: any) => s + i.total, 0);
  const beneficio = totalMes - gastosMes;
  const margin = totalMes > 0 ? (beneficio / totalMes) * 100 : 0;
  const pendientes = invoices.filter((i) => i.status === "pendiente" || i.status === "vencida");
  const pendientesTotal = pendientes.reduce((s, i) => s + i.total, 0);

  const hour = D.TODAY.getHours();
  const greeting = hour < 14 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 11, color: "var(--text-muted)",
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6,
          }}
        >
          {D.TODAY.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.15 }}>
          {greeting}, Dani.
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 8, maxWidth: 620 }}>
          Hoy tienes <b style={{ color: "var(--text)" }}>4 tareas</b> con vencimiento y
          <b style={{ color: "var(--text)" }}> {pendientes.length} facturas</b> pendientes de cobro por un total de{" "}
          <b style={{ color: "var(--text)" }}>
            {pendientesTotal.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          </b>
          .
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <KpiCard label="Facturación del mes" value={totalMes} delta={+12.4} trend={[8, 10, 9, 11, 14, 15, 14, 16]} />
        <KpiCard label="Gastos del mes" value={gastosMes} delta={-5.2} trend={[4, 5, 4, 6, 5, 4, 3, 4]} color="#C89B3C" />
        <KpiCard
          label="Beneficio neto"
          value={beneficio}
          delta={+18.9}
          extra={margin.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "% margen"}
          trend={[4, 5, 5, 5, 9, 11, 10, 11]}
          color="#4A7C59"
        />
        <KpiCard
          label="Pendiente de cobro"
          value={pendientesTotal}
          extra={`${pendientes.length} facturas`}
          trend={[2, 3, 3, 4, 4, 5, 5, 5]}
          color="#6A5ACD"
        />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>
        <div style={{ gridColumn: "span 8" }}><TreasuryCard /></div>
        <div style={{ gridColumn: "span 4" }}><UpcomingCard invoices={invoices} /></div>
        <div style={{ gridColumn: "span 6" }}><TopClientsCard contacts={contacts} onOpen={(id) => router.push(`/contactos?open=${id}`)} /></div>
        <div style={{ gridColumn: "span 6" }}><TimelineCard /></div>
        <div style={{ gridColumn: "span 6" }}>
          <TasksTodayCard
            tasks={tasks}
            spaces={spaces}
            onOpenTask={(clientId, moduleId, taskId) =>
              router.push(`/clientes/${clientId}/${moduleId}?task=${taskId}`)
            }
            onSeeAll={() => router.push("/clientes")}
          />
        </div>
        <div style={{ gridColumn: "span 6" }}><ObjectivesCard /></div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, delta, extra, trend, color = "var(--purple)",
}: {
  label: string;
  value: number;
  delta?: number;
  extra?: string;
  trend?: number[];
  color?: string;
}) {
  const fmt = value.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  return (
    <Card>
      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}>{fmt}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12 }}>
            {delta != null && (
              <span
                style={{
                  color: delta >= 0 ? "var(--success)" : "var(--error)",
                  display: "inline-flex", alignItems: "center", gap: 2, fontWeight: 500,
                }}
              >
                <Icon name={delta >= 0 ? "arrowUp" : "arrowDown"} size={12} />
                {Math.abs(delta).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </span>
            )}
            <span style={{ color: "var(--text-muted)" }}>{extra || "vs mes ant."}</span>
          </div>
        </div>
        {trend && <Sparkline data={trend} color={color} width={76} height={32} />}
      </div>
    </Card>
  );
}

function TreasuryCard() {
  const data = D.CASHFLOW;
  const maxVal = Math.max(...data.map((d: any) => Math.max(d.ingresos, d.gastos)));
  const W = 680, H = 200, pad = { l: 40, r: 10, t: 10, b: 26 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const xAt = (i: number) => pad.l + (i / (data.length - 1)) * iw;
  const yAt = (v: number) => pad.t + ih - (v / maxVal) * ih;

  const areaPath = (key: "ingresos" | "gastos") => {
    const pts = data.map((d: any, i: number) => `${xAt(i)},${yAt(d[key])}`).join(" L");
    return `M${pts} L${xAt(data.length - 1)},${pad.t + ih} L${xAt(0)},${pad.t + ih} Z`;
  };
  const linePath = (key: "ingresos" | "gastos") =>
    data.map((d: any, i: number) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(d[key])}`).join("");

  return (
    <Card padding={24}>
      <CardHeader
        title="Tesorería"
        subtitle="Últimos 6 meses"
        action={
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple)" }} />
              Ingresos
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--beige-dark)" }} />
              Gastos
            </span>
          </div>
        }
      />
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <line
              key={g}
              x1={pad.l}
              x2={W - pad.r}
              y1={pad.t + ih * g}
              y2={pad.t + ih * g}
              stroke="var(--border)"
              strokeDasharray={g === 0 || g === 1 ? "0" : "2,3"}
              strokeWidth="1"
            />
          ))}
          {[0, 0.5, 1].map((g) => {
            const v = maxVal * (1 - g);
            return (
              <text key={g} x={pad.l - 6} y={pad.t + ih * g + 4} fontSize="10" fill="var(--text-muted)" textAnchor="end">
                {Math.round(v / 1000)}k
              </text>
            );
          })}
          <path d={areaPath("gastos")} fill="#DCD1C0" opacity="0.5" />
          <path d={areaPath("ingresos")} fill="#6A5ACD" opacity="0.12" />
          <path d={linePath("gastos")} fill="none" stroke="#C9BEA8" strokeWidth="2" strokeLinecap="round" />
          <path d={linePath("ingresos")} fill="none" stroke="#6A5ACD" strokeWidth="2" strokeLinecap="round" />
          {data.map((d: any, i: number) => (
            <g key={i}>
              <circle cx={xAt(i)} cy={yAt(d.ingresos)} r="3" fill="var(--surface)" stroke="#6A5ACD" strokeWidth="1.5" />
              <text x={xAt(i)} y={H - 8} fontSize="10.5" fill="var(--text-muted)" textAnchor="middle">
                {d.month}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}

function UpcomingCard({ invoices }: { invoices: any[] }) {
  const upcoming = [
    ...invoices
      .filter((i) => (i.status === "pendiente" || i.status === "vencida") && i.dueDate)
      .map((i) => ({
        type: "factura",
        name: i.number,
        subtitle: i.concept,
        date: i.dueDate,
        amount: i.total,
        status: i.status,
      })),
    ...D.TAX_MODELS.filter((m: any) => m.status === "pendiente").map((m: any) => ({
      type: "impuesto",
      name: m.name,
      subtitle: m.description,
      date: m.dueDate,
      amount: m.amount,
      status: m.status,
    })),
  ]
    .sort((a: any, b: any) => a.date - b.date)
    .slice(0, 5);
  return (
    <Card>
      <CardHeader title="Próximos vencimientos" subtitle="30 días" />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {upcoming.map((u: any, i: number) => {
          const diff = Math.round((u.date.getTime() - D.TODAY.getTime()) / 86400000);
          const tone: "error" | "warning" | "neutral" = diff < 0 ? "error" : diff <= 3 ? "warning" : "neutral";
          return (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 2px",
                borderBottom: i < upcoming.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: u.type === "impuesto" ? "var(--beige-light)" : "var(--purple-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: u.type === "impuesto" ? "var(--text-muted)" : "var(--purple)",
                }}
              >
                <Icon name={u.type === "impuesto" ? "landmark" : "receipt"} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.name}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.subtitle}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                  {u.amount.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </div>
                <Badge tone={tone} style={{ marginTop: 2 }}>
                  {diff < 0 ? `${Math.abs(diff)}d vencida` : diff === 0 ? "hoy" : `en ${diff}d`}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TopClientsCard({ contacts, onOpen }: { contacts: any[]; onOpen: (id: string) => void }) {
  const top = [...contacts]
    .filter((c) => c.type === "cliente")
    .sort((a, b) => b.facturado - a.facturado)
    .slice(0, 5);
  const max = top[0]?.facturado || 1;
  return (
    <Card>
      <CardHeader title="Top clientes del trimestre" subtitle="Q1 2026" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {top.map((c: any, i: number) => (
          <div
            key={c.id}
            onClick={() => onOpen(c.id)}
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          >
            <div
              style={{
                width: 28, height: 28, borderRadius: 7, background: "var(--beige)",
                color: "var(--text)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 11, fontWeight: 600,
              }}
            >
              {c.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.name}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>
                  {c.facturado.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </span>
              </div>
              <Progress value={c.facturado} max={max} color={i === 0 ? "var(--purple)" : "var(--black)"} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TimelineCard() {
  const iconFor: Record<string, string> = {
    invoice_sent: "receipt", payment_in: "arrowDown", expense: "arrowUp",
    task_done: "check", contact_new: "users",
  };
  const colorFor: Record<string, string> = {
    invoice_sent: "var(--purple)", payment_in: "var(--success)",
    expense: "var(--warning)", task_done: "#2F5A3D", contact_new: "var(--black)",
  };
  return (
    <Card>
      <CardHeader title="Últimos movimientos" />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {D.TIMELINE.slice(0, 7).map((t: any, i: number) => (
          <div key={t.id} style={{ display: "flex", gap: 12, paddingBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 26, height: 26, borderRadius: "50%", background: "var(--beige-bg)",
                  color: colorFor[t.type], display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon name={iconFor[t.type]} size={12} />
              </div>
              {i < 6 && <div style={{ flex: 1, width: 1, background: "var(--border)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                {t.subtitle} · {D.relativeTime(t.when)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TasksTodayCard({
  tasks: allTasks, spaces, onOpenTask, onSeeAll,
}: {
  tasks: any[];
  spaces: any[];
  onOpenTask: (clientId: string, moduleId: string, taskId: string) => void;
  onSeeAll: () => void;
}) {
  const tasks = allTasks
    .filter((t) => t.status !== "done" && t.dueDate && Math.abs(t.dueDate.getTime() - D.TODAY.getTime()) < 7 * 86400000)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);
  return (
    <Card>
      <CardHeader
        title="Tareas pendientes"
        subtitle="Esta semana"
        action={
          <Button variant="ghost" size="sm" onClick={onSeeAll} rightIcon={<Icon name="chevronRight" size={12} />}>
            Ver todas
          </Button>
        }
      />
      {tasks.length === 0 ? (
        <EmptyState title="Sin tareas esta semana" description="Estás al día." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {tasks.map((t: any, i: number) => {
            const space = spaces.find((s) => s.id === t.clientId);
            return (
              <div
                key={t.id}
                onClick={() => onOpenTask(t.clientId, t.moduleId, t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                  borderBottom: i < tasks.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                }}
              >
                <PriorityFlag priority={t.priority} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{space?.name}</div>
                </div>
                <AvatarStack userIds={t.assignees} size={20} max={2} />
                <div
                  style={{
                    fontSize: 11.5,
                    color: t.dueDate < D.TODAY ? "var(--error)" : "var(--text-muted)",
                    fontWeight: 500, minWidth: 50, textAlign: "right",
                  }}
                >
                  {D.fmtShort(t.dueDate)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ObjectivesCard() {
  return (
    <Card>
      <CardHeader title="Objetivos de abril" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {D.OBJECTIVES.map((o: any) => {
          const pct = Math.min(100, (o.current / o.target) * 100);
          return (
            <div key={o.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12.5 }}>
                <span style={{ color: "var(--text-muted)" }}>{o.title}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{pct.toFixed(0)}%</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.01em", marginBottom: 6 }}>
                {o.current.toLocaleString("es-ES", { useGrouping: "always" as any })}{o.unit ? ` ${o.unit}` : ""}
                <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 13 }}>
                  {" "}
                  / {o.target.toLocaleString("es-ES", { useGrouping: "always" as any })}{o.unit}
                </span>
              </div>
              <Progress
                value={o.current}
                max={o.target}
                color={pct >= 75 ? "var(--success)" : pct >= 40 ? "var(--purple)" : "var(--warning)"}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
