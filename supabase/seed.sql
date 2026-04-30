-- Configuración global inicial (singleton)
INSERT INTO system_config (
  dias_notificacion_inicial,
  dias_notificacion_recordatorio,
  dias_hasta_llamado,
  emails_notificacion
) VALUES (
  2,
  2,
  2,
  '{}'
);
