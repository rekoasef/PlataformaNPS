-- La columna clientes.tipo_maquina pasa de guardar una categoria
-- (sembradora/fertilizadora) a guardar el modelo especifico, igual que
-- respuestas.maquina_modelo en la encuesta.
ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_tipo_maquina_check;

UPDATE public.clientes
  SET tipo_maquina = NULL
  WHERE tipo_maquina IS NOT NULL
    AND tipo_maquina NOT IN (
      'Gringa', 'Pionera', 'Plantor', 'Drilor', 'Mixia', 'Domina',
      'Corper (incorporadora)', 'Raster (motriz)', 'Movia (arrastre)', 'Luxion'
    );

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_tipo_maquina_check
  CHECK (tipo_maquina IS NULL OR tipo_maquina IN (
    'Gringa', 'Pionera', 'Plantor', 'Drilor', 'Mixia', 'Domina',
    'Corper (incorporadora)', 'Raster (motriz)', 'Movia (arrastre)', 'Luxion'
  ));
