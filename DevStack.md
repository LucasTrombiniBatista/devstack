# DevStack

> Kanban de estudos para quem programa: cole um link, arraste o card, foque, evolua.

Documento com duas partes: **(A)** a especificação da plataforma DevStack e **(B)** o backlog completo de estudo (tecnologias, ferramentas e links), já no formato que a plataforma vai importar.

---

# PARTE A: Plataforma DevStack

## 1. Visão

DevStack é um app **web e desktop** para controlar o que você está estudando. Cada conteúdo (vídeo, curso, documentação, repositório) vira um **card** num **Kanban**. Você arrasta os cards entre colunas, agenda a semana, define metas por dia e usa **timers de foco** ligados ao card que está estudando.

**Para quem:** pessoas desenvolvedoras (iniciantes a plenas) que estudam por várias fontes ao mesmo tempo (Alura, DIO, YouTube, docs) e perdem o controle do que já viram e do que falta.

**Promessa:** abrir o app, ver o que fazer hoje em 3 segundos, estudar com foco e ver o progresso crescer.

## 2. Princípios de produto

1. **Zero atrito para adicionar.** Colar um link já cria o card, com título e miniatura preenchidos.
2. **Teclado primeiro.** Tudo acessível por atalhos e por uma paleta de comandos (`Ctrl/Cmd + K`), como em ferramentas que devs já usam.
3. **Rápido e local-first.** Abre instantaneamente, funciona offline e sincroniza depois.
4. **Seus dados são seus.** Exportar e importar em Markdown e JSON a qualquer momento.
5. **Bonito e calmo.** Tema escuro e claro, pouca cor, nada piscando. Foco no conteúdo.
6. **Meta realista.** O app avisa quando a semana está carregada demais para o tempo disponível.
7. **Texto em Markdown.** Notas dos cards em Markdown com blocos de código.

## 3. Funcionalidades

### 3.1 Kanban de estudos (núcleo)

- Colunas padrão: **Backlog → Esta semana → Hoje → Estudando → Revisão → Feito**. Colunas podem ser renomeadas, criadas e reordenadas.
- **Arrastar e soltar** cards entre colunas e dentro da coluna, com suporte a teclado e toque.
- **Card** com:
  - título e **link** do conteúdo (YouTube, Alura, DIO, documentação, GitHub, artigo);
  - tipo (vídeo, curso, documentação, projeto, leitura, exercício);
  - tecnologia e tags (`#java`, `#docker`, `#ia`);
  - estimativa em horas e tempo real gasto (vem dos timers);
  - prioridade, data alvo e progresso (0 a 100% ou checklist);
  - notas em Markdown, checklist de subtarefas e anexos de link adicionais;
  - botão **Abrir conteúdo** (abre o link no navegador ou numa janela lateral).
- **Colar link para criar card:** o app lê o título, a miniatura e, quando possível, a duração (oEmbed e metadados da página). Plataformas fechadas (Alura, DIO) pedem preenchimento manual do título, e isso deve ser aceitável em um clique.
- **Colar lista:** colar várias linhas de links ou de Markdown cria vários cards de uma vez (formato na seção 13).
- **Trilhas (swimlanes):** agrupar cards por trilha (por exemplo "Java e Spring", "DevOps", "IA e agentes") e filtrar por tecnologia, tipo, plataforma ou prioridade.
- **Limite de WIP** configurável na coluna "Estudando" (sugestão: 2 cards), para evitar estudar dez coisas ao mesmo tempo.
- Busca global e filtros salvos.

### 3.2 Planejamento semanal e metas diárias

- **Visão semanal** com blocos de horário. Arraste um card do Kanban para um dia e horário.
- **Capacidade da semana:** você define as horas disponíveis (por exemplo 10 h) e o app mostra "planejado × disponível" e alerta se passar.
- **Meta diária:** por horas de foco, por número de cards ou por tarefa específica. Mostra o quanto falta para bater a meta do dia.
- **Rotina recorrente:** blocos que se repetem toda semana (por exemplo terça e quinta, 19h às 21h).
- **Revisão semanal:** ao fim da semana, tela com o que foi concluído, o que atrasou e um botão para **replanejar** o que sobrou.

### 3.3 Timer de foco

- **Pomodoro configurável** (foco, pausa curta, pausa longa) e modo livre (cronômetro).
- **Ligado ao card:** iniciar o timer a partir do card registra o tempo nele automaticamente.
- Notificação do sistema e som opcional ao terminar. No desktop, ícone na bandeja com contagem regressiva.
- **Modo foco:** esconde o resto da interface e mostra só o card, o timer e as notas.
- Registro de sessões com data, duração e card. Edição manual quando você esquecer de iniciar.

### 3.4 Progresso e motivação

- Painel com horas por tecnologia, por semana e por trilha.
- **Mapa de calor** de dias estudados (estilo GitHub), sequência de dias e melhor semana.
- Metas por trilha ("terminar Spring Boot até 15/01") com previsão de conclusão baseada no seu ritmo real.
- Sem gamificação invasiva: nada de pontos ou rankings por padrão.

### 3.5 Trilhas, templates e portfólio

