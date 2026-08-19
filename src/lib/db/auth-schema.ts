import { boolean, index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

/**
 * Tablas de Better Auth. Escritas a mano (no por `drizzle-kit pull`) para que
 * regenerar el schema principal no las pise, y al revés.
 *
 * Fuente de verdad del SQL: `supabase/migrations/20260819000000_better_auth_tables.sql`.
 * Si se cambia una, cambiar la otra.
 */

export const authUser = pgTable('auth_user', {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  role: text().default('admin').notNull(),
  banned: boolean().default(false).notNull(),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true, mode: 'date' }),
}, (table) => [
  unique('auth_user_email_key').on(table.email),
])

export const authSession = pgTable('auth_session', {
  id: text().primaryKey().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  token: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
  impersonatedBy: text('impersonated_by'),
}, (table) => [
  unique('auth_session_token_key').on(table.token),
  index('idx_auth_session_user_id').on(table.userId),
])

export const authAccount = pgTable('auth_account', {
  id: text().primaryKey().notNull(),
  issuer: text().notNull(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true, mode: 'date' }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true, mode: 'date' }),
  scope: text(),
  /** bcrypt para los usuarios migrados de Supabase, scrypt para los nuevos. */
  password: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('idx_auth_account_user_id').on(table.userId),
])

export const authVerification = pgTable('auth_verification', {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('idx_auth_verification_ident').on(table.identifier),
])

// El adapter de Drizzle busca cada tabla por la *clave* del objeto de schema, y
// esa clave tiene que coincidir con el `modelName` de la config de Better Auth
// (`auth_user`, no `authUser`). Sin estos alias falla en runtime, no al compilar.
export {
  authUser as auth_user,
  authSession as auth_session,
  authAccount as auth_account,
  authVerification as auth_verification,
}
