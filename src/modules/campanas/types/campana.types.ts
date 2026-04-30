import type { Tables, TablesInsert } from '@/types/database.types'

export type Campana = Tables<'campanas'>
export type CampanaInsert = TablesInsert<'campanas'>
export type CampanaEstado = 'activa' | 'completada' | 'archivada'

export type CampanaConConteos = Campana & {
  total: number
  respondidas: number
  pendientes: number
}

export type EncuestaDeCampana = {
  id: string
  estado: 'pendiente' | 'recordatorio_enviado' | 'pendiente_a_llamar' | 'respondida' | 'sin_respuesta'
  token: string
  created_at: string
  clientes: {
    id: string
    nombre: string
    telefono: string
    telefono_2: string | null
    telefono_3: string | null
    concesionario: string
    orden_fabricacion: string | null
    tecnologia: string | null
  } | null
}
