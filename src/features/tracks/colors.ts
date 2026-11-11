/** Chaves da paleta de trilhas; cada uma tem uma variável CSS `--track-<chave>`. */
export const TRACK_COLORS = ['carmim', 'tinta', 'rosa', 'cinza', 'coral'] as const
export type TrackColor = (typeof TRACK_COLORS)[number]
