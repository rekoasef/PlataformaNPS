-- La migración 20260630000000_tipos_encuesta.sql nunca terminó de aplicarse en producción:
-- quedaron creados tipos_encuesta y campanas.tipo_encuesta_id, pero faltaron estas columnas
-- en respuestas, lo que rompía el guardado de encuestas de fin de garantía.
ALTER TABLE respuestas
  ADD COLUMN IF NOT EXISTS calificacion_funcionamiento_anual  SMALLINT CHECK (calificacion_funcionamiento_anual BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS tuvo_problemas_tecnicos            BOOLEAN,
  ADD COLUMN IF NOT EXISTS calificacion_resolucion_problemas  SMALLINT CHECK (calificacion_resolucion_problemas BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS comentario_problemas               TEXT;
