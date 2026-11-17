/**
 * Modelo de dados do DevStack.md, seção 5. Datas são strings ISO para o backup em JSON
 * e a sincronização futura não precisarem de conversão.
 */

/** Campos que toda entidade carrega para a sincronização da V1 e o soft delete. */
export interface Entity {
  id: string
  criadoEm: string
  atualizadoEm: string
  /** Sobe 1 a cada alteração; base da resolução de conflitos na V1. */
  versao: number
  /** Preenchido quando o registro foi apagado (soft delete). */
  removidoEm: string | null
}

export interface Board extends Entity {
  nome: string
}

/** Papel fixo da coluna: renomear "Feito" não pode quebrar a regra de conclusão. */
export type ColumnPapel = 'backlog' | 'semana' | 'hoje' | 'estudando' | 'revisao' | 'feito'

export interface Column extends Entity {
  boardId: string
  nome: string
  /** Índice fracionário; comparar como string simples. */
  ordem: string
  limiteWip: number | null
  papel: ColumnPapel | null
}

export interface Track extends Entity {
  nome: string
  cor: string
  /** Data alvo da trilha, AAAA-MM-DD. */
  metaData: string | null
}

export type CardTipo = 'video' | 'curso' | 'documentacao' | 'projeto' | 'leitura' | 'exercicio'
export type CardPrioridade = 'baixa' | 'media' | 'alta'

export interface CardLink {
  titulo: string
  url: string
}

export interface Card extends Entity {
  boardId: string
  columnId: string
  trackId: string | null
  titulo: string
  url: string | null
  tipo: CardTipo
  plataforma: string | null
  tags: string[]
  prioridade: CardPrioridade
  estimativaMin: number | null
  /** 0 a 100. */
  progresso: number
  /** AAAA-MM-DD. */
  dataAlvo: string | null
  notasMd: string
  /** Índice fracionário dentro da coluna. */
  ordem: string
  concluidoEm: string | null
  miniaturaUrl: string | null
  /** Links adicionais além do principal. */
  links: CardLink[]
}

export interface ChecklistItem extends Entity {
  cardId: string
  texto: string
  feito: boolean
  ordem: string
}

export interface Session extends Entity {
  cardId: string | null
  inicio: string
  fim: string | null
  duracaoMin: number
  tipo: 'foco' | 'pausa'
  origem: 'timer' | 'manual'
}

export interface PlanBlock extends Entity {
  cardId: string
  /** AAAA-MM-DD. */
  dia: string
  /** HH:mm. */
  inicio: string
  /** HH:mm. */
  fim: string
  /** Série semanal: `dia` vira a data de início e o bloco se repete em `diasSemana`. */
  recorrente: boolean
  /** 0 = domingo … 6 = sábado. Só na série; vazio ou ausente, vale o dia da semana de `dia`. */
  diasSemana?: number[]
  /** Dias (AAAA-MM-DD) em que a série foi pulada: removida ou empurrada só naquele dia. */
  excecoes?: string[]
}

/** O valor atual da meta não é guardado: sai das sessões e dos cards concluídos do dia. */
export interface DailyGoal extends Entity {
  /** AAAA-MM-DD. */
  data: string
  tipoMeta: 'horas' | 'cards'
  valorMeta: number
}

export interface PomodoroConfig {
  focoMin: number
  pausaCurtaMin: number
  pausaLongaMin: number
  ciclosAtePausaLonga: number
}

/** Registro único (`id: 'app'`) com as preferências que acompanham os dados. */
export interface Settings extends Entity {
  capacidadeSemanalMin: number
  pomodoro: PomodoroConfig
}

/** Dados de uma entidade sem os campos de controle. */
export type Data<T extends Entity> = Omit<T, keyof Entity>
