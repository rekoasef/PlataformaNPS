'use server'

import { z } from 'zod'
import { db } from '@/lib/db/client'
import {
  campanas,
  clientes,
  encuestas,
  envios,
  respuestas,
  enviosWhatsappJobs,
  enviosWhatsappDetalle,
} from '@/lib/db/schema'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { updateCampanaEstado } from '@/modules/campanas/services/campanas.service'
import { parseClientesCSV } from '@/lib/utils/csv'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRol } from '@/lib/auth/session'

// Errores de validación de negocio que sí queremos mostrarle al usuario tal
// cual (a diferencia de errores técnicos de Postgres/Drizzle, que no deben
// filtrarse a la UI — esos quedan solo en el log del servidor).
class ActionError extends Error {}

async function getRoleOrThrow() {
  await requireRol('admin')
}

const CampanaSchema = z.object({
  nombre:           z.string().min(1, 'El nombre es requerido').max(200),
  fecha:            z.string().min(1, 'La fecha es requerida'),
  tipo_encuesta_id: z.string().uuid('Tipo de encuesta inválido.'),
})

const CambiarEstadoSchema = z.object({
  id: z.string().uuid('Campaña inválida.'),
  estado: z.enum(['activa', 'completada', 'archivada']),
})

const EliminarCampanaSchema = z.object({
  id: z.string().uuid('Campaña inválida.'),
})

const EliminarEncuestaSchema = z.object({
  encuesta_id: z.string().uuid('Encuesta inválida.'),
})

type ActionState = { error?: string }

export async function crearCampanaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    nombre:           formData.get('nombre') as string,
    fecha:            formData.get('fecha') as string,
    tipo_encuesta_id: formData.get('tipo_encuesta_id') as string,
  }

  const result = CampanaSchema.safeParse(raw)
  if (!result.success) return { error: result.error.issues[0].message }

  // Para fin de garantía, el CSV es opcional (puede venir del selector de OFs)
  const clienteIdsSeleccionados = formData.getAll('cliente_id') as string[]
  const file = formData.get('archivo') as File | null
  const tieneCSV = file && file.size > 0

  if (!tieneCSV && clienteIdsSeleccionados.length === 0) {
    return { error: 'Seleccioná clientes del listado de OFs o cargá un archivo CSV.' }
  }

  let rowsCSV: ReturnType<typeof parseClientesCSV> = []
  if (tieneCSV) {
    try {
      rowsCSV = parseClientesCSV(await file.text())
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Error al leer el CSV.' }
    }
    if (rowsCSV.length === 0) return { error: 'El CSV no contiene clientes válidos.' }
  }

  // Todo el alta (campaña + clientes + encuestas + envíos) corre en una sola
  // transacción: si cualquier paso falla, Postgres deshace todo — no hace
  // falta borrar "a mano" lo que ya se había creado, como pasaba con Supabase.
  let nuevaCampanaId: string
  try {
    nuevaCampanaId = await db.transaction(async (tx) => {
      const [campana] = await tx
        .insert(campanas)
        .values({ nombre: result.data.nombre, fecha: result.data.fecha, tipoEncuestaId: result.data.tipo_encuesta_id })
        .returning({ id: campanas.id })

      let clienteIdsParaEncuesta = [...clienteIdsSeleccionados]

      if (rowsCSV.length > 0) {
        const clientesNuevos = await tx
          .insert(clientes)
          .values(
            rowsCSV.map((row) => ({
              nombre: row.nombre,
              telefono: row.telefono,
              telefono2: row.telefono_2,
              telefono3: row.telefono_3,
              concesionario: row.concesionario,
              ordenFabricacion: row.orden_fabricacion,
              tecnologia: row.tecnologia,
              tipoMaquina: row.tipo_maquina,
            }))
          )
          .returning({ id: clientes.id })
        clienteIdsParaEncuesta = [...clienteIdsParaEncuesta, ...clientesNuevos.map((c) => c.id)]
      }

      if (clienteIdsParaEncuesta.length === 0) {
        throw new ActionError('No hay clientes para agregar a la campaña.')
      }

      await tx.insert(encuestas).values(
        clienteIdsParaEncuesta.map((id) => ({ clienteId: id, campanaId: campana.id }))
      )

      const fechaEnvioInicial = new Date().toISOString()
      await tx.insert(envios).values(
        clienteIdsParaEncuesta.map((id) => ({
          clienteId: id,
          campanaId: campana.id,
          numeroRecordatorio: 0,
          estadoEnvio: 'enviado' as const,
          fechaEnvio: fechaEnvioInicial,
        }))
      )

      return campana.id
    })
  } catch (e) {
    console.error('Error al crear la campaña', e)
    return { error: e instanceof ActionError ? e.message : 'Error al crear la campaña.' }
  }

  // redirect() tiene que ir FUERA de la transacción: internamente funciona
  // lanzando un error especial, y si estuviera adentro, Drizzle lo
  // interpretaría como una falla real y haría ROLLBACK de todo lo ya creado.
  revalidatePath('/campanas')
  redirect(`/campanas/${nuevaCampanaId}`)
}

