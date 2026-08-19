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

export async function solicitarRecuperacionAction(
  _prevState: RecuperarState,
  formData: FormData
): Promise<RecuperarState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) return { error: 'Ingresá tu email.' }

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'

  try {
    // El mail lo manda `sendResetPassword` de la config de Better Auth.
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `${proto}://${host}/nueva-password` },
      headers: headersList,
    })
  } catch (error) {
    // Nunca se revela si el email existe o no: siempre se responde igual.
    console.error('[recuperar-password] error:', error)
  }

  return { success: true }
}
