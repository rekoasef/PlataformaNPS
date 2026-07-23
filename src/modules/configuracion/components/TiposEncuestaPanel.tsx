'use client'

import { useActionState, useState } from 'react'
import { actualizarEnviaRegaloAction } from '@/app/(dashboard)/configuracion/actions'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { TipoEncuesta } from '../types/configuracion.types'

function TipoEncuestaRow({ tipo }: { tipo: TipoEncuesta }) {
  const [state, formAction, isPending] = useActionState(actualizarEnviaRegaloAction, {})
  const [checked, setChecked] = useState(tipo.envia_regalo)

  return (
    <form
      action={formAction}
      className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
    >
      <input type="hidden" name="tipoEncuestaId" value={tipo.id} />
      <input type="hidden" name="enviaRegalo" value={checked ? 'true' : 'false'} />

      <div>
        <p className="text-sm font-medium text-foreground">{tipo.nombre}</p>
        <p className="text-xs text-muted-foreground">
          Al responderse, notifica a Rambla y la carga en el apartado de despacho de regalos.
        </p>
        {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
        {state?.success && (
          <p className="mt-1 text-xs font-medium text-green-700">Guardado correctamente.</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={checked}
          disabled={isPending}
          onChange={(e) => setChecked(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        Envía regalo
      </label>

      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  )
}

interface TiposEncuestaPanelProps {
  tipos: TipoEncuesta[]
}

export default function TiposEncuestaPanel({ tipos }: TiposEncuestaPanelProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">Tipos de encuesta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Definí para qué tipos de encuesta se dispara el flujo de envío de regalo (email y
          apartado de Rambla).
        </p>
      </CardHeader>
      <CardContent>
        {tipos.map((tipo) => (
          <TipoEncuestaRow key={tipo.id} tipo={tipo} />
        ))}
      </CardContent>
    </Card>
  )
}
