import { timingSafeEqual } from 'node:crypto'

/**
 * Autenticación del "agente" de WhatsApp: el `mensajes.py` que corre en la PC
 * del operador y manda los mensajes.
 *
 * No usa sesión de Better Auth porque del otro lado no hay un browser ni un
 * usuario logueado, sino un script. Va con un secreto compartido
 * (`WHATSAPP_AGENTE_TOKEN`) en un header `Authorization: Bearer`.
 *
 * Esto reemplaza a la `service_role_key` de Supabase, que hasta ahora vivía en
 * un `.env` en el escritorio del operador y daba acceso total a la base. El
 * token de acá solo abre los tres endpoints de `/api/whatsapp/agente/*`.
 */

/** Compara sin filtrar por tiempo cuántos caracteres coinciden. */
function igualesEnTiempoConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  // timingSafeEqual explota si los largos difieren, así que eso se chequea
  // antes — el largo del token no es lo que hay que proteger.
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * `true` si el request trae el token del agente.
 *
 * Si `WHATSAPP_AGENTE_TOKEN` no está configurado devuelve `false` siempre: sin
 * secreto, los endpoints quedan cerrados en vez de abiertos.
 */
export function esAgenteAutorizado(request: Request): boolean {
  const esperado = process.env.WHATSAPP_AGENTE_TOKEN
  if (!esperado) return false

  const header = request.headers.get('authorization') ?? ''
  const [esquema, valor] = header.split(' ')
  if (esquema?.toLowerCase() !== 'bearer' || !valor) return false

  return igualesEnTiempoConstante(valor, esperado)
}
