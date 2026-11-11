import { describe, expect, it } from 'vitest'
import devstack from '../../../DevStack.md?raw'
import { parseDuration, parseImport } from './parse'

const result = parseImport(devstack)
const inTrack = (prefix: string) => result.cards.filter((card) => card.trilha?.startsWith(prefix))
const byTitle = (start: string) => {
  const card = result.cards.find((c) => c.titulo.startsWith(start))
  if (!card) throw new Error(`card não encontrado: ${start}`)
  return card
}

describe('importar o DevStack.md (Parte B)', () => {
  it('cria uma trilha por fase, na ordem do documento, sem o número nem o parêntese final', () => {
    expect(result.trilhas).toEqual([
      'Fase 0: Base',
      'Fase 1: Java + Spring Boot',
      'Fase 2: DevOps e deploy público',
      'Fase 3 (5A): Microsserviços em produção',
      'Fase 4: Python e fundamentos de IA',
      'Fase 5 (5B): IA e sistemas multiagente',
      'Fase 6: Node.js',
      'Nível pleno: complemento',
      'Portfólio, LinkedIn e entrevistas',
      'Metas gerais',
    ])
  })

  it('gera a quantidade certa de cards por fase', () => {
    expect(result.trilhas.map((trilha) => inTrack(trilha).length)).toEqual([
      9, 12, 20, 17, 11, 23, 9, 4, 11, 1,
    ])
    expect(result.cards).toHaveLength(117)
    expect(result.cards.every((card) => card.titulo.length > 0 && card.trilha !== null)).toBe(true)
  })

  it('ignora a Parte A, tabelas e o exemplo dentro do bloco de código', () => {
    expect(result.cards.some((card) => card.titulo === 'Título')).toBe(false)
    expect(result.cards.every((card) => !card.feito)).toBe(true)
  })

  it('lê título, link, plataforma, duração e tags de uma linha padrão', () => {
    expect(byTitle('Spring Boot 3: desenvolva')).toMatchObject({
      titulo: 'Spring Boot 3: desenvolva uma API Rest em Java',
      url: 'https://www.alura.com.br/curso-online-spring-boot-3-desenvolva-api-rest-java',
      plataforma: 'Alura',
      tipo: 'curso',
      estimativaMin: 600,
      tags: ['java', 'spring', 'api'],
      trilha: 'Fase 1: Java + Spring Boot',
    })
    expect(byTitle('Pro Git')).toMatchObject({ estimativaMin: null, plataforma: null })
  })

  it('trata a palavra no lugar da plataforma como tipo quando ela é um tipo', () => {
    expect(byTitle('Docker Get Started')).toMatchObject({ tipo: 'documentacao', plataforma: null })
    expect(byTitle('Learn Git Branching')).toMatchObject({ tipo: 'exercicio', plataforma: null })
    expect(byTitle('Martin Fowler')).toMatchObject({ tipo: 'leitura', plataforma: null })
  })

  it('marca itens sem link com #buscar e tira o aviso do título', () => {
    const card = byTitle('Agno')
    expect(card).toMatchObject({
      titulo: 'Agno: criando agentes e sistemas multiagente',
      url: null,
      plataforma: 'Alura',
      tipo: 'curso',
    })
    expect(card.tags).toEqual(['ia', 'multiagente', 'buscar'])
    expect(result.cards.filter((c) => c.tags.includes('buscar'))).toHaveLength(7)
  })

  it('reconhece projetos e entregas em negrito', () => {
    expect(byTitle('Projeto 1:')).toMatchObject({ tipo: 'projeto', tags: ['portfolio', 'java'] })
    expect(byTitle('Entrega: perfil do GitHub')).toMatchObject({ tipo: 'projeto', url: null })
    expect(result.cards.filter((c) => /^Projeto \d/.test(c.titulo))).toHaveLength(7)
  })

  it('transforma subitens em checklist do card (Projeto 5)', () => {
    const projeto = byTitle('Projeto 5:')
    expect(projeto.checklist).toHaveLength(9)
    expect(projeto.checklist[0]).toEqual({
      texto: 'Cota de uso e teto de gasto por usuário',
      feito: false,
    })
  })

  it('monta os cards-checklist: produção, padrão de repositório e metas gerais', () => {
    expect(byTitle('Checklist de produção').checklist).toHaveLength(12)
    expect(byTitle('Padrão de qualidade de cada repositório').checklist).toHaveLength(6)
    const metas = byTitle('Metas gerais')
    expect(metas.checklist).toHaveLength(9)
    expect(metas.checklist.at(-1)?.texto).toMatch(/^50 candidaturas/)
  })

  it('transforma "Tópicos obrigatórios" em um card com um item por tópico', () => {
    const java = byTitle('Tópicos obrigatórios: Java + Spring Boot')
    expect(java.checklist.map((item) => item.texto)).toEqual([
      'POO e SOLID',
      'Collections e Streams',
      'JPA e Hibernate',
      'Flyway',
      'validação',
      'exceções',
      'Spring Security com JWT',
      'JUnit e Mockito',
      'paginação',
      'OpenAPI/Swagger',
    ])
    // A vírgula dentro do parêntese não divide o tópico.
    const micro = byTitle('Tópicos obrigatórios: Microsserviços em produção')
    expect(micro.checklist).toHaveLength(11)
    expect(micro.checklist.map((item) => item.texto)).toContain(
      'observabilidade (logs, métricas e traces)',
    )
  })

  it('guarda observações entre parênteses como nota e não perde o resto', () => {
    expect(byTitle('Carreira Desenvolvimento Back-End Python')).toMatchObject({
      estimativaMin: 496 * 60,
      notasMd: 'escolher só web, APIs e testes',
      tags: ['python'],
    })
    expect(byTitle('Orange Tech+')).toMatchObject({
      tags: ['java'],
      notasMd: 'verificar se o perfil se enquadra',
    })
    expect(byTitle('Padrões de API HTTP')).toMatchObject({
      plataforma: 'Alura',
      url: 'https://www.alura.com.br/carreiras/desenvolvimento-backend-python',
      notasMd: 'dentro da carreira Back-End Python',
    })
  })

  it('mantém no título o texto que vem depois do link', () => {
    expect(byTitle('Beecrowd')).toMatchObject({
      titulo: 'Beecrowd: 2 a 3 problemas por semana',
      url: 'https://judge.beecrowd.com/pt',
    })
  })
})

