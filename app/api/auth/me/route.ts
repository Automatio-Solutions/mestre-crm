/**
 * GET /api/auth/me
 *
 * Devuelve el usuario actual leyendo la cookie `agency_session`.
 * Si la cookie no existe o el usuario fue desactivado: 401.
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchById, toPublic } from "@/lib/db/agencyUsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("agency_session")?.value;
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const user = await fetchById(session);
    if (!user || !user.isActive) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user: toPublic(user) });
  } catch (e: any) {
    console.error("[/api/auth/me]", e);
    return NextResponse.json(
      { ok: false, error: "Error consultando la base de datos." },
      { status: 500 }
    );
  }
}
