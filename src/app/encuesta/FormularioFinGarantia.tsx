'use client'

import { useActionState, useState } from 'react'
import { guardarRespuestaFinGarantiaAction } from './actions-fin-garantia'
import { CONCESIONARIOS, MAQUINAS_SEMBRADORA, MAQUINAS_FERTILIZADORA } from './form-options'

interface FormularioFinGarantiaProps {
  token: string
  concesionario: string
}

const inputClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#C0272D] focus:outline-none focus:ring-2 focus:ring-[#C0272D]/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500'

function CampoTexto({
  label, name, required, type = 'text', placeholder, disabled, defaultValue,
}: {
  label: string; name: string; required?: boolean; type?: string
  placeholder?: string; disabled?: boolean; defaultValue?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-[#C0272D] ml-0.5">*</span>}
      </label>
      <input
        id={name} name={name} type={type} required={required}
        disabled={disabled} defaultValue={defaultValue} placeholder={placeholder}
        className={inputClass}
      />
    </div>
  )
}

function CampoSelect({
  label, name, options, required, disabled, defaultValue,
}: {
  label: string; name: string; options: readonly string[]
  required?: boolean; disabled?: boolean; defaultValue?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-[#C0272D] ml-0.5">*</span>}
      </label>
      <select
        id={name} name={name} required={required} disabled={disabled}
        defaultValue={defaultValue ?? ''}
        className={inputClass}
      >
        <option value="" disabled>Seleccionar...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function CampoSelectMaquina({ disabled }: { disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="maquina_modelo" className="block text-sm font-medium text-gray-700">
        Sobre qué máquina está realizando esta encuesta<span className="text-[#C0272D] ml-0.5">*</span>
      </label>
      <select id="maquina_modelo" name="maquina_modelo" required disabled={disabled} defaultValue="" className={inputClass}>
        <option value="" disabled>Seleccionar...</option>
        {MAQUINAS_SEMBRADORA.length > 0 && (
          <optgroup label="Sembradoras">
            {MAQUINAS_SEMBRADORA.map((o) => <option key={o} value={o}>{o}</option>)}
          </optgroup>
        )}
        {MAQUINAS_FERTILIZADORA.length > 0 && (
          <optgroup label="Fertilizadoras">
            {MAQUINAS_FERTILIZADORA.map((o) => <option key={o} value={o}>{o}</option>)}
          </optgroup>
        )}
      </select>
    </div>
  )
}

function EscalaSelector({
  name, label, min = 1, max = 10, required, disabled,
}: {
  name: string; label: string; min?: number; max?: number; required?: boolean; disabled?: boolean
}) {
  const [selected, setSelected] = useState<number | null>(null)

  function getColor(n: number, isSelected: boolean) {
    if (!isSelected) return 'bg-white border-gray-300 text-gray-600 hover:border-[#C0272D] hover:text-[#C0272D] hover:bg-red-50'
    if (n <= 6) return 'bg-[#C0272D] border-[#C0272D] text-white shadow-md'
    if (n <= 8) return 'bg-amber-500 border-amber-500 text-white shadow-md'
    return 'bg-green-600 border-green-600 text-white shadow-md'
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 leading-relaxed">{label}</p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio" name={name} value={n} required={required} disabled={disabled}
              className="sr-only" onChange={() => setSelected(n)}
            />
            <span className={`flex items-center justify-center h-12 w-12 rounded-xl border-2 text-base font-bold transition-all select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${getColor(n, selected === n)}`}>
              {n}
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 pt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-[#C0272D]" />
          {min} = Muy insatisfecho / Muy improbable
        </span>
        <span className="flex items-center gap-1">
          {max} = Muy satisfecho / Muy probable
          <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
        </span>
      </div>
    </div>
  )
}

function SeccionHeader({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C0272D] text-sm font-bold text-white mt-0.5">
        {numero}
      </span>
      <h3 className="text-base font-semibold text-gray-900 leading-snug">{titulo}</h3>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>
      {children}
    </div>
  )
}

export default function FormularioFinGarantia({ token, concesionario }: FormularioFinGarantiaProps) {
  const [state, formAction, isPending] = useActionState(guardarRespuestaFinGarantiaAction, {})
  const [tuvoProblemas, setTuvoProblemas] = useState<boolean | null>(null)

  if (state.success) {
    return (
      <Card className="text-center py-14">
        <img src="/CrucianelliLogo.png" alt="Crucianelli" width={180} className="mx-auto mb-8" />
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-5">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Muchas gracias!</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
          Tu respuesta fue registrada correctamente. Tu opinión nos ayuda a seguir mejorando el producto y el servicio de Crucianelli.
        </p>
      </Card>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      {/* Intro */}
      <Card>
        <p className="text-sm leading-relaxed text-gray-600">
          Ha pasado un año desde la puesta en marcha de tu máquina Crucianelli. Queremos saber cómo fue tu experiencia durante este tiempo. Tus respuestas son confidenciales y nos ayudan a mejorar.
        </p>
      </Card>

      {/* Datos personales */}
      <Card>
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
            <svg className="h-4 w-4 text-[#C0272D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Información de contacto</h2>
        </div>
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
      </Card>

      {/* Datos de la experiencia */}
      <Card>
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
            <svg className="h-4 w-4 text-[#C0272D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Datos de la experiencia</h2>
        </div>
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
      </Card>

      {/* Pregunta 1: Funcionamiento anual */}
      <Card>
        <SeccionHeader numero={1} titulo="¿Cómo calificarías el funcionamiento general de la máquina durante este primer año de uso?" />
        <EscalaSelector
          name="calificacion_funcionamiento_anual"
          label="Considerando su desempeño en campo, confiabilidad y rendimiento general. Puntuá del 1 al 10."
          required
          disabled={isPending}
        />
      </Card>

      {/* Pregunta 2: Problemas técnicos */}
      <Card>
        <SeccionHeader numero={2} titulo="¿Tuviste algún problema técnico con la máquina durante el año?" />
        <div className="flex gap-3 mb-4">
          <label className="flex-1">
            <input
              type="radio"
              name="tuvo_problemas_tecnicos"
              value="si"
              required
              disabled={isPending}
              className="sr-only"
              onChange={() => setTuvoProblemas(true)}
            />
            <span className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-sm font-semibold cursor-pointer transition-all select-none ${tuvoProblemas === true ? 'border-[#C0272D] bg-red-50 text-[#C0272D]' : 'border-gray-300 text-gray-600 hover:border-[#C0272D] hover:bg-red-50'} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}>
              Sí, tuve problemas
            </span>
          </label>
          <label className="flex-1">
            <input
              type="radio"
              name="tuvo_problemas_tecnicos"
              value="no"
              required
              disabled={isPending}
              className="sr-only"
              onChange={() => setTuvoProblemas(false)}
            />
            <span className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-sm font-semibold cursor-pointer transition-all select-none ${tuvoProblemas === false ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-300 text-gray-600 hover:border-green-600 hover:bg-green-50'} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}>
              No tuve problemas
            </span>
          </label>
        </div>

        {/* Sub-preguntas condicionales si tuvo problemas */}
        {tuvoProblemas === true && (
          <div className="mt-4 space-y-5 rounded-xl border border-red-100 bg-red-50/40 p-5">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-4">
                ¿El problema fue resuelto correctamente y con rapidez?<span className="text-[#C0272D] ml-0.5">*</span>
              </p>
              <EscalaSelector
                name="calificacion_resolucion_problemas"
                label="En una escala del 1 al 10, donde 1 es muy insatisfecho y 10 muy satisfecho."
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Contanos qué pasó <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                name="comentario_problemas"
                rows={3}
                maxLength={1000}
                disabled={isPending}
                placeholder="Describí brevemente el problema y cómo fue atendido..."
                className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#C0272D] focus:outline-none focus:ring-2 focus:ring-[#C0272D]/20"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Pregunta 3: NPS Producto */}
      <Card>
        <SeccionHeader numero={3} titulo="Teniendo en cuenta tu experiencia con el producto Crucianelli durante este año (calidad, funcionamiento y desempeño en campo): ¿Qué tan probable es que lo recomiendes a un colega, amigo o familiar?" />
        <EscalaSelector
          name="nps_producto"
          label="En una escala del 1 al 10, donde 1 es muy improbable y 10 muy probable."
          required
          disabled={isPending}
        />
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Comentario sobre el producto <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            name="comentario_producto"
            rows={3}
            maxLength={1000}
            disabled={isPending}
            placeholder="¿Algo que podamos mejorar?"
            className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#C0272D] focus:outline-none focus:ring-2 focus:ring-[#C0272D]/20"
          />
        </div>
      </Card>

      {/* Pregunta 4: NPS Concesionario */}
      <Card>
        <SeccionHeader numero={4} titulo="Considerando el servicio postventa y el soporte recibido del concesionario durante el año: ¿Qué tan probable es que lo recomiendes a un colega o amigo?" />
        <EscalaSelector
          name="nps_concesionario"
          label="En una escala del 1 al 10, donde 1 es muy improbable y 10 muy probable."
          required
          disabled={isPending}
        />
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Comentario sobre el concesionario <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            name="comentario_concesionario"
            rows={3}
            maxLength={1000}
            disabled={isPending}
            placeholder="¿Algo que podamos mejorar?"
            className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#C0272D] focus:outline-none focus:ring-2 focus:ring-[#C0272D]/20"
          />
        </div>
      </Card>

      {/* Pregunta 5: NPS Empresa */}
      <Card>
        <SeccionHeader numero={5} titulo="Teniendo en cuenta tu experiencia general con Crucianelli a lo largo de este año: ¿Qué tan probable es que recomiendes la empresa a un colega, amigo o familiar?" />
        <EscalaSelector
          name="nps_empresa"
          label="En una escala del 1 al 10, donde 1 es muy improbable y 10 muy probable."
          required
          disabled={isPending}
        />
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Comentario sobre la empresa <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            name="comentario_empresa"
            rows={3}
            maxLength={1000}
            disabled={isPending}
            placeholder="¿Algo que podamos mejorar?"
            className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#C0272D] focus:outline-none focus:ring-2 focus:ring-[#C0272D]/20"
          />
        </div>
      </Card>

      {state?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-13 rounded-xl bg-[#C0272D] text-white font-semibold text-base shadow-lg shadow-red-200 transition-all hover:bg-[#9B1E23] hover:shadow-red-300 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 py-3.5"
      >
        {isPending ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Enviando respuesta...
          </>
        ) : (
          <>
            Enviar respuesta
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </>
        )}
      </button>
    </form>
  )
}
