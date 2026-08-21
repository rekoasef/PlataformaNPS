import { db } from '@/lib/db/client'
import { campanas, clientes, encuestas, enviosWhatsappDetalle, enviosWhatsappJobs, plantillasWhatsapp } from '@/lib/db/schema'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { renderizarMensaje } from '../utils/renderizar'
import type {
  JobEstado,
  PlantillaWhatsapp,
  PlantillaInsert,
  PlantillaUpdate,
  WhatsappJob,
  JobConPlantilla,
  JobConDetalle,
} from '../types/whatsapp.types'

export interface JobConCampana extends JobConPlantilla {
  campana: { nombre: string }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const plantillaSelect = {
  id: plantillasWhatsapp.id,
  nombre: plantillasWhatsapp.nombre,
  tipo: plantillasWhatsapp.tipo,
  lineas: plantillasWhatsapp.lineas,
  ruta_imagen: plantillasWhatsapp.rutaImagen,
  activa: plantillasWhatsapp.activa,
  created_at: plantillasWhatsapp.createdAt,
  updated_at: plantillasWhatsapp.updatedAt,
}

const jobSelect = {
  id: enviosWhatsappJobs.id,
  campana_id: enviosWhatsappJobs.campanaId,
  plantilla_id: enviosWhatsappJobs.plantillaId,
  estado: enviosWhatsappJobs.estado,
  total_contactos: enviosWhatsappJobs.totalContactos,
  enviados: enviosWhatsappJobs.enviados,
  errores: enviosWhatsappJobs.errores,
  created_at: enviosWhatsappJobs.createdAt,
  started_at: enviosWhatsappJobs.startedAt,
  completed_at: enviosWhatsappJobs.completedAt,
}

const detalleSelect = {
  id: enviosWhatsappDetalle.id,
  job_id: enviosWhatsappDetalle.jobId,
  encuesta_id: enviosWhatsappDetalle.encuestaId,
  celular: enviosWhatsappDetalle.celular,
  nombre: enviosWhatsappDetalle.nombre,
  url_encuesta: enviosWhatsappDetalle.urlEncuesta,
  estado: enviosWhatsappDetalle.estado,
  enviado_at: enviosWhatsappDetalle.enviadoAt,
  error_mensaje: enviosWhatsappDetalle.errorMensaje,
}

// ─── Plantillas ──────────────────────────────────────────────────────────────

export async function getPlantillas(): Promise<PlantillaWhatsapp[]> {
  return db.select(plantillaSelect).from(plantillasWhatsapp).orderBy(asc(plantillasWhatsapp.createdAt))
}

export async function getPlantillaById(id: string): Promise<PlantillaWhatsapp | null> {
  const [row] = await db.select(plantillaSelect).from(plantillasWhatsapp).where(eq(plantillasWhatsapp.id, id)).limit(1)
  return row ?? null
}

export async function createPlantilla(input: PlantillaInsert): Promise<PlantillaWhatsapp> {
  const [row] = await db
    .insert(plantillasWhatsapp)
    .values({
      nombre: input.nombre!,
      tipo: input.tipo!,
      lineas: input.lineas,
      rutaImagen: input.ruta_imagen,
      activa: input.activa,
    })
    .returning(plantillaSelect)
  return row
}

export async function updatePlantilla(id: string, input: PlantillaUpdate): Promise<PlantillaWhatsapp> {
  const [row] = await db
    .update(plantillasWhatsapp)
    .set({
      nombre: input.nombre,
      tipo: input.tipo,
      lineas: input.lineas,
      rutaImagen: input.ruta_imagen,
      activa: input.activa,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(plantillasWhatsapp.id, id))
    .returning(plantillaSelect)
  return row
}

export async function duplicarPlantilla(id: string): Promise<PlantillaWhatsapp> {
  const original = await getPlantillaById(id)
  if (!original) throw new Error('Plantilla no encontrada')
  return createPlantilla({
    nombre: `${original.nombre} (copia)`,
    tipo: original.tipo,
    lineas: original.lineas,
    ruta_imagen: original.ruta_imagen,
    activa: false,
  })
}

export async function archivarPlantilla(id: string): Promise<void> {
  await db.update(plantillasWhatsapp).set({ activa: false, updatedAt: new Date().toISOString() }).where(eq(plantillasWhatsapp.id, id))
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export async function getJobsByCampana(campanaId: string): Promise<JobConPlantilla[]> {
  const rows = await db
    .select({ ...jobSelect, plantilla: { nombre: plantillasWhatsapp.nombre, tipo: plantillasWhatsapp.tipo } })
    .from(enviosWhatsappJobs)
    .innerJoin(plantillasWhatsapp, eq(enviosWhatsappJobs.plantillaId, plantillasWhatsapp.id))
    .where(eq(enviosWhatsappJobs.campanaId, campanaId))
    .orderBy(desc(enviosWhatsappJobs.createdAt))
  return rows
}

export async function getAllJobs(): Promise<JobConCampana[]> {
  const rows = await db
    .select({
      ...jobSelect,
      plantilla: { nombre: plantillasWhatsapp.nombre, tipo: plantillasWhatsapp.tipo },
      campana: { nombre: campanas.nombre },
    })
    .from(enviosWhatsappJobs)
    .innerJoin(plantillasWhatsapp, eq(enviosWhatsappJobs.plantillaId, plantillasWhatsapp.id))
    .innerJoin(campanas, eq(enviosWhatsappJobs.campanaId, campanas.id))
    .orderBy(desc(enviosWhatsappJobs.createdAt))
  return rows
}

export async function getJobConDetalle(jobId: string): Promise<JobConDetalle | null> {
  const [job] = await db
    .select({ ...jobSelect, plantilla: { nombre: plantillasWhatsapp.nombre, tipo: plantillasWhatsapp.tipo } })
    .from(enviosWhatsappJobs)
    .innerJoin(plantillasWhatsapp, eq(enviosWhatsappJobs.plantillaId, plantillasWhatsapp.id))
    .where(eq(enviosWhatsappJobs.id, jobId))
    .limit(1)

  if (!job) return null

  const detalles = await db.select(detalleSelect).from(enviosWhatsappDetalle).where(eq(enviosWhatsappDetalle.jobId, jobId))

  return { ...job, detalles }
}

// ─── Crear job ───────────────────────────────────────────────────────────────

export async function crearJob(
  campanaId: string,
  plantillaId: string,
  soloRespondibles: boolean = false
): Promise<WhatsappJob> {
  type EncuestaEstado = 'pendiente' | 'respondida' | 'recordatorio_enviado' | 'necesidad_de_llamado' | 'sin_respuesta'
  const estadosIncluidos: EncuestaEstado[] = soloRespondibles
    ? ['pendiente', 'recordatorio_enviado']
    : ['pendiente', 'recordatorio_enviado', 'necesidad_de_llamado']

  const contactos = await db
    .select({
      id: encuestas.id,
      token: encuestas.token,
      clienteNombre: clientes.nombre,
      clienteTelefono: clientes.telefono,
    })
    .from(encuestas)
    .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
    .where(and(eq(encuestas.campanaId, campanaId), inArray(encuestas.estado, estadosIncluidos)))

  if (contactos.length === 0) throw new Error('No hay contactos pendientes para esta campaña')

  return db.transaction(async (tx) => {
    const [job] = await tx
      .insert(enviosWhatsappJobs)
      .values({
        campanaId,
        plantillaId,
        estado: 'pendiente',
        totalContactos: contactos.length,
      })
      .returning(jobSelect)

    await tx.insert(enviosWhatsappDetalle).values(
      contactos.map((c) => ({
        jobId: job.id,
        encuestaId: c.id,
        celular: c.clienteTelefono,
        nombre: c.clienteNombre,
        urlEncuesta: `${APP_URL}/encuesta?token=${c.token}`,
        estado: 'pendiente' as const,
      }))
    )

    return job
  })
}

export async function detenerJob(jobId: string): Promise<void> {
  await db
    .update(enviosWhatsappJobs)
    .set({ estado: 'interrumpido' })
    .where(and(eq(enviosWhatsappJobs.id, jobId), inArray(enviosWhatsappJobs.estado, ['en_progreso', 'pendiente'])))
}

// ─── Agente de envío (mensajes.py) ───────────────────────────────────────────
//
// Lo que consume el script que corre en la PC del operador. Antes leía y
// escribía la base directo con la `service_role_key` de Supabase; ahora pasa
// por acá.

export interface ContactoParaAgente {
  id: string
  celular: string
  nombre: string
  mensaje: string
}

export interface JobParaAgente {
  id: string
  estado: JobEstado
  total_contactos: number
  enviados: number
  errores: number
  ruta_imagen: string | null
  contactos: ContactoParaAgente[]
}

/**
 * El job con **solo los contactos que faltan mandar**, cada uno con el mensaje
 * ya renderizado.
 *
 * Devolver solo pendientes es lo que hace que relanzar un envío cortado no
 * vuelva a escribirle a quien ya recibió el mensaje. Y renderizar acá evita que
 * la plantilla se arme en dos lugares: antes el script rehacía en Python el
 * reemplazo de `{nombre}` y `{url}` que ya vive en `renderizarMensaje`.
 */
export async function getJobParaAgente(jobId: string): Promise<JobParaAgente | null> {
  const [job] = await db
    .select({
      id: enviosWhatsappJobs.id,
      estado: enviosWhatsappJobs.estado,
      total_contactos: enviosWhatsappJobs.totalContactos,
      enviados: enviosWhatsappJobs.enviados,
      errores: enviosWhatsappJobs.errores,
      lineas: plantillasWhatsapp.lineas,
      ruta_imagen: plantillasWhatsapp.rutaImagen,
    })
    .from(enviosWhatsappJobs)
    .innerJoin(plantillasWhatsapp, eq(enviosWhatsappJobs.plantillaId, plantillasWhatsapp.id))
    .where(eq(enviosWhatsappJobs.id, jobId))
    .limit(1)

  if (!job) return null

  const pendientes = await db
    .select({
      id: enviosWhatsappDetalle.id,
      celular: enviosWhatsappDetalle.celular,
      nombre: enviosWhatsappDetalle.nombre,
      url_encuesta: enviosWhatsappDetalle.urlEncuesta,
    })
    .from(enviosWhatsappDetalle)
    .where(and(eq(enviosWhatsappDetalle.jobId, jobId), eq(enviosWhatsappDetalle.estado, 'pendiente')))
    .orderBy(asc(enviosWhatsappDetalle.id))

  return {
    id: job.id,
    estado: job.estado as JobEstado,
    total_contactos: job.total_contactos,
    enviados: job.enviados,
    errores: job.errores,
    ruta_imagen: job.ruta_imagen,
    contactos: pendientes.map((c) => ({
      id: c.id,
      celular: c.celular.trim(),
      nombre: c.nombre,
      mensaje: renderizarMensaje(job.lineas, c.nombre, c.url_encuesta),
    })),
  }
}

/**
 * Cambia el estado del job desde el agente. Devuelve el estado que quedó, que
 * no siempre es el pedido.
 *
 * **Un job interrumpido no vuelve a `completado`.** El script corta el loop
 * cuando ve que lo detuvieron y después reporta que terminó; ese "terminé" no
 * puede pisar el hecho de que quedaron contactos sin mandar. Antes sí lo pisaba
 * y la plataforma mostraba "Completado" para campañas cortadas a la mitad.
 */
export async function marcarJobEstado(
  jobId: string,
  estado: 'en_progreso' | 'completado' | 'error' | 'interrumpido',
): Promise<JobEstado | null> {
  const [actual] = await db
    .select({ estado: enviosWhatsappJobs.estado })
    .from(enviosWhatsappJobs)
    .where(eq(enviosWhatsappJobs.id, jobId))
    .limit(1)

  if (!actual) return null

  const estadoFinal = actual.estado === 'interrumpido' && estado === 'completado' ? 'interrumpido' : estado

  await db
    .update(enviosWhatsappJobs)
    .set({
      estado: estadoFinal,
      // `coalesce` para no perder el arranque original si se relanza un job a medias.
      startedAt: sql`coalesce(${enviosWhatsappJobs.startedAt}, now())`,
      ...(estadoFinal === 'en_progreso' ? {} : { completedAt: sql`now()` }),
    })
    .where(eq(enviosWhatsappJobs.id, jobId))

  return estadoFinal as JobEstado
}

/**
 * Reporta el resultado de un contacto y deja los contadores del job al día.
 *
 * Los contadores se **recalculan desde las filas** en vez de incrementarse: el
 * script hacía leer-y-sumar-uno en dos llamadas sueltas, así que dos corridas a
 * la vez o un corte en el medio los dejaban diciendo cualquier cosa.
 */
export async function reportarContacto(
  detalleId: string,
  estado: 'enviado' | 'error',
  errorMensaje?: string,
): Promise<{ job_id: string; enviados: number; errores: number } | null> {
  return db.transaction(async (tx) => {
    const [detalle] = await tx
      .update(enviosWhatsappDetalle)
      .set({
        estado,
        enviadoAt: estado === 'enviado' ? sql`now()` : null,
        errorMensaje: estado === 'error' ? (errorMensaje?.slice(0, 200) ?? null) : null,
      })
      .where(eq(enviosWhatsappDetalle.id, detalleId))
      .returning({ jobId: enviosWhatsappDetalle.jobId })

    if (!detalle) return null

    const [conteo] = await tx
      .select({
        // El ::int va en el SQL: `count(*)` es bigint y el driver lo entrega
        // como string, no como number.
        enviados: sql<number>`count(*) filter (where ${enviosWhatsappDetalle.estado} = 'enviado')::int`,
        errores: sql<number>`count(*) filter (where ${enviosWhatsappDetalle.estado} = 'error')::int`,
      })
      .from(enviosWhatsappDetalle)
      .where(eq(enviosWhatsappDetalle.jobId, detalle.jobId))

    await tx
      .update(enviosWhatsappJobs)
      .set({ enviados: conteo.enviados, errores: conteo.errores })
      .where(eq(enviosWhatsappJobs.id, detalle.jobId))

    return { job_id: detalle.jobId, enviados: conteo.enviados, errores: conteo.errores }
  })
}

export { renderizarMensaje }
