-- =====================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =====================

ALTER TABLE clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuestas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- =====================
-- POLICIES: clientes
-- =====================

CREATE POLICY "clientes_select_admin"
ON clientes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "clientes_insert_admin"
ON clientes FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "clientes_update_admin"
ON clientes FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- DELETE no permitido (proteger historial)

-- =====================
-- POLICIES: campanas
-- =====================

CREATE POLICY "campanas_select_admin"
ON campanas FOR SELECT TO authenticated
USING (true);

CREATE POLICY "campanas_insert_admin"
ON campanas FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "campanas_update_admin"
ON campanas FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- =====================
-- POLICIES: encuestas
-- =====================

CREATE POLICY "encuestas_select_admin"
ON encuestas FOR SELECT TO authenticated
USING (true);

CREATE POLICY "encuestas_insert_admin"
ON encuestas FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "encuestas_update_admin"
ON encuestas FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- Segunda capa de defensa: anon puede leer SOLO su propia encuesta por token.
-- La validación principal ocurre en el Server Component con service_role.
CREATE POLICY "encuestas_select_by_token"
ON encuestas FOR SELECT TO anon
USING (token = (current_setting('request.jwt.claims', true)::json->>'token')::uuid);

-- =====================
-- POLICIES: respuestas
-- =====================

-- Solo admin puede leer respuestas.
-- Las inserciones siempre se hacen desde Server Actions con service_role.
CREATE POLICY "respuestas_select_admin"
ON respuestas FOR SELECT TO authenticated
USING (true);

-- =====================
-- POLICIES: envios
-- =====================

CREATE POLICY "envios_select_admin"
ON envios FOR SELECT TO authenticated
USING (true);

CREATE POLICY "envios_insert_admin"
ON envios FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "envios_update_admin"
ON envios FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- =====================
-- POLICIES: system_config
-- =====================

-- Solo admin puede ver y modificar. INSERT/DELETE no permitidos (singleton).
CREATE POLICY "config_select_admin"
ON system_config FOR SELECT TO authenticated
USING (true);

CREATE POLICY "config_update_admin"
ON system_config FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- =====================
-- VISTAS
-- =====================

-- Vista: encuestas con datos de cliente y campaña
CREATE VIEW v_encuestas_completas
WITH (security_invoker = true)
AS
SELECT
  e.id,
  e.token,
  e.estado,
  e.created_at,
  c.nombre        AS cliente_nombre,
  c.telefono      AS cliente_telefono,
  c.concesionario,
  ca.nombre       AS campana_nombre,
  ca.id           AS campana_id,
  r.nps_producto,
  r.nps_empresa,
  r.nps_concesionario,
  r.fecha_respuesta
FROM encuestas e
JOIN clientes c   ON e.cliente_id = c.id
JOIN campanas ca  ON e.campana_id = ca.id
LEFT JOIN respuestas r ON r.encuesta_id = e.id;

-- Vista: métricas NPS por campaña
CREATE VIEW v_nps_por_campana
WITH (security_invoker = true)
AS
SELECT
  ca.id                                                                   AS campana_id,
  ca.nombre                                                               AS campana_nombre,
  COUNT(r.id)                                                             AS total_respuestas,
  ROUND(AVG(r.nps_producto), 2)                                          AS avg_nps_producto,
  ROUND(AVG(r.nps_empresa), 2)                                           AS avg_nps_empresa,
  ROUND(AVG(r.nps_concesionario), 2)                                     AS avg_nps_concesionario,
  ROUND(
    (COUNT(CASE WHEN r.nps_empresa >= 9 THEN 1 END)::DECIMAL
      / NULLIF(COUNT(r.id), 0) * 100)
    -
    (COUNT(CASE WHEN r.nps_empresa <= 6 THEN 1 END)::DECIMAL
      / NULLIF(COUNT(r.id), 0) * 100)
  , 1)                                                                    AS nps_empresa_score
FROM campanas ca
LEFT JOIN encuestas e  ON e.campana_id = ca.id
LEFT JOIN respuestas r ON r.encuesta_id = e.id
GROUP BY ca.id, ca.nombre;
