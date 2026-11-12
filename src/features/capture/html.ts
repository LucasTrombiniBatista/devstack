import type { LinkMetadata } from './metadata'

/**
 * Lê título, miniatura e duração do HTML de uma página (Open Graph, Twitter e `<title>`).
 * Usado no desktop, que consegue baixar qualquer página.
 */
export function parseHtmlMetadata(html: string, pageUrl: string): LinkMetadata | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const meta = (...names: string[]) => {
    for (const name of names) {
      const value = doc
        .querySelector(`meta[property="${name}"], meta[name="${name}"], meta[itemprop="${name}"]`)
        ?.getAttribute('content')
        ?.trim()
      if (value) return value
    }
    return undefined
  }

  const titulo =
    meta('og:title', 'twitter:title') ?? doc.querySelector('title')?.textContent?.trim()
  const image = meta('og:image', 'og:image:url', 'twitter:image')
  let miniaturaUrl: string | undefined
  if (image) {
    try {
      miniaturaUrl = new URL(image, pageUrl).href
    } catch {
      miniaturaUrl = undefined
    }
  }
  const seconds = Number(meta('og:video:duration', 'video:duration'))
  const duracaoMin =
    Number.isFinite(seconds) && seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : undefined

  if (!titulo && !miniaturaUrl) return null
  return { titulo: titulo?.replace(/\s+/g, ' ') || undefined, miniaturaUrl, duracaoMin }
}
