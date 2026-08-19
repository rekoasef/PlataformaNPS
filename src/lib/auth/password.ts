import { compare as bcryptCompare } from 'bcryptjs'
import { hashPassword as hashPorDefecto, verifyPassword as verificarPorDefecto } from 'better-auth/crypto'

/**
 * Verificación de contraseñas compatible con los hashes heredados de Supabase Auth.
 *
 * Supabase hashea con bcrypt; Better Auth usa scrypt. Los 23 usuarios migrados
 * traen su hash bcrypt original, así que nadie tuvo que cambiar su contraseña,
 * pero hay que saber verificar los dos formatos.
 *
 * Las contraseñas nuevas (altas y resets) se hashean siempre con el formato
 * propio de Better Auth: bcrypt es solo de lectura, para lo que ya existía.
 */

/** bcrypt marca sus hashes con `$2a$` / `$2b$` / `$2y$`. scrypt de Better Auth no. */
export function esHashBcryptDeSupabase(hash: string): boolean {
  return /^\$2[aby]?\$/.test(hash)
}

export async function hashPassword(password: string): Promise<string> {
  return hashPorDefecto(password)
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string
  password: string
}): Promise<boolean> {
  if (esHashBcryptDeSupabase(hash)) {
    return bcryptCompare(password, hash)
  }
  return verificarPorDefecto({ hash, password })
}
