"use client";
import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui";
import type { Invoice } from "@/lib/db/invoices";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface Props {
  invoices: Invoice[];
  year: number;
  onChangeYear: (y: number) => void;
  availableYears: number[];
}

export function ContactSalesChart({ invoices, year, onChangeYear, availableYears }: Props) {
  const [mode, setMode] = useState<"bars" | "cumulative">("bars");

  const yearInvoices = useMemo(
    () => invoices.filter((i) => i.issueDate.getFullYear() === year && i.status !== "borrador"),
    [invoices, year]
  );

  const monthly = useMemo(() => {
    const arr = Array(12).fill(0) as number[];
    yearInvoices.forEach((i) => {
      const m = i.issueDate.getMonth();
      arr[m] += i.total;
    });
    return arr;
  }, [yearInvoices]);

  const cumulative = useMemo(() => {
    const arr: number[] = [];
    let acc = 0;
    for (const v of monthly) {
      acc += v;
      arr.push(acc);
    }
    return arr;
  }, [monthly]);

  const maxBar = Math.max(...monthly, 1);
  const maxCum = Math.max(...cumulative, 1);

  const W = 720;
  const H = 220;
  const pad = { l: 44, r: 12, t: 10, b: 30 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const barWidth = iw / 12;

  const xAt = (i: number) => pad.l + i * barWidth + barWidth / 2;

  const cumulativePath = cumulative
    .map((v, i) => {
      const x = xAt(i);
      const y = pad.t + ih - (v / maxCum) * ih;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join("");

  return (
    <Card padding={24}>
      <CardHeader
        title="Evolución de ventas"
        subtitle={`${yearInvoices.length} facturas · ${monthly.reduce((s, v) => s + v, 0).toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={year}
              onChange={(e) => onChangeYear(Number(e.target.value))}
              style={{
                height: 28, padding: "0 10px", fontSize: 12,
                border: "1px solid var(--border)", borderRadius: 6,
                background: "var(--surface)", fontFamily: "inherit", outline: "none",
              }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div style={{ display: "flex", background: "var(--beige-light)", padding: 2, borderRadius: 6, border: "1px solid var(--border)" }}>
              {(["bars", "cumulative"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "4px 10px", fontSize: 11.5, fontWeight: 500, borderRadius: 4,
                    background: mode === m ? "var(--surface)" : "transparent",
                    color: mode === m ? "var(--text)" : "var(--text-muted)",
                    boxShadow: mode === m ? "var(--shadow-sm)" : "none",
                  }}
                >
                  {m === "bars" ? "Mensual" : "Acumulado"}
                </button>
              ))}
            </div>
          </div>
        }
      />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {/* grid */}
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
          const v = (mode === "bars" ? maxBar : maxCum) * (1 - g);
          return (
            <text
              key={g}
              x={pad.l - 6}
              y={pad.t + ih * g + 4}
              fontSize="10"
              fill="var(--text-muted)"
              textAnchor="end"
            >
              {v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
            </text>
          );
        })}
        {/* bars */}
        {mode === "bars" &&
          monthly.map((v, i) => {
            const bh = (v / maxBar) * ih;
            const bw = Math.min(barWidth - 10, 32);
            const x = xAt(i) - bw / 2;
            const y = pad.t + ih - bh;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={bh}
                  rx={3}
                  fill={v > 0 ? "var(--purple)" : "var(--border)"}
                  opacity={v > 0 ? 0.9 : 0.3}
                />
                {v > 0 && (
                  <text
                    x={xAt(i)}
                    y={y - 4}
                    fontSize="10"
                    fill="var(--text-muted)"
                    textAnchor="middle"
                    fontVariantNumeric="tabular-nums"
                  >
                    {Math.round(v / 1000)}k
                  </text>
                )}
              </g>
            );
          })}
        {/* cumulative line */}
        {mode === "cumulative" && (
          <>
            <path
              d={`${cumulativePath} L${xAt(11)},${pad.t + ih} L${xAt(0)},${pad.t + ih} Z`}
              fill="var(--purple)"
              opacity="0.12"
            />
            <path
              d={cumulativePath}
              fill="none"
              stroke="var(--purple)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {cumulative.map((v, i) => (
              <circle
                key={i}
                cx={xAt(i)}
                cy={pad.t + ih - (v / maxCum) * ih}
                r="3"
                fill="var(--surface)"
                stroke="var(--purple)"
                strokeWidth="1.5"
              />
            ))}
          </>
        )}
        {/* month labels */}
        {MONTH_LABELS.map((m, i) => (
          <text
            key={m}
            x={xAt(i)}
            y={H - 10}
            fontSize="10.5"
            fill="var(--text-muted)"
            textAnchor="middle"
          >
            {m}
          </text>
        ))}
      </svg>
    </Card>
  );
}

// ================= KPIs =================
export function ContactSalesKpis({ invoices }: { invoices: Invoice[] }) {
  const emitidas = invoices.filter((i) => i.status !== "borrador");
  const cobradas = invoices.filter((i) => i.status === "pagada");
  const pendientes = invoices.filter((i) => i.status === "pendiente" || i.status === "vencida");

  const totalCobrado = cobradas.reduce((s, i) => s + i.total, 0);
  const totalFacturado = emitidas.reduce((s, i) => s + i.total, 0);
  const totalPendiente = pendientes.reduce((s, i) => s + i.total, 0);
  const promedio = emitidas.length > 0 ? totalFacturado / emitidas.length : 0;
  const totalVencido = invoices.filter((i) => i.status === "vencida").reduce((s, i) => s + i.total, 0);

  // Frecuencia media entre emisiones (días)
  const dates = emitidas.map((i) => i.issueDate.getTime()).sort((a, b) => a - b);
  let frecMedia = 0;
  if (dates.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < dates.length; i++) diffs.push((dates[i] - dates[i - 1]) / 86400000);
    frecMedia = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  }

  const last = emitidas.slice().sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime())[0];

  const fmtEur = (v: number) =>
    v.toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
      }}
    >
      <KpiCard label="Total facturado" value={fmtEur(totalFacturado)} sub={`${emitidas.length} facturas`} />
      <KpiCard label="Total cobrado" value={fmtEur(totalCobrado)} sub={`${cobradas.length} pagadas`} accent="var(--success)" />
      <KpiCard label="Pendiente de cobro" value={fmtEur(totalPendiente)} sub={`${pendientes.length} pendientes`} accent="var(--warning)" />
      <KpiCard
        label="Vencido"
        value={fmtEur(totalVencido)}
        sub={invoices.filter((i) => i.status === "vencida").length + " vencidas"}
        accent={totalVencido > 0 ? "var(--error)" : undefined}
      />
      <KpiCard label="Promedio / venta" value={fmtEur(promedio)} sub="Ticket medio" />
      <KpiCard
        label="Frec. media"
        value={frecMedia > 0 ? `${Math.round(frecMedia)} días` : "—"}
        sub="Entre facturas"
      />
      <KpiCard
        label="Última factura"
        value={last ? last.issueDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—"}
        sub={last ? fmtEur(last.total) : "Sin datos"}
      />
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: accent || "var(--text)",
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
