-- pg_cron para jobs programados (uuid no necesita extensión en PostgreSQL 13+)
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================
-- ENUMS
-- =====================

CREATE TYPE campana_estado AS ENUM ('activa', 'completada', 'archivada');
CREATE TYPE encuesta_estado AS ENUM ('pendiente', 'respondida');
CREATE TYPE envio_estado AS ENUM ('pendiente_envio', 'enviado');

-- =====================
-- TABLA: clientes
-- =====================

CREATE TABLE clientes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  telefono      TEXT NOT NULL,
  concesionario TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_concesionario ON clientes(concesionario);
CREATE INDEX idx_clientes_telefono ON clientes(telefono);

-- =====================
-- TABLA: campanas
-- =====================

CREATE TABLE campanas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
  estado     campana_estado NOT NULL DEFAULT 'activa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campanas_estado ON campanas(estado);
CREATE INDEX idx_campanas_fecha ON campanas(fecha);

-- =====================
-- TABLA: encuestas
-- =====================

CREATE TABLE encuestas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  campana_id UUID NOT NULL REFERENCES campanas(id) ON DELETE RESTRICT,
  token      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  estado     encuesta_estado NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_cliente_campana UNIQUE (cliente_id, campana_id)
);

CREATE INDEX idx_encuestas_token ON encuestas(token);
CREATE INDEX idx_encuestas_campana_id ON encuestas(campana_id);
CREATE INDEX idx_encuestas_cliente_id ON encuestas(cliente_id);
CREATE INDEX idx_encuestas_estado ON encuestas(estado);

-- =====================
-- TABLA: respuestas
-- =====================

CREATE TABLE respuestas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encuesta_id          UUID NOT NULL UNIQUE REFERENCES encuestas(id) ON DELETE RESTRICT,
  nps_producto         SMALLINT NOT NULL CHECK (nps_producto BETWEEN 0 AND 10),
  nps_empresa          SMALLINT NOT NULL CHECK (nps_empresa BETWEEN 0 AND 10),
  nps_concesionario    SMALLINT NOT NULL CHECK (nps_concesionario BETWEEN 0 AND 10),
  comentario_producto  TEXT,
  comentario_empresa   TEXT,
  comentario_general   TEXT,
  fecha_respuesta      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_respuestas_encuesta_id ON respuestas(encuesta_id);
CREATE INDEX idx_respuestas_fecha ON respuestas(fecha_respuesta);
CREATE INDEX idx_respuestas_nps_producto ON respuestas(nps_producto);
CREATE INDEX idx_respuestas_nps_empresa ON respuestas(nps_empresa);
CREATE INDEX idx_respuestas_nps_concesionario ON respuestas(nps_concesionario);

-- =====================
-- TABLA: envios
-- =====================

CREATE TABLE envios (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  campana_id           UUID NOT NULL REFERENCES campanas(id) ON DELETE RESTRICT,
  numero_recordatorio  SMALLINT NOT NULL DEFAULT 0
                         CHECK (numero_recordatorio BETWEEN 0 AND 3),
  estado_envio         envio_estado NOT NULL DEFAULT 'pendiente_envio',
  fecha_envio          TIMESTAMPTZ,
  notificacion_enviada BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_envio_cliente_campana_recordatorio
    UNIQUE (cliente_id, campana_id, numero_recordatorio)
);

CREATE INDEX idx_envios_campana_id ON envios(campana_id);
CREATE INDEX idx_envios_cliente_id ON envios(cliente_id);
CREATE INDEX idx_envios_numero_recordatorio ON envios(numero_recordatorio);
CREATE INDEX idx_envios_notificacion ON envios(notificacion_enviada, fecha_envio);

-- =====================
-- TABLA: system_config
-- =====================

CREATE TABLE system_config (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dias_notificacion_inicial      SMALLINT NOT NULL DEFAULT 10
                                   CHECK (dias_notificacion_inicial > 0),
  dias_notificacion_recordatorio SMALLINT NOT NULL DEFAULT 7
                                   CHECK (dias_notificacion_recordatorio > 0),
  emails_notificacion            TEXT[] NOT NULL DEFAULT '{}',
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
