ALTER TABLE clientes
  ADD COLUMN telefono_2 TEXT,
  ADD COLUMN telefono_3 TEXT;

ALTER TABLE system_config
  ADD COLUMN dias_hasta_llamado SMALLINT NOT NULL DEFAULT 2
    CHECK (dias_hasta_llamado > 0);

ALTER TABLE system_config
  ALTER COLUMN dias_notificacion_inicial SET DEFAULT 2,
  ALTER COLUMN dias_notificacion_recordatorio SET DEFAULT 2;

ALTER TYPE encuesta_estado ADD VALUE IF NOT EXISTS 'recordatorio_enviado';
ALTER TYPE encuesta_estado ADD VALUE IF NOT EXISTS 'pendiente_a_llamar';
ALTER TYPE encuesta_estado ADD VALUE IF NOT EXISTS 'sin_respuesta';
