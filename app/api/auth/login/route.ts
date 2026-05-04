/**
 * POST /api/auth/login
 *
 * Recibe { username, password } y los compara con las variables de entorno
 * AGENCY_USERNAME / AGENCY_PASSWORD (server-only, no salen al cliente).
 * Si coinciden, set-cookie `agency_session` HttpOnly por 30 días.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expectedUser = process.env.AGENCY_USERNAME;
  const expectedPass = process.env.AGENCY_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return NextResponse.json(
      { ok: false, error: "Credenciales no configuradas en el servidor." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido en el cuerpo." },
      { status: 400 }
    );
  }

  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");

  // Pequeño delay para frenar fuerza bruta amateur
  await new Promise((r) => setTimeout(r, 250));

  // Comparación case-insensitive del usuario (es un email), exacta de la contraseña
  if (
    username.toLowerCase() !== expectedUser.toLowerCase() ||
    password !== expectedPass
  ) {
    return NextResponse.json(
      { ok: false, error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("agency_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return response;
}
