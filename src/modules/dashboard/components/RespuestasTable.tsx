'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import type { RespuestaDetalle } from '../services/dashboard.service'
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
      <span className="font-medium text-gray-900">{label}:</span> {valueOrDash(value)}
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
    <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2">
      <span className="text-sm text-gray-700">{label}</span>
      {value === null ? (
        <span className="text-sm text-gray-400">—</span>
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
    return <div className="py-12 text-center text-sm text-gray-500">No hay respuestas para mostrar.</div>
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
              <TableCell className="text-gray-500">
                {new Date(respuesta.fechaRespuesta).toLocaleDateString('es-AR')}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{respuesta.nombreApellido ?? respuesta.clienteNombre}</p>
                  <p className="text-xs text-gray-500">{respuesta.email ?? respuesta.clienteTelefono}</p>
                </div>
              </TableCell>
              <TableCell>{respuesta.campanaNombre}</TableCell>
              <TableCell>{respuesta.concesionario}</TableCell>
              <TableCell>{respuesta.maquinaModelo ?? '—'}</TableCell>
              <TableCell className="text-gray-500">{formatTecnologia(respuesta.tecnologia)}</TableCell>
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
                  <TableRow key={`${respuesta.encuestaId}-detail`} className="bg-gray-50 hover:bg-gray-50">
                    <TableCell colSpan={10}>
                      <div className="grid grid-cols-1 gap-6 p-3 xl:grid-cols-4">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contacto</p>
                          <div className="space-y-1 text-sm text-gray-700">
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
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Encuesta</p>
                          <div className="space-y-1 text-sm text-gray-700">
                            <DetailItem label="Campaña" value={respuesta.campanaNombre} />
                            <DetailItem label="Concesionario importado" value={respuesta.concesionario} />
                            <DetailItem label="Concesionario sede" value={respuesta.concesionarioSede} />
                            <DetailItem label="Producto" value={respuesta.maquinaModelo} />
                            <DetailItem label="Tipo" value={respuesta.tipoMaquina} />
                            <DetailItem label="Tecnología" value={formatTecnologia(respuesta.tecnologia)} />
                            <DetailItem label="Firma factura" value={respuesta.nombreFirmaFactura} />
                            <DetailItem label="Orden fabricación" value={respuesta.ordenFabricacion} />
                            <DetailItem label="Enviada" value={new Date(respuesta.fechaEnvioEncuesta).toLocaleString('es-AR')} />
                            <DetailItem label="Respondida" value={new Date(respuesta.fechaRespuesta).toLocaleString('es-AR')} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Calificaciones</p>
                          <div className="space-y-2">
                            <ScoreLine label="Entrega y presentación" value={respuesta.calificacionEntregaPresentacion} />
                            <ScoreLine label="Puesta en marcha" value={respuesta.calificacionPuestaMarcha} />
                            <ScoreLine label="Capacitación" value={respuesta.calificacionCapacitacion} />
                            <ScoreLine label="Funcionamiento general" value={respuesta.calificacionFuncionamientoGeneral} />
                            <ScoreLine label="Técnico" value={respuesta.calificacionTecnico} />
                            <ScoreLine label="NPS concesionario" value={respuesta.npsConcesionario} nps />
                            <ScoreLine label="NPS producto" value={respuesta.npsProducto} nps />
                            <ScoreLine label="NPS empresa" value={respuesta.npsEmpresa} nps />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Comentarios</p>
                          <div className="space-y-3 text-sm text-gray-700">
                            <div>
                              <p className="font-medium text-gray-900">Producto</p>
                              <p>{respuesta.comentarioProducto || 'Sin comentario.'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Empresa</p>
                              <p>{respuesta.comentarioEmpresa || 'Sin comentario.'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">General</p>
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
