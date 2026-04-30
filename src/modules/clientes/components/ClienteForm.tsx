'use client'

import { useActionState, useEffect, useRef } from 'react'
import { crearClienteAction } from '@/app/(dashboard)/clientes/actions'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { TECNOLOGIAS } from '@/lib/utils/tecnologia'

export default function ClienteForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(crearClienteAction, {})

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
    }
  }, [state.success])

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-gray-900">Agregar OF manualmente</h2>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Nombre" name="nombre" required disabled={isPending} />
          <Input label="Teléfono 1" name="telefono" type="tel" required disabled={isPending} />
          <Input label="Teléfono 2" name="telefono_2" type="tel" disabled={isPending} />
          <Input label="Teléfono 3" name="telefono_3" type="tel" disabled={isPending} />
          <Input label="Concesionario" name="concesionario" required disabled={isPending} />
          <Input label="OF" name="orden_fabricacion" required disabled={isPending} />
          <div className="space-y-1">
            <label htmlFor="tecnologia" className="block text-sm font-medium text-gray-700">
              Tecnología
            </label>
            <select
              id="tecnologia"
              name="tecnologia"
              disabled={isPending}
              defaultValue=""
              className="block h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">Sin tecnología</option>
              {TECNOLOGIAS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {state?.error && (
            <p className="lg:col-span-4 text-sm text-red-600">{state.error}</p>
          )}
          {state?.success && (
            <p className="lg:col-span-4 text-sm text-green-700">OF agregada correctamente.</p>
          )}

          <div className="lg:col-span-4 flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar cliente'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