export async function cambiarEstadoCampanaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = CambiarEstadoSchema.safeParse({
    id: formData.get('campana_id'),
    estado: formData.get('estado'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos.' }

  try {
    await updateCampanaEstado(parsed.data.id, parsed.data.estado)
  } catch {
    return { error: 'No se pudo actualizar el estado.' }
  }

  revalidatePath(`/campanas/${parsed.data.id}`)
  revalidatePath('/campanas')
  return {}
}

export async function eliminarCampanaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = EliminarCampanaSchema.safeParse({
    id: formData.get('campana_id'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Campaña inválida.' }

  const campanaId = parsed.data.id

  let clientesParaEliminar: string[] = []
  try {
    clientesParaEliminar = await db.transaction(async (tx) => {
      const encuestasCampana = await tx
        .select({ id: encuestas.id, clienteId: encuestas.clienteId })
        .from(encuestas)
        .where(eq(encuestas.campanaId, campanaId))

      const encuestaIds = encuestasCampana.map((e) => e.id)
      const clienteIds = Array.from(new Set(encuestasCampana.map((e) => e.clienteId).filter(Boolean)))

      let clientesSinUso: string[] = []
      if (clienteIds.length > 0) {
        const [encuestasExternas, enviosExternos] = await Promise.all([
          tx
            .select({ clienteId: encuestas.clienteId })
            .from(encuestas)
            .where(and(inArray(encuestas.clienteId, clienteIds), ne(encuestas.campanaId, campanaId))),
          tx
            .select({ clienteId: envios.clienteId })
            .from(envios)
            .where(and(inArray(envios.clienteId, clienteIds), ne(envios.campanaId, campanaId))),
        ])
        const clientesUsados = new Set([
          ...encuestasExternas.map((e) => e.clienteId),
          ...enviosExternos.map((e) => e.clienteId),
        ])
        clientesSinUso = clienteIds.filter((id) => !clientesUsados.has(id))
      }

      if (encuestaIds.length > 0) {
        await tx.delete(respuestas).where(inArray(respuestas.encuestaId, encuestaIds))
      }

      // cascade borra envios_whatsapp_detalle automáticamente (FK job_id ON DELETE CASCADE)
      await tx.delete(enviosWhatsappJobs).where(eq(enviosWhatsappJobs.campanaId, campanaId))
      await tx.delete(envios).where(eq(envios.campanaId, campanaId))
      await tx.delete(encuestas).where(eq(encuestas.campanaId, campanaId))
      await tx.delete(campanas).where(eq(campanas.id, campanaId))

      return clientesSinUso
    })
  } catch (e) {
    console.error('Error al eliminar la campaña', e)
    return { error: 'No se pudo eliminar la campaña.' }
  }

  // Limpieza de clientes sin uso: best-effort, fuera de la transacción a
  // propósito — la campaña ya se borró bien, esto no debe hacerla fallar.
  if (clientesParaEliminar.length > 0) {
    try {
      await db.delete(clientes).where(inArray(clientes.id, clientesParaEliminar))
    } catch (e) {
      console.error('La campaña fue eliminada, pero no se pudieron limpiar clientes sin referencias.', e)
    }
  }

  revalidatePath('/campanas')
  revalidatePath('/clientes')
  revalidatePath('/respuestas')
  redirect('/campanas')
}

export async function eliminarEncuestaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await getRoleOrThrow()
  } catch {
    return { error: 'No tenés permisos para eliminar encuestas.' }
  }

  const parsed = EliminarEncuestaSchema.safeParse({
    encuesta_id: formData.get('encuesta_id'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Encuesta inválida.' }

  const encuestaId = parsed.data.encuesta_id

  let campanaId: string
  try {
    campanaId = await db.transaction(async (tx) => {
      const [encuesta] = await tx
        .select({ id: encuestas.id, clienteId: encuestas.clienteId, campanaId: encuestas.campanaId })
        .from(encuestas)
        .where(eq(encuestas.id, encuestaId))
        .limit(1)

      if (!encuesta) throw new ActionError('La encuesta no existe.')

      await tx.delete(enviosWhatsappDetalle).where(eq(enviosWhatsappDetalle.encuestaId, encuestaId))
      await tx.delete(respuestas).where(eq(respuestas.encuestaId, encuestaId))
      await tx
        .delete(envios)
        .where(and(eq(envios.clienteId, encuesta.clienteId), eq(envios.campanaId, encuesta.campanaId)))
      await tx.delete(encuestas).where(eq(encuestas.id, encuestaId))

      return encuesta.campanaId
    })
  } catch (e) {
    console.error('Error al eliminar la encuesta', e)
    return { error: e instanceof ActionError ? e.message : 'No se pudo eliminar la encuesta.' }
  }

  revalidatePath(`/campanas/${campanaId}`)
  revalidatePath('/campanas')
  revalidatePath('/respuestas')
  revalidatePath('/nps')
  return {}
}
