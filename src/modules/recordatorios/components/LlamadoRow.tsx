'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { TableCell, TableRow } from '@/components/ui/Table'
import { cn } from '@/lib/utils/cn'
import { agregarMedidaAction } from '@/app/(dashboard)/llamados/actions'
import MarcarSinRespuestaForm from './MarcarSinRespuestaForm'
import MedidaItem from './MedidaItem'
import type { EncuestaNecesidadLlamado } from '../types/recordatorio.types'

const COLUMN_COUNT = 11

const tipoBadge: Record<string, 'info' | 'warning'> = {
  inicio_garantia: 'info',
  fin_garantia:    'warning',
}

interface LlamadoRowProps {
  encuesta: EncuestaNecesidadLlamado
}

export default function LlamadoRow({ encuesta }: LlamadoRowProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(agregarMedidaAction, {})
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <>
      <TableRow>
        <TableCell>{encuesta.campana?.nombre ?? '—'}</TableCell>
        <TableCell>
          {encuesta.campana?.tipoSlug && encuesta.campana?.tipoNombre ? (
            <Badge variant={tipoBadge[encuesta.campana.tipoSlug] ?? 'default'}>
              {encuesta.campana.tipoNombre}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="font-medium">{encuesta.cliente?.nombre ?? '—'}</TableCell>
        <TableCell>{encuesta.cliente?.orden_fabricacion ?? '—'}</TableCell>
        <TableCell>{encuesta.cliente?.concesionario ?? '—'}</TableCell>
        <TableCell>{encuesta.cliente?.telefono ?? '—'}</TableCell>
        <TableCell>{encuesta.cliente?.telefono_2 ?? '—'}</TableCell>
        <TableCell>{encuesta.cliente?.telefono_3 ?? '—'}</TableCell>
        <TableCell>
          <Badge variant="warning">necesidad_de_llamado</Badge>
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-90')}
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                clipRule="evenodd"
              />
            </svg>
            Medidas {encuesta.medidas.length > 0 ? `(${encuesta.medidas.length})` : ''}
          </button>
        </TableCell>
        <TableCell>
          <div className="flex flex-col items-start gap-2">
            <Link
              href={`/encuesta?token=${encuesta.token}`}
              className="text-sm font-medium text-brand hover:underline"
            >
              Abrir encuesta
            </Link>
            <MarcarSinRespuestaForm encuestaId={encuesta.id} />
          </div>
        </TableCell>
      </TableRow>

      {open && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={COLUMN_COUNT} className="bg-muted/20">
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              {encuesta.medidas.length > 0 ? (
                <ul className="space-y-3">
                  {encuesta.medidas.map((medida) => (
                    <MedidaItem key={medida.id} medida={medida} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Todavía no hay medidas cargadas.</p>
              )}

              <form ref={formRef} action={formAction} className="flex items-start gap-2">
                <input type="hidden" name="encuestaId" value={encuesta.id} />
                <textarea
                  name="comentario"
                  rows={2}
                  required
                  minLength={3}
                  maxLength={2000}
                  disabled={isPending}
                  placeholder="Agregar medida (ej: llamé, no atiende)"
                  className="block w-full max-w-md flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
                  {isPending ? 'Guardando...' : 'Agregar medida'}
                </Button>
              </form>
              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
