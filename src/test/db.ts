import { db } from '@/data/db'
import type { SeedLabels } from '@/data/seed'

/** Apaga o banco e abre de novo, vazio. */
export async function resetDb(): Promise<void> {
  db.close()
  await db.delete()
  await db.open()
}

export const TEST_LABELS: SeedLabels = {
  board: 'Meus estudos',
  columns: {
    backlog: 'Backlog',
    semana: 'Esta semana',
    hoje: 'Hoje',
    estudando: 'Estudando',
    revisao: 'Revisão',
    feito: 'Feito',
  },
}
