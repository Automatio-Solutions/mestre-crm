"use client";
import { useMemo, useState } from "react";
import { Icon, Button, Card, Input, EmptyState } from "@/components/ui";
import { useJournalEntries } from "@/lib/db/useJournalEntries";
import { useChartOfAccounts } from "@/lib/db/useChartOfAccounts";
import type { ChartAccount } from "@/lib/db/chartOfAccounts";

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

export function BalanceSituacionScreen() {
  const { entries, loading: loadingEntries } = useJournalEntries();
  const { accounts, loading: loadingAccounts } = useChartOfAccounts();
  const today = new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = useState(today);

  const loading = loadingEntries || loadingAccounts;

  // Saldos acumulados por cuenta hasta la fecha "asOf"
  const balances = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>();
    const cutoff = new Date(asOf);
    cutoff.setHours(23, 59, 59, 999);
    entries.forEach((e) => {
      if (new Date(e.date) > cutoff) return;
      e.lines.forEach((l) => {
        const cur = map.get(l.accountCode) || { debit: 0, credit: 0 };
        cur.debit += l.debit;
        cur.credit += l.credit;
        map.set(l.accountCode, cur);
      });
    });
    return map;
  }, [entries, asOf]);

  type AccountWithBalance = ChartAccount & { balance: number };

  const filterAndCompute = (
    type: ChartAccount["accountType"],
    naturalSide: "debit" | "credit",
  ): AccountWithBalance[] =>
    accounts
      .filter((a) => a.accountType === type)
      .map((a) => {
        const b = balances.get(a.code) || { debit: 0, credit: 0 };
        const balance = naturalSide === "debit" ? b.debit - b.credit : b.credit - b.debit;
        return { ...a, balance };
      })
      .filter((a) => Math.abs(a.balance) > 0.005)
      .sort((a, b) => a.code.localeCompare(b.code));

  const activo      = useMemo(() => filterAndCompute("activo",     "debit"),  [accounts, balances]);
  const pasivo      = useMemo(() => filterAndCompute("pasivo",     "credit"), [accounts, balances]);
  const patrimonio  = useMemo(() => filterAndCompute("patrimonio", "credit"), [accounts, balances]);

  // Resultado del ejercicio = ingresos − gastos (cuentas grupo 6 y 7)
  const resultado = useMemo(() => {
    let ingresos = 0, gastos = 0;
    accounts.forEach((a) => {
      const b = balances.get(a.code);
      if (!b) return;
      if (a.accountType === "ingreso") ingresos += b.credit - b.debit;
      if (a.accountType === "gasto")    gastos   += b.debit - b.credit;
    });
    return +(ingresos - gastos).toFixed(2);
  }, [accounts, balances]);

  const totalActivo = +activo.reduce((s, a) => s + a.balance, 0).toFixed(2);
  const totalPasivo = +pasivo.reduce((s, a) => s + a.balance, 0).toFixed(2);
  const totalPatrimonioBase = +patrimonio.reduce((s, a) => s + a.balance, 0).toFixed(2);
  const totalPatrimonio = +(totalPatrimonioBase + resultado).toFixed(2);
  const totalPasivoYPN = +(totalPasivo + totalPatrimonio).toFixed(2);

  const diff = +(totalActivo - totalPasivoYPN).toFixed(2);
  const balanced = Math.abs(diff) < 0.01;

  const exportCSV = () => {
    const headers = ["Sección", "Código", "Cuenta", "Importe"];
    const rows: any[][] = [];
    activo.forEach((a) => rows.push(["ACTIVO", a.code, a.name, a.balance]));
    rows.push(["ACTIVO", "", "TOTAL ACTIVO", totalActivo]);
    patrimonio.forEach((a) => rows.push(["PATRIMONIO", a.code, a.name, a.balance]));
    rows.push(["PATRIMONIO", "", "Resultado del ejercicio", resultado]);
    rows.push(["PATRIMONIO", "", "Total Patrimonio Neto", totalPatrimonio]);
    pasivo.forEach((a) => rows.push(["PASIVO", a.code, a.name, a.balance]));
    rows.push(["PASIVO", "", "Total Pasivo", totalPasivo]);
    rows.push(["", "", "TOTAL PASIVO + PN", totalPasivoYPN]);
    downloadCSV(`balance_${asOf}.csv`, [headers, ...rows]);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>Balance de situación</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
            Foto patrimonial a una fecha. Calculado en vivo desde los asientos del Libro Diario.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>A fecha</span>
            <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </label>
          <Button
            variant="outline"
            leftIcon={<Icon name="download" size={14} />}
            onClick={exportCSV}
            disabled={activo.length + pasivo.length + patrimonio.length === 0}
          >
            Exportar
          </Button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Calculando balance…
        </div>
      )}

      {!loading && entries.length === 0 && (
        <EmptyState
          icon={<Icon name="book" size={28} />}
          title="Sin asientos contables"
          description="Crea asientos en el Libro Diario para que el balance se calcule automáticamente."
        />
      )}

      {!loading && entries.length > 0 && (
        <>
          {!balanced && (
            <Card padding={14} style={{ marginBottom: 16, background: "#F5E1E1", border: "1px solid var(--error)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Icon name="alert" size={16} style={{ color: "var(--error)", marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: "var(--text)" }}>
                  <b>Balance descuadrado.</b> Total Activo {fmtEur(totalActivo)} ≠ Total Pasivo + Patrimonio Neto {fmtEur(totalPasivoYPN)} (diferencia: {fmtEur(Math.abs(diff))}). Revisa que todos los asientos del Libro Diario cuadren.
                </div>
              </div>
            </Card>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* ACTIVO */}
            <Card padding={24}>
              <SectionTitle>ACTIVO</SectionTitle>
              {activo.length === 0 ? (
                <EmptyRow text="Sin cuentas con saldo deudor." />
              ) : (
                activo.map((a) => (
                  <BalLine key={a.code} code={a.code} label={a.name} amount={a.balance} />
                ))
              )}
              <BalLine label="TOTAL ACTIVO" amount={totalActivo} bold />
            </Card>

            {/* PASIVO + PATRIMONIO */}
            <Card padding={24}>
              <SectionTitle>PASIVO + PATRIMONIO NETO</SectionTitle>

              <SubSectionTitle>Patrimonio neto</SubSectionTitle>
              {patrimonio.length === 0 && resultado === 0 && (
                <EmptyRow text="Sin patrimonio registrado." />
              )}
              {patrimonio.map((a) => (
                <BalLine key={a.code} code={a.code} label={a.name} amount={a.balance} />
              ))}
              <BalLine label="Resultado del ejercicio" amount={resultado} italic />
              <BalLine label="Total Patrimonio Neto" amount={totalPatrimonio} subTotal />

              <div style={{ height: 16 }} />

              <SubSectionTitle>Pasivo</SubSectionTitle>
              {pasivo.length === 0 ? (
                <EmptyRow text="Sin pasivos registrados." />
              ) : (
                pasivo.map((a) => (
                  <BalLine key={a.code} code={a.code} label={a.name} amount={a.balance} />
                ))
              )}
              <BalLine label="Total Pasivo" amount={totalPasivo} subTotal />

              <BalLine label="TOTAL PASIVO + PN" amount={totalPasivoYPN} bold />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ----- helpers -----
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 14, fontWeight: 600, marginBottom: 14,
      paddingBottom: 8, borderBottom: "1px solid var(--border)",
      letterSpacing: "-0.01em",
    }}>
      {children}
    </div>
  );
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.06em",
      marginTop: 8, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function BalLine({
  code, label, amount, bold, subTotal, italic,
}: {
  code?: string;
  label: string;
  amount: number;
  bold?: boolean;
  subTotal?: boolean;
  italic?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "7px 0",
      borderTop: bold || subTotal ? "1px solid var(--border-strong)" : "1px solid var(--border)",
      fontSize: 13,
      fontWeight: bold ? 600 : subTotal ? 500 : 400,
      fontStyle: italic ? "italic" : "normal",
      color: bold ? "var(--text)" : "var(--text)",
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
        color: amount < 0 ? "var(--error)" : "var(--text)",
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
