-- =====================
-- public.encuesta_medidas: historial de acciones/medidas de llamado
-- =====================
-- Registro append-only de cada gestión telefónica realizada sobre una OF
-- en necesidad de llamado, con fecha/hora de carga y usuario responsable.

CREATE TABLE IF NOT EXISTS public.encuesta_medidas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encuesta_id  UUID NOT NULL REFERENCES public.encuestas(id) ON DELETE CASCADE,
  comentario   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_encuesta_medidas_encuesta_id
  ON public.encuesta_medidas(encuesta_id);

CREATE INDEX IF NOT EXISTS idx_encuesta_medidas_created_by
  ON public.encuesta_medidas(created_by)
  WHERE created_by IS NOT NULL;

ALTER TABLE public.encuesta_medidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encuesta_medidas_select_admin"
ON public.encuesta_medidas FOR SELECT TO authenticated
USING (true);

CREATE POLICY "encuesta_medidas_insert_admin"
ON public.encuesta_medidas FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE y DELETE se habilitan en la migración
-- 20260723010000_encuesta_medidas_update_delete.sql
