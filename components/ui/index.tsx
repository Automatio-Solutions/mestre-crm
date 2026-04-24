"use client";
import * as React from "react";
import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { Icon } from "./Icon";
import * as DMData from "@/lib/data";

export { Icon };

// -------- Button --------
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "purple" | "subtle" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon" | "iconSm";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  active?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  leftIcon,
  rightIcon,
  onClick,
  disabled,
  active,
  style,
  className = "",
  ...rest
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 8, fontWeight: 500, fontSize: 13,
    transition: "all 160ms ease", whiteSpace: "nowrap",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    border: "1px solid transparent",
  };
  const sizes: Record<ButtonSize, React.CSSProperties> = {
    sm: { height: 28, padding: "0 10px", fontSize: 12 },
    md: { height: 34, padding: "0 14px" },
    lg: { height: 40, padding: "0 18px", fontSize: 14 },
    icon: { height: 34, width: 34, padding: 0 },
    iconSm: { height: 28, width: 28, padding: 0 },
  };
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: "var(--black)", color: "#fff" },
    secondary: { background: "var(--beige)", color: "var(--black)", border: "1px solid var(--border-strong)" },
    ghost: { background: "transparent", color: "var(--text)" },
    outline: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" },
    purple: { background: "var(--purple)", color: "#fff" },
    subtle: { background: "var(--beige-light)", color: "var(--text)" },
    danger: { background: "transparent", color: "var(--error)", border: "1px solid #E8C7C7" },
  };
  const hoverFn = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
    if (disabled) return;
    const el = e.currentTarget;
    if (variant === "primary") el.style.background = enter ? "var(--purple)" : "var(--black)";
    if (variant === "secondary") el.style.background = enter ? "var(--beige-dark)" : "var(--beige)";
    if (variant === "ghost") el.style.background = enter ? "var(--beige-light)" : "transparent";
    if (variant === "outline") el.style.background = enter ? "var(--beige-bg)" : "var(--surface)";
    if (variant === "purple") el.style.background = enter ? "#5A4ABD" : "var(--purple)";
    if (variant === "subtle") el.style.background = enter ? "var(--beige)" : "var(--beige-light)";
  };
  return (
    <button
      className={"dm-focus " + className}
      style={{
        ...base,
        ...sizes[size],
        ...variants[variant],
        ...(active ? { background: "var(--black)", color: "#fff" } : {}),
        ...style,
      }}
      onMouseEnter={(e) => hoverFn(e, true)}
      onMouseLeave={(e) => hoverFn(e, false)}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

// -------- Card --------
export interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: number | string;
  interactive?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

export function Card({ children, style, padding = 20, interactive = false, onClick, className = "" }: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding,
        boxShadow: "var(--shadow-sm)",
        transition: "all 160ms ease",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
      onMouseEnter={
        interactive
          ? (e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }
          : undefined
      }
      onMouseLeave={
        interactive
          ? (e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.borderColor = "var(--border)";
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title, icon, action, subtitle,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {icon && <div style={{ color: "var(--text-muted)" }}>{icon}</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      {action || (
        <button
          style={{ color: "var(--text-faint)", padding: 4, borderRadius: 6, display: "flex" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--beige-light)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-faint)";
          }}
        >
          <Icon name="more" size={16} />
        </button>
      )}
    </div>
  );
}

// -------- Badge --------
type BadgeTone = "neutral" | "beige" | "purple" | "success" | "warning" | "error" | "outline" | "dark";
export function Badge({
  children, tone = "neutral", style,
}: { children: React.ReactNode; tone?: BadgeTone; style?: React.CSSProperties }) {
  const tones: Record<BadgeTone, { bg: string; fg: string; border?: string }> = {
    neutral: { bg: "var(--beige-light)", fg: "var(--text)" },
    beige: { bg: "var(--beige)", fg: "var(--black)" },
    purple: { bg: "var(--purple-soft)", fg: "#4F42A8" },
    success: { bg: "#E8F1EA", fg: "#2F5A3D" },
    warning: { bg: "#FAF1DC", fg: "#8C6A1E" },
    error: { bg: "#F5E1E1", fg: "#8C2E2E" },
    outline: { bg: "transparent", fg: "var(--text-muted)", border: "1px solid var(--border)" },
    dark: { bg: "var(--black)", fg: "#fff" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
        background: t.bg, color: t.fg, border: t.border || "none",
        whiteSpace: "nowrap", letterSpacing: "0.01em",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// -------- Avatar --------
export function Avatar({
  user, size = 28, ring = false,
}: { user: any; size?: number; ring?: boolean }) {
  if (!user) return null;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: user.color || "#6B6B6B",
        color: "#fff", fontSize: size * 0.38, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, letterSpacing: "-0.02em",
        boxShadow: ring ? "0 0 0 2px var(--surface), 0 0 0 3px var(--border)" : "none",
      }}
    >
      {user.initials}
    </div>
  );
}

export function AvatarStack({
  userIds, size = 24, max = 3,
}: { userIds: string[]; size?: number; max?: number }) {
  const users = userIds.map(DMData.userById).filter(Boolean);
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((u: any, i: number) => (
        <div
          key={u.id}
          style={{ marginLeft: i === 0 ? 0 : -size * 0.35, border: "2px solid var(--surface)", borderRadius: "50%" }}
        >
          <Avatar user={u} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -size * 0.35, width: size, height: size, borderRadius: "50%",
            background: "var(--beige)", color: "var(--text)", fontSize: size * 0.35, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--surface)",
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

// -------- Input --------
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  leftIcon?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Input({ leftIcon, style, onFocus, onBlur, ...props }: InputProps) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {leftIcon && (
        <div style={{ position: "absolute", left: 10, color: "var(--text-faint)", pointerEvents: "none" }}>
          {leftIcon}
        </div>
      )}
      <input
        {...props}
        className="dm-focus"
        style={{
          height: 34, width: "100%", paddingLeft: leftIcon ? 32 : 12, paddingRight: 12,
          border: "1px solid var(--border)", borderRadius: 8,
          background: "var(--surface)", outline: "none",
          transition: "border-color 160ms ease, box-shadow 160ms ease",
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--purple)";
          e.target.style.boxShadow = "0 0 0 3px rgba(106,90,205,0.12)";
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--border)";
          e.target.style.boxShadow = "none";
          onBlur?.(e);
        }}
      />
    </div>
  );
}

