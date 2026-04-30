// @ts-nocheck
"use client";
import { useEffect, useMemo, useState } from "react";
import * as D from "@/lib/data";
import { Icon, Button, Card, Badge, AvatarStack, PriorityFlag } from "@/components/ui";
import { fetchAccessByToken, touchLastLogin } from "@/lib/db/clientPortalAccess";
import { useClientSpaces } from "@/lib/db/useClientSpaces";
import { useTasks } from "@/lib/db/useTasks";

const SESSION_KEY = (token: string) => `portal_session_${token}`;

type View = "tareas" | "proyectos";

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
        // ¿sesión guardada?
        if (typeof window !== "undefined") {
          const saved = window.localStorage.getItem(SESSION_KEY(token));
          if (saved) setAuthed(true);
        }
        // Modo preview (solo desde la agencia, salta el login)
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

  // ---- estados de pantalla ----
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
      // Pequeño delay para evitar feeling de spam-click
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
// CONTENIDO (tras login)
// ============================================================
function PortalContent({
  clientId, preview, onLogout,
}: {
  clientId: string;
  preview: boolean;
  onLogout: () => void;
}) {
  const [view, setView] = useState<View>("tareas");
  const { spaces, loading: spacesLoading } = useClientSpaces();
  const { tasks: allTasks, loading: tasksLoading, update: updateTaskDB } = useTasks();
  const c = spaces.find((s) => s.id === clientId);

  const tasks = useMemo(
    () => allTasks.filter((t) => t.clientId === clientId && !t.customFields?.archived),
    [allTasks, clientId]
  );

  const updateTask = (id: string, patch: any) =>
    updateTaskDB(id, patch).catch((e) => console.error(e));

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

  // Columnas del dashboard
  const columns = [
    { id: "todo",  targetStatus: "todo",  title: "Por hacer",  color: "#9A968D", tasks: tasks.filter((t) => t.status === "todo") },
    { id: "doing", targetStatus: "doing", title: "En proceso", color: "#6A5ACD", tasks: tasks.filter((t) => t.status === "doing" || t.status === "review") },
    { id: "done",  targetStatus: "done",  title: "Terminadas", color: "#4A7C59", tasks: tasks.filter((t) => t.status === "done") },
  ];
  const totalAbiertas = columns[0].tasks.length + columns[1].tasks.length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Cabecera */}
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
          {([
            { id: "tareas", label: "Mis tareas" },
            { id: "proyectos", label: "Proyectos" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 500,
                background: view === t.id ? "var(--surface)" : "transparent",
                color: view === t.id ? "var(--text)" : "var(--text-muted)",
                boxShadow: view === t.id ? "var(--shadow-sm)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {preview && (
            <Badge tone="purple">
              <Icon name="eye" size={10} style={{ marginRight: 4 }}/>
              Vista previa
            </Badge>
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
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 28px 48px" }}>
        {view === "tareas" && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
                Mis tareas
              </h1>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {tasks.length} en total · {totalAbiertas} abiertas · {columns[2].tasks.length} terminadas
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {columns.map((col) => (
                <div key={col.id} style={{ background: "var(--beige-bg)", borderRadius: 12, padding: 12, minHeight: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 12px" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }}/>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{col.title}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{col.tasks.length}</span>
                  </div>
                  {col.tasks.length === 0 ? (
                    <div style={{ padding: "14px 10px", fontSize: 12, color: "var(--text-faint)" }}>
                      Sin tareas en esta columna.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {col.tasks.map((t) => (
                        <ClientTaskCard
                          key={t.id}
                          task={t}
                          modules={c.modules}
                          updateTask={updateTask}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {view === "proyectos" && (
          <ProjectsView client={c} tasks={tasks} updateTask={updateTask} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// TARJETA DE TAREA (vista cliente)
// El cliente puede: marcar como hecha (toggle), abrir detalle simplificado.
// ============================================================
function ClientTaskCard({ task, modules, updateTask }: any) {
  const [openDetail, setOpenDetail] = useState(false);
  const mod = modules.find((m: any) => m.id === task.moduleId);
  const overdue = task.dueDate && task.dueDate < D.TODAY && task.status !== "done";

  const recalcProgress = (subs: any[]) => {
    if (!subs.length) return 0;
    const done = subs.filter((s) => s.done).length;
    return Math.round((done / subs.length) * 100);
  };
  const toggleDone = () =>
    updateTask(task.id, {
      status: task.status === "done" ? "todo" : "done",
      progress: task.status === "done" ? 0 : 100,
    });

  return (
    <>
      <div
        onClick={() => setOpenDetail(true)}
        style={{
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 9,
          padding: 12, cursor: "pointer", boxShadow: "var(--shadow-sm)",
          opacity: task.status === "done" ? 0.75 : 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <PriorityFlag priority={task.priority} size={12}/>
          {mod && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 12 }}>{mod.icon}</span>
              {mod.name}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.35,
          textDecoration: task.status === "done" ? "line-through" : "none",
          color: task.status === "done" ? "var(--text-muted)" : "var(--text)",
        }}>
          {task.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {task.subtasks?.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Icon name="check" size={11}/>
                {task.subtasks.filter((s: any) => s.done).length}/{task.subtasks.length}
              </span>
            )}
            {task.dueDate && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: overdue ? "var(--error)" : "inherit" }}>
                <Icon name="clock" size={11}/>
                {D.fmtShort(task.dueDate)}
              </span>
            )}
          </div>
          <AvatarStack userIds={task.assignees} size={20} max={2}/>
        </div>
      </div>

      {openDetail && (
        <ClientTaskDetail
          task={task}
          mod={mod}
          updateTask={updateTask}
          onClose={() => setOpenDetail(false)}
          onToggleDone={toggleDone}
          recalcProgress={recalcProgress}
        />
      )}
    </>
  );
}

// ============================================================
// DETALLE DE TAREA — vista cliente (panel lateral simplificado)
// El cliente puede: marcar subtareas, comentar, marcar tarea como hecha.
// NO puede: cambiar prioridad, asignados, fecha, archivar, etc.
// ============================================================
function ClientTaskDetail({ task, mod, updateTask, onClose, onToggleDone, recalcProgress }: any) {
  const [newComment, setNewComment] = useState("");
  const subtasks = task.subtasks || [];
  const comments = task.comments || [];

  const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  const toggleSub = (i: number) => {
    const subs = subtasks.map((s: any, j: number) => (j === i ? { ...s, done: !s.done } : s));
    updateTask(task.id, { subtasks: subs, progress: recalcProgress(subs) });
  };

  const sendComment = () => {
    if (!newComment.trim()) return;
    const next = [...comments, {
      id: newId("c"),
      // El cliente comenta como cliente: usamos un userId convencional
      userId: "client",
      text: newComment.trim(),
      when: new Date(),
    }];
    updateTask(task.id, { comments: next });
    setNewComment("");
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(23, 18, 12, 0.35)",
      }}/>
      <aside style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(720px, 90vw)", zIndex: 51,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "-30px 0 80px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Top bar */}
        <div style={{
          padding: "12px 22px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <button onClick={onClose} style={{ padding: 4, color: "var(--text-muted)" }}>
            <Icon name="chevronLeft" size={16}/>
          </button>
          {mod && (
            <span style={{ fontSize: 12.5, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 14 }}>{mod.icon}</span>
              {mod.name}
            </span>
          )}
          <div style={{ flex: 1 }}/>
          <Button
            variant={task.status === "done" ? "outline" : "primary"}
            size="sm"
            leftIcon={<Icon name="check" size={12}/>}
            onClick={onToggleDone}
          >
            {task.status === "done" ? "Reabrir" : "Marcar hecha"}
          </Button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "20px 28px 28px" }}>
          {/* Pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px 3px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 500,
              background: "var(--beige-bg)", border: "1px solid var(--border)",
            }}>
              <PriorityFlag priority={task.priority} size={11}/>
              {D.PRIORITIES.find((p: any) => p.id === task.priority)?.name}
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px 3px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 500,
              background: "var(--beige-bg)", border: "1px solid var(--border)",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: D.STATUSES.find((s: any) => s.id === task.status)?.color }}/>
              {D.STATUSES.find((s: any) => s.id === task.status)?.name}
            </span>
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 14,
            letterSpacing: "-0.01em", lineHeight: 1.2,
          }}>
            {task.title}
          </h1>

          {task.description && (
            <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, marginBottom: 18, whiteSpace: "pre-wrap" }}>
              {task.description}
            </div>
          )}

          {/* Subtareas */}
          {subtasks.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
              }}>
                Subtareas · {subtasks.filter((s: any) => s.done).length}/{subtasks.length}
              </div>
              {subtasks.map((s: any, i: number) => (
                <div key={s.id || i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 8px", borderRadius: 6, fontSize: 13,
                }}>
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={() => toggleSub(i)}
                    style={{ accentColor: "var(--purple)", cursor: "pointer" }}
                  />
                  <span style={{
                    flex: 1,
                    textDecoration: s.done ? "line-through" : "none",
                    color: s.done ? "var(--text-muted)" : "var(--text)",
                  }}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Adjuntos (solo lectura) */}
          {task.attachments?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
              }}>
                Archivos · {task.attachments.length}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {task.attachments.map((a: string, i: number) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 6,
                    background: "var(--beige-bg)", fontSize: 12.5,
                  }}>
                    <Icon name="paperclip" size={13} style={{ color: "var(--text-muted)" }}/>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentarios */}
          <div>
            <div style={{
              fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
            }}>
              Comentarios · {comments.length}
            </div>
            {comments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
                {comments.map((c: any) => {
                  const isClient = c.userId === "client";
                  const u = !isClient ? D.userById(c.userId) : null;
                  const when = c.when instanceof Date ? c.when : new Date(c.when);
                  return (
                    <div key={c.id} style={{ display: "flex", gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: isClient ? "var(--beige-dark)" : (u?.color || "var(--purple)"),
                        color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 600, flexShrink: 0,
                      }}>
                        {isClient ? "TÚ" : (u?.initials || "?")}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {isClient ? "Tú" : u?.name || "—"}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {D.relativeTime(when)}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{c.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ position: "relative", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario…"
                style={{
                  width: "100%", minHeight: 64, padding: "10px 12px 36px",
                  border: "none", borderRadius: 8, fontSize: 13,
                  resize: "vertical", fontFamily: "inherit",
                  background: "transparent", outline: "none",
                }}
              />
              <div style={{
                position: "absolute", right: 8, bottom: 6,
              }}>
                <Button
                  variant="primary" size="sm"
                  onClick={sendComment}
                  disabled={!newComment.trim()}
                >
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ============================================================
// PROYECTOS (módulos) DEL CLIENTE
// ============================================================
function ProjectsView({ client, tasks, updateTask }: any) {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const activeModule = client.modules.find((m: any) => m.id === activeModuleId);

  if (activeModule) {
    const moduleTasks = tasks.filter((t: any) => t.moduleId === activeModule.id);
    const columns = [
      { id: "todo",  title: "Por hacer",  color: "#9A968D", tasks: moduleTasks.filter((t: any) => t.status === "todo") },
      { id: "doing", title: "En proceso", color: "#6A5ACD", tasks: moduleTasks.filter((t: any) => t.status === "doing" || t.status === "review") },
      { id: "done",  title: "Terminadas", color: "#4A7C59", tasks: moduleTasks.filter((t: any) => t.status === "done") },
    ];

    return (
      <>
        <button
          onClick={() => setActiveModuleId(null)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, color: "var(--text-muted)", marginBottom: 12,
          }}
        >
          <Icon name="chevronLeft" size={12}/> Volver a proyectos
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <span style={{ fontSize: 26 }}>{activeModule.icon}</span>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
              {activeModule.name}
            </h1>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {moduleTasks.length} tareas
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {columns.map((col) => (
            <div key={col.id} style={{ background: "var(--beige-bg)", borderRadius: 12, padding: 12, minHeight: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 12px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }}/>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{col.title}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{col.tasks.length}</span>
              </div>
              {col.tasks.length === 0 ? (
                <div style={{ padding: "14px 10px", fontSize: 12, color: "var(--text-faint)" }}>
                  Sin tareas en esta columna.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.tasks.map((t: any) => (
                    <ClientTaskCard
                      key={t.id}
                      task={t}
                      modules={client.modules}
                      updateTask={updateTask}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 14, letterSpacing: "-0.01em" }}>
        Proyectos
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {client.modules.map((m: any) => {
          const mTasks = tasks.filter((t: any) => t.moduleId === m.id);
          const open = mTasks.filter((t: any) => t.status !== "done").length;
          return (
            <Card key={m.id} interactive padding={16} onClick={() => setActiveModuleId(m.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 20 }}>{m.icon}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m.name}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)" }}>
                <span>{mTasks.length} tareas · {open} abiertas</span>
              </div>
            </Card>
          );
        })}
        {client.modules.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--text-faint)", padding: 20 }}>
            Aún no hay proyectos.
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// HELPERS UI
// ============================================================
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
