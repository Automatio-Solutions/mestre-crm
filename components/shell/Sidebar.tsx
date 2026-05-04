"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Icon, Avatar, Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui";
import { LogoIcon } from "./Logo";
import { NAV, isNavItem, NavChild, NavItemDef } from "./nav";
import * as DMData from "@/lib/data";

export function Sidebar({
  collapsed, setCollapsed,
}: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    ventas: true, compras: false, contabilidad: false,
  });
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const activeParent = NAV.find(
    (n): n is NavItemDef => isNavItem(n) && !!n.children && pathname.startsWith(n.path) && pathname !== n.path
  )?.id;
  useEffect(() => {
    if (activeParent) setExpanded((e) => ({ ...e, [activeParent]: true }));
  }, [activeParent]);

  const setRoute = (p: string) => router.push(p);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    // Hard refresh para limpiar caches y forzar redirect al login
    window.location.href = "/login";
  };

  function NavItem({ item }: { item: NavItemDef }) {
    const hasChildren = !!item.children?.length;
    const open = expanded[item.id];
    const active = item.path === pathname || (hasChildren && pathname.startsWith(item.path + "/") && !open);
    const activeChild = hasChildren && pathname.startsWith(item.path);
    return (
      <>
        <button
          onClick={() => {
            if (hasChildren && !collapsed) toggle(item.id);
            else setRoute(item.path);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: collapsed ? "9px 0" : "8px 10px",
            borderRadius: 7, fontSize: 13, fontWeight: active ? 500 : 450,
            justifyContent: collapsed ? "center" : "flex-start",
            color: active ? "var(--beige)" : activeChild ? "var(--black)" : "var(--text)",
            background: active ? "var(--black)" : "transparent",
            transition: "all 160ms ease", marginBottom: 1,
          }}
          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--beige-dark)"; }}
          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
        >
          {item.icon && <Icon name={item.icon} size={16} />}
          {!collapsed && <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>}
          {!collapsed && hasChildren && (
            <Icon name={open ? "chevronUp" : "chevronDown"} size={14} style={{ opacity: 0.5 }} />
          )}
        </button>
        {hasChildren && open && !collapsed && (
          <div style={{ marginBottom: 4 }}>
            {item.children!.map((c: NavChild) => {
              const ca = pathname === c.path;
              return (
                <button
                  key={c.id}
                  onClick={() => setRoute(c.path)}
                  style={{
                    display: "flex", alignItems: "center", width: "100%",
                    padding: "6px 10px 6px 36px", borderRadius: 7,
                    fontSize: 12.5, color: ca ? "var(--black)" : "var(--text)",
                    fontWeight: ca ? 500 : 400,
                    background: ca ? "rgba(0,0,0,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!ca) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
                  onMouseLeave={(e) => { if (!ca) e.currentTarget.style.background = "transparent"; }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  const items = NAV.filter((n): n is NavItemDef => isNavItem(n));
  const gestion = items.filter((i) => !i.section);
  const proyectos = items.filter((i) => i.section === "proyectos");

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240, flexShrink: 0,
        background: "var(--beige)", color: "var(--black)",
        display: "flex", flexDirection: "column",
        borderRight: "1px solid var(--border-strong)",
        transition: "width 220ms ease",
        position: "sticky", top: 0, height: "100vh", zIndex: 20,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "18px 0" : "18px 16px", minHeight: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoIcon size={26} />
          {!collapsed && (
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>MESTRE</span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{ color: "var(--text-muted)", padding: 4, borderRadius: 6 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--beige-dark)";
              e.currentTarget.style.color = "var(--black)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Icon name="sidebar" size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflow: "auto", padding: collapsed ? "4px 8px" : "4px 10px" }}>
        {!collapsed && (
          <div
            style={{
              fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
              letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 10px 6px",
            }}
          >
            Gestión
          </div>
        )}
        {gestion.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
        {!collapsed && (
          <div
            style={{
              fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
              letterSpacing: "0.08em", textTransform: "uppercase", padding: "16px 10px 6px",
            }}
          >
            Proyectos
          </div>
        )}
        {proyectos.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </nav>

      {/* Workspace + User */}
      <div style={{ borderTop: "1px solid var(--border-strong)", padding: collapsed ? 8 : 10 }}>
        {!collapsed && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              borderRadius: 8, background: "rgba(0,0,0,0.04)", marginBottom: 8, cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 28, height: 28, borderRadius: 7, background: "var(--black)",
                color: "var(--beige)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
              }}
            >
              DM
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Dani Mestre</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Workspace</div>
            </div>
            <Icon name="chevronDown" size={14} style={{ color: "var(--text-muted)" }} />
          </div>
        )}
        <Dropdown
          align="start"
          trigger={
            <button
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: collapsed ? 6 : "6px 10px", borderRadius: 8,
                justifyContent: collapsed ? "center" : "flex-start", cursor: "pointer",
                background: "transparent", border: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Avatar user={DMData.USERS[0]} size={26} />
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Dani Mestre</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>dani@mestre.co</div>
                </div>
              )}
              {!collapsed && <Icon name="chevronUp" size={14} style={{ color: "var(--text-muted)" }} />}
            </button>
          }
        >
          <DropdownItem leftIcon={<Icon name="settings" size={13} />}>
            Ajustes
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            danger
            leftIcon={<Icon name="x" size={13} />}
            onClick={logout}
          >
            Cerrar sesión
          </DropdownItem>
        </Dropdown>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{
              display: "flex", justifyContent: "center", width: "100%",
              padding: 8, marginTop: 6, color: "var(--text-muted)", borderRadius: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="sidebar" size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
