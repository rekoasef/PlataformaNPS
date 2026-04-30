'use client'

import { useActionState, useState } from 'react'
import { guardarRespuestaAction } from './actions'
import { CONCESIONARIOS, MAQUINAS_SEMBRADORA, MAQUINAS_FERTILIZADORA } from './form-options'

interface FormularioEncuestaProps {
  token: string
  concesionario: string
}

function CampoTexto({
  label,
  name,
  required,
  type = 'text',
  placeholder,
  disabled,
  defaultValue,
}: {
  label: string
  name: string
  required?: boolean
  type?: string
  placeholder?: string
  disabled?: boolean
  defaultValue?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  )
}

function CampoSelect({
  label,
  name,
  options,
  required,
  disabled,
  defaultValue,
}: {
  label: string
  name: string
  options: readonly string[]
  required?: boolean
  disabled?: boolean
  defaultValue?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required ? ' *' : ''}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue ?? ''}
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
      >
        <option value="" disabled>
          Seleccionar...
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function CampoSelectMaquina({ disabled }: { disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label htmlFor="maquina_modelo" className="block text-sm font-medium text-gray-700">
        Sobre qué máquina está realizando esta encuesta *
      </label>
      <select
        id="maquina_modelo"
        name="maquina_modelo"
        required
        disabled={disabled}
        defaultValue=""
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
      >
        <option value="" disabled>
          Seleccionar...
        </option>
        {MAQUINAS_SEMBRADORA.length > 0 && (
          <optgroup label="Sembradoras">
            {MAQUINAS_SEMBRADORA.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </optgroup>
        )}
        {MAQUINAS_FERTILIZADORA.length > 0 && (
          <optgroup label="Fertilizadoras">
            {MAQUINAS_FERTILIZADORA.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  )
}

function EscalaSelector({
  name,
  label,
  min = 1,
  max = 10,
  required,
}: {
  name: string
  label: string
  min?: number
  max?: number
  required?: boolean
}) {
  const [selected, setSelected] = useState<number | null>(null)

  function getColor(n: number, isSelected: boolean) {
    if (!isSelected) return 'bg-white border-gray-300 text-gray-700 hover:border-brand hover:text-brand'
    if (n <= 6) return 'bg-red-600 border-red-600 text-white'
    if (n <= 8) return 'bg-yellow-500 border-yellow-500 text-white'
    return 'bg-green-600 border-green-600 text-white'
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={n}
              required={required}
              className="sr-only"
              onChange={() => setSelected(n)}
            />
            <span
              className={`flex items-center justify-center h-10 w-10 rounded-lg border-2 text-sm font-semibold transition-all select-none ${getColor(n, selected === n)}`}
            >
              {n}
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min} — Muy improbable / Muy insatisfecho</span>
        <span>{max} — Muy probable / Muy satisfecho</span>
      </div>
    </div>
  )
}

function BloquePregunta({
  numero,
  title,
  children,
}: {
  numero: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {numero}
        </span>
        <h3 className="pt-0.5 text-base font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function FormularioEncuesta({ token, concesionario }: FormularioEncuestaProps) {
  const [state, formAction, isPending] = useActionState(guardarRespuestaAction, {})

  if (state.success) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">¡Muchas gracias!</h2>
        <p className="mx-auto max-w-lg text-sm text-gray-500">
          Se registró tu respuesta correctamente. Tu opinión es clave para mejorar el producto, la atención del concesionario y la experiencia con Crucianelli.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="token" value={token} />

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">2026 - Encuesta de satisfacción oficial Crucianelli</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Gracias por participar. Completá esta breve encuesta para ayudarnos a mejorar el producto, la atención del concesionario y la experiencia general con Crucianelli.
        </p>
      </div>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Información de contacto</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CampoTexto label="Nombre y apellido" name="nombre_apellido" required disabled={isPending} />
          <CampoTexto label="Calle y número" name="calle_numero" required disabled={isPending} />
          <CampoTexto label="Piso y Departamento (si requiere)" name="piso_departamento" disabled={isPending} />
          <CampoTexto label="Localidad" name="localidad" required disabled={isPending} />
          <CampoTexto label="Código postal" name="codigo_postal" required disabled={isPending} />
          <CampoTexto label="Provincia" name="provincia" required disabled={isPending} />
          <CampoTexto label="Email" name="email" type="email" required disabled={isPending} />
          <CampoTexto label="Teléfono" name="telefono" required disabled={isPending} />
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Datos de la experiencia</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CampoSelect
            label="Concesionario sede"
            name="concesionario_sede"
            options={CONCESIONARIOS}
            required
            disabled={isPending}
            defaultValue={CONCESIONARIOS.includes(concesionario as (typeof CONCESIONARIOS)[number]) ? concesionario : undefined}
          />
          <CampoSelectMaquina disabled={isPending} />
          <div className="md:col-span-2">
            <CampoTexto
              label="Bajo qué nombre o firma salió facturada la máquina"
              name="nombre_firma_factura"
              required
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      <BloquePregunta
        numero={1}
        title="¿Cómo fue el proceso de entrega y presentación de tu producto?"
      >
        <EscalaSelector
          name="calificacion_entrega_presentacion"
          label="En una escala del 1 al 10, donde 1 es muy insatisfecho y 10 muy satisfecho."
          required
        />
      </BloquePregunta>

      <BloquePregunta
        numero={2}
        title="¿Cómo fue la puesta en marcha realizada por el concesionario o técnico?"
      >
        <EscalaSelector
          name="calificacion_puesta_marcha"
          label="En una escala del 1 al 10."
          required
        />
      </BloquePregunta>

      <BloquePregunta
        numero={3}
        title="¿Qué tan satisfecho estás con la capacitación recibida sobre el uso y mantenimiento del producto?"
      >
        <EscalaSelector
          name="calificacion_capacitacion"
          label="Contempla producto y monitor. Puntúa del 1 al 10."
          required
        />
      </BloquePregunta>

      <BloquePregunta
        numero={4}
        title="¿Cómo describirías el funcionamiento general del producto?"
      >
        <EscalaSelector
          name="calificacion_funcionamiento_general"
          label="Hasta el momento, puntúa del 1 al 10."
          required
        />
      </BloquePregunta>

      <BloquePregunta
        numero={5}
        title="¿Cómo fue el trato, la predisposición y el conocimiento del técnico presente?"
      >
        <EscalaSelector
          name="calificacion_tecnico"
          label="Pensando en la atención del técnico o representante durante la entrega y puesta en marcha. Puntúa del 1 al 10."
          required
        />
      </BloquePregunta>

      <BloquePregunta
        numero={6}
        title="NPS concesionario"
      >
        <EscalaSelector
          name="nps_concesionario"
          label="Teniendo en cuenta la entrega, capacitación y puesta en marcha: ¿Qué tan probable es que recomiendes al concesionario Crucianelli a un colega o amigo?"
          required
        />
      </BloquePregunta>

      <BloquePregunta
        numero={7}
        title="NPS producto"
      >
        <EscalaSelector
          name="nps_producto"
          label="Teniendo en cuenta tu experiencia con el producto Crucianelli (calidad, funcionamiento y desempeño en campo): ¿Qué tan probable es que recomiendes un producto Crucianelli a un colega, amigo o familiar?"
          required
        />
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            ¿Desea dejarnos algún comentario para saber cómo podemos mejorar nuestro producto? (opcional)
          </label>
          <textarea
            name="comentario_producto"
            rows={4}
            maxLength={1000}
            disabled={isPending}
            className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </BloquePregunta>

      <BloquePregunta
        numero={8}
        title="NPS empresa"
      >
        <EscalaSelector
          name="nps_empresa"
          label="Teniendo en cuenta tu experiencia general con Crucianelli (atención, capacitación, entrega y soporte): ¿Qué tan probable es que recomiendes la empresa Crucianelli a un colega, amigo o familiar?"
          required
        />
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            ¿Desea dejarnos algún comentario para saber cómo podemos mejorar como empresa? (opcional)
          </label>
          <textarea
            name="comentario_empresa"
            rows={4}
            maxLength={1000}
            disabled={isPending}
            className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </BloquePregunta>

      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Enviando...' : 'Enviar respuesta'}
      </button>
    </form>
  )
}
