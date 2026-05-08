/**
 * POST /api/auth/login
 *
 * Valida { email, password } contra la tabla `agency_users` de Supabase.
 * Si coincide:
 *  - actualiza `last_login_at`
 *  - set-cookie `agency_session=<id_del_usuario>` HttpOnly por 30 días
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchByEmail, touchLastLogin, toPublic } from "@/lib/db/agencyUsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido en el cuerpo." },
      { status: 400 }
    );
  }

  // Acepta `email` (preferido) o `username` por compat con la pantalla anterior
  const email = String(body?.email || body?.username || "").trim();
  const password = String(body?.password || "");

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  // Pequeño delay para frenar fuerza bruta
  await new Promise((r) => setTimeout(r, 250));

  let user;
  try {
    user = await fetchByEmail(email);
  } catch (e: any) {
    console.error("[/api/auth/login]", e);
    const detail = e?.message || e?.code || String(e);
    return NextResponse.json(
      { ok: false, error: `Error consultando la base de datos: ${detail}` },
      { status: 500 }
    );
  }

  if (!user || !user.isActive || user.password !== password) {
    return NextResponse.json(
      { ok: false, error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }

  // Actualiza last_login_at en background, no bloqueamos
  touchLastLogin(user.id).catch(() => {});

  const response = NextResponse.json({ ok: true, user: toPublic(user) });
  response.cookies.set("agency_session", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return response;
}
