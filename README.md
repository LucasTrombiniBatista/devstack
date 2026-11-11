# DevStack

> Kanban de estudos para quem programa: cole um link, arraste o card, foque, evolua.

App web e desktop, local-first, para controlar o que você está estudando. Cada conteúdo vira um card num Kanban, com plano semanal e timer de foco ligado ao card.

- **Especificação e backlog de estudo:** [`DevStack.md`](DevStack.md)
- **Fases de desenvolvimento e estado atual:** [`docs/ROADMAP.md`](docs/ROADMAP.md)

Estado: Fases 0 a 5 concluídas. Kanban completo, colar link para criar card, paleta de comandos (`Ctrl/Cmd + K`), importação de listas em Markdown (incluindo a Parte B do `DevStack.md`), exportação em JSON, Markdown e CSV, timer de foco ligado ao card com modo foco e registro de sessões, visão semanal com capacidade, meta diária e encerramento do dia. Tudo fica guardado no navegador.

## Como rodar

Requer Node 24+ e pnpm.

```bash
pnpm install
pnpm dev
```

## Scripts

| Comando          | O que faz                                       |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Servidor de desenvolvimento                     |
| `pnpm build`     | Typecheck e build de produção em `dist/`        |
| `pnpm typecheck` | Só o typecheck                                  |
| `pnpm lint`      | oxlint                                          |
| `pnpm format`    | Prettier (use `format:check` para só verificar) |
| `pnpm test`      | Testes unitários (Vitest)                       |
| `pnpm e2e`       | Testes de ponta a ponta (Playwright)            |

Na primeira vez, o Playwright precisa do navegador: `pnpm exec playwright install chromium`.

## Stack

React, TypeScript, Vite, Tailwind, shadcn/ui, Zustand, React Router e i18next. Dados locais em IndexedDB com Dexie. Arrastar e soltar com dnd-kit. A Fase 6 traz o Tauri. Detalhes e justificativas em [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Licença

[MIT](LICENSE)
