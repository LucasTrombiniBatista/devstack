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

### Fase 4: Timer de foco (seção 3.3) ✅

- [x] Pomodoro configurável e cronômetro livre
- [x] Iniciar pelo card grava `Session` e soma no tempo real do card
- [x] Mini-timer na barra lateral; notificação e som opcional
- [x] Modo foco (`/focus/:cardId`): só card, timer e notas
- [x] Sessões por card com criação e edição manual

Como ficou:

- O timer guarda instantes, não segundos restantes. Recarregar, fechar o app ou deixar a aba em segundo plano não atrasa a contagem; ao voltar, a fase que venceu é fechada no instante em que venceu.
- Depois do foco a pausa começa sozinha. Depois da pausa o timer espera a pessoa iniciar o próximo foco.
- Só o foco vira sessão; pausas não são gravadas. Menos de 30 segundos não conta. Encerrar ou pular antes da hora grava o tempo parcial.
- O card mostra "estudado de estimado" (por exemplo "4h20 de 10h") e fica escuro com a contagem enquanto o timer está nele.
- Iniciar o foco abre o link do card em outra aba; dá para desligar nas configurações, junto com a notificação e o som.
- O estado do timer fica no `localStorage` do dispositivo e não entra no backup; as sessões entram.

**Pronto quando:** o timer continua certo após recarregar e com a aba em segundo plano; fluxo 3 da seção 4 coberto por Playwright.

### Fase 5: Semana e meta diária (seção 3.2, versão básica) ✅

- [x] Visão semanal: arrastar card para dia e hora cria `PlanBlock`; mover e redimensionar
- [x] Capacidade da semana: "planejado × disponível" com alerta
- [x] Meta diária simples (horas de foco ou número de cards)
- [x] Encerrar o dia: resumo e botão para empurrar pendentes

Como ficou:

- A grade vai das 7h às 23h em fatias de 30 minutos. A lista ao lado traz os cards de Backlog, Esta semana e Hoje; cada um tem também um botão de agenda para planejar pelo teclado.
- O bloco nasce com a estimativa do card, entre 30 min e 2h (1h quando não há estimativa). Planejar tira o card do Backlog e o põe em "Esta semana".
- A tela Hoje (`/today`) mostra a meta, o que está planejado para o dia e os cards da coluna Hoje. A meta vale do dia em que foi definida em diante, até mudar de novo.
- Encerrar o dia mostra o foco e os cards concluídos e empurra para amanhã, no mesmo horário, os blocos de cards não concluídos.
- A capacidade semanal fica em Configurações → Planejamento.

Fora do MVP: blocos recorrentes e tela de revisão semanal (V1).

**Pronto quando:** o fluxo 2 da seção 4 funciona de ponta a ponta com o backlog importado.

### Fase 6: Desktop e publicação

- [x] Tauri 2 sobre o mesmo front: bandeja com contagem regressiva, notificações nativas, metadados via plugin HTTP
- [x] PWA para abrir offline
- [ ] Deploy estático com HTTPS (workflow pronto; falta ligar o GitHub Pages)
- [x] Release `v0.1.0`: instalador Windows no CI, changelog
- [x] Passada de acessibilidade (WCAG AA) e de desempenho (abrir em menos de 1 s)

Como ficou:

