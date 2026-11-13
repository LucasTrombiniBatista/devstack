# Changelog

Todas as mudanças relevantes do projeto ficam registradas aqui. O formato segue o
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.1.4] - 2026-11-12

### Corrigido

- Configurações mostrava duas barras de rolagem, e a maior rolava até uma área vazia. Agora só o conteúdo rola, em todas as telas e com a navegação lateral ou no topo.

## [0.1.3] - 2026-11-12

### Alterado

- O DevStack agora é open source (licença MIT), com código e releases no mesmo repositório público.
- Versão para testar a atualização automática: quem está na 0.1.2 recebe o aviso desta versão dentro do app.

## [0.1.2] - 2026-11-12

### Adicionado

- Atualização automática do app desktop: ao abrir e a cada 6 horas o app procura uma versão nova e mostra um aviso com as novidades, "Atualizar agora" e "Depois". Ele baixa, instala e reinicia sozinho, e pede confirmação se o timer estiver rodando.
- Configurações → Atualizações com a versão instalada, o botão "Procurar atualizações" e a opção de desligar a verificação automática.

### Observação

- Esta é a primeira versão com atualização automática. Quem está na 0.1.0 ou na 0.1.1 precisa instalar esta à mão uma vez; as próximas chegam pelo próprio app.

## [0.1.1] - 2026-11-12

### Adicionado

- Configurações → Aparência com paleta de fundo (Creme, Neutro, Frio) e cor de destaque (cores prontas ou qualquer cor), combinações prontas como "Branco e preto" e "Preto e verde", prévia e botão para restaurar o padrão.
- Ajuste automático de contraste: o texto dos botões fica claro ou escuro conforme a cor, e um destaque que some no fundo é clareado ou escurecido, com aviso.
- Navegação lateral ou no topo e botões de ação à direita ou à esquerda.
- Lobby com resumo da semana, mapa de calor do ano, foco por dia com a meta, tempo por trilha e cards concluídos por semana, nas cores da aparência escolhida.
- Opção de abrir o app no Lobby.

## [0.1.0] - 2026-11-12

Primeira versão: o MVP do DevStack, para uso local na web e no Windows.

### Adicionado

- Quadro Kanban com as colunas Backlog, Esta semana, Hoje, Estudando, Revisão e Feito, limite de WIP, arrastar com mouse, toque e teclado, trilhas com cor, raias por trilha, filtros e busca.
- Detalhe do card com link, tipo, plataforma, tags, prioridade, estimativa, data alvo, progresso, checklist, notas em Markdown com realce de código e links adicionais.
- Colar um link cria o card, com plataforma reconhecida pelo endereço e título e miniatura buscados automaticamente.
- Paleta de comandos com `Ctrl/Cmd + K`.
- Importação de listas em Markdown, incluindo a Parte B do `DevStack.md`, com pré-visualização e sem duplicar; exportação em JSON, Markdown e CSV; backup e restauração.
- Timer de foco (pomodoro configurável ou cronômetro livre) ligado ao card, modo foco, mini-timer, notificação e som, e sessões com edição manual.
- Visão semanal com blocos de horário, capacidade semanal com alerta, tela Hoje com meta diária e encerramento do dia.
- App desktop para Windows com bandeja (contagem do timer, pausar, pular), notificações nativas e título automático de qualquer página.
- Versão web que funciona sem internet depois da primeira visita e pode ser instalada como app.
- Interface em português e inglês, tema claro, escuro ou automático e densidade compacta.
