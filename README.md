# DevStack

> Kanban de estudos para quem programa: cole um link, arraste o card, foque, evolua.

App web e desktop, local-first, para controlar o que você está estudando. Cada conteúdo vira um card num Kanban, com plano semanal e timer de foco ligado ao card.

- **Especificação e backlog de estudo:** [`DevStack.md`](DevStack.md)
- **Fases de desenvolvimento e estado atual:** [`docs/ROADMAP.md`](docs/ROADMAP.md)

Estado: Fases 0 (fundação) e 1 (dados locais) concluídas. O app abre o quadro inicial com as colunas padrão, guardado no navegador; os cards chegam na Fase 2.

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

React, TypeScript, Vite, Tailwind, shadcn/ui, Zustand, React Router e i18next. Dados locais em IndexedDB com Dexie. As próximas fases trazem dnd-kit e Tauri. Detalhes e justificativas em [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Licença

[MIT](LICENSE)
