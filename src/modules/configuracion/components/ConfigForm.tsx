'use client'

import { useActionState } from 'react'
import {
  actualizarConfiguracionAction,
  enviarEmailPruebaAction,
} from '@/app/(dashboard)/configuracion/actions'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { SystemConfig } from '../types/configuracion.types'

interface ConfigFormProps {
  config: SystemConfig
}

export default function ConfigForm({ config }: ConfigFormProps) {
  const [state, formAction, isPending] = useActionState(actualizarConfiguracionAction, {})
  const [testState, testFormAction, isSendingTest] = useActionState(enviarEmailPruebaAction, {})

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Configuración global</h2>
          <p className="mt-1 text-sm text-gray-500">
            Estos valores controlan las notificaciones y los destinatarios del sistema.
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="id" value={config.id} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Días para mandar primer recordatorio"
                name="dias_notificacion_inicial"
                type="number"
                min={1}
                required
                defaultValue={config.dias_notificacion_inicial}
                disabled={isPending}
              />
              <Input
                label="Días para pasar de estado a (necesidad de llamado)"
                name="dias_hasta_llamado"
                type="number"
                min={1}
                required
                defaultValue={config.dias_hasta_llamado}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="emails_notificacion"
                className="block text-sm font-medium text-gray-700"
              >
                Emails de notificación
              </label>
              <textarea
                id="emails_notificacion"
                name="emails_notificacion"
                rows={6}
                disabled={isPending}
                defaultValue={config.emails_notificacion.join('\n')}
                placeholder={'responsable@empresa.com\nsupervision@empresa.com'}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-500">
                Ingresa un email por línea o separados por coma.
              </p>
            </div>

            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state?.success && (
              <p className="text-sm font-medium text-green-700">
                Configuración actualizada correctamente.
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Prueba de email SMTP</h2>
          <p className="mt-1 text-sm text-gray-500">
            Envía un correo de prueba con la configuración SMTP actual.
          </p>
        </CardHeader>
        <CardContent>
          <form action={testFormAction} className="space-y-4">
            <Input
              label="Destinatario de prueba"
              name="to"
              type="email"
              placeholder={config.emails_notificacion[0] ?? 'destinatario@empresa.com'}
              disabled={isSendingTest}
            />

            <p className="text-xs text-gray-500">
              Si dejas este campo vacío, se usará el primer email configurado en notificaciones.
            </p>

            {testState?.error && <p className="text-sm text-red-600">{testState.error}</p>}
            {testState?.success && (
              <p className="text-sm font-medium text-green-700">
                Email de prueba enviado a {testState.sentTo}.
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" variant="secondary" disabled={isSendingTest}>
                {isSendingTest ? 'Enviando prueba...' : 'Enviar email de prueba'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
