export type LinkMetadata = {
  titulo?: string
  miniaturaUrl?: string
  duracaoMin?: number
}

/** De onde vêm título, miniatura e duração de um link. O desktop terá uma implementação própria. */
export interface MetadataProvider {
  fetch(url: string): Promise<LinkMetadata | null>
}

/**
 * Serviços oEmbed que aceitam chamadas direto do navegador.
 * Outras páginas bloqueiam esse acesso (CORS); para elas o título fica manual na web.
 */
const OEMBED: { match: RegExp; endpoint: (url: string) => string }[] = [
  {
    match: /^https?:\/\/((www|m|music)\.)?(youtube\.com|youtu\.be)\//i,
    endpoint: (url) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  },
  {
    match: /^https?:\/\/(www\.|player\.)?vimeo\.com\//i,
    endpoint: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  },
]

const TIMEOUT_MS = 6000

export const webMetadataProvider: MetadataProvider = {
  async fetch(url) {
    const service = OEMBED.find(({ match }) => match.test(url))
    if (!service) return null
    try {
      const response = await fetch(service.endpoint(url), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) return null
      const data = (await response.json()) as {
        title?: string
        thumbnail_url?: string
        duration?: number
      }
      return {
        titulo: data.title?.trim() || undefined,
        miniaturaUrl: data.thumbnail_url,
        duracaoMin: data.duration ? Math.max(1, Math.round(data.duration / 60)) : undefined,
      }
    } catch {
      // Sem internet ou serviço fora do ar: o card fica com o título provisório.
      return null
    }
  },
}

let provider: MetadataProvider = webMetadataProvider

export const getMetadataProvider = () => provider

/** Troca a fonte de metadados (desktop na Fase 6, e testes). */
export function setMetadataProvider(next: MetadataProvider): void {
  provider = next
}
