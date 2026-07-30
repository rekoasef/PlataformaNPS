const PRODUCTOS_REGALO = [
  { nombre: 'Mini Ball', sku: 'TCC0233', cantidad: 1 },
  { nombre: 'Botella Contigo Matterhorn', sku: 'SCE0008', cantidad: 1 },
] as const

type RamblaRegaloTemplateParams = {
  nombreApellido: string
  calleNumero: string
  pisoDepartamento: string | null
  localidad: string
  codigoPostal: string
  provincia: string
  email: string
  telefono: string
  concesionario: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#6b7280;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>
  `
}

export function buildRamblaRegaloTemplate({
  nombreApellido,
  calleNumero,
  pisoDepartamento,
  localidad,
  codigoPostal,
  provincia,
  email,
  telefono,
  concesionario,
}: RamblaRegaloTemplateParams) {
  const subject = `Regalo Encuesta Posventa ${concesionario}`

  const direccion = pisoDepartamento
    ? `${calleNumero} — ${pisoDepartamento}`
    : calleNumero

  const productosHtml = PRODUCTOS_REGALO.map(
    (p) =>
      `<li style="margin:6px 0;font-size:14px;color:#374151;">${escapeHtml(p.nombre)} <span style="color:#6b7280;">(${escapeHtml(p.sku)})</span> &times; ${p.cantidad} unidad</li>`
  ).join('')

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">

        <div style="background:#C0272D;padding:20px 24px;color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">Plataforma NPS Crucianelli</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">
            ¡Una nueva persona contestó la encuesta de Posventa ${escapeHtml(concesionario)}!
          </h1>
        </div>

        <div style="padding:24px;">
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            A continuación encontrarás los datos para realizar el envío del regalo.
          </p>

          <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Datos para el envío</p>
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tbody>
                ${row('Nombre y apellido:', nombreApellido)}
                ${row('Dirección:', direccion)}
                ${row('Localidad:', localidad)}
                ${row('Código postal:', codigoPostal)}
                ${row('Provincia:', provincia)}
                ${row('E-mail:', email)}
                ${row('Teléfono:', telefono)}
              </tbody>
            </table>
          </div>

          <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Productos a despachar</p>
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;">
            <ul style="margin:0;padding-left:18px;">
              ${productosHtml}
            </ul>
          </div>
        </div>

        <div style="padding:0 24px 24px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            Este correo fue generado automáticamente por la Plataforma NPS Crucianelli.
          </p>
        </div>

      </div>
    </div>
  `

  const text = [
    `¡Una nueva persona contestó la encuesta de Posventa ${concesionario}!`,
    '',
    'DATOS PARA EL ENVÍO',
    `Nombre y apellido: ${nombreApellido}`,
    `Dirección: ${direccion}`,
    `Localidad: ${localidad}`,
    `Código postal: ${codigoPostal}`,
    `Provincia: ${provincia}`,
    `E-mail: ${email}`,
    `Teléfono: ${telefono}`,
    '',
    'PRODUCTOS A DESPACHAR',
    ...PRODUCTOS_REGALO.map((p) => `${p.nombre} (${p.sku}) × ${p.cantidad} unidad`),
  ].join('\n')

  return { subject, html, text }
}
