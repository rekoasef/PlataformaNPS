import { db } from '@/lib/db/client'
import { campanas, clientes, encuestas, tiposEncuesta } from '@/lib/db/schema'
import { and, desc, eq, lte, sql } from 'drizzle-orm'
import type { CampanaEstado } from '../types/campana.types'
import type { Tecnologia } from '@/lib/utils/tecnologia'

export type OFElegible = {
  clienteId: string
  nombre: string
  telefono: string
  concesionario: string
  ordenFabricacion: string
  tecnologia: Tecnologia | null
  campanaInicioNombre: string
  campanaInicioFecha: string
}

const campanaSelect = {
  id: campanas.id,
  nombre: campanas.nombre,
  fecha: campanas.fecha,
  estado: campanas.estado,
  created_at: campanas.createdAt,
  tipo_encuesta_id: campanas.tipoEncuestaId,
}

export async function getCampanas(filtros?: { tipoEncuestaId?: string }) {
  return db
    .select({
      ...campanaSelect,
      tipoNombre: tiposEncuesta.nombre,
      tipoSlug: tiposEncuesta.slug,
      total: sql<number>`count(${encuestas.id})::int`,
      respondidas: sql<number>`count(${encuestas.id}) filter (where ${encuestas.estado} = 'respondida')::int`,
      pendientes: sql<number>`count(${encuestas.id}) filter (where ${encuestas.estado} not in ('respondida', 'sin_respuesta'))::int`,
    })
    .from(campanas)
    .leftJoin(tiposEncuesta, eq(campanas.tipoEncuestaId, tiposEncuesta.id))
    .leftJoin(encuestas, eq(encuestas.campanaId, campanas.id))
    .where(filtros?.tipoEncuestaId ? eq(campanas.tipoEncuestaId, filtros.tipoEncuestaId) : undefined)
    .groupBy(campanas.id, tiposEncuesta.nombre, tiposEncuesta.slug)
    .orderBy(desc(campanas.createdAt))
}

export async function getCampanaById(id: string) {
  const [campana] = await db.select(campanaSelect).from(campanas).where(eq(campanas.id, id)).limit(1)
  if (!campana) throw new Error('Campaña no encontrada')
  return campana
}

export async function getCampanaConEncuestas(id: string) {
  return db
    .select({
      id: encuestas.id,
      estado: encuestas.estado,
      token: encuestas.token,
      created_at: encuestas.createdAt,
      clientes: {
        id: clientes.id,
        nombre: clientes.nombre,
        telefono: clientes.telefono,
        telefono_2: clientes.telefono2,
        telefono_3: clientes.telefono3,
        concesionario: clientes.concesionario,
        orden_fabricacion: clientes.ordenFabricacion,
        tecnologia: clientes.tecnologia,
      },
    })
    .from(encuestas)
    .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
    .where(eq(encuestas.campanaId, id))
    .orderBy(encuestas.createdAt)
}

export async function createCampana(data: { nombre: string; fecha: string; tipo_encuesta_id: string }) {
  const [campana] = await db
    .insert(campanas)
    .values({ nombre: data.nombre, fecha: data.fecha, tipoEncuestaId: data.tipo_encuesta_id })
    .returning(campanaSelect)
  return campana
}

export async function updateCampanaEstado(id: string, estado: CampanaEstado) {
  await db.update(campanas).set({ estado }).where(eq(campanas.id, id))
}

export async function getOFsElegiblesFinGarantia(): Promise<OFElegible[]> {
  const tipos = await db.select({ id: tiposEncuesta.id, slug: tiposEncuesta.slug }).from(tiposEncuesta)

  const inicioId = tipos.find((t) => t.slug === 'inicio_garantia')?.id
  const finId = tipos.find((t) => t.slug === 'fin_garantia')?.id

  if (!inicioId || !finId) return []

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 12)
  const cutoffDate = cutoff.toISOString().split('T')[0]

  const encuestasFin = await db
    .select({ clienteId: encuestas.clienteId })
    .from(encuestas)
    .innerJoin(campanas, eq(encuestas.campanaId, campanas.id))
    .where(eq(campanas.tipoEncuestaId, finId))

  const clientesEnFin = new Set(encuestasFin.map((e) => e.clienteId))

  const candidatos = await db
    .select({
      clienteId: encuestas.clienteId,
      cliente: {
        id: clientes.id,
        nombre: clientes.nombre,
        telefono: clientes.telefono,
        concesionario: clientes.concesionario,
        ordenFabricacion: clientes.ordenFabricacion,
        tecnologia: clientes.tecnologia,
      },
      campanaNombre: campanas.nombre,
      campanaFecha: campanas.fecha,
    })
    .from(encuestas)
    .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
    .innerJoin(campanas, eq(encuestas.campanaId, campanas.id))
    .where(and(eq(campanas.tipoEncuestaId, inicioId), lte(campanas.fecha, cutoffDate)))

  const byCliente = new Map<string, OFElegible>()

  for (const c of candidatos) {
    if (clientesEnFin.has(c.clienteId)) continue
    if (!c.cliente.ordenFabricacion) continue

    const existing = byCliente.get(c.clienteId)
    if (!existing || c.campanaFecha > existing.campanaInicioFecha) {
      byCliente.set(c.clienteId, {
        clienteId: c.cliente.id,
        nombre: c.cliente.nombre,
        telefono: c.cliente.telefono,
        concesionario: c.cliente.concesionario,
        ordenFabricacion: c.cliente.ordenFabricacion,
        tecnologia: c.cliente.tecnologia as Tecnologia | null,
        campanaInicioNombre: c.campanaNombre,
        campanaInicioFecha: c.campanaFecha,
      })
    }
  }

  return Array.from(byCliente.values()).sort((a, b) => a.ordenFabricacion.localeCompare(b.ordenFabricacion))
}

export async function getTiposEncuesta() {
  return db
    .select({ id: tiposEncuesta.id, nombre: tiposEncuesta.nombre, slug: tiposEncuesta.slug })
    .from(tiposEncuesta)
    .where(eq(tiposEncuesta.activo, true))
    .orderBy(tiposEncuesta.createdAt)
}
