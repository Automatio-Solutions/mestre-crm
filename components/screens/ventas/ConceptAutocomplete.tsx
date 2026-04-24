"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui";
import { useServices } from "@/lib/db/useServices";

export interface ConceptAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectService?: (service: any) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

/**
 * Input de texto para el "Concepto" de una línea.
 * Al escribir "@" se abre un popup con los servicios del catálogo.
 * Al seleccionar un servicio se reemplaza el @query por el nombre del servicio
 * y se dispara onSelectService para que el padre rellene precio/iva/descripción.
 *
 * El popup se renderiza en un portal (document.body) para escapar de overflow
 * de los contenedores (la tabla de líneas tiene overflow-x: auto).
 */
export function ConceptAutocomplete({
  value, onChange, onSelectService, placeholder, style,
}: ConceptAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [triggerIdx, setTriggerIdx] = useState(-1);
  const [query, setQuery] = useState("");
  const [hoverIdx, setHoverIdx] = useState(0);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { services: allServices } = useServices();
  // Solo servicios activos en el autocompletado
  const services = allServices.filter((s) => s.active);

  // Detección de "@foo" antes del cursor
  const detectTrigger = (text: string, caret: number) => {
    let i = caret - 1;
    while (i >= 0) {
      const c = text[i];
      if (c === "@") {
        if (i === 0 || /\s/.test(text[i - 1])) {
          return { at: i, query: text.slice(i + 1, caret) };
        }
        return null;
      }
      if (/\s/.test(c)) return null;
      i--;
    }
    return null;
  };

  const filtered = useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    if (!q) return services.slice(0, 8);
    return services
      .filter((s) =>
        (s.name + " " + s.category + " " + (s.description || ""))
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 8);
  }, [open, query, services]);

  useEffect(() => {
    setHoverIdx(0);
  }, [filtered.length, query]);

  // Recalcular la posición del popup siempre que abra, y al hacer scroll/resize
  useEffect(() => {
    if (!open || !inputRef.current) {
      setPopupPos(null);
      return;
    }
    const updatePos = () => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 340),
      });
    };
    updatePos();
    // true = capturar scroll en ancestros con overflow
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);
    const caret = e.target.selectionStart ?? text.length;
    const trig = detectTrigger(text, caret);
    if (trig) {
      setTriggerIdx(trig.at);
      setQuery(trig.query);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const closePopup = () => {
    setOpen(false);
    setTriggerIdx(-1);
    setQuery("");
  };

  const applyService = (svc: any) => {
    if (triggerIdx < 0 || !inputRef.current) return;
    const before = value.slice(0, triggerIdx);
    const after = value.slice(triggerIdx + 1 + query.length);
    const newValue = (before + svc.name + after).replace(/\s+$/, "") + (after.startsWith(" ") ? "" : " ");
    onChange(newValue);
    onSelectService?.(svc);
    closePopup();
    setTimeout(() => {
      const pos = (before + svc.name).length + 1;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      applyService(filtered[hoverIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePopup();
    }
  };

  const popup = open && filtered.length > 0 && popupPos && mounted
    ? createPortal(
        <div
          style={{
            position: "fixed",
            top: popupPos.top,
            left: popupPos.left,
            width: popupPos.width,
            maxWidth: 440,
            maxHeight: 320,
            overflow: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "var(--shadow-lg)",
            zIndex: 1000,
            padding: 4,
            animation: "slideUp 120ms ease",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div
            style={{
              padding: "6px 10px 4px",
              fontSize: 10.5,
              color: "var(--text-muted)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Servicios {query && <span style={{ color: "var(--text-faint)" }}>· "{query}"</span>}
          </div>
          {filtered.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseEnter={() => setHoverIdx(i)}
              onClick={() => applyService(s)}
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
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "var(--purple-soft)",
                  color: "var(--purple)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="sparkles" size={13} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.category} · {s.description}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                }}
              >
                {s.price.toLocaleString("es-ES", { useGrouping: "always" })} €
              </div>
            </button>
          ))}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              padding: "6px 10px",
              fontSize: 10.5,
              color: "var(--text-faint)",
              display: "flex",
              gap: 12,
            }}
          >
            <span><kbd style={kbd}>↑↓</kbd> navegar</span>
            <span><kbd style={kbd}>↵</kbd> seleccionar</span>
            <span><kbd style={kbd}>esc</kbd> cerrar</span>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        ref={inputRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(closePopup, 180)}
        placeholder={placeholder || "Escribe el concepto o usa @ para buscar"}
        className="dm-focus"
        style={{
          height: 34,
          width: "100%",
          padding: "0 12px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--surface)",
          outline: "none",
          fontSize: 13.5,
          ...style,
        }}
      />
      {popup}
    </div>
  );
}

const kbd: React.CSSProperties = {
  padding: "1px 5px",
  border: "1px solid var(--border)",
  borderRadius: 3,
  background: "var(--beige-bg)",
};
