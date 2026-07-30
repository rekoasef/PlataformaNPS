ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo_maquina TEXT
  CHECK (tipo_maquina IS NULL OR tipo_maquina IN ('sembradora', 'fertilizadora'));

CREATE INDEX IF NOT EXISTS idx_clientes_tipo_maquina
  ON public.clientes(tipo_maquina)
  WHERE tipo_maquina IS NOT NULL;
