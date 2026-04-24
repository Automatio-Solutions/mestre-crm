"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, Badge, Avatar, Dropdown, DropdownItem, DropdownSeparator, useConfirm } from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { useContacts } from "@/lib/db/useContacts";
import { useQuotes } from "@/lib/db/useQuotes";
import { StatCard, VentasHeader } from "./shared";
import * as D from "@/lib/data";

type View = "kanban" | "tabla";

export function PresupuestosScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const [view, setView] = useState<View>("kanban");
  const { contacts } = useContacts();
  const contactsMap = useMemo(() => {
    const m = new Map<string, any>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const { quotes, loading, moveToStatus, remove, duplicate } = useQuotes();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const byStatus: Record<string, any[]> = {};
  (D.QUOTE_STATUSES as any[]).forEach((s) => { byStatus[s.id] = []; });
  quotes.forEach((q) => {
    if (byStatus[q.status]) byStatus[q.status].push(q);
  });

  const totals = {
    abiertos: quotes
      .filter((q) => !["aceptado", "rechazado"].includes(q.status))
      .reduce((s, q) => s + q.amount, 0),
    aceptados: quotes
      .filter((q) => q.status === "aceptado")
      .reduce((s, q) => s + q.amount, 0),
    ponderado: quotes
      .filter((q) => !["rechazado"].includes(q.status))
      .reduce((s, q) => s + q.amount * (q.probability / 100), 0),
    conversion: Math.round(
      (quotes.filter((q) => q.status === "aceptado").length /
        Math.max(1, quotes.filter((q) => q.status !== "borrador").length)) *
        100
    ),
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <VentasHeader
        section="Presupuestos"
        title="Presupuestos"
        description="Cotizaciones y pipeline comercial"
        primary={{
          label: "Nuevo presupuesto",
          icon: "plus",
          onClick: () => router.push("/ventas/presupuestos/nuevo"),
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard
          label="Abiertos"
          value={totals.abiertos}
          sub={`${quotes.filter((q) => !["aceptado", "rechazado"].includes(q.status)).length} presupuestos`}
        />
        <StatCard label="Ponderado" value={Math.round(totals.ponderado)} color="var(--purple)" sub="Por probabilidad" />
        <StatCard
          label="Aceptados 2026"
          value={totals.aceptados}
          color="var(--success)"
          sub={`${quotes.filter((q) => q.status === "aceptado").length} ganados`}
        />
        <StatCard label="Tasa conversión" value={totals.conversion} format="number" suffix="%" sub="Últimos 90 días" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
          {[
            { id: "kanban" as const, label: "Pipeline", icon: "columns" },
            { id: "tabla" as const, label: "Tabla", icon: "list" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: view === v.id ? "var(--surface)" : "transparent",
                color: view === v.id ? "var(--text)" : "var(--text-muted)",
                boxShadow: view === v.id ? "var(--shadow-sm)" : "none",
              }}
            >
              <Icon name={v.icon} size={12} /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Cargando presupuestos…
        </div>
      )}

      {!loading && view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(240px, 1fr))", gap: 10, overflowX: "auto" }}>
          {(D.QUOTE_STATUSES as any[]).map((st) => {
            const items = byStatus[st.id] || [];
            const total = items.reduce((s: number, q: any) => s + q.amount, 0);
            const isOver = dragOverStatus === st.id;
            return (
              <div
                key={st.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStatus !== st.id) setDragOverStatus(st.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStatus(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) {
                    moveToStatus(dragId, st.id).catch((err) => console.error(err));
                  }
                  setDragId(null);
                  setDragOverStatus(null);
                }}
                style={{
                  background: isOver ? "var(--purple-soft)" : "var(--beige-bg)",
                  borderRadius: 10,
                  padding: 10,
                  minHeight: 420,
                  outline: isOver ? "2px dashed var(--purple)" : "2px dashed transparent",
                  outlineOffset: -2,
                  transition: "background 140ms ease, outline-color 140ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: st.color }} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{st.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· {items.length}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {(total / 1000).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k €
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((q: any) => {
                    const cli = contactsMap.get(q.clientId);
                    const isDragging = dragId === q.id;
                    return (
                      <div
                        key={q.id}
                        draggable
                        onDragStart={(e) => {
                          setDragId(q.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", q.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOverStatus(null);
                        }}
                        style={{
                          opacity: isDragging ? 0.35 : 1,
                          transform: isDragging ? "scale(0.98)" : "none",
                          transition: "opacity 120ms ease, transform 120ms ease",
                          cursor: "grab",
                        }}
                      >
                        <Card
                          padding={12}
                          interactive
                          onClick={() => {
                            if (!isDragging) router.push(`/ventas/presupuestos/${q.id}`);
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                              {q.number}
                            </div>
                            <div
                              style={{ display: "flex", alignItems: "center", gap: 6 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {q.viewed && <Icon name="eye" size={11} style={{ color: "var(--text-faint)" }} />}
                              <Dropdown
                                align="end"
                                trigger={
                                  <button
                                    type="button"
                                    style={{ color: "var(--text-faint)", padding: 2, borderRadius: 4 }}
                                    title="Acciones"
                                  >
                                    <Icon name="moreV" size={12} />
                                  </button>
                                }
                              >
                                <DropdownItem
                                  leftIcon={<Icon name="edit" size={13} />}
                                  onClick={() => router.push(`/ventas/presupuestos/${q.id}/editar`)}
                                >
                                  Editar
                                </DropdownItem>
                                <DropdownItem
                                  leftIcon={<Icon name="fileText" size={13} />}
                                  onClick={async () => {
                                    const dup = await duplicate(q.id);
                                    router.push(`/ventas/presupuestos/${dup.id}/editar`);
                                  }}
                                >
                                  Duplicar
                                </DropdownItem>
                                {!["aceptado", "rechazado"].includes(q.status) && (
                                  <>
                                    <DropdownItem
                                      leftIcon={<Icon name="check" size={13} />}
                                      onClick={() => moveToStatus(q.id, "aceptado")}
                                    >
                                      Marcar aceptado
                                    </DropdownItem>
                                    <DropdownItem
                                      leftIcon={<Icon name="x" size={13} />}
                                      onClick={() => moveToStatus(q.id, "rechazado")}
                                    >
                                      Marcar rechazado
                                    </DropdownItem>
                                  </>
                                )}
                                <DropdownSeparator />
                                <DropdownItem
                                  danger
                                  leftIcon={<Icon name="trash" size={13} />}
                                  onClick={async () => {
                                    const ok = await confirm({
                                      title: "Eliminar presupuesto",
                                      message: `¿Seguro que quieres eliminar el presupuesto ${q.number}?`,
                                      danger: true,
                                    });
                                    if (ok) await remove(q.id);
                                  }}
                                >
                                  Eliminar
                                </DropdownItem>
                              </Dropdown>
                            </div>
                          </div>
                          <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>
                            {q.concept}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>
                            {cli?.name || "—"}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>
                              {q.amount.toLocaleString("es-ES", { useGrouping: "always" })} €
                            </div>
                            {!["aceptado", "rechazado"].includes(q.status) && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color:
                                    q.probability > 60
                                      ? "var(--success)"
                                      : q.probability > 40
                                      ? "var(--warning)"
                                      : "var(--text-muted)",
                                }}
                              >
                                {q.probability}%
                              </div>
                            )}
                          </div>
                          <div style={{
                            marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)",
                            fontSize: 10.5, color: "var(--text-muted)",
                            display: "flex", justifyContent: "space-between",
                          }}>
                            <span>{D.fmtShort(q.issueDate)}</span>
                            {q.status !== "aceptado" && q.status !== "rechazado" && q.expireDate && (
                              <span>Expira {D.fmtShort(q.expireDate)}</span>
                            )}
                            {q.status === "aceptado" && q.acceptedDate && (
                              <span style={{ color: "var(--success)" }}>✓ {D.fmtShort(q.acceptedDate)}</span>
                            )}
                            {q.status === "rechazado" && q.rejectedDate && (
                              <span style={{ color: "var(--error)" }}>✕ {D.fmtShort(q.rejectedDate)}</span>
                            )}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div style={{
                      padding: 16, textAlign: "center", fontSize: 11.5,
                      color: isOver ? "var(--purple)" : "var(--text-faint)",
                      border: isOver ? "1px dashed var(--purple)" : "1px dashed transparent",
                      borderRadius: 8,
                      transition: "all 140ms ease",
                    }}>
                      {isOver ? "Suelta aquí" : "Vacío"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && view === "tabla" && (
        <Card padding={0} style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--beige-bg)" }}>
                <Th>Número</Th>
                <Th>Cliente</Th>
                <Th>Concepto</Th>
                <Th>Responsable</Th>
                <Th>Emisión</Th>
                <Th>Expiración</Th>
                <Th align="right">Importe</Th>
                <Th align="right">Prob.</Th>
                <Th>Estado</Th>
                <Th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const cli = contactsMap.get(q.clientId || "");
                const owner = q.owner ? D.userById(q.owner) : null;
                const st = (D.QUOTE_STATUSES as any[]).find((s) => s.id === q.status);
                return (
                  <tr
                    key={q.id}
                    onClick={() => router.push(`/ventas/presupuestos/${q.id}`)}
                    style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                  >
                    <Td mono style={{ fontWeight: 500 }}>{q.number}</Td>
                    <Td>{cli?.name || "—"}</Td>
                    <Td muted>{q.concept}</Td>
                    <Td>{owner && <Avatar user={owner} size={22} />}</Td>
                    <Td muted>{D.fmtShort(q.issueDate)}</Td>
                    <Td muted>{q.expireDate ? D.fmtShort(q.expireDate) : "—"}</Td>
                    <Td align="right" mono style={{ fontWeight: 500 }}>{q.amount.toLocaleString("es-ES", { useGrouping: "always" })} €</Td>
                    <Td align="right" mono muted>{q.probability}%</Td>
                    <Td>
                      <Badge
                        tone={
                          q.status === "aceptado"
                            ? "success"
                            : q.status === "rechazado"
                            ? "error"
                            : q.status === "negociando"
                            ? "warning"
                            : "purple"
                        }
                      >
                        {st?.name}
                      </Badge>
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <Dropdown
                        align="end"
                        trigger={
                          <button
                            style={{ color: "var(--text-faint)", padding: 4, borderRadius: 4 }}
                            title="Acciones"
                          >
                            <Icon name="moreV" size={14} />
                          </button>
                        }
                      >
                        <DropdownItem
                          leftIcon={<Icon name="edit" size={13} />}
                          onClick={() => router.push(`/ventas/presupuestos/${q.id}/editar`)}
                        >
                          Editar
                        </DropdownItem>
                        <DropdownItem
                          leftIcon={<Icon name="fileText" size={13} />}
                          onClick={async () => {
                            const dup = await duplicate(q.id);
                            router.push(`/ventas/presupuestos/${dup.id}/editar`);
                          }}
                        >
                          Duplicar
                        </DropdownItem>
                        {!["aceptado", "rechazado"].includes(q.status) && (
                          <>
                            <DropdownItem
                              leftIcon={<Icon name="check" size={13} />}
                              onClick={() => moveToStatus(q.id, "aceptado")}
                            >
                              Marcar aceptado
                            </DropdownItem>
                            <DropdownItem
                              leftIcon={<Icon name="x" size={13} />}
                              onClick={() => moveToStatus(q.id, "rechazado")}
                            >
                              Marcar rechazado
                            </DropdownItem>
                          </>
                        )}
                        <DropdownSeparator />
                        <DropdownItem
                          danger
                          leftIcon={<Icon name="trash" size={13} />}
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Eliminar presupuesto",
                              message: `¿Seguro que quieres eliminar el presupuesto ${q.number}?`,
                              danger: true,
                            });
                            if (ok) await remove(q.id);
                          }}
                        >
                          Eliminar
                        </DropdownItem>
                      </Dropdown>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
