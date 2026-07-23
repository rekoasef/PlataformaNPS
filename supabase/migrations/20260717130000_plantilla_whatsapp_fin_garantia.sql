-- Plantilla WhatsApp para el envío inicial de encuestas de Fin de Garantía (sin regalo).
INSERT INTO plantillas_whatsapp (nombre, tipo, lineas)
SELECT
  'Envío inicial — Fin de Garantía',
  'inicial',
  ARRAY[
    '¡Hola {nombre}! 👋',
    '',
    'Se cumplió un año desde que confiaste en Crucianelli 🚜. Queremos conocer cómo funcionó tu equipo durante este primer año.',
    '',
    '📝 Completá esta breve encuesta de fin de garantía, no te va a llevar más de 2 minutos.',
    '👉 {url}',
    '',
    '🔔 Importante: Este contacto se utiliza unicamente para este fin. Si necesitas asistencia tecnica o comercial, por favor contactate con tu Concesionario oficial.'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM plantillas_whatsapp WHERE nombre = 'Envío inicial — Fin de Garantía'
);
