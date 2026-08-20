-- Re-agrega las FKs a la tabla de usuarios que quedaron sueltas durante la migración.
--
-- `encuestas.marcado_sin_respuesta_por` y `encuesta_medidas.created_by` apuntaban
-- a `auth.users(id)` de Supabase. Al portar el schema al Postgres propio esa tabla
-- no existía, así que las columnas quedaron como UUID sin constraint. Ahora existe
-- `auth_user(id)` a la cual apuntar.
--
-- Solo aplica al Postgres self-hosted (igual que 20260819000000_better_auth_tables.sql):
-- contra Supabase Cloud no hay `auth_user` y estas columnas ya tienen su FK original.
--
-- Cambio de tipo: `auth_user.id` es TEXT (tipo nativo de Better Auth), así que las
-- dos columnas pasan de UUID a TEXT. Los usuarios migrados conservan su UUID de
-- Supabase guardado como texto, por lo que los valores siguen coincidiendo.
--
-- ON DELETE SET NULL: son columnas de auditoría. Borrar un usuario no debe borrar
-- ni bloquear el borrado de encuestas ni de medidas de llamado; se pierde el "quién"
-- y se conserva el registro.

BEGIN;

-- 1. UUID -> TEXT. Los índices se reconstruyen solos con el opclass del tipo nuevo.
--    Guardado por tipo actual para que la migración se pueda volver a correr.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'encuestas' AND column_name = 'marcado_sin_respuesta_por') = 'uuid' THEN
    ALTER TABLE encuestas
      ALTER COLUMN marcado_sin_respuesta_por TYPE TEXT USING marcado_sin_respuesta_por::text;
  END IF;

  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'encuesta_medidas' AND column_name = 'created_by') = 'uuid' THEN
    ALTER TABLE encuesta_medidas
      ALTER COLUMN created_by TYPE TEXT USING created_by::text;
  END IF;
END $$;

-- 2. Limpiar referencias a usuarios que ya no existen (borrados de Supabase Auth antes
--    de la migración, o nunca migrados). Sin esto la FK no se puede crear.
DO $$
DECLARE
  huerfanas_encuestas INT;
  huerfanas_medidas   INT;
BEGIN
  UPDATE encuestas e
     SET marcado_sin_respuesta_por = NULL
   WHERE e.marcado_sin_respuesta_por IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth_user u WHERE u.id = e.marcado_sin_respuesta_por);
  GET DIAGNOSTICS huerfanas_encuestas = ROW_COUNT;

  UPDATE encuesta_medidas m
     SET created_by = NULL
   WHERE m.created_by IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth_user u WHERE u.id = m.created_by);
  GET DIAGNOSTICS huerfanas_medidas = ROW_COUNT;

  RAISE NOTICE 'Referencias huérfanas puestas en NULL: encuestas=%, encuesta_medidas=%',
    huerfanas_encuestas, huerfanas_medidas;
END $$;

-- 3. Las FKs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'encuestas_marcado_sin_respuesta_por_fkey') THEN
    ALTER TABLE encuestas
      ADD CONSTRAINT encuestas_marcado_sin_respuesta_por_fkey
      FOREIGN KEY (marcado_sin_respuesta_por) REFERENCES auth_user(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'encuesta_medidas_created_by_fkey') THEN
    ALTER TABLE encuesta_medidas
      ADD CONSTRAINT encuesta_medidas_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth_user(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
