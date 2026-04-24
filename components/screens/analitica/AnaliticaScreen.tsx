"use client";
import { useMemo, useState } from "react";
import { Icon, Button, Card, CardHeader, Progress } from "@/components/ui";
import { StatCard } from "@/components/screens/ventas/shared";
import { useInvoices } from "@/lib/db/useInvoices";
import { usePurchases } from "@/lib/db/usePurchases";
import { useContacts } from "@/lib/db/useContacts";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const COLORS = ["#6A5ACD", "#4A7C59", "#C89B3C", "#B84545", "#2A6FB3", "#9B3A8F", "#2F5A3D", "#5A4D2E"];

export function AnaliticaScreen() {
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const { contacts } = useContacts();

  const availableYears = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    invoices.forEach((i) => ys.add(i.issueDate.getFullYear()));
    purchases.forEach((p) => ys.add(p.issueDate.getFullYear()));
    return Array.from(ys).sort((a, b) => b - a);
  }, [invoices, purchases]);

  const [year, setYear] = useState<number>(availableYears[0] ?? new Date().getFullYear());

  // ---- Series mensuales ingresos / gastos ----
  const monthly = useMemo(() => {
    const ingresos = Array(12).fill(0) as number[];
    const gastos = Array(12).fill(0) as number[];
    invoices.forEach((i) => {
      if (i.issueDate.getFullYear() === year && i.status !== "borrador") {
        ingresos[i.issueDate.getMonth()] += i.total;
      }
    });
    purchases.forEach((p) => {
      if (p.issueDate.getFullYear() === year) {
        gastos[p.issueDate.getMonth()] += p.total;
      }
    });
    return { ingresos, gastos };
  }, [invoices, purchases, year]);

  const totalIngresos = monthly.ingresos.reduce((s, v) => s + v, 0);
  const totalGastos = monthly.gastos.reduce((s, v) => s + v, 0);
  const beneficio = totalIngresos - totalGastos;
  const margin = totalIngresos > 0 ? (beneficio / totalIngresos) * 100 : 0;

  // ---- Donut: ingresos por cliente ----
  const byClient = useMemo(() => {
    const m = new Map<string, number>();
    invoices
      .filter((i) => i.issueDate.getFullYear() === year && i.status !== "borrador")
      .forEach((i) => {
        const key = i.clientId || "sin-cliente";
        m.set(key, (m.get(key) || 0) + i.total);
      });
    const arr = Array.from(m.entries())
      .map(([clientId, value]) => {
        const c = contacts.find((x) => x.id === clientId);
        return { name: c?.name || "Sin cliente", value, color: "" };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    arr.forEach((x, i) => (x.color = COLORS[i % COLORS.length]));
    return arr;
  }, [invoices, contacts, year]);

  // ---- Donut: gastos por categoría ----
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    purchases
      .filter((p) => p.issueDate.getFullYear() === year)
      .forEach((p) => {
        const key = p.category || "Sin categoría";
        m.set(key, (m.get(key) || 0) + p.total);
      });
    const arr = Array.from(m.entries())
      .map(([name, amount]) => ({ name, amount, color: "" }))
      .sort((a, b) => b.amount - a.amount);
    arr.forEach((x, i) => (x.color = COLORS[i % COLORS.length]));
    return arr;
  }, [purchases, year]);

  const totalByClient = byClient.reduce((s, x) => s + x.value, 0);
  const totalByCategory = byCategory.reduce((s, x) => s + x.amount, 0);

  // Top clientes por facturado total (histórico basado en contacts)
  const topClients = useMemo(() => {
    const m = new Map<string, number>();
    invoices.forEach((i) => {
      if (i.status !== "borrador" && i.clientId) {
        m.set(i.clientId, (m.get(i.clientId) || 0) + i.total);
      }
    });
    return Array.from(m.entries())
      .map(([id, total]) => ({ client: contacts.find((c) => c.id === id), total }))
      .filter((x) => x.client)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices, contacts]);

  const maxClient = topClients[0]?.total || 1;

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>Analítica</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
            Resumen financiero calculado en vivo desde tus facturas y gastos
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              height: 34, padding: "0 10px", fontSize: 13,
              border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--surface)", outline: "none",
            }}
          >
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" leftIcon={<Icon name="download" size={14} />}>Exportar</Button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="Ingresos" value={totalIngresos} color="var(--success)" sub={`Año ${year}`} />
        <StatCard label="Gastos" value={totalGastos} color="var(--warning)" sub={`Año ${year}`} />
        <StatCard
          label="Beneficio"
          value={beneficio}
          color={beneficio >= 0 ? "var(--text)" : "var(--error)"}
          sub={`${margin.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 1, maximumFractionDigits: 1 })}% margen`}
        />
        <StatCard label="Facturas emitidas" value={invoices.filter((i) => i.issueDate.getFullYear() === year && i.status !== "borrador").length} format="number" />
      </div>

      {/* Gráfico mensual ingresos vs gastos */}
      <Card padding={24} style={{ marginBottom: 16 }}>
        <CardHeader
          title="Evolución mensual"
          subtitle={`Ingresos vs gastos · ${year}`}
          action={
            <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} /> Ingresos
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)" }} /> Gastos
              </span>
            </div>
          }
        />
        <BarChart ingresos={monthly.ingresos} gastos={monthly.gastos} />
      </Card>

      {/* Dos columnas: clientes + categorías */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card padding={24}>
          <CardHeader title="Ingresos por cliente" subtitle={`${byClient.length} clientes · ${year}`} />
          {byClient.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
              Sin datos de ingresos para {year}
            </div>
          ) : (
            <>
              <DonutChart data={byClient.map((c) => ({ name: c.name, value: c.value, color: c.color }))} total={totalByClient} />
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                {byClient.map((c) => (
                  <LegendRow key={c.name} color={c.color} label={c.name} value={c.value} total={totalByClient} />
                ))}
              </div>
            </>
          )}
        </Card>

        <Card padding={24}>
          <CardHeader title="Gastos por categoría" subtitle={`${byCategory.length} categorías · ${year}`} />
          {byCategory.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
              Sin datos de gastos para {year}
            </div>
          ) : (
            <>
              <DonutChart data={byCategory.map((c) => ({ name: c.name, value: c.amount, color: c.color }))} total={totalByCategory} />
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                {byCategory.map((c) => (
                  <LegendRow key={c.name} color={c.color} label={c.name} value={c.amount} total={totalByCategory} />
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Top clientes */}
      <Card padding={24}>
        <CardHeader title="Top clientes por facturado" subtitle="Histórico" />
        {topClients.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
            Aún no has facturado nada.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {topClients.map((item, i) => (
              <div key={item.client!.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, background: "var(--beige)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600,
                }}>
                  {item.client!.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 500 }}>{item.client!.name}</span>
                    <span>
                      {item.total.toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <Progress value={item.total} max={maxClient} color={i === 0 ? "var(--purple)" : "var(--black)"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============ Gráficos ============

function BarChart({ ingresos, gastos }: { ingresos: number[]; gastos: number[] }) {
  const max = Math.max(...ingresos, ...gastos, 1);
  const W = 820, H = 240, pad = { l: 44, r: 10, t: 10, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const groupW = iw / 12;
  const barW = Math.min(groupW / 2 - 4, 18);
  const xAt = (i: number) => pad.l + i * groupW + groupW / 2;
  const hAt = (v: number) => (v / max) * ih;
  const yAt = (v: number) => pad.t + ih - hAt(v);

  return (
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
        const v = max * (1 - g);
        return (
          <text key={g} x={pad.l - 6} y={pad.t + ih * g + 4} fontSize="10" fill="var(--text-muted)" textAnchor="end">
            {v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
          </text>
        );
      })}
      {ingresos.map((v, i) => {
        const x = xAt(i) - barW - 2;
        return <rect key={"ing" + i} x={x} y={yAt(v)} width={barW} height={hAt(v)} rx={2} fill="var(--success)" opacity={0.85} />;
      })}
      {gastos.map((v, i) => {
        const x = xAt(i) + 2;
        return <rect key={"gas" + i} x={x} y={yAt(v)} width={barW} height={hAt(v)} rx={2} fill="var(--warning)" opacity={0.85} />;
      })}
      {MONTHS.map((m, i) => (
        <text key={m} x={xAt(i)} y={H - 8} fontSize="10.5" fill="var(--text-muted)" textAnchor="middle">
          {m}
        </text>
      ))}
    </svg>
  );
}

function DonutChart({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  const size = 180;
  const r = 70;
  const r2 = 50;
  const cx = size / 2, cy = size / 2;
  let acc = 0;

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const frac = total > 0 ? d.value / total : 0;
          const a0 = acc * 2 * Math.PI - Math.PI / 2;
          acc += frac;
          const a1 = acc * 2 * Math.PI - Math.PI / 2;
          const large = frac > 0.5 ? 1 : 0;
          const x0 = cx + r * Math.cos(a0);
          const y0 = cy + r * Math.sin(a0);
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          const ix0 = cx + r2 * Math.cos(a1);
          const iy0 = cy + r2 * Math.sin(a1);
          const ix1 = cx + r2 * Math.cos(a0);
          const iy1 = cy + r2 * Math.sin(a0);
          const path = [
            `M ${x0} ${y0}`,
            `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
            `L ${ix0} ${iy0}`,
            `A ${r2} ${r2} 0 ${large} 0 ${ix1} ${iy1}`,
            "Z",
          ].join(" ");
          return <path key={i} d={path} fill={d.color} />;
        })}
        <text x={cx} y={cy - 2} fontSize="14" fill="var(--text)" textAnchor="middle" fontWeight="600">
          {(total / 1000).toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 0, maximumFractionDigits: 0 })}k€
        </text>
        <text x={cx} y={cy + 14} fontSize="10" fill="var(--text-muted)" textAnchor="middle">
          Total
        </text>
      </svg>
    </div>
  );
}

function LegendRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
        {value.toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
      </span>
      <span style={{ color: "var(--text-muted)", fontSize: 11, width: 40, textAlign: "right" }}>
        {pct.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 0, maximumFractionDigits: 0 })}%
      </span>
    </div>
  );
}
