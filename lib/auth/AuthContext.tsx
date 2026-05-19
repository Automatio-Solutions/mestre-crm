"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Scope =
  | "*"
  | "dashboard"
  | "contactos"
  | "ventas"
  | "compras"
  | "contabilidad"
  | "impuestos"
  | "analitica"
  | "proyectos";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  userRef: string | null;   // u1, u7… vincula a USERS de lib/data
  scopes: Scope[];
  isActive: boolean;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  /** Devuelve true si el usuario tiene ese scope (o '*' = admin). */
  hasScope: (scope: Scope) => boolean;
}

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  hasScope: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else if (res.status === 401) {
        // Cookie presente pero sin usuario válido (stale tras cambios de migración).
        // Limpiamos sesión y mandamos a login. Sólo si NO estamos ya en /login.
        setUser(null);
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
          window.location.href = "/login";
          return;
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    window.location.href = "/login";
  };

  useEffect(() => {
    refresh();
  }, []);

  const hasScope = (scope: Scope) => {
    if (!user) return false;
    if (user.scopes.includes("*")) return true;
    return user.scopes.includes(scope);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, refresh, logout, hasScope }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
