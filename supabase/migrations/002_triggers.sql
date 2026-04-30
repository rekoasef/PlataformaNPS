-- =====================
-- FUNCIÓN + TRIGGER: marcar encuesta como respondida al insertar respuesta
-- =====================

CREATE OR REPLACE FUNCTION fn_marcar_encuesta_respondida()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE encuestas
  SET estado = 'respondida'
  WHERE id = NEW.encuesta_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_marcar_encuesta_respondida
AFTER INSERT ON respuestas
FOR EACH ROW
EXECUTE FUNCTION fn_marcar_encuesta_respondida();

-- =====================
-- FUNCIÓN + TRIGGER: actualizar updated_at en system_config
-- =====================

CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_system_config_updated_at
BEFORE UPDATE ON system_config
FOR EACH ROW
EXECUTE FUNCTION fn_update_updated_at();
