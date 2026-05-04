// @ts-nocheck
"use client";
import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as D from "@/lib/data";
import {
  Icon, Button, Card, Badge, Input, Modal, Dropdown, DropdownItem,
} from "@/components/ui";
import { usePurchases } from "@/lib/db/usePurchases";
import { useContacts } from "@/lib/db/useContacts";
import { uploadScan, deleteScan } from "@/lib/storage/expenseScans";
import type { ScanResult, ScanModel } from "@/lib/scan/types";
import { CATEGORIES_HINT } from "@/lib/scan/types";

type ItemStatus = "queued" | "uploading" | "scanning" | "review" | "saving" | "saved" | "error";
type PStatus = "borrador" | "pendiente" | "pagada" | "vencida";
type PMethod = "transferencia" | "tarjeta" | "domiciliado" | "efectivo" | "none";

interface ScanItem {
  id: string;
  file: File;
  status: ItemStatus;
  error?: string;
  // Tras subir
  storagePath?: string;
  publicUrl?: string;
  // Tras escanear
  result?: ScanResult;
  modelUsed?: string;
  // Tras crear gasto
  purchaseId?: string;
  // Edición del usuario antes de confirmar (datos del OCR)
  edited?: ScanResult;
  // Campos manuales (no vienen del OCR) — todos los campos de Gasto
  pStatus?: PStatus;
  pMethod?: PMethod;
  payDate?: string;          // ISO YYYY-MM-DD
  internalNote?: string;
  account?: string;
}

const STATUSES: { id: PStatus; name: string; color: string }[] = [
  { id: "borrador",  name: "Borrador",  color: "#9A968D" },
  { id: "pendiente", name: "Pendiente", color: "#C89B3C" },
  { id: "pagada",    name: "Pagada",    color: "#4A7C59" },
  { id: "vencida",   name: "Vencida",   color: "#B84545" },
];

const METHODS: { id: PMethod; name: string }[] = [
  { id: "transferencia", name: "Transferencia" },
  { id: "tarjeta",       name: "Tarjeta" },
  { id: "domiciliado",   name: "Domiciliado" },
  { id: "efectivo",      name: "Efectivo" },
  { id: "none",          name: "—" },
];

// Normaliza para comparar (NIF/nombre)
const normalize = (s: string | null | undefined) =>
  (s || "").replace(/[\s\-.]/g, "").toLowerCase();

function findContactMatch(contacts: any[], supplierName: string | null, supplierNif: string | null) {
  if (supplierNif) {
    const n = normalize(supplierNif);
    const byNif = contacts.find((c) => c.nif && normalize(c.nif) === n);
    if (byNif) return byNif;
  }
  if (supplierName) {
    const n = normalize(supplierName);
    const byName = contacts.find((c) => c.name && normalize(c.name) === n);
    if (byName) return byName;
  }
  return null;
}

