import { db } from '@/lib/db/client'
import { campanas, clientes, encuestas, respuestas, tiposEncuesta } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Acceso a datos del formulario público de encuesta.
 *
 * Es la única superficie del sistema accesible sin login: el token es toda la
 * credencial. Por eso la validación de token y el bloqueo de doble respuesta
 * viven acá, en una sola función, y no repetidos en cada action.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `encuestas.token` es UUID: comparar contra un string con otro formato hace
 * que Postgres aborte la query (22P02) en vez de devolver 0 filas. Se filtra
 * antes de tocar la base para que un token basura sea "no existe", no un 500.
 */
export function esTokenConFormatoValido(token: string): boolean {
  return UUID_RE.test(token)
}

type EncuestaEstado = (typeof encuestas.estado.enumValues)[number]

export type EncuestaPublica = {
  id: string
  estado: EncuestaEstado
  concesionario: string
  tipoSlug: string
}

/** Datos para renderizar el formulario. No expone nada del cliente más allá del concesionario. */
export async function getEncuestaPorToken(token: string): Promise<EncuestaPublica | null> {
  if (!esTokenConFormatoValido(token)) return null

  const [encuesta] = await db
    .select({
      id: encuestas.id,
      estado: encuestas.estado,
      concesionario: clientes.concesionario,
      tipoSlug: tiposEncuesta.slug,
    })
    .from(encuestas)
    .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
    .innerJoin(campanas, eq(encuestas.campanaId, campanas.id))
    .innerJoin(tiposEncuesta, eq(campanas.tipoEncuestaId, tiposEncuesta.id))
    .where(eq(encuestas.token, token))
    .limit(1)

  return encuesta ?? null
}

/** Columnas propias de cada tipo de encuesta. `encuesta_id` y `canal_respuesta` los resuelve el guardado. */
export type ValoresRespuesta = Omit<typeof respuestas.$inferInsert, 'encuestaId' | 'canalRespuesta'>

export type ResultadoGuardado =
  | { ok: true; encuestaId: string; enviaRegalo: boolean }
  | { ok: false; error: string }

function esViolacionDeUnique(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505'
}

/**
 * Valida el token e inserta la respuesta de forma atómica.
 *
 * Todo pasa dentro de una transacción con `SELECT ... FOR UPDATE` sobre la
 * encuesta: dos envíos simultáneos del mismo token se serializan acá, así el
 * segundo ve el estado ya actualizado en vez de pasar el chequeo y chocar
 * contra la base. El UNIQUE de `respuestas.encuesta_id` queda igual como última
 * red de seguridad.
 *
 * No actualiza `encuestas.estado`: de eso se encarga el trigger
 * `trg_marcar_encuesta_respondida` al insertar en `respuestas`.
 */
export async function guardarRespuestaConToken(
  token: string,
  valores: ValoresRespuesta
): Promise<ResultadoGuardado> {
  if (!esTokenConFormatoValido(token)) {
    return { ok: false, error: 'El link de encuesta no es válido.' }
  }

  try {
    return await db.transaction(async (tx) => {
      const [encuesta] = await tx
        .select({
          id: encuestas.id,
          estado: encuestas.estado,
          enviaRegalo: tiposEncuesta.enviaRegalo,
        })
        .from(encuestas)
        .innerJoin(campanas, eq(encuestas.campanaId, campanas.id))
        .innerJoin(tiposEncuesta, eq(campanas.tipoEncuestaId, tiposEncuesta.id))
        .where(eq(encuestas.token, token))
        .limit(1)
        .for('update', { of: encuestas })

      if (!encuesta) return { ok: false as const, error: 'El link de encuesta no es válido.' }
      if (encuesta.estado === 'respondida') return { ok: false as const, error: 'Esta encuesta ya fue completada.' }
      if (encuesta.estado === 'sin_respuesta') return { ok: false as const, error: 'Esta encuesta fue cerrada como sin respuesta.' }

      const [respuestaExistente] = await tx
        .select({ id: respuestas.id })
        .from(respuestas)
        .where(eq(respuestas.encuestaId, encuesta.id))
        .limit(1)

      if (respuestaExistente) return { ok: false as const, error: 'Esta encuesta ya fue completada.' }

      await tx.insert(respuestas).values({
        ...valores,
        encuestaId: encuesta.id,
        canalRespuesta: encuesta.estado === 'necesidad_de_llamado' ? 'llamado' : 'mensaje',
      })

      return { ok: true as const, encuestaId: encuesta.id, enviaRegalo: encuesta.enviaRegalo }
    })
  } catch (error) {
    if (esViolacionDeUnique(error)) {
      return { ok: false, error: 'Esta encuesta ya fue completada.' }
    }
    console.error('Error al guardar la respuesta', error)
    return { ok: false, error: 'Error al guardar la respuesta. Por favor intentá nuevamente.' }
  }
}
