import { db } from '@/lib/db/client'
import { clientes, encuestas } from '@/lib/db/schema'
import { asc, eq, ilike, or, sql } from 'drizzle-orm'
import type { ClienteFormData } from '../types/cliente.types'
import type { ClienteCSVRow } from '@/lib/utils/csv'

const PAGE_SIZE = 20

// Selección explícita: traduce los nombres camelCase del schema de Drizzle
// (tipoMaquina, ordenFabricacion) al snake_case que ya usa el resto del
// módulo (tipo_maquina, orden_fabricacion) — mismo contrato que Supabase.
const clienteSelect = {
  id: clientes.id,
  nombre: clientes.nombre,
  telefono: clientes.telefono,
  telefono_2: clientes.telefono2,
  telefono_3: clientes.telefono3,
  concesionario: clientes.concesionario,
  orden_fabricacion: clientes.ordenFabricacion,
  tecnologia: clientes.tecnologia,
  tipo_maquina: clientes.tipoMaquina,
  created_at: clientes.createdAt,
}

export async function getClientes(search?: string, page = 1) {
  const from = (page - 1) * PAGE_SIZE

  const where = search
    ? or(
        ilike(clientes.nombre, `%${search}%`),
        ilike(clientes.concesionario, `%${search}%`),
        ilike(clientes.tecnologia, `%${search}%`)
      )
    : undefined

  const [data, countResult] = await Promise.all([
    db.select(clienteSelect).from(clientes).where(where).orderBy(asc(clientes.nombre)).limit(PAGE_SIZE).offset(from),
    db.select({ total: sql<number>`count(*)::int` }).from(clientes).where(where),
  ])

  return { data, count: countResult[0].total, pageSize: PAGE_SIZE }
}

export async function getClienteById(id: string) {
  const [cliente] = await db.select(clienteSelect).from(clientes).where(eq(clientes.id, id)).limit(1)
  if (!cliente) throw new Error('Cliente no encontrado')
  return cliente
}

export async function createCliente(data: ClienteFormData) {
  const [cliente] = await db
    .insert(clientes)
    .values({
      nombre: data.nombre,
      telefono: data.telefono,
      telefono2: data.telefono_2,
      telefono3: data.telefono_3,
      concesionario: data.concesionario,
      ordenFabricacion: data.orden_fabricacion,
      tecnologia: data.tecnologia,
      tipoMaquina: data.tipo_maquina,
    })
    .returning(clienteSelect)
  return cliente
}

export async function createClientesBulk(rows: ClienteCSVRow[]) {
  if (rows.length === 0) return []
  return db
    .insert(clientes)
    .values(
      rows.map((row) => ({
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
    .returning(clienteSelect)
}

export async function getClientesByCampana(campanaId: string) {
  return db
    .select({
      cliente_id: encuestas.clienteId,
      estado: encuestas.estado,
      token: encuestas.token,
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
    .where(eq(encuestas.campanaId, campanaId))
    .orderBy(asc(encuestas.createdAt))
}
