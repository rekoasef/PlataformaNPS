-- Tablas de Better Auth (reemplazo de Supabase Auth).
--
-- Solo aplican al Postgres self-hosted: en Supabase Cloud el equivalente vive en
-- el schema `auth`, que es propiedad de la plataforma. Aplicar esto contra
-- Supabase crearía tablas inertes — no hace falta y solo confunde.
--
-- El schema se derivó de `getSchema()` de better-auth 1.7.1 con el plugin admin,
-- no del CLI (que quedó deprecado en 1.4.x y no incluye campos nuevos como
-- `auth_account.issuer`). Si se actualiza better-auth, volver a derivarlo.
--
-- Los `id` son TEXT, no UUID: es el tipo nativo de Better Auth. Los 23 usuarios
-- que vienen de Supabase conservan su UUID original guardado como texto, así que
-- los ids siguen siendo los mismos de siempre.

CREATE TABLE IF NOT EXISTS auth_user (
  id             TEXT        PRIMARY KEY,
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL UNIQUE,
  email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  image          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Roles de la app. Reemplaza el `app_metadata.role` del JWT de Supabase:
  -- al vivir en la tabla, cambiar un rol tiene efecto inmediato.
  role           TEXT        NOT NULL DEFAULT 'admin',
  banned         BOOLEAN     NOT NULL DEFAULT FALSE,
  ban_reason     TEXT,
  ban_expires    TIMESTAMPTZ,
  CONSTRAINT auth_user_role_check CHECK (role IN ('admin', 'rambla', 'fabrica'))
);

CREATE TABLE IF NOT EXISTS auth_session (
  id              TEXT        PRIMARY KEY,
  expires_at      TIMESTAMPTZ NOT NULL,
  token           TEXT        NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address      TEXT,
  user_agent      TEXT,
  user_id         TEXT        NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  impersonated_by TEXT
);

CREATE TABLE IF NOT EXISTS auth_account (
  id                       TEXT        PRIMARY KEY,
  issuer                   TEXT        NOT NULL,
  account_id               TEXT        NOT NULL,
  provider_id              TEXT        NOT NULL,
  user_id                  TEXT        NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  access_token             TEXT,
  refresh_token            TEXT,
  id_token                 TEXT,
  access_token_expires_at  TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope                    TEXT,
  -- Hash de la contraseña. Para los usuarios migrados es bcrypt (formato de
  -- Supabase); para los nuevos, scrypt de Better Auth. Ver src/lib/auth/password.ts
  password                 TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_verification (
  id         TEXT        PRIMARY KEY,
  identifier TEXT        NOT NULL,
  value      TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user_id    ON auth_session(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_token      ON auth_session(token);
CREATE INDEX IF NOT EXISTS idx_auth_account_user_id    ON auth_account(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_verification_ident ON auth_verification(identifier);
