/**
 * Middleware de autenticación de la agencia.
 *
 * Bloquea el acceso a cualquier ruta del CRM si no hay cookie `agency_session`.
 * Excepciones (rutas públicas):
 *   - /login                 → la pantalla de login
 *   - /api/auth/*            → endpoints de login/logout
 *   - /portal/c/*            → portal del cliente (auth propia con token)
 *
 * Si no hay sesión y la ruta es protegida → redirige a /login?next=<path original>
 */
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
];

const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/portal/c/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ruta pública por path exacto
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Ruta pública por prefijo
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ¿Hay sesión?
  const session = request.cookies.get("agency_session");
  if (session?.value) {
    return NextResponse.next();
  }

  // No hay sesión: redirigir a /login conservando la ruta original como ?next=
  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Excluye:
     *  - _next/static (assets compilados)
     *  - _next/image  (imágenes optimizadas)
     *  - favicons (icon.png, apple-icon.png)
     *  - manifest, robots.txt, sitemap.xml
     *  - rutas terminadas en .svg, .png, .jpg, .webp (imágenes públicas en /public)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
