"use client";
import { useMemo, useState } from "react";
import { Icon, Button, Card, Input, EmptyState } from "@/components/ui";
import { useJournalEntries } from "@/lib/db/useJournalEntries";
import { useChartOfAccounts } from "@/lib/db/useChartOfAccounts";

const fmtEur = (n: number) =>
  n.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

// CSV helpers
const csvEscape = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function downloadCSV(filename: string, rows: any[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PerdidasGananciasScreen() {
  const { entries, loading: loadingEntries } = useJournalEntries();
  const { accounts, loading: loadingAccounts } = useChartOfAccounts();
  const loading = loadingEntries || loadingAccounts;

  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);

  // Saldos por cuenta en el rango
  const balances = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>();
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    entries.forEach((e) => {
      const d = new Date(e.date);
      if (d < from || d > to) return;
      e.lines.forEach((l) => {
        const cur = map.get(l.accountCode) || { debit: 0, credit: 0 };
        cur.debit += l.debit;
        cur.credit += l.credit;
        map.set(l.accountCode, cur);
      });
    });
    return map;
  }, [entries, dateFrom, dateTo]);

  const ingresos = useMemo(() =>
    accounts
      .filter((a) => a.accountType === "ingreso")
      .map((a) => {
        const b = balances.get(a.code) || { debit: 0, credit: 0 };
        return { ...a, amount: +(b.credit - b.debit).toFixed(2) };
      })
      .filter((a) => Math.abs(a.amount) > 0.005)
      .sort((a, b) => b.amount - a.amount),
  [accounts, balances]);

  const gastos = useMemo(() =>
    accounts
      .filter((a) => a.accountType === "gasto")
      .map((a) => {
        const b = balances.get(a.code) || { debit: 0, credit: 0 };
        return { ...a, amount: +(b.debit - b.credit).toFixed(2) };
      })
      .filter((a) => Math.abs(a.amount) > 0.005)
      .sort((a, b) => b.amount - a.amount),
  [accounts, balances]);

  const totalIngresos = +ingresos.reduce((s, a) => s + a.amount, 0).toFixed(2);
  const totalGastos   = +gastos.reduce((s, a) => s + a.amount, 0).toFixed(2);
  const resultado     = +(totalIngresos - totalGastos).toFixed(2);
  const margen        = totalIngresos > 0 ? (resultado / totalIngresos) * 100 : 0;

  // Atajos de rango temporal
  const setRange = (kind: "month" | "quarter" | "year" | "prevYear" | "ytd") => {
    const now = new Date();
    if (kind === "year") {
      const y = now.getFullYear();
      setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`);
    } else if (kind === "prevYear") {
      const y = now.getFullYear() - 1;
      setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`);
    } else if (kind === "ytd") {
      const y = now.getFullYear();
      setDateFrom(`${y}-01-01`); setDateTo(now.toISOString().slice(0, 10));
    } else if (kind === "month") {
      const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, "0");
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      setDateFrom(`${y}-${m}-01`); setDateTo(`${y}-${m}-${String(last).padStart(2, "0")}`);
    } else if (kind === "quarter") {
      const q = Math.floor(now.getMonth() / 3);
      const startMonth = q * 3 + 1;
      const endMonth = q * 3 + 3;
      const y = now.getFullYear();
      const last = new Date(y, endMonth, 0).getDate();
      setDateFrom(`${y}-${String(startMonth).padStart(2, "0")}-01`);
      setDateTo(`${y}-${String(endMonth).padStart(2, "0")}-${String(last).padStart(2, "0")}`);
    }
  };

  const exportCSV = () => {
    const headers = ["Sección", "Código", "Cuenta", "Importe"];
    const rows: any[][] = [];
    ingresos.forEach((a) => rows.push(["INGRESOS", a.code, a.name, a.amount]));
    rows.push(["INGRESOS", "", "Total Ingresos", totalIngresos]);
    gastos.forEach((a) => rows.push(["GASTOS", a.code, a.name, -a.amount]));
    rows.push(["GASTOS", "", "Total Gastos", -totalGastos]);
    rows.push(["", "", "RESULTADO DEL EJERCICIO", resultado]);
    downloadCSV(`pyg_${dateFrom}_${dateTo}.csv`, [headers, ...rows]);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>Pérdidas y ganancias</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
            Ingresos − Gastos del periodo. Calculado en vivo desde los asientos del Libro Diario.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Desde</span>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hasta</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <Button
            variant="outline"
            leftIcon={<Icon name="download" size={14} />}
            onClick={exportCSV}
            disabled={ingresos.length + gastos.length === 0}
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Atajos de rango */}
      <div style={{
        display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3,
        borderRadius: 8, border: "1px solid var(--border)",
        width: "fit-content", marginBottom: 16, fontSize: 12,
      }}>
        {[
          { id: "month",    label: "Mes actual" },
          { id: "quarter",  label: "Trimestre" },
          { id: "ytd",      label: "Año actual hasta hoy" },
          { id: "year",     label: "Año completo" },
          { id: "prevYear", label: "Año anterior" },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setRange(p.id as any)}
            style={{
              padding: "5px 10px", borderRadius: 6, fontWeight: 500,
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <KpiCard label="Ingresos"  value={totalIngresos} color="var(--success)" />
        <KpiCard label="Gastos"    value={totalGastos}   color="var(--error)"   />
        <KpiCard label="Resultado" value={resultado}     color={resultado >= 0 ? "var(--success)" : "var(--error)"} />
        <KpiCard
          label="Margen"
          value={margen}
          color="var(--purple)"
          formatter={(n) => `${n.toFixed(1)}%`}
          sub={totalIngresos === 0 ? "Sin ingresos" : undefined}
        />
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Calculando cuenta de resultados…
        </div>
      )}

      {!loading && entries.length === 0 && (
        <EmptyState
          icon={<Icon name="book" size={28} />}
          title="Sin asientos contables"
          description="Crea asientos en el Libro Diario para que se calcule la cuenta de pérdidas y ganancias."
        />
      )}

      {!loading && entries.length > 0 && (
        <Card padding={28}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.01em" }}>
            Cuenta de Pérdidas y Ganancias
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
            Periodo: {dateFrom} → {dateTo}
          </div>

          <SubSectionTitle>Ingresos</SubSectionTitle>
          {ingresos.length === 0 ? (
            <EmptyRow text="Sin ingresos en el periodo." />
          ) : (
            ingresos.map((a) => (
              <PyGLine key={a.code} code={a.code} label={a.name} amount={a.amount} />
            ))
          )}
          <PyGLine label="Total Ingresos" amount={totalIngresos} subTotal />

          <div style={{ height: 16 }} />

          <SubSectionTitle>Gastos</SubSectionTitle>
          {gastos.length === 0 ? (
            <EmptyRow text="Sin gastos en el periodo." />
          ) : (
            gastos.map((a) => (
              <PyGLine key={a.code} code={a.code} label={a.name} amount={-a.amount} />
            ))
          )}
          <PyGLine label="Total Gastos" amount={-totalGastos} subTotal />

          <div style={{ height: 16 }} />

          <PyGLine label="RESULTADO DEL EJERCICIO" amount={resultado} bold />
          {totalIngresos > 0 && (
            <div style={{
              padding: "10px 0 0", fontSize: 12, color: "var(--text-muted)",
              textAlign: "right",
            }}>
              Margen sobre ingresos: <b style={{ color: "var(--text)" }}>{margen.toFixed(1)}%</b>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ----- helpers -----
function KpiCard({ label, value, color, sub, formatter }: {
  label: string;
  value: number;
  color: string;
  sub?: string;
  formatter?: (n: number) => string;
}) {
  return (
    <Card padding={18}>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color, letterSpacing: "-0.01em" }}>
        {formatter ? formatter(value) : fmtEur(value)}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.06em",
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function PyGLine({
  code, label, amount, bold, subTotal,
}: {
  code?: string;
  label: string;
  amount: number;
  bold?: boolean;
  subTotal?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "7px 0",
      borderTop: bold || subTotal ? "1px solid var(--border-strong)" : "1px solid var(--border)",
      fontSize: bold ? 14 : 13,
      fontWeight: bold ? 600 : subTotal ? 500 : 400,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {code && (
          <span style={{
            fontFamily: "var(--font-mono, monospace)", color: "var(--purple)",
            fontSize: 11.5, fontWeight: 500,
          }}>{code}</span>
        )}
        <span style={{ color: bold ? "var(--text)" : subTotal ? "var(--text)" : "var(--text-muted)" }}>
          {label}
        </span>
      </span>
      <span style={{
        fontVariantNumeric: "tabular-nums",
        color: amount < 0 ? "var(--error)" : amount > 0 ? "var(--text)" : "var(--text-muted)",
      }}>
        {fmtEur(amount)}
      </span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={{ padding: "8px 0", fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>
      {text}
    </div>
  );
}
