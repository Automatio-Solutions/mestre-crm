// @ts-nocheck
"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon, Button, Card } from "@/components/ui";
import { fetchAccessByToken, touchLastLogin } from "@/lib/db/clientPortalAccess";
import { useClientSpaces } from "@/lib/db/useClientSpaces";
import { useTasks } from "@/lib/db/useTasks";

const SESSION_KEY = (token: string) => `portal_session_${token}`;

export function ClientPortal({ token, preview = false }: { token: string; preview?: boolean }) {
  const [access, setAccess] = useState<any>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [accessNotFound, setAccessNotFound] = useState(false);

  // 1) Cargar el acceso por token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAccess(true);
      try {
        const a = await fetchAccessByToken(token);
        if (cancelled) return;
        if (!a) {
          setAccessNotFound(true);
          return;
        }
        setAccess(a);
        if (typeof window !== "undefined") {
          const saved = window.localStorage.getItem(SESSION_KEY(token));
          if (saved) setAuthed(true);
        }
        if (preview) setAuthed(true);
      } catch (e) {
        console.error(e);
        setAccessNotFound(true);
      } finally {
        if (!cancelled) setLoadingAccess(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, preview]);

  if (loadingAccess) {
    return (
      <CenteredScreen>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando portal…</div>
      </CenteredScreen>
    );
  }

  if (accessNotFound || !access) {
    return (
      <CenteredScreen>
        <Card padding={28} style={{ width: 380, textAlign: "center" }}>
          <Icon name="lock" size={28} style={{ color: "var(--text-muted)", marginBottom: 10 }}/>
          <h1 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600 }}>Enlace no válido</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Este enlace no existe o ha sido revocado. Pídele al equipo un nuevo enlace.
          </p>
        </Card>
      </CenteredScreen>
    );
  }

  if (!authed) {
    return (
      <LoginScreen
        access={access}
        onSuccess={() => {
          window.localStorage.setItem(SESSION_KEY(token), "1");
          touchLastLogin(token).catch(() => {});
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <PortalContent
      clientId={access.clientId}
      preview={preview}
      onLogout={() => {
        window.localStorage.removeItem(SESSION_KEY(token));
        setAuthed(false);
      }}
    />
  );
}

// ============================================================
// LOGIN
// ============================================================
function LoginScreen({ access, onSuccess }: { access: any; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 200));
      if (username.trim() === access.username && password === access.password) {
        onSuccess();
      } else {
        setError("Usuario o contraseña incorrectos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredScreen>
      <form onSubmit={submit} style={{ width: 380 }}>
        <Card padding={28}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              Portal de cliente
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Inicia sesión
            </h1>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Usuario">
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
                placeholder="123"
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••"
              />
            </Field>
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: "8px 12px",
              background: "#F5E1E1", color: "var(--error)",
              borderRadius: 8, fontSize: 12.5,
            }}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading || !username.trim() || !password}
            style={{ width: "100%", marginTop: 16 }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </Card>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "var(--text-faint)" }}>
          ¿Problemas para acceder? Contacta con tu gestor.
        </div>
      </form>
    </CenteredScreen>
  );
}

