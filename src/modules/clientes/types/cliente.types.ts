import type { Tables, TablesInsert } from '@/types/database.types'
import type { Tecnologia } from '@/lib/utils/tecnologia'
import type { TipoMaquina } from '@/lib/utils/tipoMaquina'

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
  tipo_maquina?: TipoMaquina | null
}
