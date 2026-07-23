'use server'

import { z } from 'zod'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { enviarAlertaNpsCritico, enviarNotificacionRambla } from '@/modules/alertas/services/alertas.service'
import { CONCESIONARIOS, MAQUINAS, getTipoMaquina } from './form-options'

const RespuestaSchema = z.object({
  token: z.string().uuid(),
  nombre_apellido: z.string().min(1).max(200),
  calle_numero: z.string().min(1).max(200),
  piso_departamento: z.string().max(200).optional(),
  localidad: z.string().min(1).max(200),
  codigo_postal: z.string().min(1).max(50),
  provincia: z.string().min(1).max(200),
  email: z.string().email().max(200),
  telefono: z.string().min(1).max(50),
  concesionario_sede: z.enum(CONCESIONARIOS),
  maquina_modelo: z.enum(MAQUINAS),
  nombre_firma_factura: z.string().min(1).max(200),
  calificacion_entrega_presentacion: z.coerce.number().int().min(1).max(10),
  calificacion_capacitacion: z.coerce.number().int().min(1).max(10),
  calificacion_tecnico: z.coerce.number().int().min(1).max(10),
  nps_concesionario: z.coerce.number().int().min(1).max(10),
  nps_producto: z.coerce.number().int().min(1).max(10),
  nps_empresa: z.coerce.number().int().min(1).max(10),
  comentario_concesionario: z.string().max(1000).optional(),
  comentario_producto: z.string().max(1000).optional(),
  comentario_empresa: z.string().max(1000).optional(),
})

type State = { error?: string; success?: boolean }

