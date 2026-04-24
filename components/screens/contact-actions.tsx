"use client";
import { Icon } from "@/components/ui";
import {
  type Contact,
  normalizePhoneForWhatsApp,
  normalizeWebsite,
  googleMapsUrl,
} from "@/lib/db/contacts";

export interface ContactAction {
  key: string;
  label: string;
  icon: string;
  href?: string | null;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}

export function buildContactActions(
  contact: Contact,
  opts: { onMore?: () => void } = {}
): ContactAction[] {
  const wa = normalizePhoneForWhatsApp(contact.phone);
  const web = normalizeWebsite(contact.website);
  const maps = googleMapsUrl(contact);
  return [
    {
      key: "email",
      label: "Email",
      icon: "mail",
      href: contact.email ? `mailto:${contact.email}` : null,
      disabled: !contact.email,
    },
    {
      key: "call",
      label: "Llamada",
      icon: "phone",
      href: contact.phone ? `tel:${contact.phone}` : null,
      disabled: !contact.phone,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: "message",
      href: wa ? `https://wa.me/${wa}` : null,
      disabled: !wa,
    },
    {
      key: "web",
      label: "Web",
      icon: "link",
      href: web,
      disabled: !web,
    },
    {
      key: "map",
      label: "Mapa",
      icon: "pin",
      href: maps,
      disabled: !maps,
    },
    ...(opts.onMore
      ? [
          {
            key: "more",
            label: "Más",
            icon: "arrowRight",
            onClick: opts.onMore,
            primary: true,
          } as ContactAction,
        ]
      : []),
  ];
}

export function ContactActionsBar({
  actions, size = "md",
}: {
  actions: ContactAction[];
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${actions.length}, 1fr)`,
        gap: isSm ? 6 : 10,
      }}
    >
      {actions.map((a) => {
        const content = (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: isSm ? "10px 4px" : "14px 8px",
              borderRadius: 10,
              background: a.primary ? "var(--purple)" : "var(--surface)",
              border: "1px solid var(--border)",
              color: a.primary ? "#fff" : a.disabled ? "var(--text-faint)" : "var(--text)",
              cursor: a.disabled ? "not-allowed" : "pointer",
              opacity: a.disabled ? 0.45 : 1,
              transition: "all 160ms ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (a.disabled) return;
              if (a.primary) e.currentTarget.style.background = "#5A4ABD";
              else {
                e.currentTarget.style.background = "var(--beige-bg)";
                e.currentTarget.style.borderColor = "var(--border-strong)";
              }
            }}
            onMouseLeave={(e) => {
              if (a.disabled) return;
              if (a.primary) e.currentTarget.style.background = "var(--purple)";
              else {
                e.currentTarget.style.background = "var(--surface)";
                e.currentTarget.style.borderColor = "var(--border)";
              }
            }}
          >
            <div
              style={{
                width: isSm ? 32 : 36,
                height: isSm ? 32 : 36,
                borderRadius: "50%",
                background: a.primary ? "rgba(255,255,255,0.18)" : "var(--beige-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: a.primary ? "#fff" : a.disabled ? "var(--text-faint)" : "var(--purple)",
              }}
            >
              <Icon name={a.icon} size={isSm ? 14 : 16} />
            </div>
            <span
              style={{
                fontSize: isSm ? 10.5 : 11.5,
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}
            >
              {a.label}
            </span>
          </div>
        );
        if (a.disabled) return <div key={a.key}>{content}</div>;
        if (a.onClick) {
          return (
            <button
              key={a.key}
              onClick={a.onClick}
              style={{ padding: 0, background: "transparent", border: "none", textAlign: "left" }}
            >
              {content}
            </button>
          );
        }
        if (a.href) {
          return (
            <a
              key={a.key}
              href={a.href}
              target={a.href.startsWith("http") ? "_blank" : undefined}
              rel={a.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {content}
            </a>
          );
        }
        return <div key={a.key}>{content}</div>;
      })}
    </div>
  );
}
