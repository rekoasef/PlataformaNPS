ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tecnologia TEXT
  CHECK (tecnologia IS NULL OR tecnologia IN ('leaf', 'precision_planting'));

CREATE INDEX IF NOT EXISTS idx_clientes_tecnologia
  ON public.clientes(tecnologia)
  WHERE tecnologia IS NOT NULL;
