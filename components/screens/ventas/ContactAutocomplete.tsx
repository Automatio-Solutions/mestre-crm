"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui";
import { useContacts } from "@/lib/db/useContacts";
import type { Contact } from "@/lib/db/contacts";
import { ContactFormModal } from "@/components/screens/contactos";

export function ContactAutocomplete({
  value, onChange, filterTypes,
}: {
  value: string;              // contactId
  onChange: (contactId: string) => void;
  /** Qué tipos de contacto mostrar en la lista. Default: clientes + leads. */
  filterTypes?: Array<"cliente" | "proveedor" | "lead">;
}) {
  const { contacts, create } = useContacts();
  const types = filterTypes || ["cliente", "lead"];
  const selected = contacts.find((c) => c.id === value) || null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoverIdx, setHoverIdx] = useState(0);
  const [creating, setCreating] = useState(false);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = contacts.filter((c) => types.includes(c.type as any));
    if (!q) return list.slice(0, 10);
    return list
      .filter((c) =>
        [c.name, c.nif, c.email, c.city].filter(Boolean).join(" ").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query, contacts, types]);

  useEffect(() => { setHoverIdx(0); }, [filtered.length, query]);

  useEffect(() => {
    if (!open || !inputRef.current) { setPopupPos(null); return; }
    const update = () => {
      if (!inputRef.current) return;
      const r = inputRef.current.getBoundingClientRect();
      setPopupPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 320),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const displayValue = !open && selected ? selected.name : query;

  const pick = (c: Contact) => {
    onChange(c.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const openCreate = () => {
    setCreating(true);
    setOpen(false);
  };

  const handleCreateSubmit = async (values: any) => {
    // Si solo permitimos un tipo, pre-setearlo (ej: proveedor para compras)
    const defaultType = types.length === 1 ? types[0] : values.type;
    const created = await create({ ...values, type: defaultType });
    onChange(created.id);
    setCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    const max = filtered.length;  // el "Crear nuevo" se suma aparte
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx((i) => Math.min(max, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hoverIdx < filtered.length) pick(filtered[hoverIdx]);
      else openCreate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  };

  const popup = open && popupPos && mounted
    ? createPortal(
        <div
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "fixed",
            top: popupPos.top,
            left: popupPos.left,
            width: popupPos.width,
            maxHeight: 360,
            overflow: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "var(--shadow-lg)",
            zIndex: 1000,
            padding: 4,
            animation: "slideUp 120ms ease",
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: "12px 10px", fontSize: 12, color: "var(--text-muted)" }}>
              {query ? `Sin coincidencias para "${query}"` : "Empieza a escribir para buscar"}
            </div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseEnter={() => setHoverIdx(i)}
              onClick={() => pick(c)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                background: hoverIdx === i ? "var(--beige-bg)" : "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: "var(--beige)",
                  color: "var(--text)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                }}
              >
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div
                  style={{
                    fontSize: 11.5, color: "var(--text-muted)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                >
                  {[c.nif, c.city, c.email].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10.5, padding: "2px 6px", borderRadius: 4,
                  background: c.type === "lead" ? "var(--purple-soft)" : "var(--beige-light)",
                  color: c.type === "lead" ? "#4F42A8" : "var(--text)",
                  textTransform: "capitalize",
                }}
              >
                {c.type}
              </span>
            </button>
          ))}

          {/* Separador + Crear nuevo */}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4 }}>
            <button
              type="button"
              onMouseEnter={() => setHoverIdx(filtered.length)}
              onClick={openCreate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                background: hoverIdx === filtered.length ? "var(--purple-soft)" : "transparent",
                textAlign: "left",
                cursor: "pointer",
                color: "var(--purple)",
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: "var(--purple-soft)",
                  color: "var(--purple)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="plus" size={14} />
              </div>
              <span>
                Crear nuevo contacto{query && ` "${query}"`}
              </span>
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div style={{ position: "relative", width: "100%" }}>
        <input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected && e.target.value !== selected.name) {
              // El usuario editó el nombre → deselecciona
              onChange("");
            }
          }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onKeyDown={handleKeyDown}
          placeholder={selected ? "" : "Escribe para buscar…"}
          className="dm-focus"
          style={{
            height: 34,
            width: "100%",
            padding: "0 12px",
            paddingRight: selected ? 32 : 12,
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--surface)",
            outline: "none",
            fontSize: 13.5,
          }}
        />
        {selected && !open && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setQuery("");
              inputRef.current?.focus();
            }}
            title="Quitar contacto"
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              padding: 4,
              color: "var(--text-faint)",
              borderRadius: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="x" size={11} />
          </button>
        )}
        {popup}
      </div>
      <ContactFormModal
        open={creating}
        onClose={() => setCreating(false)}
        initial={null}
        initialName={query.trim()}
        onSubmit={handleCreateSubmit}
      />
    </>
  );
}
