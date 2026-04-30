-- 1. Fijar search_path en funciones existentes (anti hijacking)
ALTER FUNCTION public.fn_marcar_encuesta_respondida()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_update_updated_at()
  SET search_path = public, pg_temp;

-- 2. Revocar EXECUTE público de funciones SECURITY DEFINER.
--    Los triggers y pg_cron siguen funcionando porque corren como owner/superuser.
REVOKE EXECUTE ON FUNCTION public.fn_marcar_encuesta_respondida()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_encuestas_necesidad_llamado() FROM PUBLIC, anon, authenticated;

-- 3. Índice para FK marcado_sin_respuesta_por
CREATE INDEX IF NOT EXISTS idx_encuestas_marcado_sin_respuesta_por
  ON public.encuestas(marcado_sin_respuesta_por)
  WHERE marcado_sin_respuesta_por IS NOT NULL;

-- 4. Optimizar policy: envolver current_setting en SELECT para evaluar una sola vez
DROP POLICY IF EXISTS "encuestas_select_by_token" ON public.encuestas;

CREATE POLICY "encuestas_select_by_token"
ON public.encuestas FOR SELECT TO anon
USING (
  token = (
    SELECT (current_setting('request.jwt.claims', true)::json->>'token')::uuid
  )
);
