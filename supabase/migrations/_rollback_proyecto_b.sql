-- =====================================================
-- ROLLBACK NPS — pegar SOLO en el Proyecto B (el equivocado)
-- =====================================================
-- Revierte todo lo aplicado por las migraciones 001-009.
-- NO toca la extensión pg_cron por si la usás en otra cosa.
-- Todo es IF EXISTS, así que es seguro correrlo aunque algo
-- haya quedado a medias.

-- 1. Sacar el cron job (de 008)
DO $rb$
DECLARE
  job_id bigint;
BEGIN
  SELECT jobid INTO job_id
  FROM cron.job
  WHERE jobname = 'sync-encuestas-necesidad-llamado'
  LIMIT 1;

  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
END
$rb$;

-- 2. Borrar funciones de workflow (de 008)
DROP FUNCTION IF EXISTS public.sync_encuestas_necesidad_llamado() CASCADE;

-- 3. Borrar vistas (de 003)
DROP VIEW IF EXISTS public.v_nps_por_campana CASCADE;
DROP VIEW IF EXISTS public.v_encuestas_completas CASCADE;

-- 4. Borrar tablas en orden inverso de FKs.
--    CASCADE limpia automáticamente triggers, indices, policies y FKs.
DROP TABLE IF EXISTS public.respuestas    CASCADE;
DROP TABLE IF EXISTS public.envios        CASCADE;
DROP TABLE IF EXISTS public.encuestas     CASCADE;
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TABLE IF EXISTS public.campanas      CASCADE;
DROP TABLE IF EXISTS public.clientes      CASCADE;

-- 5. Borrar funciones de triggers (de 002)
DROP FUNCTION IF EXISTS public.fn_marcar_encuesta_respondida() CASCADE;
DROP FUNCTION IF EXISTS public.fn_update_updated_at() CASCADE;

-- 6. Borrar enums creados por las migraciones
DROP TYPE IF EXISTS public.tipo_maquina_enum;
DROP TYPE IF EXISTS public.encuesta_estado;
DROP TYPE IF EXISTS public.envio_estado;
DROP TYPE IF EXISTS public.campana_estado;

-- 7. Refrescar cache de PostgREST
NOTIFY pgrst, 'reload schema';