export async function guardarRespuestaAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const raw = {
    token: formData.get('token'),
    nombre_apellido: formData.get('nombre_apellido'),
    calle_numero: formData.get('calle_numero'),
    piso_departamento: formData.get('piso_departamento'),
    localidad: formData.get('localidad'),
    codigo_postal: formData.get('codigo_postal'),
    provincia: formData.get('provincia'),
    email: formData.get('email'),
    telefono: formData.get('telefono'),
    concesionario_sede: formData.get('concesionario_sede'),
    maquina_modelo: formData.get('maquina_modelo'),
    nombre_firma_factura: formData.get('nombre_firma_factura'),
    calificacion_entrega_presentacion: formData.get('calificacion_entrega_presentacion'),
    calificacion_capacitacion: formData.get('calificacion_capacitacion'),
    calificacion_tecnico: formData.get('calificacion_tecnico'),
    nps_concesionario: formData.get('nps_concesionario'),
    nps_producto: formData.get('nps_producto'),
    nps_empresa: formData.get('nps_empresa'),
    comentario_concesionario: formData.get('comentario_concesionario'),
    comentario_producto: formData.get('comentario_producto'),
    comentario_empresa: formData.get('comentario_empresa'),
  }

  const result = RespuestaSchema.safeParse(raw)
  if (!result.success) {
    return { error: 'Por favor completá todas las preguntas antes de enviar.' }
  }

  const supabase = createSupabaseAdmin()

  // 1. Re-validar token en servidor
  const { data: encuesta } = await supabase
    .from('encuestas')
    .select('id, estado, campanas(tipos_encuesta(envia_regalo))')
    .eq('token', result.data.token)
    .single()

  if (!encuesta) return { error: 'El link de encuesta no es válido.' }
  if (encuesta.estado === 'respondida') return { error: 'Esta encuesta ya fue completada.' }
  if (encuesta.estado === 'sin_respuesta') return { error: 'Esta encuesta fue cerrada como sin respuesta.' }

  // 2. Doble check: verificar que no exista respuesta previa
  const { data: respuestaExistente } = await supabase
    .from('respuestas')
    .select('id')
    .eq('encuesta_id', encuesta.id)
    .maybeSingle()

  if (respuestaExistente) return { error: 'Esta encuesta ya fue completada.' }

  const tipoMaquina = getTipoMaquina(result.data.maquina_modelo)
  if (!tipoMaquina) {
    return { error: 'No se pudo determinar el tipo de máquina seleccionada.' }
  }

  // 3. Insertar respuesta (el trigger actualiza encuesta.estado automáticamente)
  const canalRespuesta = encuesta.estado === 'necesidad_de_llamado' ? 'llamado' : 'mensaje'
  const { error: errInsert } = await supabase.from('respuestas').insert({
    encuesta_id: encuesta.id,
    canal_respuesta: canalRespuesta,
    nombre_apellido: result.data.nombre_apellido,
    calle_numero: result.data.calle_numero,
    piso_departamento: result.data.piso_departamento || null,
    localidad: result.data.localidad,
    codigo_postal: result.data.codigo_postal,
    provincia: result.data.provincia,
    email: result.data.email,
    telefono: result.data.telefono,
    concesionario_sede: result.data.concesionario_sede,
    maquina_modelo: result.data.maquina_modelo,
    tipo_maquina: tipoMaquina,
    nombre_firma_factura: result.data.nombre_firma_factura,
    calificacion_entrega_presentacion: result.data.calificacion_entrega_presentacion,
    calificacion_capacitacion: result.data.calificacion_capacitacion,
    calificacion_tecnico: result.data.calificacion_tecnico,
    nps_producto: result.data.nps_producto,
    nps_empresa: result.data.nps_empresa,
    nps_concesionario: result.data.nps_concesionario,
    comentario_concesionario: result.data.comentario_concesionario || null,
    comentario_producto: result.data.comentario_producto || null,
    comentario_empresa: result.data.comentario_empresa || null,
    comentario_general: null,
  })

  if (errInsert) return { error: 'Error al guardar la respuesta. Por favor intentá nuevamente.' }

  // Disparar alerta email + notificaciones en paralelo (errores no bloquean la respuesta)
  const { nps_producto, nps_empresa, nps_concesionario } = result.data
  const esNPSCritico = nps_producto <= 6 || nps_empresa <= 6 || nps_concesionario <= 6
  const nombre = result.data.nombre_apellido
  const concesionario = result.data.concesionario_sede

  const campana = Array.isArray(encuesta.campanas) ? encuesta.campanas[0] : encuesta.campanas
  const tipoEncuesta = Array.isArray(campana?.tipos_encuesta) ? campana.tipos_encuesta[0] : campana?.tipos_encuesta
  const enviaRegalo = tipoEncuesta?.envia_regalo ?? false

  try {
    const inserts: Promise<unknown>[] = [
      Promise.resolve(supabase.from('notificaciones').insert({
        tipo: 'nueva_respuesta',
        titulo: 'Nueva respuesta recibida',
        mensaje: `${nombre} (${concesionario}) completó la encuesta.`,
        para_rol: 'admin',
        metadata: { nombre, concesionario },
      })),
    ]

    if (enviaRegalo) {
      inserts.push(
        Promise.resolve(supabase.from('notificaciones').insert({
          tipo: 'regalo_pendiente',
          titulo: 'Nuevo regalo pendiente',
          mensaje: `${nombre} completó la encuesta. Hay un nuevo regalo pendiente de envío.`,
          para_rol: 'rambla',
          metadata: { nombre, concesionario },
        })),
        enviarNotificacionRambla({
          nombreApellido: result.data.nombre_apellido,
          calleNumero: result.data.calle_numero,
          pisoDepartamento: result.data.piso_departamento || null,
          localidad: result.data.localidad,
          codigoPostal: result.data.codigo_postal,
          provincia: result.data.provincia,
          email: result.data.email,
          telefono: result.data.telefono,
          concesionario: result.data.concesionario_sede,
        }).catch(err => console.error('Notificación Rambla email fallida', err))
      )
    }

    if (esNPSCritico) {
      const npsList: string[] = []
      if (nps_producto <= 6)      npsList.push(`Producto: ${nps_producto}`)
      if (nps_empresa <= 6)       npsList.push(`Empresa: ${nps_empresa}`)
      if (nps_concesionario <= 6) npsList.push(`Concesionario: ${nps_concesionario}`)

      inserts.push(
        Promise.resolve(supabase.from('notificaciones').insert({
          tipo: 'nps_critico',
          titulo: 'NPS Crítico detectado',
          mensaje: `${nombre} — ${npsList.join(' · ')}`,
          para_rol: 'admin',
          metadata: { nombre, concesionario },
        }))
      )

      inserts.push(
        enviarAlertaNpsCritico({
          encuestaId: encuesta.id,
          npsProducto: nps_producto,
          npsEmpresa: nps_empresa,
          npsConcesionario: nps_concesionario,
          comentarioProducto: result.data.comentario_producto || null,
          comentarioConcesionario: result.data.comentario_concesionario || null,
          comentarioEmpresa: result.data.comentario_empresa || null,
          comentarioGeneral: null,
        }).catch(err => console.error('Alerta NPS email fallida', err))
      )
    }

    await Promise.allSettled(inserts)
  } catch (error) {
    console.error('Error al crear notificaciones', error)
  }

  return { success: true }
}
