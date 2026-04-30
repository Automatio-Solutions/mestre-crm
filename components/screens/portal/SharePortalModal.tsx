// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { Icon, Button, Modal, useConfirm } from "@/components/ui";
import { useClientPortalAccess } from "@/lib/db/useClientPortalAccess";

/**
 * SharePortalModal — gestiona el acceso del portal de un cliente:
 *  - Asegura un registro (lo crea con 123/123 la primera vez)
 *  - Permite editar usuario/contraseña
 *  - Muestra el enlace público y permite copiarlo
 *  - Permite regenerar el token (invalidar enlaces antiguos)
 *  - Permite revocar el acceso por completo
 */
export function SharePortalModal({
  open, onClose, clientId, clientName,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}) {
  const confirm = useConfirm();
  const { access, loading, ensure, update, regenerate, remove } = useClientPortalAccess(clientId);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir: si no hay acceso, lo creamos con 123/123 por defecto
  useEffect(() => {
    if (!open || loading) return;
    if (!access) {
      ensure({ username: "123", password: "123" }).catch((e) => setError(e.message));
    } else {
      setUsername(access.username);
      setPassword(access.password);
    }
  }, [open, loading, access, ensure]);

  // Sincronizar inputs cuando cambia el access remoto
  useEffect(() => {
    if (access) {
      setUsername(access.username);
      setPassword(access.password);
    }
  }, [access]);

  const portalUrl = access
    ? (typeof window !== "undefined"
        ? `${window.location.origin}/portal/c/${access.token}`
        : `/portal/c/${access.token}`)
    : "";

  const dirty = access && (username !== access.username || password !== access.password);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await update({ username: username.trim(), password });
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: seleccionar el campo
      const el = document.getElementById("portal-url-field") as HTMLInputElement | null;
      el?.select();
    }
  };

  const handleRegenerate = async () => {
    const ok = await confirm({
      title: "Regenerar enlace",
      message: "El enlace anterior dejará de funcionar de inmediato. ¿Continuar?",
      danger: true,
      confirmLabel: "Regenerar",
    });
    if (!ok) return;
    try {
      await regenerate();
    } catch (e: any) {
      setError(e?.message || "No se pudo regenerar.");
    }
  };

  const handleRevoke = async () => {
    const ok = await confirm({
      title: "Revocar acceso",
      message: `Se eliminará el acceso al portal de "${clientName}". El cliente ya no podrá entrar con el enlace actual.`,
      danger: true,
      confirmLabel: "Revocar",
    });
    if (!ok) return;
    try {
      await remove();
      onClose();
    } catch (e: any) {
      setError(e?.message || "No se pudo revocar.");
    }
  };

  const openPreview = () => {
    if (!access) return;
    window.open(`/portal/c/${access.token}?preview=1`, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{
          padding: "16px 22px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Compartir portal</h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {clientName}
            </div>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", padding: 4 }}>
            <Icon name="close" size={15}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {loading || !access ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 20, textAlign: "center" }}>
              Preparando acceso…
            </div>
          ) : (
            <>
              {/* URL del portal */}
              <div>
                <label style={labelStyle}>Enlace del portal</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    id="portal-url-field"
                    readOnly
                    value={portalUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    style={{
                      ...inputStyle, flex: 1, fontSize: 12.5,
                      fontFamily: "ui-monospace, monospace",
                      background: "var(--beige-bg)",
                    }}
                  />
                  <Button
                    variant={copied ? "primary" : "outline"}
                    size="sm"
                    leftIcon={<Icon name={copied ? "check" : "link"} size={12}/>}
                    onClick={copyLink}
                  >
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
                  Compártelo con el cliente. Necesitará usuario y contraseña para entrar.
                </div>
              </div>

              {/* Credenciales */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Usuario</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ ...inputStyle, paddingRight: 36 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                        color: "var(--text-muted)", padding: 4,
                      }}
                      title={showPassword ? "Ocultar" : "Mostrar"}
                    >
                      <Icon name={showPassword ? "eye" : "lock"} size={13}/>
                    </button>
                  </div>
                </div>
              </div>

              {dirty && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setUsername(access.username);
                    setPassword(access.password);
                  }}>
                    Descartar
                  </Button>
                  <Button variant="primary" size="sm" onClick={save} disabled={saving || !username.trim() || !password}>
                    {saving ? "Guardando…" : "Guardar credenciales"}
                  </Button>
                </div>
              )}

              {/* Acciones secundarias */}
              <div style={{
                display: "flex", flexDirection: "column", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                background: "var(--beige-bg)",
              }}>
                <button
                  onClick={openPreview}
                  style={secondaryActionStyle}
                >
                  <Icon name="eye" size={14}/>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Acceder como cliente</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Abre el portal en otra pestaña en modo vista previa (sin login).
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleRegenerate}
                  style={secondaryActionStyle}
                >
                  <Icon name="refresh" size={14}/>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Regenerar enlace</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Invalida el enlace actual y genera uno nuevo.
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleRevoke}
                  style={{ ...secondaryActionStyle, color: "var(--error)" }}
                >
                  <Icon name="trash" size={14}/>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Revocar acceso</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      El cliente perderá el acceso al portal por completo.
                    </div>
                  </div>
                </button>
              </div>

              {error && (
                <div style={{
                  padding: "8px 12px", background: "#F5E1E1", color: "var(--error)",
                  borderRadius: 8, fontSize: 12.5,
                }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 22px", borderTop: "1px solid var(--border)",
          background: "var(--beige-bg)",
          display: "flex", justifyContent: "flex-end",
        }}>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.05em",
  display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1px solid var(--border)", borderRadius: 8,
  fontSize: 13.5, fontFamily: "inherit", background: "var(--surface)",
};

const secondaryActionStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "8px 4px", textAlign: "left", cursor: "pointer",
  background: "transparent", borderRadius: 6,
};
