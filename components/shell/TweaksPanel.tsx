"use client";
import { Icon } from "@/components/ui";

export interface Tweaks {
  accent: string;
  beige: string;
  density: "compacta" | "cómoda" | "amplia";
  sidebarCollapsed: boolean;
}

export function TweaksPanel({
  tweaks, update, onClose,
}: {
  tweaks: Tweaks;
  update: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", bottom: 20, right: 20, width: 320,
        background: "var(--surface)", borderRadius: 12,
        boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)",
        zIndex: 300, overflow: "hidden", animation: "slideUp 180ms",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderBottom: "1px solid var(--border)",
          background: "var(--beige-bg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="settings" size={14} style={{ color: "var(--purple)" }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Tweaks</span>
        </div>
        <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={label}>Acento</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["#6A5ACD", "#B84545", "#4A7C59", "#C89B3C", "#2F4858", "#000000"].map((c) => (
              <button
                key={c}
                onClick={() => update("accent", c)}
                style={{
                  width: 28, height: 28, borderRadius: 7, background: c,
                  border: tweaks.accent === c ? "2px solid var(--text)" : "2px solid transparent",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <div style={label}>Beige (sidebar)</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["#DCD1C0", "#E8DDC8", "#CEC2AE", "#F0E8D9", "#B9AE96"].map((c) => (
              <button
                key={c}
                onClick={() => update("beige", c)}
                style={{
                  width: 28, height: 28, borderRadius: 7, background: c,
                  border: tweaks.beige === c ? "2px solid var(--text)" : "2px solid var(--border)",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <div style={label}>Densidad</div>
          <div
            style={{
              display: "flex", gap: 4, background: "var(--beige-bg)",
              padding: 3, borderRadius: 7, border: "1px solid var(--border)",
            }}
          >
            {(["compacta", "cómoda", "amplia"] as const).map((d) => (
              <button
                key={d}
                onClick={() => update("density", d)}
                style={{
                  flex: 1, padding: "5px 8px", borderRadius: 5, fontSize: 11.5, fontWeight: 500,
                  background: tweaks.density === d ? "var(--surface)" : "transparent",
                  color: tweaks.density === d ? "var(--text)" : "var(--text-muted)",
                  boxShadow: tweaks.density === d ? "var(--shadow-sm)" : "none",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div
          style={{
            fontSize: 11, color: "var(--text-faint)",
            paddingTop: 6, borderTop: "1px solid var(--border)",
          }}
        >
          Los cambios se guardan automáticamente.
        </div>
      </div>
    </div>
  );
}

const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
};
