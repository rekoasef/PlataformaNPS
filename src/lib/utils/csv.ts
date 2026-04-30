// Parser compartido — sin imports de Node.js, funciona en browser y servidor.
// Columnas soportadas (en cualquier orden, con o sin acentos/mayúsculas):
//   CONCESIONARIO | CLIENTE (según factura) | ORDEN DE FABRICACION … | Teléfono 1/2/3
//   concesionario | nombre                  | orden_fabricacion       | telefono[_1|_2|_3] | tecnologia

import { normalizeTecnologiaInput, type Tecnologia } from '@/lib/utils/tecnologia'

export type ClienteCSVRow = {
  nombre: string
  telefono: string
  telefono_2: string | null
  telefono_3: string | null
  concesionario: string
  orden_fabricacion: string
  tecnologia: Tecnologia | null
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isPhoneHeader(header: string, index: 1 | 2 | 3): boolean {
  const aliasesByIndex: Record<1 | 2 | 3, string[]> = {
    1: [
      'telefono',
      'telefono 1',
      'telefono1',
      'telefono del cliente',
      'telefono cliente',
      'telefono del cliente 1',
      'telefono cliente 1',
    ],
    2: [
      'telefono 2',
      'telefono2',
      'telefono del cliente 2',
      'telefono cliente 2',
      'celular 2',
      'celular cliente 2',
    ],
    3: [
      'telefono 3',
      'telefono3',
      'telefono del cliente 3',
      'telefono cliente 3',
      'celular 3',
      'celular cliente 3',
    ],
  }

  return aliasesByIndex[index].includes(header)
}

export function parseClientesCSV(text: string): ClienteCSVRow[] {
  const lines = text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')

  if (lines.length < 2) throw new Error('El archivo no tiene datos.')

  const sep = lines[0].includes(';') ? ';' : ','
  const rawHeaders = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ''))
  const headers = rawHeaders.map(normalizeHeader)

  const dealerIdx = headers.findIndex((h) => h.startsWith('concesionario'))
  const nameIdx   = headers.findIndex((h) => h.startsWith('cliente') || h.startsWith('nombre'))
  const ordenIdx  = headers.findIndex((h) => h.startsWith('orden'))
  const phone1Idx = headers.findIndex((h) => isPhoneHeader(h, 1))
  const phone2Idx = headers.findIndex((h) => isPhoneHeader(h, 2))
  const phone3Idx = headers.findIndex((h) => isPhoneHeader(h, 3))
  const tecnologiaIdx = headers.findIndex((h) => h === 'tecnologia')

  if (nameIdx === -1)   throw new Error('No se encontro la columna de cliente/nombre.')
  if (dealerIdx === -1) throw new Error('No se encontro la columna de concesionario.')
  if (ordenIdx === -1) throw new Error('No se encontro la columna de OF / orden de fabricacion.')
  if (phone1Idx === -1 && phone2Idx === -1 && phone3Idx === -1) {
    throw new Error('No se encontro ninguna columna de telefono.')
  }

  const rows = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line, index) => {
      const values = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ''))
      const phones = [phone1Idx, phone2Idx, phone3Idx]
        .filter((idx) => idx !== -1)
        .map((idx) => values[idx] ?? '')
        .map((phone) => phone.trim())
        .filter(Boolean)
      const tecnologiaRaw = tecnologiaIdx === -1 ? '' : values[tecnologiaIdx] ?? ''
      const tecnologia = normalizeTecnologiaInput(tecnologiaRaw)

      if (tecnologiaIdx !== -1 && tecnologiaRaw.trim() && !tecnologia) {
        throw new Error(`La tecnología de la fila ${index + 2} debe ser Leaf o Precision Planting.`)
      }

      return {
        nombre: values[nameIdx] ?? '',
        concesionario: values[dealerIdx] ?? '',
        orden_fabricacion: values[ordenIdx] ?? '',
        phones,
        tecnologia,
      }
    })
    .filter((row) => row.nombre && row.concesionario && row.orden_fabricacion && row.phones.length > 0)

  const grouped = new Map<string, ClienteCSVRow>()

  for (const row of rows) {
    const key = row.orden_fabricacion.trim()
    const existing = grouped.get(key)

    if (!existing) {
      const uniquePhones = Array.from(new Set(row.phones)).slice(0, 3)
      grouped.set(key, {
        nombre: row.nombre.trim(),
        telefono: uniquePhones[0] ?? '',
        telefono_2: uniquePhones[1] ?? null,
        telefono_3: uniquePhones[2] ?? null,
        concesionario: row.concesionario.trim(),
        orden_fabricacion: key,
        tecnologia: row.tecnologia,
      })
      continue
    }

    const mergedPhones = Array.from(
      new Set([
        existing.telefono,
        existing.telefono_2 ?? '',
        existing.telefono_3 ?? '',
        ...row.phones,
      ].filter(Boolean))
    )

    if (mergedPhones.length > 3) {
      throw new Error(`La OF ${key} tiene más de 3 teléfonos asociados.`)
    }

    existing.telefono = mergedPhones[0] ?? ''
    existing.telefono_2 = mergedPhones[1] ?? null
    existing.telefono_3 = mergedPhones[2] ?? null
    existing.nombre = existing.nombre || row.nombre.trim()
    existing.concesionario = existing.concesionario || row.concesionario.trim()

    if (existing.tecnologia && row.tecnologia && existing.tecnologia !== row.tecnologia) {
      throw new Error(`La OF ${key} tiene más de una tecnología asociada.`)
    }
    existing.tecnologia = existing.tecnologia ?? row.tecnologia
  }

  return Array.from(grouped.values())
}
