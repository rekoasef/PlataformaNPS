'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { APIError } from 'better-auth/api'
import { auth } from '@/lib/auth'

type LoginState = { error?: string }

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Ingresá tu email y contraseña.' }
  }

  try {
    // Verifica tanto los hashes bcrypt heredados de Supabase como los propios
    // (ver src/lib/auth/password.ts), así nadie tuvo que cambiar su contraseña.
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() })
  } catch (error) {
    if (error instanceof APIError) {
      return { error: 'Credenciales incorrectas. Verificá tu email y contraseña.' }
    }
    throw error
  }

  redirect('/')
}

type RecuperarState = { error?: string; success?: boolean }

/**
 * El link del mail de recuperación se arma con `BETTER_AUTH_URL`, no con el host
 * del request. Si no coinciden, el mail llega bien pero el link da 404 — un
 * síntoma que no dice nada sobre la causa. Pasa fácil en desarrollo cuando Next
 * levanta en otro puerto porque el 3000 está ocupado, y en producción si la
 * variable quedó con el dominio viejo.
 */
function avisarSiElHostNoCoincide(hostDelRequest: string | null) {
  const configurada = process.env.BETTER_AUTH_URL
  if (!configurada || !hostDelRequest) return

  const hostConfigurado = new URL(configurada).host
  if (hostConfigurado !== hostDelRequest) {
    console.warn(
      `[recuperar-password] BETTER_AUTH_URL apunta a "${hostConfigurado}" pero estás sirviendo en ` +
      `"${hostDelRequest}". El link del mail va a apuntar a "${hostConfigurado}" y probablemente dé 404. ` +
      `Corregí BETTER_AUTH_URL para que coincida.`
    )
  }
}

export async function solicitarRecuperacionAction(
  _prevState: RecuperarState,
  formData: FormData
): Promise<RecuperarState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) return { error: 'Ingresá tu email.' }

  const headersList = await headers()
  avisarSiElHostNoCoincide(headersList.get('host'))

  try {
    // `redirectTo` va **relativo** a propósito. Si se armara con el header Host,
    // la base del link (que sale de BETTER_AUTH_URL) y el callback podrían
    // apuntar a hosts distintos y el link del mail daría 404 — y además confiar
    // en el header Host para construir links habilita host-header injection:
    // un atacante manda un Host falso y la víctima recibe un link a su dominio.
    // Relativo, las dos mitades salen siempre de BETTER_AUTH_URL.
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: '/nueva-password' },
      headers: headersList,
    })
  } catch (error) {
    // Nunca se revela si el email existe o no: siempre se responde igual.
    console.error('[recuperar-password] error:', error)
  }

  return { success: true }
}