- **Templates de trilha:** importar um roteiro pronto (a Parte B deste documento é o primeiro template).
- **Cards de projeto:** cada projeto de portfólio tem repositório, link do deploy, checklist de qualidade (README, testes, pipeline) e vira lembrete de post para o LinkedIn.
- **Rascunho de post:** a partir das notas e do projeto, gerar um rascunho para você editar e publicar manualmente.
- **Revisão espaçada (futuro):** conteúdos concluídos voltam como cards de revisão após 1, 7 e 30 dias.

### 3.6 Experiência e acessibilidade

- Tema escuro, claro e automático. Densidade compacta ou confortável.
- Atalhos para tudo: nova nota, mover card, iniciar timer, ir para hoje.
- Português (Brasil) e inglês desde o início.
- Acessível por teclado e leitor de tela, com contraste adequado (WCAG AA).
- Exportar e importar: Markdown, JSON e CSV. Backup completo com um clique.

## 4. Fluxos principais

1. **Adicionar:** `Ctrl/Cmd + K` → "Novo card" → colar link → título e miniatura aparecem → Enter. Card cai no Backlog.
2. **Planejar a semana (domingo, 10 min):** abrir a visão semanal → arrastar cards do Backlog para os dias → ver o aviso de capacidade → confirmar.
3. **Estudar:** abrir "Hoje" → clicar no card → **Iniciar foco** → o conteúdo abre ao lado e o timer roda → anotar em Markdown → marcar progresso.
4. **Encerrar o dia:** o app mostra a meta batida ou o que ficou para amanhã, com um botão para empurrar os pendentes.
5. **Revisar a semana:** relatório, replanejar o que sobrou, escolher o foco da próxima.

## 5. Modelo de dados (rascunho)

```text
User            id, nome, email, idioma, fusoHorario, preferencias
Board           id, userId, nome, colunas[]
Column          id, boardId, nome, ordem, limiteWip
Track           id, userId, nome, cor, metaData            (trilha)
Card            id, boardId, columnId, trackId, titulo, url, tipo, plataforma,
                tags[], prioridade, estimativaMin, progresso, dataAlvo,
                notasMd, ordem, criadoEm, concluidoEm
ChecklistItem   id, cardId, texto, feito
Session         id, cardId, inicio, fim, duracaoMin, tipo(foco|pausa), origem(timer|manual)
PlanBlock       id, userId, cardId, dia, inicio, fim, recorrente
DailyGoal       id, userId, data, tipoMeta(horas|cards), valorMeta, valorAtual
Integration     id, userId, provedor, tokenRef, escopo, status
```

Regra de ouro: o `Card` carrega o **link**, e tudo (tempo, progresso, plano) se pendura nele.

## 6. Arquitetura e stack sugerida

Sugestão pensada para você aprender e mostrar no portfólio ao mesmo tempo. Todas as escolhas abaixo são propostas, não decisões fechadas.

| Camada | Opção sugerida | Por quê |
|---|---|---|
| Web | React + TypeScript + Vite | Padrão de mercado, ótimo ecossistema |
| Arrastar e soltar | dnd-kit | Acessível, com suporte a teclado |
| Estado e dados locais | IndexedDB (Dexie) + TanStack Query | Local-first e offline |
| Desktop | Tauri (alternativa: Electron) | Reaproveita o front web; Tauri gera app leve |
| Backend (V1) | Java 21 + Spring Boot + PostgreSQL | É a sua stack principal de estudo |
| Auth | JWT/OAuth2 (Keycloak ou provedor social) | Prática de segurança real |
| Sync | API REST + resolução de conflitos por versão | Local-first com nuvem |
| Eventos | RabbitMQ ou Kafka | Notificações, integrações, analytics |
| Cache | Redis | Sessões e estatísticas |
| IA (V2) | Serviço em Python (FastAPI) com agentes | Conecta ao estudo de IA e multiagente |
| Infra | Docker, GitHub Actions, Terraform, nuvem à sua escolha | Deploy público com CI/CD |
| Observabilidade | OpenTelemetry + Grafana | Operar de verdade |

**Evolução em etapas:**

1. **MVP:** só front-end, dados no navegador (IndexedDB), empacotável como app desktop. Sem backend, publicado como site estático.
2. **V1:** backend em Spring Boot com contas e sincronização entre dispositivos.
3. **V2:** separar em serviços (planejamento, timer e métricas, integrações, notificações, IA) com gateway e mensageria. Aqui o DevStack vira o seu **projeto-âncora de microsserviços em produção**.

## 7. Integrações (roteiro de futuro)

| Integração | O que faz | Observação |
|---|---|---|
| Calendário (Google e Outlook) | Mostrar blocos de estudo na agenda e importar compromissos | Exige OAuth; começar só com exportar `.ics` |
| GitHub | Ligar card de projeto a repositório, ver commits e PRs, criar card a partir de issue | API pública bem documentada |
| YouTube | Importar playlists como cards, duração e progresso | Via API pública e oEmbed |
| Alura e DIO | Importar por link | Não presumir API pública: começar com colar link e preencher manualmente; verificar depois |
| Notion e Obsidian | Exportar notas e cards em Markdown | Exportar vem antes de sincronizar |
| Slack e Discord | Lembretes e resumo semanal | Webhooks simples |
| Música de foco | Abrir uma playlist ao iniciar o timer | Apenas atalho de link no início |
| WakaTime ou Toggl | Cruzar tempo de código com tempo de estudo | Opcional |
| LinkedIn | Copiar rascunho de post pronto | Publicação automática por API tende a ser restrita; manter copiar e colar |
| **MCP / agentes de IA** | Expor o quadro como servidor MCP para agentes lerem e moverem cards | Une o DevStack ao estudo de multiagente |

