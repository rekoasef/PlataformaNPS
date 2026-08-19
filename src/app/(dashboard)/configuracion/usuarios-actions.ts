'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import {
  createUser,
  updateUserRole,
  deleteUser,
  type UserRole,
} from '@/modules/configuracion/services/usuarios.service'
import { getUsuarioActual } from '@/lib/auth/session'

type ActionState = { error?: string; success?: boolean }

async function requireAdmin() {
  const usuario = await getUsuarioActual()
  if (usuario?.role !== 'admin') {
    throw new Error('Solo los administradores pueden gestionar usuarios.')
  }
  return usuario
}

const CreateUserSchema = z.object({
  email: z.email('Email inválido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  role: z.enum(['admin', 'rambla', 'fabrica']),
})

export async function crearUsuarioAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch (e) {
    return { error: (e as Error).message }
  }

  const result = CreateUserSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  })
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  try {
    await createUser(result.data.email, result.data.password, result.data.role)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'No se pudo crear el usuario.'
    return { error: msg }
  }

  revalidatePath('/configuracion')
  return { success: true }
}

const UpdateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'rambla', 'fabrica']),
})

export async function actualizarRolAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdmin()
    const userId = formData.get('userId') as string
    // No se puede cambiar el propio rol
    if (admin.id === userId) {
      return { error: 'No podés cambiar tu propio rol.' }
    }
  } catch (e) {
    return { error: (e as Error).message }
  }

  const result = UpdateRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  })
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  try {
    await updateUserRole(result.data.userId, result.data.role as UserRole)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo actualizar el rol.' }
  }

  revalidatePath('/configuracion')
  return { success: true }
}

export async function eliminarUsuarioAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let adminId: string
  try {
    const admin = await requireAdmin()
    adminId = admin.id
  } catch (e) {
    return { error: (e as Error).message }
  }

  const userId = formData.get('userId') as string
  if (!userId) return { error: 'Usuario inválido.' }
  if (adminId === userId) return { error: 'No podés eliminar tu propio usuario.' }

  try {
    await deleteUser(userId)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo eliminar el usuario.' }
  }

  revalidatePath('/configuracion')
  return { success: true }
}
