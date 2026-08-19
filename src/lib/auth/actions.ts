'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function logoutAction() {
  // Borra la sesión de la base, no solo la cookie: un logout revoca de verdad.
  await auth.api.signOut({ headers: await headers() })
  redirect('/login')
}
