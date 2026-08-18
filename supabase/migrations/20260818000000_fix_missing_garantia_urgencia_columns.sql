-- Documenta columnas que ya existían en producción (Supabase Cloud) pero nunca
-- quedaron en una migración commiteada al repo — se agregaron en algún momento
-- directo contra la base viva. Detectado el 2026-08-18 al comparar el schema de
-- producción contra el de staging (ver docs/06-migracion-self-hosted.md sección 8).
-- Mismo patrón de raíz que 20260720000000_fix_missing_fin_garantia_columns.sql.
-- IF NOT EXISTS: en producción ya existen (no-op ahí); en cualquier otro ambiente
-- (staging, local) las crea.

ALTER TABLE tipos_encuesta
  ADD COLUMN IF NOT EXISTS config JSONB,
  ADD COLUMN IF NOT EXISTS introduccion TEXT,
  ADD COLUMN IF NOT EXISTS preguntas JSONB;

ALTER TABLE respuestas
  ADD COLUMN IF NOT EXISTS cumplimiento_expectativas SMALLINT CHECK (cumplimiento_expectativas BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS respuestas_raw JSONB,
  ADD COLUMN IF NOT EXISTS conformidad_acompanamiento_garantia SMALLINT CHECK (conformidad_acompanamiento_garantia BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS necesito_asistencia_urgente BOOLEAN,
  ADD COLUMN IF NOT EXISTS calificacion_tiempo_respuesta_urgente SMALLINT CHECK (calificacion_tiempo_respuesta_urgente BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS tuvo_reclamo_garantia BOOLEAN,
  ADD COLUMN IF NOT EXISTS calificacion_resolucion_problema_garantia SMALLINT CHECK (calificacion_resolucion_problema_garantia BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS comentario_problema_garantia TEXT;