export function EscanerScreen() {
  const router = useRouter();
  const { create: createPurchase } = usePurchases();
  const { contacts, create: createContact } = useContacts();
  const [items, setItems] = useState<ScanItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [model, setModel] = useState<ScanModel>("haiku");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const newId = () => `s-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  const updateItem = useCallback((id: string, patch: Partial<ScanItem>) => {
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const newItems: ScanItem[] = list.map((f) => ({
      id: newId(),
      file: f,
      status: "queued",
    }));
    setItems((arr) => [...newItems, ...arr]);
    if (newItems[0] && !selectedId) setSelectedId(newItems[0].id);

    // Procesar en serie para no saturar la API
    for (const it of newItems) {
      await processItem(it);
    }
  };

  const processItem = async (item: ScanItem) => {
    // 1. subir a Supabase Storage
    updateItem(item.id, { status: "uploading" });
    let upload: any;
    try {
      upload = await uploadScan(item.file);
      updateItem(item.id, {
        status: "scanning",
        storagePath: upload.path,
        publicUrl: upload.publicUrl,
      });
    } catch (e: any) {
      console.error(e);
      updateItem(item.id, { status: "error", error: e?.message || "Error al subir" });
      return;
    }

    // 2. mandar al endpoint /api/scan
    try {
      const fd = new FormData();
      fd.append("file", item.file);
      fd.append("model", model);
      const res = await fetch("/api/scan", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      updateItem(item.id, {
        status: "review",
        result: data.result,
        edited: data.result,
        modelUsed: data.modelUsed,
        // Defaults para los campos manuales del Gasto
        pStatus: "pendiente",
        pMethod: "transferencia",
        payDate: "",
        internalNote: "",
        account: "",
      });
    } catch (e: any) {
      console.error(e);
      updateItem(item.id, { status: "error", error: e?.message || "Error en el escaneo" });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const onPickClick = () => fileInputRef.current?.click();
  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selected = items.find((x) => x.id === selectedId) || null;

  // ---- editar campos del OCR ----
  const editField = (key: keyof ScanResult, value: any) => {
    if (!selected) return;
    const cur = selected.edited || selected.result;
    if (!cur) return;
    updateItem(selected.id, { edited: { ...cur, [key]: value } });
  };

  // ---- editar campos manuales (no OCR) ----
  const editMeta = (key: "pStatus" | "pMethod" | "payDate" | "internalNote" | "account", value: any) => {
    if (!selected) return;
    updateItem(selected.id, { [key]: value });
  };

  // ---- crear gasto ----
  const confirmAndCreate = async () => {
    if (!selected) return;
    const data = selected.edited || selected.result;
    if (!data) return;

    updateItem(selected.id, { status: "saving" });
    try {
      // 1) Resolver proveedor: buscar en contacts; si no existe y hay nombre, crearlo.
      let supplierId: string | null = null;
      const matched = findContactMatch(contacts, data.supplierName, data.supplierNif);
      if (matched) {
        supplierId = matched.id;
      } else if (data.supplierName && data.supplierName.trim()) {
        const newContact = await createContact({
          type: "proveedor",
          name: data.supplierName.trim(),
          nif: data.supplierNif?.trim() || null,
        });
        supplierId = newContact.id;
      }

      const issueDate = data.date ? new Date(data.date) : new Date();
      const payDate = selected.payDate ? new Date(selected.payDate) : null;
      const base = data.base ?? 0;
      const vat = data.vat ?? 0;
      const total = data.total ?? base + vat;
      const vatPct = data.vatPct ?? 21;

      const purchase = await createPurchase({
        supplierId,
        number: data.number || null,
        concept: data.concept || data.supplierName || "Escaneado",
        category: data.category || null,
        issueDate,
        payDate,
        base,
        vatPct,
        vat,
        total,
        status: selected.pStatus || "pendiente",
        paymentMethod: selected.pMethod || "transferencia",
        source: "scan",
        account: selected.account?.trim() || null,
        lines: [],
        tags: [],
        attachments: selected.publicUrl ? [selected.publicUrl] : [],
        internalNote: selected.internalNote?.trim() || null,
        docText: null,
      });

      updateItem(selected.id, { status: "saved", purchaseId: purchase.id });
    } catch (e: any) {
      console.error(e);
      updateItem(selected.id, {
        status: "review",
        error: e?.message || "Error al crear el gasto",
      });
    }
  };

  // ---- descartar (borra archivo del storage también) ----
  const discard = async () => {
    if (!selected) return;
    if (selected.storagePath) {
      try { await deleteScan(selected.storagePath); } catch (e) { console.error(e); }
    }
    setItems((arr) => arr.filter((x) => x.id !== selected.id));
    setSelectedId(null);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
            Escáner documental
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
            Sube tickets o facturas, Claude extrae los datos y los conviertes en gastos.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ModelSelector model={model} onChange={setModel}/>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? "var(--purple)" : "var(--border-strong)"}`,
          background: dragging ? "var(--purple-soft)" : "var(--beige-bg)",
          borderRadius: 14, padding: "32px 24px", textAlign: "center",
          marginBottom: 20, transition: "all 160ms",
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
          color: "var(--purple)", border: "1px solid var(--border)",
        }}>
          <Icon name="upload" size={22}/>
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 5 }}>
          Arrastra tickets o facturas aquí
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
          PDF, JPG, PNG, WEBP · hasta 15 MB · se suben a Supabase Storage y se procesan con Claude {model === "haiku" ? "Haiku 4.5" : "Sonnet 4.5"}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <Button variant="primary" size="sm" leftIcon={<Icon name="upload" size={13}/>} onClick={onPickClick}>
            Seleccionar archivos
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={onFileInput}
          style={{ display: "none" }}
        />
      </div>

      {/* Cola de archivos (a ancho completo) */}
      {items.length === 0 ? (
        <Card padding={32} style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Aún no hay archivos. Sube uno para empezar.
        </Card>
      ) : (
        <QueueList
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRetry={(it) => processItem(it)}
        />
      )}

      {/* Modal flotante grande con el panel de detalle */}
      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        width={1280}
      >
        {selected && (
          <DetailPanel
            item={selected}
            contacts={contacts}
            onEdit={editField}
            onEditMeta={editMeta}
            onConfirm={confirmAndCreate}
            onDiscard={discard}
            onClose={() => setSelectedId(null)}
            onOpenPurchase={(id) => router.push(`/compras/gastos/${id}`)}
          />
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// MODEL SELECTOR
// ============================================================
function ModelSelector({ model, onChange }: { model: ScanModel; onChange: (m: ScanModel) => void }) {
  return (
    <Dropdown
      align="end"
      trigger={
        <button style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
          border: "1px solid var(--border)", background: "var(--surface)",
        }}>
          <Icon name="sparkles" size={12}/>
          Modelo: {model === "haiku" ? "Haiku" : "Sonnet"}
          <Icon name="chevronDown" size={11} style={{ color: "var(--text-muted)" }}/>
        </button>
      }
    >
      <DropdownItem onClick={() => onChange("haiku")}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Claude Haiku 4.5</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Rápido y barato (~0,001 €). Recomendado para tickets.
          </div>
        </div>
      </DropdownItem>
      <DropdownItem onClick={() => onChange("sonnet")}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Claude Sonnet 4.5</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Más preciso (~0,01 €). Para facturas complejas.
          </div>
        </div>
      </DropdownItem>
    </Dropdown>
  );
}

