import i18n from '@/app/i18n'
import { DEFAULT_COLUMNS, type SeedLabels } from '@/data/seed'
import type { ColumnPapel } from '@/data/types'

/** Nomes do quadro inicial no idioma escolhido. Depois de criados, são dados e não mudam mais. */
export function seedLabels(language: string): SeedLabels {
  const t = i18n.getFixedT(language)
  return {
    board: t('seed.board'),
    columns: Object.fromEntries(
      DEFAULT_COLUMNS.map(({ papel }) => [papel, t(`seed.columns.${papel}`)]),
    ) as Record<ColumnPapel, string>,
  }
}
