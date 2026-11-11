# Roadmap de desenvolvimento

Plano de fases derivado do [`DevStack.md`](../DevStack.md), que é a fonte da verdade: a Parte A define os requisitos e a Parte B é o primeiro conjunto de dados que o app importa. As seções citadas abaixo são desse documento.

Cada fase termina com app rodando, testes passando e este arquivo atualizado.

## Decisões

| Área          | Escolha                                                           |
| ------------- | ----------------------------------------------------------------- |
| Base          | Vite + React + TypeScript (strict), pnpm                          |
| UI            | Tailwind + shadcn/ui (Radix), `cmdk` para a paleta                |
| Drag and drop | dnd-kit                                                           |
| Dados locais  | Dexie (IndexedDB) + `useLiveQuery`; TanStack Query entra na V1    |
| Estado de UI  | Zustand                                                           |
| Rotas         | React Router com `HashRouter` (igual em site estático e no Tauri) |
| i18n          | i18next, pt-BR e en                                               |
| Testes        | Vitest + Testing Library; Playwright para os fluxos da seção 4    |
| Lint e format | oxlint (padrão do template Vite atual) + Prettier                 |
| Desktop       | Tauri 2                                                           |
| CI/CD         | GitHub Actions                                                    |

Regras de desenho que valem para todas as fases:

- **Pronto para sync desde o dia 1:** toda entidade tem `id` (UUID), `criadoEm`, `atualizadoEm`, `versao` e `removidoEm` (soft delete).
- **Ordem dos cards por índice fracionário:** mover um card atualiza um registro, não a coluna inteira.
- **Camada de repositório** (`src/data/repos`) entre a UI e o Dexie; a sincronização da V1 entra por baixo dela.
- **Timer por timestamps**, persistido no banco: sobrevive a recarregar a página e a abas em segundo plano.
- **Metadados de link atrás de `MetadataProvider`:** no desktop busca pelo lado Rust (sem CORS); na web usa oEmbed onde der e título manual no resto.

## MVP

### Fase 0: Fundação ✅

- [x] Repositório git, README, licença, este roadmap
- [x] Vite + React + TS, Tailwind + shadcn/ui, oxlint + Prettier, Vitest, Playwright
- [x] Casca do app: barra lateral (Quadro, Semana, Configurações), tema claro/escuro/automático, densidade, pt-BR e en
- [x] Workflow de CI (lint, formatação, typecheck, testes, build, e2e)

**Pronto quando:** `pnpm dev` abre a casca com troca de tema e idioma; CI verde. (O CI só roda depois que o repositório for enviado ao GitHub.)

### Fase 1: Dados locais ✅

- [x] Schema Dexie a partir da seção 5: `Board`, `Column`, `Track`, `Card`, `ChecklistItem`, `Session`, `PlanBlock`, `DailyGoal`, `Settings` (`User` e `Integration` ficam para a V1)
- [x] Repositórios tipados com campos de sync e soft delete
- [x] Seed: um board com as 6 colunas padrão e WIP 2 em "Estudando"
- [x] Testes dos repositórios com `fake-indexeddb`

**Pronto quando:** dados persistem entre recarregamentos; testes de CRUD e ordenação passam.

### Fase 2: Kanban (seção 3.1) ✅

- [x] Colunas: renderizar, renomear, criar, reordenar, limite de WIP com aviso
- [x] Cards: criar, editar, arrastar entre colunas e dentro da coluna (mouse, toque, teclado)
- [x] Detalhe do card: título, link, tipo, plataforma, tags, prioridade, estimativa, data alvo, progresso, notas em Markdown, checklist, links extras, **Abrir conteúdo**
- [x] Trilhas com cor e agrupamento do quadro por trilha (swimlanes)
- [x] Filtros (tag, tipo, plataforma, prioridade, trilha) e busca global
- [x] Mover para "Feito" grava `concluidoEm`

- [x] Tema "Carmim" (claro e escuro) e fontes Nunito e JetBrains Mono

Cada célula mostra até 50 cards e um "Mostrar mais"; é isso que mantém o arrastar leve com backlog grande. As colunas são reordenadas pelo menu da coluna, não por arrasto.

**Pronto quando:** criar, editar e arrastar funciona só com teclado; 1.000 cards arrastam sem engasgo.

### Fase 3: Captura, importação e exportação ✅

- [x] Colar link cria card (plataforma pelo domínio, `MetadataProvider`, fallback manual)
- [x] Paleta `Ctrl/Cmd + K` mínima: novo card, ir para Quadro/Semana/Hoje, buscar card
- [x] Parser do formato da seção 13 como função pura, testado contra o próprio `DevStack.md`
  - linha com link vira card; `[x]` vai para "Feito"; `Xh` vira estimativa; `?` fica sem estimativa
  - título `## N. Fase ...` vira trilha
  - item sem link ou com `(buscar pelo nome)` vira card sem URL com a tag `#buscar`
  - subitens aninhados e blocos "um card com checklist" viram `ChecklistItem`
  - `**Projeto N:**` vira card do tipo projeto
