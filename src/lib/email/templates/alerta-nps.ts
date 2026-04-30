type AlertaNpsTemplateParams = {
  clienteNombre: string
  concesionario: string
  campanaNombre: string
  npsProducto: number
  npsEmpresa: number
  npsConcesionario: number
  comentarioProducto: string | null
  comentarioEmpresa: string | null
  comentarioGeneral: string | null
  detalleUrl: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderScore(label: string, value: number) {
  const bg = value < 6 ? '#fee2e2' : '#f3f4f6'
  const color = value < 6 ? '#b91c1c' : '#111827'

  return `
    <tr>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;background:${bg};color:${color};font-weight:700;text-align:center;">${value}</td>
    </tr>
  `
}

function comentarioBlock(label: string, value: string | null) {
  if (!value) return ''

  return `
    <div style="margin-top:16px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111827;">${escapeHtml(label)}</p>
      <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;color:#374151;font-size:14px;line-height:1.5;">
        ${escapeHtml(value)}
      </div>
    </div>
  `
}

export function buildAlertaNpsTemplate({
  clienteNombre,
  concesionario,
  campanaNombre,
  npsProducto,
  npsEmpresa,
  npsConcesionario,
  comentarioProducto,
  comentarioEmpresa,
  comentarioGeneral,
  detalleUrl,
}: AlertaNpsTemplateParams) {
  const criticalFields = [
    npsProducto < 6 ? `Producto (${npsProducto})` : null,
    npsEmpresa < 6 ? `Empresa (${npsEmpresa})` : null,
    npsConcesionario < 6 ? `Concesionario (${npsConcesionario})` : null,
  ].filter(Boolean)

  const subject = `Alerta NPS critica - ${clienteNombre} - ${concesionario}`

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#C0272D;padding:20px 24px;color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">Plataforma NPS</p>
          <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">Alerta NPS critica</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px;color:#111827;font-size:15px;line-height:1.6;">
            Se registró una respuesta crítica en la campaña <strong>${escapeHtml(campanaNombre)}</strong>.
          </p>
          <ul style="margin:0 0 20px;padding-left:18px;color:#374151;font-size:14px;line-height:1.6;">
            <li>Cliente: <strong>${escapeHtml(clienteNombre)}</strong></li>
            <li>Concesionario: <strong>${escapeHtml(concesionario)}</strong></li>
            <li>Valores críticos: <strong>${escapeHtml(criticalFields.join(', '))}</strong></li>
          </ul>

          <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
            <tbody>
              ${renderScore('NPS Producto', npsProducto)}
              ${renderScore('NPS Empresa', npsEmpresa)}
              ${renderScore('NPS Concesionario', npsConcesionario)}
            </tbody>
          </table>

          ${comentarioBlock('Comentario sobre el producto', comentarioProducto)}
          ${comentarioBlock('Comentario sobre la empresa', comentarioEmpresa)}
          ${comentarioBlock('Comentario general', comentarioGeneral)}

          <div style="margin-top:24px;">
            <a href="${escapeHtml(detalleUrl)}" style="display:inline-block;background:#C0272D;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:700;">
              Ver campaña
            </a>
          </div>
        </div>
      </div>
    </div>
  `

  const text = [
    'Alerta NPS critica',
    '',
    `Campaña: ${campanaNombre}`,
    `Cliente: ${clienteNombre}`,
    `Concesionario: ${concesionario}`,
    `NPS Producto: ${npsProducto}`,
    `NPS Empresa: ${npsEmpresa}`,
    `NPS Concesionario: ${npsConcesionario}`,
    comentarioProducto ? `Comentario producto: ${comentarioProducto}` : null,
    comentarioEmpresa ? `Comentario empresa: ${comentarioEmpresa}` : null,
    comentarioGeneral ? `Comentario general: ${comentarioGeneral}` : null,
    '',
    `Detalle: ${detalleUrl}`,
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
