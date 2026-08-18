import { db } from '@/lib/db/client'
import { tiposEncuesta } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Plantilla, Pregunta } from '../types/plantilla.types'

const SLUGS_SISTEMA = ['inicio_garantia']

const plantillaSelect = {
  id: tiposEncuesta.id,
  nombre: tiposEncuesta.nombre,
  slug: tiposEncuesta.slug,
  activo: tiposEncuesta.activo,
  introduccion: tiposEncuesta.introduccion,
  preguntas: tiposEncuesta.preguntas,
  created_at: tiposEncuesta.createdAt,
}

function rowToPlantilla(row: {
  id: string
  nombre: string
  slug: string
  activo: boolean
  introduccion: string | null
  preguntas: unknown
  created_at: string
}): Plantilla {
  return {
    id: row.id,
    nombre: row.nombre,
    slug: row.slug,
    activo: row.activo,
    introduccion: row.introduccion ?? '',
    preguntas: (row.preguntas as Pregunta[] | null) ?? [],
    created_at: row.created_at,
    es_sistema: SLUGS_SISTEMA.includes(row.slug),
  }
}

export async function getPlantillas(): Promise<Plantilla[]> {
  const rows = await db.select(plantillaSelect).from(tiposEncuesta).where(eq(tiposEncuesta.activo, true)).orderBy(tiposEncuesta.createdAt)
  return rows.map(rowToPlantilla)
}

export async function getPlantillaById(id: string): Promise<Plantilla | null> {
  const [row] = await db.select(plantillaSelect).from(tiposEncuesta).where(eq(tiposEncuesta.id, id)).limit(1)
  return row ? rowToPlantilla(row) : null
}

export async function createPlantilla(input: {
  nombre: string
  introduccion: string
  preguntas: Pregunta[]
}): Promise<Plantilla> {
  const slug = input.nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  const [row] = await db
    .insert(tiposEncuesta)
    .values({
      nombre: input.nombre,
      slug,
      activo: true,
      introduccion: input.introduccion,
      preguntas: input.preguntas,
    })
    .returning(plantillaSelect)
  return rowToPlantilla(row)
}

export async function updatePlantilla(
  id: string,
  input: { nombre: string; introduccion: string; preguntas: Pregunta[] }
): Promise<void> {
  await db
    .update(tiposEncuesta)
    .set({ nombre: input.nombre, introduccion: input.introduccion, preguntas: input.preguntas })
    .where(eq(tiposEncuesta.id, id))
}

export async function deletePlantilla(id: string): Promise<void> {
  await db.update(tiposEncuesta).set({ activo: false }).where(eq(tiposEncuesta.id, id))
}

// Legacy — used by campanas service
export async function getTiposEncuesta() {
  return db
    .select({ id: tiposEncuesta.id, nombre: tiposEncuesta.nombre, slug: tiposEncuesta.slug })
    .from(tiposEncuesta)
    .where(eq(tiposEncuesta.activo, true))
    .orderBy(tiposEncuesta.createdAt)
}

// Legacy — used by encuesta/page.tsx
export async function getConfigFinGarantia() {
  const [row] = await db
    .select({ introduccion: tiposEncuesta.introduccion, preguntas: tiposEncuesta.preguntas })
    .from(tiposEncuesta)
    .where(eq(tiposEncuesta.slug, 'fin_garantia'))
    .limit(1)
  return row ?? null
}