// ============================================================
// QUEUE LIST (izquierda)
// ============================================================
function QueueList({
  items, selectedId, onSelect, onRetry,
}: {
  items: ScanItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: (it: ScanItem) => void;
}) {
  return (
    <Card padding={0} style={{ overflow: "hidden", height: "fit-content" }}>
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
        fontSize: 12.5, fontWeight: 500, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        En cola ({items.length})
      </div>
      {items.map((it) => {
        const meta = STATUS_META[it.status];
        const isSelected = selectedId === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", width: "100%", textAlign: "left",
              borderBottom: "1px solid var(--border)",
              background: isSelected ? "var(--beige-bg)" : "transparent",
              cursor: "pointer",
            }}
          >
            <FileThumb file={it.file} url={it.publicUrl} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 500,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {it.file.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {(it.file.size / 1024).toFixed(1)} KB
              </div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Badge tone={meta.tone}>
                  {(it.status === "uploading" || it.status === "scanning" || it.status === "saving") && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "currentColor", display: "inline-block",
                      marginRight: 4, animation: "pulse 1.2s infinite",
                    }}/>
                  )}
                  {meta.label}
                </Badge>
                {it.status === "error" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRetry(it); }}
                    style={{ fontSize: 11, color: "var(--purple)", textDecoration: "underline" }}
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </Card>
  );
}

