'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { APIError } from 'better-auth/api'
import { auth } from '@/lib/auth'

type State = { error?: string; success?: boolean }

export async function actualizarPasswordAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const password = (formData.get('password') as string)?.trim()
  const confirmar = (formData.get('confirmar') as string)?.trim()
  const token = (formData.get('token') as string)?.trim()

  if (!password || password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }
  if (password !== confirmar) {
    return { error: 'Las contraseñas no coinciden.' }
  }
  if (!token) {
    return { error: 'El enlace no es válido. Pedí uno nuevo desde "olvidé mi contraseña".' }
  }

  try {
    // La contraseña nueva se guarda con el formato propio de Better Auth (scrypt),
    // aunque la anterior fuera un hash bcrypt heredado de Supabase.
    await auth.api.resetPassword({ body: { newPassword: password, token }, headers: await headers() })
  } catch (error) {
    if (error instanceof APIError) {
      return { error: 'No se pudo actualizar la contraseña. El enlace puede haber expirado.' }
    }
    throw error
  }

  redirect('/login?mensaje=password_actualizado')
}
