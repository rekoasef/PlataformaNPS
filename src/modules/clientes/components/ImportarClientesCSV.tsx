'use client'

import { useActionState } from 'react'
import { importarClientesCSVAction } from '@/app/(dashboard)/clientes/actions'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export default function ImportarClientesCSV() {
  const [state, formAction, isPending] = useActionState(importarClientesCSVAction, {})

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-gray-900">Importar clientes desde CSV</h2>
        <p className="text-xs text-gray-500 mt-1">
          Columnas esperadas (en cualquier orden):
        </p>
        <ul className="mt-1 space-y-0.5">
          {[
            'CONCESIONARIO',
            'CLIENTE (según factura)',
            'ORDEN DE FABRICACION MÁQUINA (grabado en chasis)',
            'Teléfono del Cliente',
            'Teléfono del Cliente 2 (opcional)',
            'Teléfono del Cliente 3 (opcional)',
            'TECNOLOGIA / TECNOLOGÍA (Leaf o Precision Planting, opcional)',
          ].map((col) => (
            <li key={col}>
              <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{col}</code>
            </li>
          ))}
        </ul>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1 w-full">
            <input
              name="archivo"
              type="file"
              accept=".csv,text/csv"
              required
              disabled={isPending}
              className="block w-full text-sm text-gray-600
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-gray-100 file:text-gray-700
                hover:file:bg-gray-200
                cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Button type="submit" disabled={isPending} className="shrink-0">
            {isPending ? 'Importando...' : 'Importar CSV'}
          </Button>
        </form>

        {state?.error && (
          <p className="mt-3 text-sm text-red-600">{state.error}</p>
        )}
        {state?.success && (
          <p className="mt-3 text-sm text-green-700 font-medium">
            {state.imported} cliente{state.imported !== 1 ? 's' : ''} importado{state.imported !== 1 ? 's' : ''} correctamente.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
