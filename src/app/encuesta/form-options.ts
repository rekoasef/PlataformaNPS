export const CONCESIONARIOS = [
  'Agrícola Arrecifes',
  'Agrícola Noroeste',
  'Agrícola Rafaela S.A.',
  'Agro de Souza S.A.',
  'Agro Sur S.A.C.I.F.I.A',
  'Agrocomercial Chivilcoy',
  'Agromag Saladillo S.R.L.',
  'Alonso Maquinarias',
  'Altamirano Oscar A. Maquinaria',
  'Álvarez Maquinarias',
  'Anta Maquinarias S.R.L.',
  'Botto Victor',
  'Calatroni Javier',
  'Caminiti y Caminos',
  'Caón Maquinarias',
  'Centeno Maquianarias',
  'Ciagro',
  'Combes Gabriel',
  'Corporación de Maquinarias S.A.',
  'Cosechar S.A.',
  'Cri - Mag',
  'Criolani',
  'Depetris',
  'Distribuidora Z',
  'Echevarria',
  'El Marrullero',
  'EQ SA.',
  'Fábrica (Pagnucco)',
  'Ferrari maquinarias',
  'TecnoAgro (Ferro)',
  'Frare Hernán',
  'Gondra',
  'Guerrero Carlos',
  'Lanzetti',
  'Torremaq',
  'Lombardi Silvia',
  'Luciano Salvador R.',
  'M.F.M Rural',
  'Maquiagro Quenumá',
  'Maquinarias del Centro',
  'Maratta',
  'Net Multiagro',
  'Pajín Maquinarias S.A',
  'Palloti',
  'Perracino',
  'Perticarini',
  'Pintucci y Guizzo',
  'Pozzi',
  'Quadri',
  'Quevedo y Canavese',
  'Realicó Agrosoluciones',
  'Sabbione',
  'Scheidegger',
  'Schmidt Mauricio',
  'Spitale Osvaldo',
  'Sur Pampa',
  'Taborro',
  'Tecnomac',
  'Todocampo Salum',
  'Vagliengo',
  'Weinbaur',
  'Wirz Carlos',
  'Zapelli',
] as const

export const MAQUINAS_SEMBRADORA = ['Gringa', 'Pionera', 'Plantor', 'Drilor', 'Mixia', 'Domina'] as const
export const MAQUINAS_FERTILIZADORA = ['Corper (incorporadora)', 'Raster (motriz)', 'Movia (arrastre)', 'Luxion'] as const

export const MAQUINAS = [
  ...MAQUINAS_SEMBRADORA,
  ...MAQUINAS_FERTILIZADORA,
] as const

export type TipoMaquina = 'sembradora' | 'fertilizadora'

export function getTipoMaquina(modelo: string): TipoMaquina | null {
  if ((MAQUINAS_SEMBRADORA as readonly string[]).includes(modelo)) return 'sembradora'
  if ((MAQUINAS_FERTILIZADORA as readonly string[]).includes(modelo)) return 'fertilizadora'
  return null
}