// -------- Dropdown --------
export function Dropdown({
  trigger, children, align = "start", width = 220,
}: { trigger: React.ReactNode; children: React.ReactNode; align?: "start" | "end"; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align === "end" ? "right" : "left"]: 0,
            minWidth: width,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "var(--shadow-lg)",
            padding: 4,
            zIndex: 50,
            animation: "slideUp 120ms ease",
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children, onClick, danger, leftIcon, rightIcon,
}: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  danger?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        padding: "8px 10px", borderRadius: 6, fontSize: 13, textAlign: "left",
        color: danger ? "var(--error)" : "var(--text)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-light)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {leftIcon && <span style={{ color: "var(--text-muted)", display: "flex" }}>{leftIcon}</span>}
      <span style={{ flex: 1 }}>{children}</span>
      {rightIcon}
    </button>
  );
}

export function DropdownSeparator() {
  return <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />;
}

// -------- Tabs --------
export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}
export function Tabs({
  tabs, value, onChange, size = "md",
}: { tabs: TabItem[]; value: string; onChange: (id: string) => void; size?: "sm" | "md" }) {
  return (
    <div
      style={{
        display: "flex", gap: 2, padding: 3, background: "var(--beige-light)",
        borderRadius: 9, border: "1px solid var(--border)", width: "fit-content",
      }}
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="dm-focus"
            style={{
              padding: size === "sm" ? "5px 10px" : "6px 14px",
              borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--text)" : "var(--text-muted)",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              transition: "all 160ms ease",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {t.icon}
            {t.label}
            {t.count != null && (
              <span
                style={{
                  background: "var(--beige)", color: "var(--text)",
                  fontSize: 10.5, fontWeight: 500, padding: "1px 6px", borderRadius: 4,
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// -------- Sheet --------
export function Sheet({
  open, onClose, children, width = 560,
}: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)", animation: "fadeIn 160ms ease" }}
      />
      <div
        style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width,
          background: "var(--surface)", boxShadow: "-20px 0 60px rgba(0,0,0,0.12)",
          animation: "slideRight 220ms ease", overflow: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// -------- Modal --------
export function Modal({
  open, onClose, children, width = 720, fullscreen = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  fullscreen?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 120, display: "flex",
        alignItems: fullscreen ? "stretch" : "center", justifyContent: "center",
        padding: fullscreen ? 0 : 32,
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", animation: "fadeIn 160ms ease" }}
      />
      <div
        style={{
          position: "relative", width: fullscreen ? "100%" : width,
          maxHeight: fullscreen ? "100vh" : "92vh", height: fullscreen ? "100vh" : "auto",
          background: "var(--surface)", borderRadius: fullscreen ? 0 : 16,
          boxShadow: "var(--shadow-lg)", overflow: "hidden",
          display: "flex", flexDirection: "column",
          animation: "slideUp 220ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// -------- Tooltip --------
export function Tooltip({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
            background: "var(--black)", color: "#fff", fontSize: 11, fontWeight: 500,
            padding: "4px 8px", borderRadius: 6, whiteSpace: "nowrap", pointerEvents: "none",
            animation: "fadeIn 120ms ease", zIndex: 200,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

// -------- Empty state --------
export function EmptyState({
  icon, title, description, action, illustration,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  illustration?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      {illustration || (
        <div
          style={{
            width: 96, height: 96, borderRadius: 20, background: "var(--beige-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", marginBottom: 20,
          }}
        >
          {icon || <Icon name="inbox" size={36} stroke={1.25} />}
        </div>
      )}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.01em" }}>{title}</div>
      {description && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360, marginBottom: action ? 20 : 0, lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {action}
    </div>
  );
}

// -------- Skeleton --------
export function Skeleton({ width = "100%", height = 12, style }: { width?: number | string; height?: number | string; style?: React.CSSProperties }) {
  return <div className="skel" style={{ width, height, ...style }} />;
}

// -------- Priority flag --------
export function PriorityFlag({ priority, size = 14 }: { priority: string; size?: number }) {
  const p = DMData.PRIORITIES.find((x: any) => x.id === priority);
  if (!p) return null;
  return <Icon name="flag" size={size} style={{ color: p.color, fill: p.color + "33" }} />;
}

// -------- Status pill --------
export function StatusPill({ status }: { status: string }) {
  const s = DMData.STATUSES.find((x: any) => x.id === status);
  if (!s) return null;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "2px 8px", borderRadius: 6, fontSize: 11.5, fontWeight: 500,
        background: s.bg, color: s.color, letterSpacing: "0.01em",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {s.name}
    </span>
  );
}

// -------- Tag pill --------
export function TagPill({ tag, size = "md" }: { tag: string; size?: "sm" | "md" }) {
  const palette = (DMData.TAG_COLORS as any)[tag] || "#F0ECE2";
  return (
    <span
      style={{
        display: "inline-flex", padding: size === "sm" ? "1px 6px" : "2px 8px",
        borderRadius: 4, fontSize: size === "sm" ? 10.5 : 11, fontWeight: 500,
        background: palette, color: "var(--text)", letterSpacing: "0.01em",
      }}
    >
      {tag}
    </span>
  );
}

// -------- Spark line --------
export function Sparkline({ data, color = "var(--purple)", height = 28, width = 80 }: { data: number[]; color?: string; height?: number; width?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// -------- Progress bar --------
export function Progress({ value, max = 100, color = "var(--black)", height = 4 }: { value: number; max?: number; color?: string; height?: number }) {
  return (
    <div style={{ height, background: "var(--beige-light)", borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, (value / max) * 100)}%`,
          background: color,
          borderRadius: 999,
          transition: "width 300ms ease",
        }}
      />
    </div>
  );
}

// -------- Toaster --------
interface Toast { id: string; title: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode; duration?: number }
const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, ...t }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.duration || 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 300, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: "var(--black)", color: "#fff", padding: "12px 16px",
              borderRadius: 10, fontSize: 13, fontWeight: 500, maxWidth: 360,
              boxShadow: "var(--shadow-lg)", animation: "slideUp 220ms ease",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            {t.icon}
            <div>
              <div>{t.title}</div>
              {t.description && (
                <div style={{ fontSize: 12, color: "#bbb", fontWeight: 400, marginTop: 2 }}>{t.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// -------- Confirm (corporate dialog) --------
export { ConfirmProvider, useConfirm } from "./confirm";
export type { ConfirmOptions } from "./confirm";