// ============================================================
// DETAIL PANEL (derecha)
// ============================================================
function DetailPanel({
  item, contacts, onEdit, onEditMeta, onConfirm, onDiscard, onClose, onOpenPurchase,
}: {
  item: ScanItem;
  contacts: any[];
  onEdit: (k: keyof ScanResult, v: any) => void;
  onEditMeta: (k: "pStatus" | "pMethod" | "payDate" | "internalNote" | "account", v: any) => void;
  onConfirm: () => void;
  onDiscard: () => void;
  onClose: () => void;
  onOpenPurchase: (id: string) => void;
}) {
  const data = item.edited || item.result;
  const supplierMatch = data ? findContactMatch(contacts, data.supplierName, data.supplierNif) : null;

  // Estados intermedios
  if (item.status === "queued" || item.status === "uploading" || item.status === "scanning") {
    return (
      <SimpleStateLayout onClose={onClose}>
        <div style={{
          padding: "100px 24px", textAlign: "center",
          color: "var(--text-muted)", fontSize: 14,
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>
            {item.status === "queued" ? "⏳" : item.status === "uploading" ? "📤" : "🔍"}
          </div>
          {STATUS_META[item.status].label}…
        </div>
      </SimpleStateLayout>
    );
  }

  if (item.status === "error") {
    return (
      <SimpleStateLayout onClose={onClose}>
        <div style={{ padding: 32, background: "#FAF1F1" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Icon name="alert" size={20} style={{ color: "var(--error)", flexShrink: 0, marginTop: 2 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--error)" }}>Algo salió mal</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                {item.error || "Error desconocido"}
              </div>
              <div style={{ marginTop: 12 }}>
                <Button variant="ghost" size="sm" onClick={onDiscard}>Descartar</Button>
              </div>
            </div>
          </div>
        </div>
      </SimpleStateLayout>
    );
  }

  if (item.status === "saved") {
    return (
      <SimpleStateLayout onClose={onClose}>
        <div style={{ padding: "60px 28px", textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#E8F1EA", color: "var(--success)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px",
          }}>
            <Icon name="check" size={30} stroke={2.5}/>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Gasto creado</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            El archivo se guardó y aparece en Compras.
          </div>
          <Button variant="primary" onClick={() => item.purchaseId && onOpenPurchase(item.purchaseId)}>
            Abrir gasto
          </Button>
        </div>
      </SimpleStateLayout>
    );
  }

  // status === "review" o "saving"
  if (!data) return null;
  const isSaving = item.status === "saving";

  return (
    <div style={{ display: "flex", flexDirection: "column", maxHeight: "92vh" }}>
      <div style={{
        padding: "16px 22px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.file.name}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span>Datos extraídos · revisa y confirma</span>
            {item.modelUsed && (
              <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>· {item.modelUsed}</span>
            )}
            {data.confidence != null && (
              <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>
                · confianza {Math.round(data.confidence * 100)}%
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={isSaving}>
            Descartar
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="check" size={12}/>}
            onClick={onConfirm}
            disabled={isSaving}
          >
            {isSaving ? "Creando…" : "Confirmar y crear gasto"}
          </Button>
          <button
            onClick={onClose}
            title="Cerrar"
            style={{
              padding: 6, color: "var(--text-muted)",
              borderRadius: 6,
              display: "inline-flex", alignItems: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="close" size={15}/>
          </button>
        </div>
      </div>

      {/* Avisos */}
      {data.warnings && data.warnings.length > 0 && (
        <div style={{
          padding: "10px 20px", background: "#FAF1DC", borderBottom: "1px solid var(--border)",
          fontSize: 12, color: "#8C6A1E",
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <Icon name="alert" size={13} style={{ marginTop: 1, flexShrink: 0 }}/>
          <div>
            <b style={{ fontWeight: 600 }}>Avisos del escaneo:</b>{" "}
            {data.warnings.join(" · ")}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 0, minHeight: 0, flex: 1, overflow: "hidden" }}>
        {/* Preview del documento */}
        <div style={{
          borderRight: "1px solid var(--border)",
          background: "var(--beige-bg)",
          padding: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "auto",
        }}>
          {item.publicUrl && (
            item.file.type === "application/pdf" ? (
              <iframe
                src={item.publicUrl}
                style={{ width: "100%", height: "100%", minHeight: 720, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}
                title="Documento"
              />
            ) : (
              <img
                src={item.publicUrl}
                alt="Documento"
                style={{ maxWidth: "100%", maxHeight: "calc(92vh - 140px)", borderRadius: 8, boxShadow: "var(--shadow-sm)" }}
              />
            )
          )}
        </div>

        {/* Formulario editable (scroll propio) */}
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          {/* Proveedor con badge de coincidencia */}
          <Field label="Proveedor">
            <Input
              value={data.supplierName || ""}
              onChange={(e) => onEdit("supplierName", e.target.value)}
              placeholder="Nombre del proveedor"
            />
            {data.supplierName && (
              <div style={{ marginTop: 4 }}>
                {supplierMatch ? (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, color: "var(--success)",
                    background: "#E8F1EA",
                    padding: "2px 8px", borderRadius: 999,
                  }}>
                    <Icon name="check" size={10}/> Coincide con: {supplierMatch.name}
                  </span>
                ) : (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, color: "var(--purple)",
                    background: "var(--purple-soft)",
                    padding: "2px 8px", borderRadius: 999,
                  }}>
                    <Icon name="plus" size={10}/> Se creará nuevo proveedor al confirmar
                  </span>
                )}
              </div>
            )}
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="NIF/CIF">
              <Input
                value={data.supplierNif || ""}
                onChange={(e) => onEdit("supplierNif", e.target.value)}
                placeholder="B12345678"
              />
            </Field>
            <Field label="Nº factura/ticket">
              <Input
                value={data.number || ""}
                onChange={(e) => onEdit("number", e.target.value)}
                placeholder="—"
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Fecha emisión">
              <Input
                type="date"
                value={data.date || ""}
                onChange={(e) => onEdit("date", e.target.value)}
              />
            </Field>
            <Field label="Categoría">
              <CategorySelect value={data.category || ""} onChange={(v) => onEdit("category", v)} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <Field label="Base">
              <Input
                type="number"
                step="0.01"
                value={data.base ?? ""}
                onChange={(e) => onEdit("base", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>
            <Field label="IVA %">
              <Input
                type="number"
                value={data.vatPct ?? ""}
                onChange={(e) => onEdit("vatPct", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>
            <Field label="IVA €">
              <Input
                type="number"
                step="0.01"
                value={data.vat ?? ""}
                onChange={(e) => onEdit("vat", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>
            <Field label="Total">
              <Input
                type="number"
                step="0.01"
                value={data.total ?? ""}
                onChange={(e) => onEdit("total", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>
          </div>

          {/* Sección Estado y pago */}
          <SectionDivider label="Estado y pago"/>
          <Field label="Estado">
            <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 7, border: "1px solid var(--border)" }}>
              {STATUSES.map((s) => {
                const active = (item.pStatus || "pendiente") === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onEditMeta("pStatus", s.id)}
                    style={{
                      flex: 1, padding: "6px 8px", borderRadius: 5,
                      fontSize: 12, fontWeight: 500,
                      background: active ? "var(--surface)" : "transparent",
                      color: active ? "var(--text)" : "var(--text-muted)",
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }}/>
                    {s.name}
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Método de pago">
              <MethodSelect value={item.pMethod || "transferencia"} onChange={(v) => onEditMeta("pMethod", v)}/>
            </Field>
            <Field label="Fecha de pago">
              <Input
                type="date"
                value={item.payDate || ""}
                onChange={(e) => onEditMeta("payDate", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Cuenta contable">
            <Input
              value={item.account || ""}
              onChange={(e) => onEditMeta("account", e.target.value)}
              placeholder="Ej. 600, 629, 622…"
            />
          </Field>

          {/* Sección Concepto y notas */}
          <SectionDivider label="Concepto y notas"/>
          <Field label="Concepto">
            <Input
              value={data.concept || ""}
              onChange={(e) => onEdit("concept", e.target.value)}
              placeholder="Descripción breve"
            />
          </Field>
          <Field label="Nota interna">
            <textarea
              value={item.internalNote || ""}
              onChange={(e) => onEditMeta("internalNote", e.target.value)}
              placeholder="Notas privadas (no visibles para el proveedor)"
              style={{
                width: "100%", minHeight: 60, padding: "8px 10px",
                border: "1px solid var(--border)", borderRadius: 7,
                fontSize: 13, fontFamily: "inherit", background: "var(--surface)",
                resize: "vertical",
              }}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

// Layout reutilizable para los estados intermedios (queued/uploading/scanning/error/saved)
function SimpleStateLayout({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", maxHeight: "92vh" }}>
      <div style={{
        padding: "12px 22px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
      }}>
        <button
          onClick={onClose}
          title="Cerrar"
          style={{ padding: 6, color: "var(--text-muted)", borderRadius: 6 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Icon name="close" size={15}/>
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
    </div>
  );
}

// ============================================================
// HELPERS UI
// ============================================================
const STATUS_META: Record<ItemStatus, { label: string; tone: any }> = {
  queued:    { label: "En cola",    tone: "outline" },
  uploading: { label: "Subiendo",   tone: "purple" },
  scanning:  { label: "Procesando", tone: "purple" },
  review:    { label: "Revisar",    tone: "warning" },
  saving:    { label: "Creando",    tone: "purple" },
  saved:     { label: "Guardado",   tone: "success" },
  error:     { label: "Error",      tone: "error" },
};

function FileThumb({ file, url }: { file: File; url?: string }) {
  if (file.type.startsWith("image/") && url) {
    return (
      <div style={{
        width: 36, height: 44, borderRadius: 4,
        background: `url(${url}) center/cover var(--beige)`,
        flexShrink: 0,
      }}/>
    );
  }
  const ext = (file.name.split(".").pop() || "FILE").slice(0, 4).toUpperCase();
  return (
    <div style={{
      width: 36, height: 44, borderRadius: 4,
      background: "var(--beige)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--text-muted)", flexShrink: 0,
      fontSize: 9, fontWeight: 600,
    }}>
      {ext}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{
        fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      marginTop: 6, marginBottom: -2,
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
    </div>
  );
}

function MethodSelect({ value, onChange }: { value: PMethod; onChange: (v: PMethod) => void }) {
  const cur = METHODS.find((m) => m.id === value) || METHODS[0];
  return (
    <Dropdown
      align="start"
      trigger={
        <button style={{
          width: "100%", padding: "8px 12px",
          border: "1px solid var(--border)", borderRadius: 7,
          background: "var(--surface)", fontSize: 13, fontFamily: "inherit",
          textAlign: "left",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{cur.name}</span>
          <Icon name="chevronDown" size={11} style={{ color: "var(--text-muted)" }}/>
        </button>
      }
    >
      {METHODS.map((m) => (
        <DropdownItem key={m.id} onClick={() => onChange(m.id)}>
          {m.name}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Dropdown
      align="start"
      trigger={
        <button style={{
          width: "100%", padding: "8px 12px",
          border: "1px solid var(--border)", borderRadius: 7,
          background: "var(--surface)", fontSize: 13, fontFamily: "inherit",
          textAlign: "left",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={value ? {} : { color: "var(--text-faint)" }}>
            {value || "Sin categoría"}
          </span>
          <Icon name="chevronDown" size={11} style={{ color: "var(--text-muted)" }}/>
        </button>
      }
    >
      {CATEGORIES_HINT.map((c) => (
        <DropdownItem key={c} onClick={() => onChange(c)}>
          {c}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
