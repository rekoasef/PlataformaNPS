export function buildTestEmailTemplate() {
  const sentAt = new Date().toISOString()

  return {
    subject: 'Prueba de email - Plataforma NPS',
    html: `
      <div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
          <h1 style="margin:0 0 12px;color:#111827;font-size:22px;">Prueba de email</h1>
          <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">
            Este correo confirma que el sistema de emails de la Plataforma NPS está funcionando.
          </p>
          <p style="margin:0;color:#6b7280;font-size:13px;">Fecha UTC: ${sentAt}</p>
        </div>
      </div>
    `,
    text: `Prueba de email SMTP\n\nLa integración SMTP de la Plataforma NPS está funcionando.\nFecha UTC: ${sentAt}`,
  }
}