describe('formato da seção 13 em geral', () => {
  it('lê concluídos, subitens e notas recuadas', () => {
    const { cards, trilhas } = parseImport(
      [
        '- [x] [Git básico](https://git-scm.com/) · livro · 2h · #git',
        '  - [x] Capítulo 1',
        '  - [ ] Capítulo 2',
        '  > Anotação da primeira linha',
        '  > e da segunda',
        '## Docker',
        '* [ ] Volumes · estudo · 45 min',
      ].join('\n'),
    )
    expect(trilhas).toEqual(['Docker'])
    expect(cards[0]).toMatchObject({
      titulo: 'Git básico',
      feito: true,
      trilha: null,
      estimativaMin: 120,
      checklist: [
        { texto: 'Capítulo 1', feito: true },
        { texto: 'Capítulo 2', feito: false },
      ],
      notasMd: 'Anotação da primeira linha\ne da segunda',
    })
    expect(cards[1]).toMatchObject({ titulo: 'Volumes', trilha: 'Docker', estimativaMin: 45 })
  })

  it('aceita lista solta: links, links com título e títulos', () => {
    const { cards } = parseImport(
      [
        'https://www.youtube.com/watch?v=abc123',
        '',
        '- https://www.alura.com.br/curso-online-containers-na-pratica-com-docker',
        '[Spring Guides](https://spring.io/guides)',
        'Estudar índices no PostgreSQL',
      ].join('\n'),
    )
    expect(cards.map((c) => [c.titulo, c.plataforma, c.tipo])).toEqual([
      ['youtube.com', 'YouTube', 'video'],
      ['Containers na pratica com docker', 'Alura', 'curso'],
      ['Spring Guides', null, 'documentacao'],
      ['Estudar índices no PostgreSQL', null, 'leitura'],
    ])
    expect(cards[3].url).toBeNull()
  })

  it('devolve vazio para texto sem cards', () => {
    expect(parseImport('')).toEqual({ trilhas: [], cards: [] })
    expect(parseImport('\n  \n')).toEqual({ trilhas: [], cards: [] })
  })

  it('converte durações', () => {
    expect(parseDuration('10h')).toBe(600)
    expect(parseDuration('1h30')).toBe(90)
    expect(parseDuration('45 min')).toBe(45)
    expect(parseDuration('1,5h')).toBe(90)
    expect(parseDuration('?')).toBeNull()
    expect(parseDuration('')).toBeNull()
  })
})
