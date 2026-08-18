import { db } from '@/lib/db/client'
import { campanas, clientes, encuestas, enviosWhatsappDetalle, enviosWhatsappJobs, plantillasWhatsapp } from '@/lib/db/schema'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type {
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

export { renderizarMensaje } from '../utils/renderizar'
