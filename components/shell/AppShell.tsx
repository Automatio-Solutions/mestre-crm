"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { TweaksPanel, Tweaks } from "./TweaksPanel";
import { ToastProvider, ConfirmProvider } from "@/components/ui";

const TWEAK_DEFAULTS: Tweaks = {
  accent: "#6A5ACD",
  beige: "#DCD1C0",
  density: "cómoda",
  sidebarCollapsed: false,
};

const STORAGE_KEY = "dm-crm-tweaks";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isPublicPortal = pathname.startsWith("/portal");

  const [collapsed, setCollapsed] = useState(TWEAK_DEFAULTS.sidebarCollapsed);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setTweaks({ ...TWEAK_DEFAULTS, ...parsed });
        if (typeof parsed.sidebarCollapsed === "boolean") setCollapsed(parsed.sidebarCollapsed);
      }
    } catch {}
  }, []);

  // ⌘K / Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // apply tweaks to root + persist
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--purple", tweaks.accent);
    r.style.setProperty("--beige", tweaks.beige);
    const densityMap: Record<Tweaks["density"], number> = {
      compacta: 0.85, cómoda: 1, amplia: 1.15,
    };
    r.style.setProperty("--density", String(densityMap[tweaks.density] || 1));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...tweaks, sidebarCollapsed: collapsed }));
    } catch {}
  }, [tweaks, collapsed]);

  const updateTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) =>
    setTweaks((t) => ({ ...t, [key]: value }));

  // Portal público de cliente: layout limpio sin sidebar/header de la agencia
  if (isPublicPortal) {
    return (
      <ToastProvider>
        <ConfirmProvider>
          <main style={{ minHeight: "100vh" }}>{children}</main>
        </ConfirmProvider>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Header onOpenCmd={() => setCmdOpen(true)} />
          <main style={{ flex: 1, minHeight: 0 }}>{children}</main>
        </div>
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
        <button
          aria-label="Abrir tweaks"
          onClick={() => setTweaksOpen((o) => !o)}
          style={{
            position: "fixed", bottom: 20, left: 20, width: 36, height: 36,
            borderRadius: 10, background: "var(--surface)",
            border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", zIndex: 250,
          }}
        >
          <span style={{ fontSize: 16 }}>⚙︎</span>
        </button>
        {tweaksOpen && (
          <TweaksPanel tweaks={tweaks} update={updateTweak} onClose={() => setTweaksOpen(false)} />
        )}
      </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
