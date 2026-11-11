import type { IndexableType, Table } from 'dexie'
import { db } from '@/data/db'
import type { Data, Entity } from '@/data/types'
import { newId, nowIso } from '@/lib/ids'

/** Acrescenta os campos de controle a um registro novo. */
export function stamp<T extends Entity>(data: Data<T>, id: string = newId()): T {
  const now = nowIso()
  return { ...data, id, criadoEm: now, atualizadoEm: now, versao: 1, removidoEm: null } as T
}

/** Aplica uma alteração subindo a versão. */
export function bump<T extends Entity>(current: T, patch: Partial<Data<T>>): T {
  return { ...current, ...patch, atualizadoEm: nowIso(), versao: current.versao + 1 }
}

const alive = <T extends Entity>(entity: T | undefined): entity is T =>
  entity !== undefined && entity.removidoEm === null

/**
 * Operações comuns a toda tabela. Registros apagados (soft delete) nunca saem daqui:
 * continuam no banco só para a sincronização saber que foram removidos.
 */
export function createRepo<T extends Entity>(table: Table<T, string>) {
  async function get(id: string): Promise<T | undefined> {
    const entity = await table.get(id)
    return alive(entity) ? entity : undefined
  }

  async function update(id: string, patch: Partial<Data<T>>): Promise<T> {
    return db.transaction('rw', table, async () => {
      const current = await get(id)
      if (!current) throw new Error(`${table.name}: registro ${id} não encontrado`)
      const next = bump(current, patch)
      await table.put(next)
      return next
    })
  }

  return {
    get,
    update,

    async list(): Promise<T[]> {
      return (await table.toArray()).filter(alive)
    },

    async listBy(index: string, value: IndexableType): Promise<T[]> {
      return (await table.where(index).equals(value).toArray()).filter(alive)
    },

    async create(data: Data<T>, id?: string): Promise<T> {
      const entity = stamp<T>(data, id)
      await table.add(entity)
      return entity
    },

    async remove(id: string): Promise<void> {
      await db.transaction('rw', table, async () => {
        const current = await get(id)
        if (!current) return
        await table.put({ ...bump(current, {}), removidoEm: nowIso() })
      })
    },
  }
}
