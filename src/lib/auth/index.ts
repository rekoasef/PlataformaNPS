import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { nextCookies } from 'better-auth/next-js'

import { db } from '@/lib/db/client'
import * as authSchema from '@/lib/db/auth-schema'
import { sendEmail } from '@/lib/email/send-email'
import { buildRecuperarPasswordTemplate } from '@/lib/email/templates/recuperar-password'
import { hashPassword, verifyPassword } from './password'

/** Los tres roles de la app. Reemplaza el `app_metadata.role` que venía en el JWT de Supabase. */
export const ROLES = ['admin', 'rambla', 'fabrica'] as const
export type UserRole = (typeof ROLES)[number]

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),

  emailAndPassword: {
    enabled: true,
    // Único método: no hay OAuth ni magic links en esta app.
    requireEmailVerification: false,
    minPasswordLength: 8,
    // Verifica tanto los hashes bcrypt heredados de Supabase como los propios (ver ./password.ts)
    password: { hash: hashPassword, verify: verifyPassword },
    // OJO: el template del mail dice "válido por 1 hora" en texto fijo. Coincide
    // con el default de Better Auth (3600s), pero si se cambia acá hay que
    // cambiarlo también en buildRecuperarPasswordTemplate o el mail miente.
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      const template = buildRecuperarPasswordTemplate(url)
      await sendEmail({ to: user.email, ...template })
    },
  },

  // Tablas con prefijo `auth_`: además de agrupar el subsistema, evita que la
  // tabla `user` choque con la palabra reservada de Postgres (obligaría a
  // escribirla entrecomillada en cada query suelta).
  user: {
    modelName: 'auth_user',
    additionalFields: {
      // El rol vive en la tabla de usuarios, no en el token: cambiarlo tiene
      // efecto inmediato, sin esperar a que expire una sesión.
      role: {
        type: 'string',
        required: false,
        defaultValue: 'admin',
        input: false, // nadie puede mandarse su propio rol en el signup
      },
    },
  },

  session: {
    modelName: 'auth_session',
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24,     // se renueva como mucho una vez por día
  },

  account: { modelName: 'auth_account' },
  verification: { modelName: 'auth_verification' },

  plugins: [
    // Reemplaza usuarios.service.ts: listar, crear, cambiar rol y borrar usuarios.
    admin({ adminRoles: ['admin'], defaultRole: 'admin' }),
    // Necesario para que los server actions puedan escribir la cookie de sesión.
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
