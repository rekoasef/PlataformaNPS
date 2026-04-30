import type { Tables, TablesInsert } from '@/types/database.types'
import type { Tecnologia } from '@/lib/utils/tecnologia'

export type Cliente = Tables<'clientes'>
export type ClienteInsert = TablesInsert<'clientes'>

export type ClienteFormData = {
  nombre: string
  telefono: string
  telefono_2?: string | null
  telefono_3?: string | null
  concesionario: string
  orden_fabricacion: string
  tecnologia?: Tecnologia | null
}
