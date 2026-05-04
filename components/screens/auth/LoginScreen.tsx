"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon, Button, Card } from "@/components/ui";
import { LogoIcon } from "@/components/shell/Logo";

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión, evitar quedarse "atascado" en /login
  useEffect(() => {
    // No podemos leer la cookie HttpOnly desde JS, así que simplemente
    // intentamos navegar al destino. Si no hay sesión, el middleware
    // nos rebotará otra vez aquí.
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Credenciales incorrectas.");
        return;
      }
      // Login OK → redirige al destino (o a la home)
      router.replace(next);
    } catch (e: any) {
      setError(e?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--beige-bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decoración corporativa de fondo */}
      <div style={{
        position: "absolute", top: -120, right: -120,
        width: 360, height: 360, borderRadius: "50%",
        background: "var(--beige)", opacity: 0.55,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -160, left: -160,
        width: 420, height: 420, borderRadius: "50%",
        background: "var(--purple-soft)", opacity: 0.55,
        pointerEvents: "none",
      }} />

      <form onSubmit={submit} style={{ width: 420, position: "relative", zIndex: 1 }}>
        {/* Logo + wordmark fuera del card */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, marginBottom: 22,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "var(--black)", color: "var(--beige)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "var(--shadow-sm)",
          }}>
            <LogoIcon size={26} />
          </div>
          <span style={{
            fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
            color: "var(--text)",
          }}>
            MESTRE
          </span>
        </div>

        {/* Card del formulario */}
        <Card
          padding={36}
          style={{
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Banda morada decorativa arriba */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: 3, background: "var(--purple)",
          }} />

          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em",
              color: "var(--text)",
            }}>
              Inicia sesión
            </h1>
            <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
              Accede a tu CRM
            </div>
          </div>

          {/* Campos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Email">
              <input
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={inputStyle}
              />
            </Field>

            <Field label="Contraseña">
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute", right: 8, top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)", padding: 6,
                  }}
                  title={showPassword ? "Ocultar" : "Mostrar"}
                  tabIndex={-1}
                >
                  <Icon name={showPassword ? "eye" : "lock"} size={14}/>
                </button>
              </div>
            </Field>
          </div>

          {error && (
            <div style={{
              marginTop: 14, padding: "9px 12px",
              background: "#F5E1E1", color: "var(--error)",
              borderRadius: 8, fontSize: 12.5,
              border: "1px solid #E8C5C5",
            }}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading || !email.trim() || !password}
            style={{ width: "100%", marginTop: 20, height: 42 }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </Card>

        <div style={{
          textAlign: "center", marginTop: 18,
          fontSize: 11.5, color: "var(--text-muted)",
        }}>
          ¿Problemas para acceder?{" "}
          <span style={{ color: "var(--purple)", fontWeight: 500 }}>
            Contacta con soporte
          </span>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  border: "1px solid var(--border)", borderRadius: 8,
  fontSize: 14, fontFamily: "inherit", background: "var(--surface)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{
        fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}