- [x] Colar lista com pré-visualização antes de confirmar
- [x] Exportar e importar JSON (backup completo) e Markdown; exportar CSV

Como ficou:

- Na web, título e miniatura automáticos só para YouTube e Vimeo (oEmbed direto do navegador). Os outros sites bloqueiam esse acesso; o card nasce com um título tirado do endereço e a pessoa ajusta. O desktop (Fase 6) busca qualquer página.
- Itens sem metadados numa seção (como "Metas gerais") viram um único card com checklist.
- Importar a mesma lista duas vezes não duplica: vale o link, ou título e trilha quando não há link.
- O Markdown exportado guarda título, link, plataforma ou tipo, estimativa, tags, checklist e notas. O resto só vai no backup em JSON.

**Pronto quando:** importar a Parte B gera as trilhas e os cards corretos; exportar JSON, limpar o banco e importar devolve o mesmo estado.

### Fase 4: Timer de foco (seção 3.3)

- [ ] Pomodoro configurável e cronômetro livre
- [ ] Iniciar pelo card grava `Session` e soma no tempo real do card
- [ ] Mini-timer no cabeçalho; notificação e som opcional
- [ ] Modo foco (`/focus/:cardId`): só card, timer e notas
- [ ] Sessões por card com criação e edição manual

**Pronto quando:** o timer continua certo após recarregar e com a aba em segundo plano; fluxo 3 da seção 4 coberto por Playwright.

### Fase 5: Semana e meta diária (seção 3.2, versão básica)

- [ ] Visão semanal: arrastar card para dia e hora cria `PlanBlock`; mover e redimensionar
- [ ] Capacidade da semana: "planejado × disponível" com alerta
- [ ] Meta diária simples (horas de foco ou número de cards)
- [ ] Encerrar o dia: resumo e botão para empurrar pendentes

Fora do MVP: blocos recorrentes e tela de revisão semanal (V1).

**Pronto quando:** o fluxo 2 da seção 4 funciona de ponta a ponta com o backlog importado.

### Fase 6: Desktop e publicação

- [ ] Tauri 2 sobre o mesmo front: bandeja com contagem regressiva, notificações nativas, metadados via plugin HTTP
- [ ] PWA para abrir offline; deploy estático com HTTPS
- [ ] Release `v0.1.0`: instalador Windows no CI, changelog
- [ ] Passada de acessibilidade (WCAG AA) e de desempenho (abrir em menos de 1 s)

**Pronto quando:** o instalador funciona em máquina limpa; o site abre offline após a primeira visita.

### Fase 7: Uso real

- [ ] Importar a Parte B e usar o app por 2 semanas no lugar de qualquer outro método (seção 9)
- [ ] Registrar atritos como issues e corrigir em lote
- [ ] Medir o tempo para adicionar um card (meta: menos de 10 s)

## Depois do MVP

Detalhar cada versão só ao chegar nela, com o aprendizado do uso real.

### V1: contas, sync e progresso

1. Backend Java 21 + Spring Boot + PostgreSQL + Flyway: auth JWT/OAuth2, API REST, OpenAPI.
2. Sync local-first: fila de mudanças no cliente, push/pull por `versao`, resolução de conflitos.
3. Painel de progresso (horas por tecnologia e trilha, mapa de calor, sequência), metas diárias completas, rotina recorrente, revisão semanal, atalhos completos, filtros salvos.
4. Docker, CI/CD e deploy público com HTTPS.

**Pronto quando:** site com URL pública e pipeline.

### V2: microsserviços

1. Serviços de planejamento, timer e métricas, integrações e notificações, com gateway, mensageria, Redis e Keycloak.
2. Integrações com GitHub, calendário (começar por `.ics`) e playlists do YouTube; templates de trilha; revisão espaçada.
3. Terraform, OpenTelemetry + Grafana, alertas, teste de carga com k6.

**Pronto quando:** checklist de produção da seção 18 cumprido.

### V3: IA e agentes

1. Serviço Python (FastAPI) e servidor MCP expondo o quadro.
2. Agentes: planejador semanal, curador, resumo e quiz, coach de portfólio.
3. Teto de custo, confirmação humana para ações que alteram dados, trace e evals no CI.

## Pendências em aberto

- **Open source ou produto** (seção 11): hoje com licença MIT; decidir antes de divulgar.
- **Nome:** a pasta é `DevTrack` e o produto é "DevStack" (constante em `src/lib/constants.ts`); confirmar domínio antes de publicar.
- **Hospedagem do site estático:** decidir na Fase 6.
