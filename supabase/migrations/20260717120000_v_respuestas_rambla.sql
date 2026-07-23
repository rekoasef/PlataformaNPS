-- Flag configurable: si el tipo de encuesta dispara el flujo de regalo (Rambla).
ALTER TABLE tipos_encuesta
  ADD COLUMN IF NOT EXISTS envia_regalo BOOLEAN NOT NULL DEFAULT false;

UPDATE tipos_encuesta SET envia_regalo = true WHERE slug = 'inicio_garantia';
UPDATE tipos_encuesta SET envia_regalo = false WHERE slug = 'fin_garantia';

-- Vista: solo respuestas de encuestas cuyo tipo tiene el envío de regalo activado.
DROP VIEW IF EXISTS v_respuestas_rambla;
CREATE VIEW v_respuestas_rambla
WITH (security_invoker = true)
AS
SELECT r.*
FROM respuestas r
JOIN encuestas e   ON e.id = r.encuesta_id
JOIN campanas ca   ON ca.id = e.campana_id
JOIN tipos_encuesta te ON te.id = ca.tipo_encuesta_id
WHERE te.envia_regalo = true;
