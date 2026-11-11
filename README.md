# DevStack

> Kanban de estudos para quem programa: cole um link, arraste o card, foque, evolua.

App web e desktop, local-first, para controlar o que você está estudando. Cada conteúdo vira um card num Kanban, com plano semanal e timer de foco ligado ao card.

- **Especificação e backlog de estudo:** [`DevStack.md`](DevStack.md)
- **Fases de desenvolvimento e estado atual:** [`docs/ROADMAP.md`](docs/ROADMAP.md)

Estado: Fase 0 (fundação) concluída. Por enquanto existe só a casca do app, com tema, densidade e idioma.

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

React, TypeScript, Vite, Tailwind, shadcn/ui, Zustand, React Router e i18next. As próximas fases trazem Dexie (IndexedDB), dnd-kit e Tauri. Detalhes e justificativas em [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Licença

[MIT](LICENSE)
