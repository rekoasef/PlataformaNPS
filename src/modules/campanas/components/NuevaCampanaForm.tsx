'use client'

import Link from 'next/link'
import { useActionState, useState, useMemo } from 'react'
import { crearCampanaAction } from '@/app/(dashboard)/campanas/actions'
import { parseClientesCSV, type ClienteCSVRow } from '@/lib/utils/csv'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { formatTecnologia } from '@/lib/utils/tecnologia'
import { formatTipoMaquina } from '@/lib/utils/tipoMaquina'
import type { OFElegible } from '../services/campanas.service'

const today = new Date().toISOString().split('T')[0]

type Tipo = { id: string; nombre: string; slug: string }

interface Props {
  tipos: Tipo[]
  ofsElegibles: OFElegible[]
}

export default function NuevaCampanaForm({ tipos, ofsElegibles }: Props) {
  const [state, formAction, isPending] = useActionState(crearCampanaAction, {})
  const [preview, setPreview] = useState<ClienteCSVRow[]>([])
  const [csvError, setCsvError] = useState<string>('')
  const [tipoId, setTipoId] = useState<string>(tipos[0]?.id ?? '')
  const [selectedOFs, setSelectedOFs] = useState<Set<string>>(new Set())
  const [busquedaOF, setBusquedaOF] = useState<string>('')

  const tipoSlug = tipos.find((t) => t.id === tipoId)?.slug ?? ''
  const esFinGarantia = tipoSlug === 'fin_garantia'

  const ofsFiltradas = useMemo(() => {
    const q = busquedaOF.toLowerCase()
    if (!q) return ofsElegibles
    return ofsElegibles.filter(
      (of) =>
        of.ordenFabricacion.toLowerCase().includes(q) ||
        of.nombre.toLowerCase().includes(q) ||
        of.concesionario.toLowerCase().includes(q)
    )
  }, [ofsElegibles, busquedaOF])

  function toggleOF(clienteId: string) {
    setSelectedOFs((prev) => {
      const next = new Set(prev)
      if (next.has(clienteId)) next.delete(clienteId)
      else next.add(clienteId)
      return next
    })
  }

  function toggleTodos() {
    if (selectedOFs.size === ofsFiltradas.length && ofsFiltradas.length > 0) {
      setSelectedOFs(new Set())
    } else {
      setSelectedOFs(new Set(ofsFiltradas.map((of) => of.clienteId)))
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setPreview([]); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseClientesCSV(ev.target?.result as string)
        setPreview(rows)
        setCsvError('')
      } catch (err: unknown) {
        setPreview([])
        setCsvError(err instanceof Error ? err.message : 'Error al leer el archivo.')
      }
    }
    reader.readAsText(file)
  }

  const totalClientes = selectedOFs.size + preview.length

  return (
    <form action={formAction} className="space-y-6">
      {/* Datos de la campaña */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">Datos de la campaña</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre de la campaña"
              name="nombre"
              placeholder="Ej: Campaña Junio 2025"
              required
              disabled={isPending}
            />
            <Input
              label="Fecha"
              name="fecha"
              type="date"
              defaultValue={today}
              required
              disabled={isPending}
            />
          </div>

          {/* Selector de tipo de encuesta */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Tipo de encuesta</p>
            <div className="flex gap-3">
              {tipos.map((tipo) => (
                <label key={tipo.id} className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo_encuesta_id"
                    value={tipo.id}
                    checked={tipoId === tipo.id}
                    onChange={() => { setTipoId(tipo.id); setSelectedOFs(new Set()) }}
                    disabled={isPending}
                    className="sr-only"
                  />
                  <span className={`flex items-center justify-center gap-2 h-11 rounded-lg border-2 text-sm font-semibold transition-all select-none ${
                    tipoId === tipo.id
                      ? 'border-[#C0272D] bg-red-50 text-[#C0272D]'
                      : 'border-border text-muted-foreground hover:border-[#C0272D]/50'
                  } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {tipo.nombre}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel OFs elegibles (solo fin de garantía) */}
      {esFinGarantia && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  OFs que completaron 12 meses
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Clientes con campaña de inicio de garantía con más de un año de antigüedad que aún no recibieron la encuesta de fin.
                </p>
              </div>
              {ofsElegibles.length > 0 && (
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {ofsElegibles.length} disponibles
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ofsElegibles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay OFs que hayan cumplido 12 meses sin recibir la encuesta de fin de garantía.
              </p>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Buscar por OF, nombre o concesionario..."
                    value={busquedaOF}
                    onChange={(e) => setBusquedaOF(e.target.value)}
                    disabled={isPending}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder-muted-foreground focus:border-[#C0272D] focus:outline-none focus:ring-2 focus:ring-[#C0272D]/20"
                  />
                  {selectedOFs.size > 0 && (
                    <span className="flex items-center rounded-md bg-red-50 px-3 text-sm font-medium text-[#C0272D] border border-red-200">
                      {selectedOFs.size} seleccionada{selectedOFs.size !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="rounded-md border border-border overflow-hidden">
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b border-border sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5 text-left w-10">
                            <input
                              type="checkbox"
                              checked={ofsFiltradas.length > 0 && selectedOFs.size === ofsFiltradas.length}
                              onChange={toggleTodos}
                              disabled={isPending || ofsFiltradas.length === 0}
                              className="rounded border-border accent-[#C0272D]"
                              title="Seleccionar todos"
                            />
                          </th>
                          {['OF', 'Nombre', 'Concesionario', 'Tecnología', 'Campaña inicio', 'Fecha inicio'].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left text-muted-foreground font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ofsFiltradas.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                              Sin resultados para &quot;{busquedaOF}&quot;
                            </td>
                          </tr>
                        ) : (
                          ofsFiltradas.map((of) => (
                            <tr
                              key={of.clienteId}
                              className={`cursor-pointer transition-colors ${selectedOFs.has(of.clienteId) ? 'bg-red-50' : 'hover:bg-muted/30'}`}
                              onClick={() => !isPending && toggleOF(of.clienteId)}
                            >
                              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedOFs.has(of.clienteId)}
                                  onChange={() => toggleOF(of.clienteId)}
                                  disabled={isPending}
                                  className="rounded border-border accent-[#C0272D]"
                                />
                              </td>
                              <td className="px-3 py-2.5 font-mono font-medium text-foreground">{of.ordenFabricacion}</td>
                              <td className="px-3 py-2.5 text-foreground">{of.nombre}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{of.concesionario}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{formatTecnologia(of.tecnologia)}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{of.campanaInicioNombre}</td>
                              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                                {new Date(of.campanaInicioFecha).toLocaleDateString('es-AR')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inputs ocultos para los IDs seleccionados */}
                {Array.from(selectedOFs).map((id) => (
                  <input key={id} type="hidden" name="cliente_id" value={id} />
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* CSV — requerido para inicio, opcional para fin de garantía */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {esFinGarantia ? 'Importar clientes adicionales (CSV)' : 'Clientes (CSV)'}
            {esFinGarantia && <span className="ml-2 text-xs font-normal text-muted-foreground">opcional</span>}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Columnas esperadas:{' '}
            <code className="bg-muted px-1 rounded text-xs">
              CONCESIONARIO, CLIENTE (según factura), ORDEN DE FABRICACION MÁQUINA, Teléfono del Cliente
            </code>
            <br />
            Opcionales:{' '}
            <code className="bg-muted px-1 rounded text-xs">
              tecnologia (Leaf / Precision Planting), tipo_maquina (Gringa, Pionera, Plantor, Drilor, Mixia, Domina, Corper (incorporadora), Raster (motriz), Movia (arrastre), Luxion)
            </code>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            name="archivo"
            type="file"
            accept=".csv,text/csv"
            required={!esFinGarantia}
            disabled={isPending}
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
              file:text-sm file:font-medium file:bg-muted file:text-foreground
              hover:file:bg-muted cursor-pointer"
          />

          {csvError && <p className="text-sm text-red-600">{csvError}</p>}

          {preview.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                Vista previa — {preview.length} cliente{preview.length !== 1 ? 's' : ''} en el CSV
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {['Nombre', 'Tel. 1', 'Tel. 2', 'Tel. 3', 'Concesionario', 'OF', 'Tecnología', 'Máquina'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-foreground">{row.nombre}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.telefono}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.telefono_2 ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.telefono_3 ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.concesionario}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.orden_fabricacion}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatTecnologia(row.tecnologia)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatTipoMaquina(row.tipo_maquina)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 10 && (
                <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
                  y {preview.length - 10} cliente{preview.length - 10 !== 1 ? 's' : ''} más...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex justify-end gap-3">
        <Link
          href="/campanas"
          className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          disabled={isPending || (esFinGarantia ? totalClientes === 0 : preview.length === 0)}
        >
          {isPending
            ? 'Creando campaña...'
            : `Crear campaña${totalClientes > 0 ? ` (${totalClientes} cliente${totalClientes !== 1 ? 's' : ''})` : ''}`
          }
        </Button>
      </div>
    </form>
  )
}
