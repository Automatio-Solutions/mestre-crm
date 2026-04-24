"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Modal } from "./index";
import { Icon, Button } from "./index";

/**
 * Sistema de confirmación corporativo — sustituto de window.confirm().
 *
 * Uso:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "...", message: "...", danger: true });
 *   if (!ok) return;
 */

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: string;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const ConfirmCtx = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false)
);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...opts, resolve });
      }),
    []
  );

  const close = (result: boolean) => {
    if (pending) {
      pending.resolve(result);
      setPending(null);
    }
  };

  // Enter = confirmar, Esc = cancelar
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); close(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={!!pending} onClose={() => close(false)} width={440}>
        {pending && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px 0", display: "flex", gap: 14 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: pending.danger ? "#F5E1E1" : "var(--purple-soft)",
                  color: pending.danger ? "var(--error)" : "var(--purple)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={pending.icon || (pending.danger ? "alert" : "check")} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
                  {pending.title}
                </h2>
                {pending.message && (
                  <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {pending.message}
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex", justifyContent: "flex-end", gap: 8,
                padding: "16px 24px 20px", marginTop: 14,
              }}
            >
              <Button variant="ghost" onClick={() => close(false)}>
                {pending.cancelLabel || "Cancelar"}
              </Button>
              <Button
                variant={pending.danger ? "danger" : "primary"}
                onClick={() => close(true)}
                autoFocus
              >
                {pending.confirmLabel || (pending.danger ? "Eliminar" : "Confirmar")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);
