-- =====================
-- ENUM: tipo_maquina_enum
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_maquina_enum') THEN
    CREATE TYPE public.tipo_maquina_enum AS ENUM ('sembradora', 'fertilizadora');
  END IF;
END
$$;

-- =====================
-- public.respuestas.tipo_maquina
-- =====================
ALTER TABLE public.respuestas
  ADD COLUMN IF NOT EXISTS tipo_maquina public.tipo_maquina_enum;

UPDATE public.respuestas SET tipo_maquina = 'sembradora' WHERE tipo_maquina IS NULL;

ALTER TABLE public.respuestas
  ALTER COLUMN tipo_maquina SET NOT NULL,
  ALTER COLUMN tipo_maquina SET DEFAULT 'sembradora';

CREATE INDEX IF NOT EXISTS idx_respuestas_tipo_maquina
  ON public.respuestas(tipo_maquina);

-- =====================
-- public.encuestas: comentario + auditoría sin respuesta
-- =====================
ALTER TABLE public.encuestas
  ADD COLUMN IF NOT EXISTS comentario_sin_respuesta   TEXT,
  ADD COLUMN IF NOT EXISTS marcado_sin_respuesta_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marcado_sin_respuesta_por  UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_encuestas_marcado_sin_respuesta_at
  ON public.encuestas(marcado_sin_respuesta_at)
  WHERE marcado_sin_respuesta_at IS NOT NULL;
