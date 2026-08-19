'use server'

import { z } from 'zod'
import { db } from '@/lib/db/client'
import { notificaciones } from '@/lib/db/schema'
import { guardarRespuestaConToken } from './encuesta.db'
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

  const tipoMaquina = getTipoMaquina(result.data.maquina_modelo)
  if (!tipoMaquina) {
    return { error: 'No se pudo determinar el tipo de máquina seleccionada.' }
  }

  // Revalida el token e inserta en una sola transacción (el trigger actualiza encuesta.estado)
  const guardado = await guardarRespuestaConToken(result.data.token, {
    nombreApellido: result.data.nombre_apellido,
    calleNumero: result.data.calle_numero,
    pisoDepartamento: result.data.piso_departamento || null,
    localidad: result.data.localidad,
    codigoPostal: result.data.codigo_postal,
    provincia: result.data.provincia,
    email: result.data.email,
    telefono: result.data.telefono,
    concesionarioSede: result.data.concesionario_sede,
    maquinaModelo: result.data.maquina_modelo,
    tipoMaquina,
    nombreFirmaFactura: result.data.nombre_firma_factura,
    calificacionEntregaPresentacion: result.data.calificacion_entrega_presentacion,
    calificacionCapacitacion: result.data.calificacion_capacitacion,
    calificacionTecnico: result.data.calificacion_tecnico,
    npsProducto: result.data.nps_producto,
    npsEmpresa: result.data.nps_empresa,
    npsConcesionario: result.data.nps_concesionario,
    comentarioConcesionario: result.data.comentario_concesionario || null,
    comentarioProducto: result.data.comentario_producto || null,
    comentarioEmpresa: result.data.comentario_empresa || null,
    comentarioGeneral: null,
  })

  if (!guardado.ok) return { error: guardado.error }

  // Disparar alerta email + notificaciones en paralelo (errores no bloquean la respuesta)
  const { nps_producto, nps_empresa, nps_concesionario } = result.data
  const esNPSCritico = nps_producto <= 6 || nps_empresa <= 6 || nps_concesionario <= 6
  const nombre = result.data.nombre_apellido
  const concesionario = result.data.concesionario_sede

  const { enviaRegalo } = guardado

  try {
    const inserts: Promise<unknown>[] = [
      db.insert(notificaciones).values({
        tipo: 'nueva_respuesta',
        titulo: 'Nueva respuesta recibida',
        mensaje: `${nombre} (${concesionario}) completó la encuesta.`,
        paraRol: 'admin',
        metadata: { nombre, concesionario },
      }),
    ]

    if (enviaRegalo) {
      inserts.push(
        db.insert(notificaciones).values({
          tipo: 'regalo_pendiente',
          titulo: 'Nuevo regalo pendiente',
          mensaje: `${nombre} completó la encuesta. Hay un nuevo regalo pendiente de envío.`,
          paraRol: 'rambla',
          metadata: { nombre, concesionario },
        }),
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
        db.insert(notificaciones).values({
          tipo: 'nps_critico',
          titulo: 'NPS Crítico detectado',
          mensaje: `${nombre} — ${npsList.join(' · ')}`,
          paraRol: 'admin',
          metadata: { nombre, concesionario },
        })
      )

      inserts.push(
        enviarAlertaNpsCritico({
          encuestaId: guardado.encuestaId,
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
