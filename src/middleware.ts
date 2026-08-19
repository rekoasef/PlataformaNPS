import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

/**
 * Guarda de rutas.
 *
 * Acá solo se mira **si hay cookie de sesión**, no se valida contra la base: el
 * middleware corre en el edge runtime, donde no hay driver de Postgres. La
 * verificación real (sesión vigente + rol) la hace cada página/action con
 * `getUsuarioActual()`, que sí consulta la base — el middleware es un filtro
 * barato de primera pasada, no la autorización.
 *
 * Por eso las reglas por rol viven en el layout del dashboard y en cada action,
 * no acá: el rol no viaja en la cookie.
 */

const RUTAS_PUBLICAS = ['/login', '/encuesta', '/nueva-password', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const esPublica = RUTAS_PUBLICAS.some((r) => pathname.startsWith(r))
  const tieneSesion = getSessionCookie(request) !== null

  if (!esPublica && !tieneSesion) {
    const destino = new URL('/login', request.url)
    return NextResponse.redirect(destino)
  }

  if (pathname === '/login' && tieneSesion) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // El layout del dashboard necesita saber qué ruta se pidió para aplicar las
  // reglas por rol; un Server Component no tiene acceso al pathname de otro modo.
  const headers = new Headers(request.headers)
  headers.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:jpg|jpeg|png|gif|webp|svg|ico)$).*)'],
}
