"use client";
import { useMemo, useState, useEffect } from "react";
import {
  Icon, Button, Card, Badge, Input, Modal, Dropdown, DropdownItem, DropdownSeparator, EmptyState, useConfirm,
} from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { useChartOfAccounts } from "@/lib/db/useChartOfAccounts";
import type { ChartAccount, NewChartAccount, AccountType } from "@/lib/db/chartOfAccounts";
import { PGC_GROUPS, ACCOUNT_TYPES } from "@/lib/db/chartOfAccounts";

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

export function CuadroCuentasScreen() {
  const confirm = useConfirm();
  const { accounts, loading, create, update, remove } = useChartOfAccounts();

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("todos");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChartAccount | null>(null);

  const filtered = useMemo(() => {
    let r = accounts;
    if (!showInactive) r = r.filter((a) => a.active);
    if (groupFilter !== "todos") r = r.filter((a) => a.groupCode === groupFilter);
    if (typeFilter !== "todos") r = r.filter((a) => a.accountType === typeFilter);
    if (search.trim()) {
      const lq = search.toLowerCase();
      r = r.filter((a) => [a.code, a.name, a.description].filter(Boolean).join(" ").toLowerCase().includes(lq));
    }
    return r;
  }, [accounts, search, groupFilter, typeFilter, showInactive]);

  const byGroup = useMemo(() => {
    const buckets = new Map<string, ChartAccount[]>();
    accounts.filter((a) => a.active).forEach((a) => {
      const g = a.groupCode || "0";
      if (!buckets.has(g)) buckets.set(g, []);
      buckets.get(g)!.push(a);
    });
    return buckets;
  }, [accounts]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (a: ChartAccount) => { setEditing(a); setFormOpen(true); };

  const handleSubmit = async (values: NewChartAccount) => {
    if (editing) await update(editing.id, values);
    else await create(values);
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (a: ChartAccount) => {
    const ok = await confirm({
      title: "Eliminar cuenta",
      message: `¿Seguro que quieres eliminar la cuenta ${a.code} · ${a.name}? Los asientos que la usan no se eliminan, pero perderán la referencia al nombre.`,
      danger: true,
    });
    if (!ok) return;
    await remove(a.id);
  };

  const exportCSV = () => {
    const headers = ["Código", "Nombre", "Tipo", "Grupo PGC", "Cuenta padre", "Activa", "Descripción"];
    const rows = filtered.map((a) => [
      a.code, a.name, a.accountType,
      a.groupCode || "", a.parentCode || "",
      a.active ? "sí" : "no",
      a.description || "",
    ]);
    downloadCSV(`cuadro_cuentas_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>Cuadro de cuentas</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
            Catálogo maestro del Plan General Contable. Define las cuentas que después usarás en los asientos del Libro Diario.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="outline"
            leftIcon={<Icon name="download" size={14} />}
            onClick={exportCSV}
            disabled={filtered.length === 0}
          >
            Exportar
          </Button>
          <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
            Nueva cuenta
          </Button>
        </div>
      </div>

      {/* Resumen por grupos PGC */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, marginBottom: 20 }}>
        {Object.entries(PGC_GROUPS).map(([code, info]) => {
          const count = byGroup.get(code)?.length || 0;
          const active = groupFilter === code;
          return (
            <button
              key={code}
              onClick={() => setGroupFilter(active ? "todos" : code)}
              style={{
                textAlign: "left", padding: "10px 12px",
                background: active ? "var(--black)" : "var(--surface)",
                border: "1px solid " + (active ? "var(--black)" : "var(--border)"),
                color: active ? "#fff" : "var(--text)",
                borderRadius: 8, fontSize: 12, cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: 5,
                  background: active ? "rgba(255,255,255,0.15)" : "var(--beige-bg)",
                  fontWeight: 600, fontSize: 11,
                }}>{code}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{count} cuenta{count === 1 ? "" : "s"}</span>
              </div>
              <div style={{ fontWeight: 500, fontSize: 12.5, lineHeight: 1.3 }}>{info.name}</div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código, nombre…"
            leftIcon={<Icon name="search" size={14} />}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)", flexWrap: "wrap" }}>
          {[{ id: "todos", label: "Todos los tipos" }, ...ACCOUNT_TYPES.map((t) => ({ id: t.id, label: t.label }))].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: typeFilter === t.id ? "var(--surface)" : "transparent",
                color: typeFilter === t.id ? "var(--text)" : "var(--text-muted)",
                boxShadow: typeFilter === t.id ? "var(--shadow-sm)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar inactivas
        </label>
      </div>

      {/* Tabla */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Cargando cuadro de cuentas…
        </div>
      )}

      {!loading && accounts.length === 0 && (
        <EmptyState
          icon={<Icon name="book" size={28} />}
          title="Sin cuentas todavía"
          description="Carga el Plan General Contable con el seed o añade tus primeras cuentas manualmente."
          action={
            <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
              Nueva cuenta
            </Button>
          }
        />
      )}

      {!loading && accounts.length > 0 && (
        <Card padding={0} style={{ overflow: "visible" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--beige-bg)" }}>
                <Th>Código</Th>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Grupo PGC</Th>
                <Th>Cuenta padre</Th>
                <Th>Estado</Th>
                <Th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Sin resultados. Prueba con otros filtros.
                  </td>
                </tr>
              )}
              {filtered.map((a) => {
                const typeMeta = ACCOUNT_TYPES.find((t) => t.id === a.accountType);
                const groupInfo = a.groupCode ? PGC_GROUPS[a.groupCode] : null;
                return (
                  <tr
                    key={a.id}
                    onClick={() => openEdit(a)}
                    style={{ borderTop: "1px solid var(--border)", cursor: "pointer", opacity: a.active ? 1 : 0.55 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Td mono>
                      <span style={{ color: "var(--purple)", fontWeight: 500 }}>{a.code}</span>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 500 }}>{a.name}</div>
                      {a.description && (
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                          {a.description}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11.5, padding: "2px 8px", borderRadius: 999,
                        background: "var(--beige-bg)", color: "var(--text)",
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: typeMeta?.color }} />
                        {typeMeta?.label || a.accountType}
                      </span>
                    </Td>
                    <Td muted>{a.groupCode ? `${a.groupCode} · ${groupInfo?.name || ""}` : "—"}</Td>
                    <Td mono muted>{a.parentCode || "—"}</Td>
                    <Td>
                      <Badge tone={a.active ? "success" : "outline"}>
                        {a.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </Td>
                    <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Dropdown
                        align="end"
                        trigger={
                          <button style={{ color: "var(--text-faint)", padding: 4, borderRadius: 4 }} title="Acciones">
                            <Icon name="moreV" size={14} />
                          </button>
                        }
                      >
                        <DropdownItem leftIcon={<Icon name="edit" size={13} />} onClick={() => openEdit(a)}>
                          Editar
                        </DropdownItem>
                        <DropdownItem
                          leftIcon={<Icon name={a.active ? "x" : "check"} size={13} />}
                          onClick={() => update(a.id, { active: !a.active })}
                        >
                          {a.active ? "Desactivar" : "Activar"}
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem danger leftIcon={<Icon name="trash" size={13} />} onClick={() => handleDelete(a)}>
                          Eliminar
                        </DropdownItem>
                      </Dropdown>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{
            padding: "10px 16px", borderTop: "1px solid var(--border)",
            background: "var(--beige-bg)", fontSize: 11.5, color: "var(--text-muted)",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>{filtered.length} de {accounts.length} cuentas</span>
            <span>Plan General Contable español</span>
          </div>
        </Card>
      )}

      <AccountFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
        allAccounts={accounts}
      />
    </div>
  );
}

// ============================================================
// Modal Nueva / Editar cuenta
// ============================================================
function AccountFormModal({
  open, onClose, onSubmit, initial, allAccounts,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewChartAccount) => Promise<void>;
  initial: ChartAccount | null;
  allAccounts: ChartAccount[];
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("activo");
  const [groupCode, setGroupCode] = useState("");
  const [parentCode, setParentCode] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCode(initial.code);
      setName(initial.name);
      setAccountType(initial.accountType);
      setGroupCode(initial.groupCode || "");
      setParentCode(initial.parentCode || "");
      setDescription(initial.description || "");
      setActive(initial.active);
    } else {
      setCode(""); setName(""); setAccountType("activo");
      setGroupCode(""); setParentCode(""); setDescription("");
      setActive(true);
    }
    setErr(null);
  }, [open, initial]);

  // Auto-detectar grupo y tipo desde el código (si el usuario no los ha tocado)
  useEffect(() => {
    if (!code) return;
    const first = code.trim().charAt(0);
    if (/[1-9]/.test(first)) {
      setGroupCode((prev) => prev || first);
      const groupInfo = PGC_GROUPS[first];
      if (groupInfo && !initial) {
        setAccountType((prev) => prev === "activo" ? groupInfo.type : prev);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setErr("El código es obligatorio.");
    if (!name.trim()) return setErr("El nombre es obligatorio.");
    // Validar duplicado
    const dup = allAccounts.find((a) => a.code === code.trim() && a.id !== initial?.id);
    if (dup) return setErr(`Ya existe la cuenta ${dup.code} · ${dup.name}.`);

    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        accountType,
        groupCode: groupCode || null,
        parentCode: parentCode || null,
        description: description.trim() || null,
        active,
      });
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={580}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {initial ? `Editar cuenta ${initial.code}` : "Nueva cuenta"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            Cuentas del Plan General Contable. El primer dígito del código determina el grupo PGC.
          </p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 14 }}>
            <FormField label="Código *">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="572" autoFocus />
            </FormField>
            <FormField label="Nombre *">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bancos e instituciones de crédito c/c vista" />
            </FormField>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Tipo">
              <select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} style={selectStyle}>
                {ACCOUNT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Grupo PGC">
              <select value={groupCode} onChange={(e) => setGroupCode(e.target.value)} style={selectStyle}>
                <option value="">—</option>
                {Object.entries(PGC_GROUPS).map(([code, info]) => (
                  <option key={code} value={code}>{code} · {info.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Cuenta padre (código)">
            <Input value={parentCode} onChange={(e) => setParentCode(e.target.value)} placeholder="Ej: 57 para 572. Opcional." />
          </FormField>

          <FormField label="Descripción">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas o uso esperado de esta cuenta"
              style={{
                width: "100%", minHeight: 60, padding: "8px 10px",
                border: "1px solid var(--border)", borderRadius: 8,
                fontSize: 13, fontFamily: "inherit", background: "var(--surface)",
                resize: "vertical",
              }}
            />
          </FormField>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Activa (disponible para nuevos asientos)</span>
          </label>

          {err && (
            <div style={{ fontSize: 12.5, color: "var(--error)", background: "#F5E1E1", padding: "8px 12px", borderRadius: 8 }}>
              {err}
            </div>
          )}
        </div>

        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid var(--border)",
          background: "var(--beige-bg)",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear cuenta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const selectStyle: React.CSSProperties = {
  height: 34, width: "100%", padding: "0 10px",
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--surface)", outline: "none", fontSize: 13.5,
};
