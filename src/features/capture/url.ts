import type { CardTipo } from '@/data/types'

/** Plataformas reconhecidas pelo domínio do link. */
const PLATFORMS: [RegExp, string][] = [
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'YouTube'],
  [/(^|\.)alura\.com\.br$/, 'Alura'],
  [/(^|\.)dio\.me$/, 'DIO'],
  [/(^|\.)github\.com$/, 'GitHub'],
  [/(^|\.)vimeo\.com$/, 'Vimeo'],
  [/(^|\.)udemy\.com$/, 'Udemy'],
  [/(^|\.)coursera\.org$/, 'Coursera'],
  [/(^|\.)freecodecamp\.org$/, 'freeCodeCamp'],
  [/(^|\.)learn\.microsoft\.com$/, 'Microsoft Learn'],
  [/(^|\.)skillbuilder\.aws$/, 'AWS Skill Builder'],
]

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

export function platformFromUrl(url: string): string | null {
  const host = hostOf(url)
  if (!host) return null
  return PLATFORMS.find(([pattern]) => pattern.test(host))?.[1] ?? null
}

/** Melhor palpite do tipo de conteúdo a partir do link. */
export function tipoFromUrl(url: string, plataforma: string | null): CardTipo {
  const host = hostOf(url) ?? ''
  if (plataforma === 'YouTube' || plataforma === 'Vimeo') return 'video'
  if (plataforma === 'GitHub') return 'projeto'
  if (plataforma) return 'curso'
  if (
    /^(docs?|developer|learn)\./.test(host) ||
    /\/(docs?|documentation|guides?|reference)(\/|$)/.test(url)
  ) {
    return 'documentacao'
  }
  return 'leitura'
}

/**
 * Título provisório tirado do próprio link, para o card nascer com algo legível
 * enquanto os metadados não chegam (ou quando a plataforma não os fornece).
 */
export function fallbackTitle(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  const host = parsed.hostname.replace(/^www\./, '')
  const segments = parsed.pathname.split('/').filter(Boolean)
  const slug = segments.at(-1)
  if (!slug || /^(watch|index\.html?)$/i.test(slug)) return host
  let text: string
  try {
    text = decodeURIComponent(slug)
  } catch {
    text = slug
  }
  text = text
    .replace(/\.(html?|php|aspx?)$/i, '')
    .replace(/^curso-online-/, '')
    .replace(/[-_+]+/g, ' ')
    .trim()
  if (!/[a-zA-ZÀ-ÿ]{3}/.test(text)) return host
  return text.charAt(0).toUpperCase() + text.slice(1)
}
