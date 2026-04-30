CREATE OR REPLACE FUNCTION public.sync_encuestas_necesidad_llamado()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  WITH config AS (
    SELECT dias_hasta_llamado
    FROM public.system_config
    LIMIT 1
  ),
  stale_recordatorios AS (
    SELECT DISTINCT e.campana_id, e.cliente_id
    FROM public.envios e
    CROSS JOIN config c
    WHERE e.estado_envio = 'enviado'
      AND e.numero_recordatorio > 0
      AND e.fecha_envio IS NOT NULL
      AND e.fecha_envio <= NOW() - make_interval(days => c.dias_hasta_llamado)
  ),
  updated AS (
    UPDATE public.encuestas en
    SET estado = 'necesidad_de_llamado'
    FROM stale_recordatorios sr
    WHERE en.campana_id = sr.campana_id
      AND en.cliente_id = sr.cliente_id
      AND en.estado = 'recordatorio_enviado'
    RETURNING en.id
  )
  SELECT COUNT(*) INTO updated_count
  FROM updated;

  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.sync_encuestas_necesidad_llamado()
IS 'Pasa encuestas desde recordatorio_enviado a necesidad_de_llamado cuando vence el plazo configurado.';

DO $outer$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'sync-encuestas-necesidad-llamado'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'sync-encuestas-necesidad-llamado',
    '*/15 * * * *',
    'SELECT public.sync_encuestas_necesidad_llamado();'
  );
END;
$outer$;