- O desktop é a mesma interface dentro do Tauri. Fechar a janela só a esconde: o timer segue na bandeja, que mostra a contagem e tem Abrir, Pausar ou Continuar, Pular e Sair.
- No desktop, links abrem no navegador padrão e o título automático funciona para qualquer página (lê Open Graph e `<title>`).
- O instalador (`.msi` e `.exe`) é gerado pelo workflow `Release` ao enviar uma tag `vX.Y.Z`. As notas saem do `CHANGELOG.md`.
- O instalador não tem assinatura de código. O Windows mostra o aviso do SmartScreen, e máquinas com o Controle Inteligente de Aplicativos ligado bloqueiam a instalação. Resolver isso pede um certificado de assinatura (por exemplo Azure Trusted Signing).
- O site usa caminhos relativos, então o mesmo build serve em subpasta do GitHub Pages e dentro do Tauri. Um service worker guarda os arquivos do app; os dados já ficam no IndexedDB.
- O deploy do site fica no workflow `Site` e só roda quando a variável de repositório `DEPLOY_PAGES` vale `true`. Publicar torna o site público.
- Acessibilidade: o teste `e2e/pwa.spec.ts` roda o axe (WCAG 2 A e AA) no quadro, Hoje, Semana, Configurações, painel do card e modo foco, nos dois temas.
- Desempenho: as telas além do quadro carregam sob demanda; o pacote principal caiu de 790 kB para 510 kB, e o quadro com 1.000 cards abre em cerca de 230 ms.

**Pronto quando:** o instalador funciona em máquina limpa; o site abre offline após a primeira visita.

### Fase 7: Uso real

- [ ] Importar a Parte B e usar o app por 2 semanas no lugar de qualquer outro método (seção 9)
- [ ] Registrar atritos como issues e corrigir em lote
- [ ] Medir o tempo para adicionar um card (meta: menos de 10 s)

### Fase 8: Aparência personalizável ✅

Tudo fica em Configurações → Aparência e vale para o app inteiro. Nenhuma tela tem controles de cor próprios.

- [x] Duas paletas independentes:
  - **Fundo:** fundo da página, superfícies (cards, painéis, menus), bordas e texto. Exemplos de presets: Creme (atual), Branco, Grafite, Preto.
  - **Destaque:** botões primários, item ativo da navegação, foco do teclado, timer e gráficos. Presets (Carmim, Oceano, Floresta, Âmbar, Violeta, Preto) e seletor livre de cor.
- [x] Combinações prontas que juntam as duas (por exemplo "Branco e preto", "Branco e vermelho", "Preto e verde"), além da escolha livre de cada paleta
- [x] Regras de contraste aplicadas sozinhas:
  - o texto sobre o destaque vira claro ou escuro conforme a cor, com contraste mínimo de 4,5:1;
  - se o destaque escolhido não tiver contraste de 4,5:1 com o fundo (ele também colore textos) (por exemplo preto sobre fundo preto), o app ajusta a luminosidade e avisa na própria tela de configurações;
  - tons derivados (hover, mapa de calor, séries dos gráficos) saem da cor de destaque, nunca de valores fixos.
- [x] Layout: navegação lateral ou superior; botões de ação à direita ou à esquerda
- [x] Prévia ao vivo dentro de Configurações e botão "Restaurar padrão"
- [x] Preferências no `settings-store` (versão 2 com migração); `apply-settings` escreve os tokens CSS (`--background`, `--card`, `--primary`, `--ring`, `--chart-*` etc.) no `<html>`

Como ficou:

- Paletas de fundo: Creme (o visual original), Neutro (branco puro ou preto puro) e Frio. O tema claro/escuro escolhe a variante de cada uma.
- Destaque "Padrão" mantém o comportamento original (carmim no claro, creme no escuro). Qualquer outra cor vale nos dois temas.
- A lógica fica em `src/app/appearance.ts` (funções puras com testes); `apply-settings` só escreve no `<html>` os tokens que mudam.
- Botões de ação à esquerda invertem o cabeçalho do Quadro e da Semana (classe `page-header`).
- Com a navegação no topo, as trilhas saem da barra; o filtro por trilha continua na barra do Quadro.
- O teste `e2e/appearance.spec.ts` roda o axe nas quatro combinações prontas, com navegação no topo e botões à esquerda.

**Pronto quando:** todas as combinações prontas passam no axe (WCAG AA) nas telas principais; trocar uma paleta muda o app inteiro sem recarregar.

### Fase 9: Lobby ✅

Tela inicial com o avanço em estudos e projetos, pintada com as paletas da Fase 8. Protótipo aprovado (dados de exemplo).

