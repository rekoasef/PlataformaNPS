-- =====================
-- public.encuesta_medidas: habilitar edición y borrado (CRUD completo)
-- =====================

ALTER TABLE public.encuesta_medidas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_encuesta_medidas_updated_at ON public.encuesta_medidas;

CREATE TRIGGER trg_encuesta_medidas_updated_at
BEFORE UPDATE ON public.encuesta_medidas
FOR EACH ROW
EXECUTE FUNCTION fn_update_updated_at();

CREATE POLICY "encuesta_medidas_update_admin"
ON public.encuesta_medidas FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "encuesta_medidas_delete_admin"
ON public.encuesta_medidas FOR DELETE TO authenticated
USING (true);
