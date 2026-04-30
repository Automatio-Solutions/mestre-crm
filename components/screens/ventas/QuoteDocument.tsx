"use client";
import { forwardRef } from "react";
import type { Quote, QuoteLine } from "@/lib/db/quotes";
import { calcLineSubtotal, calcInvoiceTotals } from "@/lib/db/invoices";
import { COMPANY } from "@/lib/company";
import * as D from "@/lib/data";

/**
 * Documento PDF de presupuesto.
 * Misma base visual que InvoiceDocument pero con título "PRESUPUESTO",
 * columna "Expiración" en vez de "Vencimiento", y sección de condiciones.
 */
export interface QuoteDocumentProps {
  quote: Quote;
  client: any | null;
  width?: number;
}

export const QuoteDocument = forwardRef<HTMLDivElement, QuoteDocumentProps>(function QuoteDocument(
  { quote, client, width = 794 },
  ref
) {
  const lines: QuoteLine[] = quote.lines && quote.lines.length > 0
    ? quote.lines
    : [{
        id: "l1",
        concept: quote.concept || "Concepto",
        description: "",
        quantity: 1,
        price: +(quote.amount / (1 + quote.vatPct / 100)).toFixed(2),
        vat: quote.vatPct,
        discount: 0,
      }];

  const totals = calcInvoiceTotals(lines);
  const vatPct = lines[0]?.vat ?? quote.vatPct;

  const issueDateShort = quote.issueDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });

  const clientAddress =
    client
      ? [client.address, `${client.postalCode || ""} ${client.city || ""}`.trim(), client.province, client.country]
          .filter((s) => s && String(s).trim())
          .join(", ")
      : "";

  return (
    <div
      ref={ref}
      style={{
        width,
        minHeight: Math.round(width * Math.SQRT2) - 4,
        background: "#ffffff",
        color: "#1a1a1a",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 12,
        lineHeight: 1.4,
        position: "relative",
        padding: 0,
      }}
    >
      {/* ===== Banner superior beige ===== */}
      <div style={{ position: "relative", minHeight: 110 }}>
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: 110,
            background: "#dcd1c0",
          }}
        />
        {/* Logo */}
        <div
          style={{
            position: "absolute",
            left: 40, top: 14, width: 200, height: 90,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 12,
            boxSizing: "border-box",
          }}
        >
          {COMPANY.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={COMPANY.logoUrl}
              alt={COMPANY.tradeName}
              style={{
                maxWidth: "100%",
                maxHeight: 52,
                objectFit: "contain",
                mixBlendMode: "multiply",
              }}
            />
          ) : (
            <div style={{ fontSize: 30, fontWeight: 600, color: "#1a1a1a", letterSpacing: "-0.02em" }}>
              {COMPANY.tradeName}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
            {COMPANY.website}
          </div>
        </div>
        {/* Título */}
        <div
          style={{
            position: "absolute",
            top: 34, left: 280,
            fontSize: 28,
            fontWeight: 500,
            color: "#1a1a1a",
            letterSpacing: "0.06em",
          }}
        >
          PRESUPUESTO
        </div>
        {/* Contacto arriba a la derecha */}
        <div
          style={{
            position: "absolute",
            top: 26, right: 40,
            textAlign: "right",
            color: "#1a1a1a",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          <div>{COMPANY.phone}</div>
          <div>{COMPANY.email}</div>
        </div>
      </div>

      {/* ===== Cliente ===== */}
      <div style={{ padding: "32px 40px 0" }}>
        <div style={{ fontSize: 11, fontStyle: "italic", color: "#4a4a4a", marginBottom: 4 }}>
          Cliente
        </div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{client?.name || "—"}</div>
        {client?.nif && <div style={{ fontSize: 12 }}>{client.nif}</div>}
        {clientAddress && <div style={{ fontSize: 12 }}>{clientAddress}</div>}
      </div>

      {/* ===== Nº presupuesto + fechas ===== */}
      <div style={{ padding: "22px 40px 14px" }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>PRESUPUESTO {quote.number}</div>
        <div style={{ fontWeight: 700, fontSize: 12 }}>Fecha {issueDateShort}</div>
        {quote.expireDate && (
          <div style={{ fontWeight: 700, fontSize: 12 }}>
            Válido hasta {quote.expireDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })}
          </div>
        )}
      </div>

      {/* ===== Tabla ===== */}
      <div style={{ padding: "0 40px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#ffffff" }}>
              <th style={thDoc}>CONCEPTO</th>
              <th style={{ ...thDoc, textAlign: "right", width: 70 }}>PRECIO</th>
              <th style={{ ...thDoc, textAlign: "right", width: 60 }}>DTO.</th>
              <th style={{ ...thDoc, textAlign: "right", width: 80 }}>SUBTOTAL</th>
              <th style={{ ...thDoc, textAlign: "right", width: 50 }}>IVA</th>
              <th style={{ ...thDoc, textAlign: "right", width: 80 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const subtotal = calcLineSubtotal(l);
              const vat = subtotal * ((l.vat || 0) / 100);
              const total = subtotal + vat;
              return (
                <tr key={l.id || i}>
                  <td style={{ ...tdDoc, paddingTop: 14, paddingBottom: 14 }}>
                    <div style={{ fontWeight: 700 }}>{l.concept || "—"}</div>
                    {l.description && (
                      <div style={{ fontSize: 10.5, color: "#333", marginTop: 2, whiteSpace: "pre-wrap" }}>
                        {l.description}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdDoc, textAlign: "right", paddingTop: 14 }}>{formatEur(l.price)}</td>
                  <td style={{ ...tdDoc, textAlign: "right", paddingTop: 14 }}>{l.discount ? `${l.discount}%` : "0%"}</td>
                  <td style={{ ...tdDoc, textAlign: "right", paddingTop: 14 }}>{formatEur(subtotal)}</td>
                  <td style={{ ...tdDoc, textAlign: "right", paddingTop: 14 }}>{l.vat || 0}%</td>
                  <td style={{ ...tdDoc, textAlign: "right", paddingTop: 14, fontWeight: 700 }}>{formatEur(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== Totales ===== */}
      <div style={{ padding: "20px 40px 0" }}>
        <table style={{ marginLeft: "auto", fontSize: 12 }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 12px", fontWeight: 700, color: "#4a4a4a" }}>BASE IMPONIBLE</td>
              <td style={{ padding: "4px 0", textAlign: "right", minWidth: 80 }}>{formatEur(totals.base)}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 12px", fontWeight: 700, color: "#4a4a4a" }}>IVA {vatPct}%</td>
              <td style={{ padding: "4px 0", textAlign: "right" }}>{formatEur(totals.vat)}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 12px", fontWeight: 700, color: "#4a4a4a" }}>TOTAL</td>
              <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 700 }}>{formatEur(totals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== Condiciones / términos ===== */}
      {quote.terms && (
        <div style={{ padding: "32px 40px 0", fontSize: 11, whiteSpace: "pre-wrap" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Condiciones</div>
          {quote.terms}
        </div>
      )}

      {/* ===== Footer legal (barra beige full-width) ===== */}
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          background: "#dcd1c0",
          color: "#1a1a1a",
          padding: "8px 40px",
          fontSize: 10.5,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        <div>{COMPANY.legalName} {COMPANY.nif} {COMPANY.address}</div>
        <div>{COMPANY.city} ({COMPANY.postalCode}), {COMPANY.province}, {COMPANY.country}</div>
      </div>
    </div>
  );
});

const thDoc: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 10.5,
  fontWeight: 700,
  color: "#1a1a1a",
  border: "1px solid #1a1a1a",
  background: "#ffffff",
  letterSpacing: "0.02em",
};

const tdDoc: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 11,
  verticalAlign: "top",
};

const formatEur = (n: number) =>
  n.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";