- [x] Resumo: horas de foco na semana (com variação), cards concluídos, sequência de dias, dias com meta batida
- [x] Mapa de calor anual de minutos de foco (estilo GitHub)
- [x] Barras de foco por dia (14 dias) com a linha da meta diária
- [x] Linha de cards concluídos acumulados por semana
- [x] Rosca de tempo por trilha
- [x] Agregações em `src/features/lobby/stats.ts` (funções puras com testes), leitura por `src/data/repos`
- [x] Rota `/lobby` carregada sob demanda e opção de abrir o app nela

Como ficou:

- Os gráficos são SVG próprio, sem biblioteca nova; as cores vêm de `--chart-*`, então seguem a aparência da Fase 8.
- "Foco em 7 dias" compara os últimos 7 dias com os 7 anteriores. A sequência não quebra enquanto o dia de hoje ainda não teve foco.
- A meta batida usa a meta que valia em cada dia (horas de foco ou número de cards).
- A rosca mostra as quatro trilhas com mais tempo e junta o resto em "Outras trilhas"; foco sem card ou sem trilha entra em "Sem trilha".
- A tela inicial (Quadro ou Lobby) fica em Configurações → Aparência e vale na próxima abertura do app.
- O teste `e2e/lobby.spec.ts` grava sessões no IndexedDB, confere os números e roda o axe nos dois temas e com "Preto e verde".

**Pronto quando:** os números batem com as sessões e cards reais importados; axe sem violações nos dois temas.

### Fase 10: Atualização automática do desktop

Hoje quem tem o app instalado só descobre uma versão nova indo ao GitHub. Com esta fase, o próprio app avisa e se atualiza.

- [ ] Plugin oficial `tauri-plugin-updater` (Rust e `@tauri-apps/plugin-updater`), com permissão nas capabilities
- [ ] Par de chaves de assinatura da atualização (`pnpm tauri signer generate`):
  - a chave pública vai no `tauri.conf.json`;
  - a privada e a senha ficam só nos secrets do GitHub (`TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`), nunca no repositório;
  - guardar uma cópia da chave privada fora do GitHub: sem ela, nenhuma versão futura consegue atualizar quem já instalou.
- [ ] Workflow `Release` assinando os pacotes e publicando o `latest.json` junto dos instaladores (endpoint: `releases/latest/download/latest.json`)
- [ ] Ao abrir o app (e a cada poucas horas com ele aberto), verificar se há versão nova; só no desktop, nunca na web
- [ ] Aviso discreto com a versão nova e as notas do `CHANGELOG.md`, com "Atualizar agora" e "Depois"; "Depois" silencia aquela versão até a próxima
- [ ] Progresso do download, instalação e reinício; se o timer estiver rodando, esperar ele terminar ou pedir confirmação
- [ ] Em Configurações: versão atual, botão "Procurar atualizações" e opção de desligar a verificação automática
- [ ] Textos via i18next (pt-BR e en)
- [ ] Testar o caminho completo: instalar uma versão, publicar a seguinte e conferir que o app atualiza sem perder dados

Observações:

- A assinatura da atualização é diferente do certificado de assinatura de código; o aviso do SmartScreen na primeira instalação continua.
- Quem estiver em uma versão anterior a esta fase ainda precisa instalar a nova à mão uma vez.
- Falha na verificação (sem internet, GitHub fora) não mostra erro; só tenta de novo mais tarde.

**Pronto quando:** um app instalado na versão N recebe o aviso da N+1, atualiza com um clique e abre com os mesmos dados.

## Depois do MVP

Detalhar cada versão só ao chegar nela, com o aprendizado do uso real.

### V1: contas, sync e progresso

1. Backend Java 21 + Spring Boot + PostgreSQL + Flyway: auth JWT/OAuth2, API REST, OpenAPI.
2. Sync local-first: fila de mudanças no cliente, push/pull por `versao`, resolução de conflitos.
3. Painel de progresso além do Lobby (horas por tecnologia, comparação entre dispositivos), metas diárias completas, rotina recorrente, revisão semanal, atalhos completos, filtros salvos.
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
