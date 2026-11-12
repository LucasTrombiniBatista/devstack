# DevStack

> Kanban de estudos para quem programa: cole um link, arraste o card, foque, evolua.

App web e desktop, local-first, para controlar o que você está estudando. Cada conteúdo vira um card num Kanban, com plano semanal e timer de foco ligado ao card.

- **Especificação e backlog de estudo:** [`DevStack.md`](DevStack.md)
- **Fases de desenvolvimento e estado atual:** [`docs/ROADMAP.md`](docs/ROADMAP.md)

Estado: Fases 0 a 6 concluídas (versão 0.1.0). Kanban completo, captura de links, paleta de comandos, importação e exportação, timer de foco ligado ao card, visão semanal e meta diária. Roda no navegador (inclusive sem internet) e como app desktop no Windows. Tudo fica guardado no próprio aparelho.

## Como rodar

Requer Node 24+ e pnpm.

```bash
pnpm install
pnpm dev
```

### App desktop (Tauri)

Requer também Rust (toolchain `stable-x86_64-pc-windows-msvc`), Visual Studio Build Tools com C++ e WebView2.

```bash
pnpm tauri dev     # app desktop em modo de desenvolvimento
pnpm tauri build   # gera o instalador em src-tauri/target/release/bundle
```

O Controle Inteligente de Aplicativos do Windows, quando ligado, bloqueia os programas que o Rust compila durante o build. Nesse caso o desktop é compilado pelo GitHub Actions: o job `desktop` do CI confere o código Rust, e o workflow `Release` gera o instalador a cada tag `vX.Y.Z`.

## Versões

As mudanças de cada versão ficam no [`CHANGELOG.md`](CHANGELOG.md). Para lançar uma versão: atualizar `version` no `package.json` e o changelog, e enviar a tag (`git tag v0.1.0 && git push origin v0.1.0`).

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
| `pnpm tauri`     | CLI do Tauri (`dev`, `build`, `icon`)           |

Na primeira vez, o Playwright precisa do navegador: `pnpm exec playwright install chromium`.

## Stack

React, TypeScript, Vite, Tailwind, shadcn/ui, Zustand, React Router e i18next. Dados locais em IndexedDB com Dexie. Arrastar e soltar com dnd-kit. Desktop com Tauri 2. Detalhes e justificativas em [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Licença

[MIT](LICENSE)
