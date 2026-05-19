"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { TweaksPanel, Tweaks } from "./TweaksPanel";
import { Button, Card, Icon, ToastProvider, ConfirmProvider } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";
import { NAV, isNavItem, NavItemDef, scopeForPath } from "./nav";

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
  const isLoginPage = pathname === "/login";
  const isCleanLayout = isPublicPortal || isLoginPage;

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

  // Layout limpio sin sidebar/header de la agencia:
  //  - Portal público de cliente (/portal/c/...)
  //  - Pantalla de login (/login)
  if (isCleanLayout) {
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
      <AuthProvider>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Header onOpenCmd={() => setCmdOpen(true)} />
          <main style={{ flex: 1, minHeight: 0 }}>
            <ScopeGuard>{children}</ScopeGuard>
          </main>
        </div>
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      </div>
      </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

// ============================================================
// ScopeGuard — bloquea acceso a rutas fuera del scope del usuario
// ============================================================
function ScopeGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, loading, hasScope } = useAuth();

  // Mientras cargamos la sesión, dejamos renderizar (el contenido tiene sus
  // propios loading states; el middleware ya garantiza que hay cookie).
  if (loading || !user) return <>{children}</>;

  const required = scopeForPath(pathname);
  if (!required) return <>{children}</>;     // ruta sin scope (no debería pasar)
  if (hasScope(required)) return <>{children}</>;

  // Sin permiso → encontrar primera sección que sí pueda ver
  const firstAllowed = NAV
    .filter((n): n is NavItemDef => isNavItem(n))
    .find((i) => hasScope(i.scope));

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "calc(100vh - 64px)", padding: 24,
    }}>
      <Card padding={32} style={{ maxWidth: 460, textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 56, height: 56, borderRadius: 14,
          background: "#F5E1E1", color: "var(--error)",
          marginBottom: 18,
        }}>
          <Icon name="lock" size={26} />
        </div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Sin acceso a esta sección</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, marginBottom: 22, lineHeight: 1.5 }}>
          Tu usuario no tiene permiso para ver <b style={{ color: "var(--text)" }}>{pathname}</b>.
          Si crees que es un error, contacta con un administrador para que ajuste tus permisos.
        </p>
        {firstAllowed && (
          <Button
            variant="primary"
            leftIcon={<Icon name={firstAllowed.icon} size={13} />}
            onClick={() => router.push(firstAllowed.path)}
          >
            Ir a {firstAllowed.label}
          </Button>
        )}
      </Card>
    </div>
  );
}