// ============================================================
// CONTENIDO TRAS LOGIN — Dashboard de progreso, read-only
// ============================================================
function PortalContent({
  clientId, preview, onLogout,
}: {
  clientId: string;
  preview: boolean;
  onLogout: () => void;
}) {
  const { spaces, loading: spacesLoading } = useClientSpaces();
  const { tasks: allTasks, loading: tasksLoading } = useTasks();
  const c = spaces.find((s) => s.id === clientId);

  // Tareas vivas del cliente (excluye archivadas)
  const tasks = useMemo(
    () => allTasks.filter((t) => t.clientId === clientId && !t.customFields?.archived),
    [allTasks, clientId]
  );

  if (spacesLoading || tasksLoading) {
    return (
      <CenteredScreen>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando…</div>
      </CenteredScreen>
    );
  }
  if (!c) {
    return (
      <CenteredScreen>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Cliente no encontrado.</div>
      </CenteredScreen>
    );
  }

  // ---- Cálculos de progreso ----
  // Cada tarea aporta un valor 0..1 que combina su propio estado y el de sus subtareas.
  //   units = (task.done ? 1 : 0) + Σ(subtask.done)
  //   total = 1 + subtask.length
  //   progress = units / total
  const taskProgressFraction = (t: any): number => {
    const subs = t.subtasks || [];
    const taskUnit = t.status === "done" ? 1 : 0;
    const subDone = subs.filter((s: any) => s.done).length;
    return (taskUnit + subDone) / (1 + subs.length);
  };

  const globalProgress = tasks.length > 0
    ? tasks.reduce((s, t) => s + taskProgressFraction(t), 0) / tasks.length
    : 0;
  const globalPct = Math.round(globalProgress * 100);

  // Por proyecto (sólo proyectos con al menos 1 tarea)
  const projectProgress = c.modules
    .map((m: any) => {
      const projTasks = tasks.filter((t) => t.moduleId === m.id);
      if (projTasks.length === 0) return null;
      const avg = projTasks.reduce((s, t) => s + taskProgressFraction(t), 0) / projTasks.length;
      return {
        id: m.id,
        name: m.name,
        icon: m.icon,
        pct: Math.round(avg * 100),
      };
    })
    .filter(Boolean) as { id: string; name: string; icon: string; pct: number }[];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Cabecera limpia */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: c.color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 600,
          }}>{c.logo}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Portal de cliente</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {preview && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 999,
              background: "var(--purple-soft)", color: "var(--purple)",
              fontSize: 11, fontWeight: 500,
            }}>
              <Icon name="eye" size={10}/> Vista previa
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" size={12}/>}
            onClick={onLogout}
          >
            {preview ? "Salir" : "Cerrar sesión"}
          </Button>
        </div>
      </header>

      {/* Contenido */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 28px 56px" }}>
        {tasks.length === 0 ? (
          <EmptyDashboard message="Aún no hay tareas." />
        ) : (
          <>
            {/* Donut global */}
            <Card padding={32} style={{ marginBottom: 18, textAlign: "center" }}>
              <div style={{
                fontSize: 11, color: "var(--text-muted)",
                letterSpacing: "0.06em", textTransform: "uppercase",
                marginBottom: 18,
              }}>
                Avance global
              </div>
              <ProgressDonut pct={globalPct} />
              {globalPct === 100 && (
                <div style={{
                  marginTop: 16, fontSize: 13, color: "var(--success)",
                  fontWeight: 500,
                }}>
                  🎉 Todo terminado
                </div>
              )}
            </Card>

            {/* Por proyecto */}
            {projectProgress.length > 0 && (
              <Card padding={24}>
                <div style={{
                  fontSize: 11, color: "var(--text-muted)",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  marginBottom: 18,
                }}>
                  Por proyecto
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {projectProgress.map((p) => (
                    <ProjectBar key={p.id} project={p}/>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DONUT GLOBAL
// ============================================================
function ProgressDonut({ pct }: { pct: number }) {
  const SIZE = 180;
  const STROKE = 14;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const offset = CIRC * (1 - Math.max(0, Math.min(1, pct / 100)));
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      <svg width={SIZE} height={SIZE}>
        {/* Anillo de fondo */}
        <circle
          cx={cx} cy={cy} r={RADIUS}
          fill="none"
          stroke="var(--beige-bg)"
          strokeWidth={STROKE}
        />
        {/* Arco de progreso */}
        <circle
          cx={cx} cy={cy} r={RADIUS}
          fill="none"
          stroke="var(--purple)"
          strokeWidth={STROKE}
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        />
      </svg>
      {/* % en el centro */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
        pointerEvents: "none",
      }}>
        <div style={{
          fontSize: 38, fontWeight: 600, letterSpacing: "-0.02em",
          color: "var(--text)", lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}>
          {pct}<span style={{ fontSize: 22, fontWeight: 500 }}>%</span>
        </div>
        <div style={{
          fontSize: 11, color: "var(--text-muted)",
          marginTop: 4, letterSpacing: "0.04em",
        }}>
          completado
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BARRA POR PROYECTO
// ============================================================
function ProjectBar({ project }: { project: { id: string; name: string; icon: string; pct: number } }) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 18 }}>{project.icon}</span>
          <span style={{
            fontSize: 13.5, fontWeight: 500,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {project.name}
          </span>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums",
          color: project.pct === 100 ? "var(--success)" : "var(--text)",
        }}>
          {project.pct}%
        </span>
      </div>
      {/* Barra */}
      <div style={{
        height: 8, background: "var(--beige-bg)", borderRadius: 999,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${project.pct}%`,
          height: "100%",
          background: project.pct === 100 ? "var(--success)" : "var(--purple)",
          borderRadius: 999,
          transition: "width 600ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}/>
      </div>
    </div>
  );
}

// ============================================================
// HELPERS UI
// ============================================================
function EmptyDashboard({ message }: { message: string }) {
  return (
    <Card padding={48} style={{ textAlign: "center" }}>
      <Icon name="check" size={28} style={{ color: "var(--text-muted)", marginBottom: 12 }}/>
      <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{message}</div>
    </Card>
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

function CenteredScreen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      {children}
    </div>
  );
}
