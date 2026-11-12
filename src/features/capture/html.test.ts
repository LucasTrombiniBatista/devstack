import { describe, expect, it } from 'vitest'
import { parseHtmlMetadata } from './html'

describe('metadados lidos do HTML (desktop)', () => {
  it('prefere Open Graph e resolve a imagem relativa', () => {
    const html = `<html><head>
      <title>Título da aba | Alura</title>
      <meta property="og:title" content="Spring Boot 3: desenvolva uma API Rest em Java">
      <meta property="og:image" content="/imagens/spring.png">
      <meta property="og:video:duration" content="5400">
    </head></html>`
    expect(parseHtmlMetadata(html, 'https://www.alura.com.br/curso-online-spring')).toEqual({
      titulo: 'Spring Boot 3: desenvolva uma API Rest em Java',
      miniaturaUrl: 'https://www.alura.com.br/imagens/spring.png',
      duracaoMin: 90,
    })
  })

  it('cai no <title> e junta espaços', () => {
    const html = '<title>\n  Docker   Get Started\n</title>'
    expect(parseHtmlMetadata(html, 'https://docs.docker.com/get-started/')).toEqual({
      titulo: 'Docker Get Started',
      miniaturaUrl: undefined,
      duracaoMin: undefined,
    })
  })

  it('página sem nada útil devolve null', () => {
    expect(parseHtmlMetadata('<p>oi</p>', 'https://a.b/')).toBeNull()
  })
})