**Ideias de agentes (V2+):**

- **Planejador semanal:** propõe a semana a partir do backlog, da capacidade e das metas.
- **Curador:** sugere o próximo conteúdo de uma trilha e detecta lacunas.
- **Resumo e quiz:** gera resumo e perguntas de revisão a partir das suas notas.
- **Coach de portfólio:** transforma um projeto concluído em README e rascunho de post.

Qualquer agente precisa de limite de custo, confirmação humana para ações que alteram dados e registro do que fez.

## 8. Requisitos não funcionais

- **Desempenho:** abrir em menos de 1 s e arrastar cards sem engasgo com 1.000 cards.
- **Offline:** tudo do núcleo (Kanban, timer, plano) funciona sem internet.
- **Privacidade:** dados do usuário só dele; tokens de integração guardados com segurança; exclusão de conta apaga tudo.
- **Segurança:** OWASP Top 10, dependências escaneadas, segredos fora do código.
- **Qualidade:** testes automatizados, pipeline de CI/CD, versionamento semântico, changelog.
- **Acessibilidade e idiomas:** conforme a seção 3.6.

## 9. Roadmap do produto

| Versão | Entrega | Critério de pronto |
|---|---|---|
| **MVP** | Kanban com cards e link, arrastar e soltar, timer de foco ligado ao card, visão semanal básica, tema escuro, exportar e importar, instalável como app desktop | Você usa por 2 semanas no lugar de qualquer outro método |
| **V1** | Contas, sincronização, metas diárias, painel de progresso, importar lista de cards, atalhos e paleta de comandos, deploy público | Site com URL pública e CI/CD |
| **V2** | Microsserviços, GitHub e calendário, templates de trilha, revisão espaçada | Observabilidade e alertas funcionando |
| **V3** | Agentes de IA, servidor MCP, rascunho de post, integrações de comunidade | Evals automatizados e controle de custo |

## 10. Métricas de sucesso

- Dias por semana com pelo menos uma sessão de foco.
- Horas de foco por semana em relação à capacidade planejada.
- Cards concluídos por semana e tempo médio por card.
- Tempo para adicionar um card (meta: menos de 10 segundos).
- Percentual da meta semanal cumprida.

## 11. Riscos e perguntas em aberto

- **Escopo:** começar pelo MVP local-first. Não construir backend e integrações antes de usar o Kanban de verdade.
- **Dados de plataformas fechadas:** Alura e DIO podem não oferecer API. Decidir se entrada manual e colar link bastam.
- **Web e desktop ao mesmo tempo:** manter uma única base de código (Tauri ou Electron) reduz o custo. Decidir entre os dois.
- **Notificações no navegador:** têm limitações; o desktop deve ser a experiência completa do timer.
- **Open source ou produto?** Decidir cedo, pois afeta licença, documentação e contribuição.
- **Nome e identidade:** confirmar que "DevStack" está livre como nome de domínio e de produto antes de divulgar.

## 12. Primeiros passos práticos

1. Criar o repositório `devstack` com README, licença e quadro de issues.
2. Montar o front: Kanban com dnd-kit, cards com link e notas, dados no IndexedDB.
3. Adicionar o timer de foco ligado ao card e o registro de sessões.
4. Adicionar a visão semanal e a meta diária.
5. Empacotar como app desktop e publicar o site estático com HTTPS.
6. **Importar a Parte B deste documento** como primeiro conteúdo e usar o app para estudar o próprio roteiro.

---

# PARTE B: Backlog de estudo (conteúdo inicial do DevStack)

## 13. Formato de importação

Cada linha vira um card. Padrão:

```text
- [ ] [Título](url) · plataforma · duração · #tag1 #tag2
```

- `[ ]` é o estado (`[x]` já concluído).
- A duração usa `Xh` quando conhecida e `?` quando não conhecida.
- A fase vira a trilha (coluna "Backlog" por padrão).
- Itens sem link (apenas nome) estão marcados com `(buscar pelo nome)` e devem ser localizados na plataforma.

Os links de cursos Alura e DIO foram conferidos em pesquisa em 10/11/2026. Inscrições de bootcamps da DIO abrem e fecham, e parte do conteúdo depende do plano. Confira antes de começar.

## 14. Mapa de tecnologias e ferramentas

