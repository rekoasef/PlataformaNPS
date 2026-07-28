'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import type { RespuestaDetalle } from '../services/dashboard.service'
import { getCalificacionesConfigPorSlug } from '../utils/calificaciones'
import { getNpsAnswerVariant } from '../utils/nps'
import { formatTecnologia } from '@/lib/utils/tecnologia'

interface RespuestasTableProps {
  respuestas: RespuestaDetalle[]
}

function NpsBadge({ value }: { value: number }) {
  return <Badge variant={getNpsAnswerVariant(value)}>{value}</Badge>
}

function valueOrDash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '—' : value
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  return (
    <p>
      <span className="font-medium text-foreground">{label}:</span> {valueOrDash(value)}
    </p>
  )
}

function ScoreLine({
  label,
  value,
  nps,
}: {
  label: string
  value: number | null
  nps?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      {value === null ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : nps ? (
        <NpsBadge value={value} />
      ) : (
        <Badge variant="info">{value}</Badge>
      )}
    </div>
  )
}

export default function RespuestasTable({ respuestas }: RespuestasTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (respuestas.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">No hay respuestas para mostrar.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Campaña</TableHead>
          <TableHead>Concesionario</TableHead>
          <TableHead>Máquina</TableHead>
          <TableHead>Tecnología</TableHead>
          <TableHead>Canal</TableHead>
          <TableHead className="text-right">NPS concesionario</TableHead>
          <TableHead className="text-right">NPS producto</TableHead>
          <TableHead className="text-right">NPS empresa</TableHead>
          <TableHead className="text-right">Detalle</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {respuestas.flatMap((respuesta) => {
          const expanded = expandedId === respuesta.encuestaId

          return [
            <TableRow key={respuesta.encuestaId}>
              <TableCell className="text-muted-foreground">
                {new Date(respuesta.fechaRespuesta).toLocaleDateString('es-AR')}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{respuesta.nombreApellido ?? respuesta.clienteNombre}</p>
                  <p className="text-xs text-muted-foreground">{respuesta.email ?? respuesta.clienteTelefono}</p>
                </div>
              </TableCell>
              <TableCell>{respuesta.campanaNombre}</TableCell>
              <TableCell>{respuesta.concesionario}</TableCell>
              <TableCell>{respuesta.maquinaModelo ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{formatTecnologia(respuesta.tecnologia)}</TableCell>
              <TableCell>
                <Badge variant={respuesta.canalRespuesta === 'llamado' ? 'warning' : 'info'}>
                  {respuesta.canalRespuesta === 'llamado' ? 'Llamado' : 'Mensaje'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <NpsBadge value={respuesta.npsConcesionario} />
              </TableCell>
              <TableCell className="text-right">
                <NpsBadge value={respuesta.npsProducto} />
              </TableCell>
              <TableCell className="text-right">
                <NpsBadge value={respuesta.npsEmpresa} />
              </TableCell>
              <TableCell className="text-right">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : respuesta.encuestaId)}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {expanded ? 'Ocultar' : 'Ver'}
                </button>
              </TableCell>
            </TableRow>,
            ...(expanded
              ? [
                  <TableRow key={`${respuesta.encuestaId}-detail`} className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={11}>
                      <div className="grid grid-cols-1 gap-6 p-3 xl:grid-cols-4">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contacto</p>
                          <div className="space-y-1 text-sm text-foreground">
                            <DetailItem label="Nombre" value={respuesta.nombreApellido ?? respuesta.clienteNombre} />
                            <DetailItem label="Email" value={respuesta.email} />
                            <DetailItem label="Teléfono" value={respuesta.telefono ?? respuesta.clienteTelefono} />
                            <DetailItem label="Calle y número" value={respuesta.calleNumero} />
                            <DetailItem label="Piso/departamento" value={respuesta.pisoDepartamento} />
                            <DetailItem label="Localidad" value={respuesta.localidad} />
                            <DetailItem label="Código postal" value={respuesta.codigoPostal} />
                            <DetailItem label="Provincia" value={respuesta.provincia} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Encuesta</p>
                          <div className="space-y-1 text-sm text-foreground">
                            <DetailItem label="Campaña" value={respuesta.campanaNombre} />
                            <DetailItem label="Concesionario importado" value={respuesta.concesionario} />
                            <DetailItem label="Concesionario sede" value={respuesta.concesionarioSede} />
                            <DetailItem label="Producto" value={respuesta.maquinaModelo} />
                            <DetailItem label="Tipo" value={respuesta.tipoMaquina} />
                            <DetailItem label="Tecnología" value={formatTecnologia(respuesta.tecnologia)} />
                            <DetailItem label="Firma factura" value={respuesta.nombreFirmaFactura} />
                            <DetailItem label="Orden fabricación" value={respuesta.ordenFabricacion} />
                            <DetailItem label="Canal" value={respuesta.canalRespuesta === 'llamado' ? 'Llamado' : 'Mensaje'} />
                            <DetailItem label="Enviada" value={new Date(respuesta.fechaEnvioEncuesta).toLocaleString('es-AR')} />
                            <DetailItem label="Respondida" value={new Date(respuesta.fechaRespuesta).toLocaleString('es-AR')} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calificaciones</p>
                          <div className="space-y-2">
                            {getCalificacionesConfigPorSlug(respuesta.tipoEncuestaSlug).map((item) => (
                              <ScoreLine
                                key={item.key}
                                label={item.label}
                                value={respuesta[item.key] as number | null}
                                nps={item.key.startsWith('nps')}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comentarios</p>
                          <div className="space-y-3 text-sm text-foreground">
                            <div>
                              <p className="font-medium text-foreground">Producto</p>
                              <p>{respuesta.comentarioProducto || 'Sin comentario.'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Empresa</p>
                              <p>{respuesta.comentarioEmpresa || 'Sin comentario.'}</p>
                            </div>
                            {respuesta.tipoEncuestaSlug === 'fin_garantia' && (
                              <div>
                                <p className="font-medium text-foreground">Problemas técnicos</p>
                                <p>
                                  {respuesta.tuvoProblemasTecnicos === null
                                    ? '—'
                                    : respuesta.tuvoProblemasTecnicos
                                      ? `Sí — ${respuesta.comentarioProblemas || 'sin comentario adicional'}`
                                      : 'No'}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-foreground">General</p>
                              <p>{respuesta.comentarioGeneral || 'Sin comentario.'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>,
                ]
              : []),
          ]
        })}
      </TableBody>
    </Table>
  )
}