| Categoria | O que estudar | Documentação oficial |
|---|---|---|
| Controle de versão | Git, GitHub, Conventional Commits | [Pro Git](https://git-scm.com/book/pt-br/v2) |
| Linguagem principal | Java 21 (POO, Collections, Streams) | [roadmap.sh Java](https://roadmap.sh/java) |
| Framework Java | Spring Boot, Spring Data JPA, Spring Security, Spring Cloud, Spring AI | [Spring Boot](https://spring.io/projects/spring-boot), [Spring Cloud](https://spring.io/projects/spring-cloud), [Spring AI](https://spring.io/projects/spring-ai) |
| Testes Java | JUnit, Mockito, Jacoco | [JUnit](https://junit.org/), [Mockito](https://site.mockito.org/) |
| Banco relacional | PostgreSQL, SQL, índices, transações, Flyway | [PostgreSQL Docs](https://www.postgresql.org/docs/), [Flyway](https://flywaydb.org/) |
| Cache | Redis | [Redis Docs](https://redis.io/docs/) |
| Mensageria | RabbitMQ, Kafka | [RabbitMQ](https://www.rabbitmq.com/docs), [Kafka](https://kafka.apache.org/documentation/) |
| Resiliência | Circuit breaker, retry, timeout (Resilience4j) | [Resilience4j](https://resilience4j.readme.io/) |
| Autenticação | JWT, OAuth2, Keycloak | [Keycloak](https://www.keycloak.org/documentation) |
| Contêineres | Docker, Docker Compose | [Docker Docs](https://docs.docker.com/get-started/) |
| Orquestração | Kubernetes | [Kubernetes Tutorials](https://kubernetes.io/docs/tutorials/) |
| CI/CD | GitHub Actions, Azure DevOps | [GitHub Actions](https://docs.github.com/pt/actions) |
| Infraestrutura como código | Terraform (e AWS CDK) | [Terraform Docs](https://developer.hashicorp.com/terraform/docs) |
| Nuvem | AWS, Azure | [AWS Skill Builder](https://skillbuilder.aws/), [Microsoft Learn](https://learn.microsoft.com/pt-br/training/) |
| Observabilidade | OpenTelemetry, Prometheus, Grafana | [OpenTelemetry](https://opentelemetry.io/docs/), [Prometheus](https://prometheus.io/docs/), [Grafana](https://grafana.com/docs/) |
| Carga e desempenho | k6 | [k6 Docs](https://grafana.com/docs/k6/latest/) |
| Segurança | OWASP Top 10, varredura de imagens e dependências | [OWASP Top 10](https://owasp.org/www-project-top-ten/) |
| Python | Python, FastAPI, Pydantic, pytest | [Python Tutorial](https://docs.python.org/pt-br/3/tutorial/), [FastAPI](https://fastapi.tiangolo.com/pt/), [pytest](https://docs.pytest.org/) |
| Node.js (opcional) | Node, TypeScript, Express ou NestJS, Jest | [Node.js Learn](https://nodejs.org/pt/learn), [TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html), [NestJS](https://docs.nestjs.com/), [Jest](https://jestjs.io/) |
| IA e LLMs | Prompting, tool calling, RAG, pgvector, evals | [Documentação da Claude](https://docs.claude.com), [pgvector](https://github.com/pgvector/pgvector) |
| Agentes e multiagente | LangChain e LangGraph, Google ADK, CrewAI, MCP, A2A | [LangChain e LangGraph](https://docs.langchain.com), [Google ADK](https://google.github.io/adk-docs/), [CrewAI](https://docs.crewai.com/), [MCP](https://modelcontextprotocol.io) |
| Segurança de IA | Prompt injection, guardrails | [OWASP Top 10 para LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| Arquitetura | Microsserviços, 12-factor, Saga, Outbox, Clean Architecture | [microservices.io](https://microservices.io/patterns/index.html), [12-Factor App](https://12factor.net/pt_br/) |
| APIs | REST, OpenAPI/Swagger, Postman | [MDN: HTTP](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Overview) |
| Prática de algoritmos | Estruturas de dados e problemas | [Beecrowd](https://judge.beecrowd.com/pt), [LeetCode](https://leetcode.com/) |

## 15. Fase 0: Base (semanas 1 a 3)

- [ ] [Pro Git em português](https://git-scm.com/book/pt-br/v2) · livro gratuito · ? · #git
- [ ] [Learn Git Branching](https://learngitbranching.js.org/?locale=pt_BR) · interativo · ? · #git
- [ ] [Carreira Platform Engineering (Linux, GitHub, Docker)](https://www.alura.com.br/carreiras/platform-engineering) · Alura · ? · #linux #git #devops
- [ ] [MDN: visão geral do HTTP](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Overview) · documentação · ? · #http
- [ ] Padrões de API HTTP e Modelagem de APIs · Alura (dentro da [carreira Back-End Python](https://www.alura.com.br/carreiras/desenvolvimento-backend-python)) · ? · #api #http
- [ ] [SQLBolt](https://sqlbolt.com/) · interativo · ? · #sql
- [ ] [PostgreSQL Tutorial](https://www.postgresqltutorial.com/) · tutorial · ? · #sql #postgres
- [ ] [roadmap.sh Backend (guardar como checklist)](https://roadmap.sh/backend) · mapa · ? · #backend
- [ ] **Entrega:** perfil do GitHub com foto, bio e README de perfil · projeto · ? · #portfolio

## 16. Fase 1: Java + Spring Boot (semanas 4 a 10)

**Alura**

- [ ] [Carreira Desenvolvimento Back-End Java](https://www.alura.com.br/formacao-trilha-completa-dev-backend-java) · Alura · ? · #java #spring
- [ ] [Spring Boot 3: desenvolva uma API Rest em Java](https://www.alura.com.br/curso-online-spring-boot-3-desenvolva-api-rest-java) · Alura · 10h · #java #spring #api
- [ ] [Spring Boot: desenvolvendo uma API RESTful](https://www.alura.com.br/curso-online-spring-boot-desenvolvendo-api-restful) · Alura · 12h · #java #spring #docker
- [ ] [Agilidade, TDD e testes (Spring Boot)](https://www.alura.com.br/curso-online-agilidade-tdd-desenvolvimento-software) · Alura · ? · #java #testes

**DIO**

- [ ] [Bootcamp Almaviva: Back-end com Java e QA](https://www.dio.me/bootcamp/almaviva-back-end-com-java-qa) · DIO · ? · #java #spring #testes
- [ ] [Bootcamp Riachuelo: Primeiros Passos com Java](https://www.dio.me/es/bootcamp/riachuelo-primeiros-passos-com-java) · DIO · 31h · #java #solid
- [ ] [Orange Tech+ Backend (Inter)](https://www.dio.me/bootcamp/orange-tech-backend) · DIO · ? · #java (verificar se o perfil se enquadra)

**Gratuito**

- [ ] [Spring Guides](https://spring.io/guides) · documentação · ? · #spring
- [ ] [Spring Boot Reference](https://docs.spring.io/spring-boot/index.html) · documentação · ? · #spring
- [ ] [roadmap.sh Java](https://roadmap.sh/java) · mapa · ? · #java

**Tópicos obrigatórios (viram checklist de um card):** POO e SOLID, Collections e Streams, JPA e Hibernate, Flyway, validação, exceções, Spring Security com JWT, JUnit e Mockito, paginação, OpenAPI/Swagger.

**Entrega**

- [ ] **Projeto 1:** API Spring Boot de um domínio real (agendamento ou estoque) com JWT, perfis, testes, migrações, Swagger e README · projeto · ? · #portfolio #java

## 17. Fase 2: DevOps e deploy público (semanas 8 a 14)

**Alura**

- [ ] [Containers na prática com Docker](https://www.alura.com.br/curso-online-containers-na-pratica-com-docker) · Alura · ? · #docker
- [ ] [Docker: construindo imagens para produção](https://www.alura.com.br/curso-online-docker-construindo-imagens-producao) · Alura · ? · #docker
- [ ] [CI/CD e DevOps: pipelines automatizados e seguros](https://www.alura.com.br/curso-online-ci-cd-conceitos-e-praticas-de-pipeline) · Alura · 8h · #cicd #githubactions #kubernetes
- [ ] [Integração Contínua com Docker e GitHub Actions: do build ao deploy em nuvem](https://www.alura.com.br/curso-online-entrega-continua-docker-githubactions-python) · Alura · 20h · #cicd #aws
- [ ] [Integração contínua: automatize o deploy no Amazon ECS](https://www.alura.com.br/curso-online-integracao-continua-automatize-deploy-amazon-ecs) · Alura · ? · #aws #cicd
- [ ] [Cultura DevOps e Agilidade](https://www.alura.com.br/curso-online-devops-e-agil-integracao-continua-colaboracao-e-automacao) · Alura · 8h · #devops

**DIO**

- [ ] [Formação Docker Fundamentals](https://web.dio.me/track/formacao-docker-fundamentals) · DIO · ? · #docker
- [ ] [Formação Kubernetes Fundamentals](https://web.dio.me/track/formacao-kubernetes) · DIO · ? · #kubernetes
- [ ] [Formação DevOps Fundamentals](https://web.dio.me/track/formacao-devops-fundamentals) · DIO · ? · #devops #azuredevops
- [ ] [Jornada DevOps com AWS: Impulso](https://www.dio.me/bootcamp/jornada-devops-com-aws-impulso) · DIO · ? · #aws #devops
- [ ] [Bootcamp Cloud AWS](https://www.dio.me/bootcamp/bootcamp-cloud-aws) · DIO · 73h · #aws #iac
- [ ] [Cloud DevOps Experience: Banco Carrefour](https://www.dio.me/bootcamp/cloud-devops-experience-banco-carrefour) · DIO · 101h · #docker #kubernetes #gcp
- [ ] [Microsoft Azure Advanced #2](https://www.dio.me/bootcamp/microsoft-azure-advanced-2) · DIO · ? · #azure #kubernetes

**Gratuito**

- [ ] [Docker Get Started](https://docs.docker.com/get-started/) · documentação · ? · #docker
- [ ] [GitHub Actions](https://docs.github.com/pt/actions) · documentação · ? · #githubactions
- [ ] [Kubernetes Tutorials](https://kubernetes.io/docs/tutorials/) · documentação · ? · #kubernetes
- [ ] [roadmap.sh DevOps](https://roadmap.sh/devops) · mapa · ? · #devops
- [ ] [AWS Skill Builder](https://skillbuilder.aws/) · AWS · ? · #aws
- [ ] [Microsoft Learn](https://learn.microsoft.com/pt-br/training/) · Microsoft · ? · #azure

**Certificações de entrada (opcionais):** AWS Certified Cloud Practitioner e Microsoft AZ-900; depois AWS Developer Associate ou AZ-204.

**Entrega**

- [ ] **Projeto 2:** a API do Projeto 1 com Dockerfile otimizado, docker-compose, pipeline no GitHub Actions, deploy em nuvem com HTTPS e, como extra, Terraform · projeto · ? · #portfolio #devops

## 18. Fase 3 (5A): Microsserviços em produção (semanas 11 a 20)

**Alura**

- [ ] [Microsserviços: implementando com Java e Spring](https://www.alura.com.br/curso-online-microsservicos-implementando-java-spring) · Alura · ? · #microsservicos #spring
- [ ] [Microsserviços Java: construa soluções escaláveis](https://www.alura.com.br/conteudo/microsservicos-java-construa-solucoes-escalaveis) · Alura · ? · #microsservicos
- [ ] [Microsserviços: padrões de projeto](https://www.alura.com.br/conteudo/microsservicos-padroes-projeto) · Alura · ? · #microsservicos #padroes
- [ ] [Microsserviços na prática: IaC com CDK e deploy na AWS](https://www.alura.com.br/conteudo/microsservicos-pratica-iac-cdk-deploy-aws) · Alura · 3h · #aws #iac
- [ ] [Arquiteturas distribuídas e integração de sistemas](https://www.alura.com.br/curso-online-arquiteturas-distribuidas-e-integracao-de-sistemas) · Alura · ? · #arquitetura
- [ ] Microsserviços na prática: mensageria com RabbitMQ (buscar pelo nome) · Alura · ? · #rabbitmq

**DIO**

- [ ] [Projeto: arquitetura de microsserviços com Spring Cloud](https://www.dio.me/projects/construindo-um-projeto-com-arquitetura-baseada-em-microsservicos-usando-spring-cloud) · DIO · ? · #springcloud
- [ ] [Bootcamp NTT DATA: Back-end Java com Spring AI](https://www.educamaisbrasil.com.br/educacao/carreira/ntt-data-e-dio-oferecem-5-mil-bolsas-para-curso-de-backend-java) · DIO · 54h · #java #springai (a página é a notícia; conferir inscrição na DIO)

**Gratuito**

- [ ] [microservices.io: catálogo de padrões](https://microservices.io/patterns/index.html) · documentação · ? · #microsservicos
- [ ] [Martin Fowler: Microservices](https://martinfowler.com/articles/microservices.html) · artigo · ? · #microsservicos
- [ ] [The Twelve-Factor App](https://12factor.net/pt_br/) · documentação · ? · #arquitetura
- [ ] [Spring Cloud](https://spring.io/projects/spring-cloud) · documentação · ? · #springcloud
- [ ] [OpenTelemetry](https://opentelemetry.io/docs/) · documentação · ? · #observabilidade

**Tópicos obrigatórios:** API Gateway, banco por serviço, REST e eventos, Saga, Outbox, idempotência, circuit breaker e retry, Redis, OAuth2/Keycloak, observabilidade (logs, métricas e traces), rate limiting.

**Entrega: checklist de produção (um card com checklist)**

- [ ] Domínio próprio e HTTPS automático
- [ ] Pipeline independente por serviço, com imagens versionadas e deploy após merge
- [ ] Infraestrutura como código (Terraform) com ambiente recriável
- [ ] Segredos fora do código
- [ ] Health checks, readiness e reinício automático
- [ ] Logs estruturados, métricas e traces
- [ ] Alertas: erro 5xx, latência e serviço fora do ar
- [ ] Rate limiting, CORS e varredura de dependências e imagens
- [ ] Migrações versionadas e backup testado
- [ ] Teste de carga com k6 e resultado no README
- [ ] Rollback documentado
- [ ] Alerta de orçamento na conta de nuvem

- [ ] **Projeto 3 (âncora):** plataforma de microsserviços no ar (pode ser o próprio DevStack na V2) com gateway, 3 a 4 serviços e mensageria · projeto · ? · #portfolio #microsservicos
- [ ] **Prova de operação:** derrubar um serviço de propósito, mostrar a degradação controlada e publicar o post-mortem · projeto · ? · #portfolio #observabilidade

## 19. Fase 4: Python e fundamentos de IA (semanas 15 a 22)

**Alura (Python)**

- [ ] [Carreira Desenvolvimento Back-End Python](https://www.alura.com.br/carreiras/desenvolvimento-backend-python) · Alura · 496h (escolher só web, APIs e testes) · #python
- [ ] [Python: introdução à linguagem](https://www.alura.com.br/curso-online-python-introducao-a-linguagem) · Alura · ? · #python
- [ ] [Python Web com Flask](https://www.alura.com.br/curso-online-python-web-flask) · Alura · ? · #python #flask
- [ ] [API com Django: validações, buscas, filtros e deploy](https://www.alura.com.br/curso-online-api-django-3-validacoes-buscas-filtros-deploy) · Alura · ? · #python #django
- [ ] [Python: testes automatizados e qualidade de código](https://www.alura.com.br/curso-online-python-testes-automatizados-qualidade-codigo) · Alura · ? · #python #testes

**Gratuito**

- [ ] [FastAPI (em português)](https://fastapi.tiangolo.com/pt/) · documentação · ? · #python #fastapi
- [ ] [Python Tutorial (pt-br)](https://docs.python.org/pt-br/3/tutorial/) · documentação · ? · #python
- [ ] [roadmap.sh Python](https://roadmap.sh/python) · mapa · ? · #python

**Alura (IA, fundamentos e agentes únicos)**

- [ ] [LangChain: desenvolva agentes de inteligência artificial](https://www.alura.com.br/curso-online-langchain-desenvolva-agentes-inteligencia-artificial) · Alura · 8h · #ia #langchain
- [ ] [Cursor: integração de agentes de IA ao fluxo de desenvolvimento](https://www.alura.com.br/curso-online-cursor-integracao-de-agentes-de-ia-ao-fluxo-de-desenvolvimento) · Alura · 6h · #ia #agentes

**Entrega**

- [ ] **Projeto 4:** microsserviço em FastAPI com Pydantic, pytest, Docker e pipeline reaproveitado, consumindo a API Java · projeto · ? · #portfolio #python

## 20. Fase 5 (5B): IA e sistemas multiagente (semanas 21 a 28)

**Ordem de estudo**

1. Fundamentos de LLM: tokens, contexto, temperatura, engenharia de prompt, saída estruturada
2. Tool calling
3. RAG: embeddings, chunking, pgvector, avaliação
4. Agente único: laço de raciocínio e ferramentas, memória e limites
5. Multiagente: padrões de orquestração (tabela abaixo)
6. Protocolos: MCP e A2A
7. Produção: evals, tracing, custo, guardrails, segurança
8. Desenvolvimento assistido por agentes (agentic engineering)

| Padrão multiagente | Como funciona | Quando usar |
|---|---|---|
| Agente como ferramenta | Um agente principal chama outros como funções | Delegação simples e isolada |
| Supervisor | Um coordenador distribui tarefas e junta resultados | Fluxos com etapas bem definidas |
| Handoff | Agentes passam a conversa entre si | Atendimento com especialidades |
| Pipeline | Agentes em sequência, cada um com um papel | Gerar, revisar e publicar |
| Executor e crítico | Um produz, outro avalia e devolve | Qualidade de código ou texto |

**Alura**

- [ ] [Carreira Engenharia de Agentes de IA](https://www.alura.com.br/carreiras/engenharia-de-ia) · Alura · ? · #ia #agentes #multiagente
- [ ] [Carreira AI Agent Ops](https://www.alura.com.br/carreiras/ai-agent-ops) · Alura · 68h · #ia #agentes
- [ ] [Google ADK: orquestrando agentes de IA com Python](https://www.alura.com.br/curso-online-google-adk-agents) · Alura · 8h · #ia #adk
- [ ] Agno: criando agentes e sistemas multiagente (buscar pelo nome) · Alura · ? · #ia #multiagente
- [ ] [Agentic Engineering (Alura + FIAP)](https://www.alura.com.br/artigos/o-que-e-agentic-engineering) · artigo · ? · #ia #agentes
- [ ] [Imersão gratuita: Engenharia de Software, Dev na Era da IA](https://www.alura.com.br/imersao-engenharia-software-ia-google) · Alura + Google · ? · #ia (conferir datas e gravações)

**DIO**

- [ ] [Roadmap completo para dominar Agentes de IA em 2026](https://www.dio.me/articles/o-roadmap-completo-para-dominar-agentes-de-ia-em-2026-0df1a526693e) · DIO · ? · #ia #agentes
- [ ] [Sistemas multiagentes com Python, LLMs e CrewAI](https://www.dio.me/es/articles/inteligencia-artificial-colaborativa-criando-sistemas-multiagentes-com-python-llms-e-crewai-30f21f303561) · DIO · ? · #crewai #multiagente
- [ ] CI&T: Do Prompt ao Agente (buscar pelo nome) · DIO · ? · #ia
- [ ] AWS: Agentes de IA em Campo (buscar pelo nome) · DIO · ? · #ia #aws
- [ ] Globant: Java & Spring Boot AI Developer (buscar pelo nome) · DIO · ? · #java #ia
- [ ] DXC: IA do Zero ao Primeiro Agente (buscar pelo nome) · DIO · ? · #ia
- [ ] Agente de Deploy Automatizado com Azure DevOps (buscar pelo nome) · DIO · ? · #azuredevops #ia

**Gratuito**

- [ ] [Documentação da Claude](https://docs.claude.com) · documentação · ? · #ia
- [ ] [Model Context Protocol](https://modelcontextprotocol.io) · documentação · ? · #mcp
- [ ] [LangChain e LangGraph](https://docs.langchain.com) · documentação · ? · #langgraph
- [ ] [Google ADK](https://google.github.io/adk-docs/) · documentação · ? · #adk
- [ ] [CrewAI](https://docs.crewai.com/) · documentação · ? · #crewai
- [ ] [Spring AI](https://spring.io/projects/spring-ai) · documentação · ? · #springai
- [ ] [pgvector](https://github.com/pgvector/pgvector) · repositório · ? · #rag
- [ ] [OWASP Top 10 para LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/) · documentação · ? · #seguranca #ia
- [ ] [Livro gratuito: multiagente com LangGraph, MCP e A2A](https://www.freecodecamp.org/news/how-to-build-a-multi-agent-ai-system-with-langgraph-mcp-and-a2a-full-book/) · freeCodeCamp · ? · #multiagente #mcp

**Entrega**

- [ ] **Projeto 5:** time de agentes integrado à plataforma: triagem, conhecimento (RAG), ações (via servidor MCP) e supervisor · projeto · ? · #portfolio #multiagente
  - [ ] Cota de uso e teto de gasto por usuário
  - [ ] Rate limit, timeout e retry
  - [ ] Trace de cada passo do agente
  - [ ] Defesa contra prompt injection
  - [ ] Aprovação humana para ações sensíveis
  - [ ] Evals automáticos rodando no CI
  - [ ] Prompts versionados
  - [ ] Painel de custo e latência
  - [ ] Demo pública com cota diária, vídeo curto e diagrama no README
- [ ] **Projeto 6 (menor):** agente que revisa PRs no GitHub Actions ou agente de deploy com Azure DevOps · projeto · ? · #portfolio #devops #ia

## 21. Fase 6: Node.js (opcional, semana 29 em diante)

- [ ] [Carreira Desenvolvimento Back-End Node.js](https://www.alura.com.br/carreiras/desenvolvimento-backend-nodejs) · Alura · ? · #node
- [ ] [Node.js: primeira API com Express](https://www.alura.com.br/curso-online-node-primeira-api-express) · Alura · 8h · #node #express
- [ ] [API REST com Node.js, Express e MongoDB](https://www.alura.com.br/curso-online-nodejs-api-rest-express-mongodb) · Alura · ? · #node #mongodb
- [ ] [Formações de Node.js na Alura](https://www.alura.com.br/cursos-online-programacao/node-js) · Alura · ? · #node
- [ ] [Node.js Learn](https://nodejs.org/pt/learn) · documentação · ? · #node
- [ ] [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) · documentação · ? · #typescript
- [ ] [NestJS Docs](https://docs.nestjs.com/) · documentação · ? · #nestjs
- [ ] [roadmap.sh Node.js](https://roadmap.sh/nodejs) · mapa · ? · #node
- [ ] **Projeto 7:** reimplementar um módulo do Projeto 1 em Node com TypeScript, testes e Dockerfile · projeto · ? · #portfolio #node

## 22. Nível pleno: complemento (contínuo)

- [ ] Clean Architecture e DDD tático · estudo · ? · #arquitetura
- [ ] Mensageria avançada: Kafka e RabbitMQ em produção · estudo · ? · #mensageria
- [ ] OWASP Top 10 aplicado às suas APIs · estudo · ? · #seguranca
- [ ] Observabilidade: logs estruturados, métricas, tracing · estudo · ? · #observabilidade

## 23. Portfólio, LinkedIn e entrevistas

**Padrão de qualidade de cada repositório (um card com checklist)**

- [ ] README com problema, stack, diagrama, como rodar em um comando e demo
- [ ] Seção de decisões técnicas (trade-offs)
- [ ] Testes automatizados e badge do pipeline
- [ ] Commits pequenos e descritivos
- [ ] Documentação da API (Swagger ou collection do Postman) em `docs/`
- [ ] No máximo 4 a 6 repositórios fixados no perfil

**LinkedIn**

- [ ] Título com stack e foco, sobre curto com resultados, projetos em destaque com links, certificados da Alura e da DIO em licenças e certificações · tarefa · ? · #linkedin
- [ ] 1 a 2 posts por semana (o que construí, problema, aprendizado, link do repositório) · hábito · ? · #linkedin
- [ ] 3 posts técnicos: arquitetura, post-mortem e lições de agentes em produção · tarefa · ? · #linkedin
- [ ] Manter perfis completos na Alura Empregabilidade e no Talent Match da DIO · tarefa · ? · #carreira

**Entrevistas**

- [ ] [Beecrowd](https://judge.beecrowd.com/pt): 2 a 3 problemas por semana · prática · ? · #algoritmos
- [ ] [LeetCode](https://leetcode.com/) (fácil e médio) · prática · ? · #algoritmos
- [ ] Teoria de backend: REST, idempotência, status HTTP, transações, índices, N+1, cache, filas · estudo · ? · #backend
- [ ] System design básico: encurtador de URL, API de pedidos, fila de notificações · estudo · ? · #arquitetura
- [ ] 5 histórias no formato STAR (projetos, conflitos, erros, aprendizados) · tarefa · ? · #entrevista
- [ ] Adaptar o currículo a cada vaga (verbo + ação + número) · hábito · ? · #carreira

## 24. Metas gerais

- [ ] Fase 0 concluída e GitHub organizado
- [ ] Projeto 1 (API Spring Boot) publicado
- [ ] Projeto 2 (pipeline e deploy) no ar
- [ ] Certificação de entrada em nuvem (AWS CCP ou AZ-900)
- [ ] Projeto 3 (microsserviços em produção) no ar
- [ ] Projeto 4 (serviço Python) no ar
- [ ] Projeto 5 (time de agentes) no ar
- [ ] 10 posts no LinkedIn
- [ ] 50 candidaturas com currículo adaptado e 10 conversas com pessoas da área

**Dica:** comece a se candidatar a partir do Projeto 2. O roteiro continua em paralelo com as entrevistas.
