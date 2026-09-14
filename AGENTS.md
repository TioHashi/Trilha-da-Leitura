# AGENTS.md - Trilha da Leitura

Este arquivo orienta a manutencao e evolucao do repositorio **Trilha da Leitura**, um sistema web para gerenciamento e acompanhamento da fluencia leitora.

Antes de qualquer implementacao, o agente deve ler este arquivo completamente, inspecionar o repositorio, verificar o estado do Git e preservar o sistema existente.

## 1. Objetivo do Projeto

O sistema ajuda professores e gestores escolares a:

- aplicar avaliacoes de fluencia leitora;
- cadastrar alunos vinculados a professor, escola e turma;
- registrar resultados individuais;
- acompanhar desempenho individual e coletivo;
- identificar dificuldades de leitura;
- consultar historico de avaliacoes e relatorios;
- receber recomendacoes pedagogicas com apoio de Inteligencia Artificial;
- planejar intervencoes e novas avaliacoes.

A Inteligencia Artificial e apenas apoio pedagogico. Ela nao pode diagnosticar alunos, substituir a decisao do professor, modificar notas, alterar resultados ou mudar automaticamente a classificacao leitora.

## 2. Estado Atual Do Sistema

O projeto evoluiu de uma aplicacao estatica simples para um sistema web estatico com autenticacao, Firestore, Cloud Functions, IA, testes e preparacao para GitHub Pages.

Paginas principais:

- `login.html`: tela de login com Firebase Authentication, imagem de fundo institucional, recuperacao de senha por e-mail e redirecionamento seguro.
- `index.html`: avaliacao individual da fluencia leitora. Professor comum entra com escola e turma ja vinculadas ao login; o campo de aluno carrega alunos da colecao `alunos` vinculados ao professor, escola e turma.
- `dashboard.html`: painel de acompanhamento com filtros, indicadores, graficos, cadastro de alunos, tabela de resultados, exportacao CSV e exclusao controlada.
- `analises.html`: pagina de historico e Assistente Pedagogico com IA, com geracao de analise de turma ou individual, salvamento automatico e abertura/exclusao de relatorios.
- `trilha-turma.html`: atividade coletiva sem registro, com palavras em tela uma por vez, temporizador de 1 segundo por palavra e transicao automatica entre categorias.

Areas relevantes:

- `assets/js/app.js`: logica da avaliacao individual, sorteio de conteudo, cronometros de 60 segundos, classificacao, resultado e fluxo de telas.
- `assets/js/database.js`: salvamento local, fila offline, sincronizacao com Firestore e vinculacao do resultado ao usuario autenticado.
- `assets/js/dashboard.js`: leitura de resultados e alunos, vinculo professor/escola/turma, cadastro de alunos, indicadores, graficos, tabela, exclusao e CSV.
- `assets/js/conteudo.js`: listas pedagogicas de palavras conhecidas, palavras possivelmente desconhecidas, textos e perguntas.
- `src/ts/auth.ts`: autenticacao, protecao de paginas, conexao com emuladores e recuperacao de senha.
- `src/ts/ai-assistant.ts`: interface da IA, anonimizacao, historico, renderizacao de relatorios e salvamento automatico.
- `src/ts/trilha-turma.ts`: atividade coletiva de turma, temporizador, contagem de palavras e fluxo automatico.
- `functions/src/ai/`: backend da IA com Cloud Functions v2, validacao, prompt, schema, chamada OpenAI e fallback local para emulador.
- `firestore.rules`: regras de seguranca para `resultadosAlunos`, `alunos`, `usuarios` e `analisesPedagogicas`.
- `scripts/semear-emuladores.mjs`: cria dados ficticios no Firebase Emulator Suite.
- `scripts/verificar-dados-emuladores.mjs`: confere a massa local dos emuladores.
- `scripts/build-pages.mjs` e `scripts/verify-pages-build.mjs`: preparam e validam o frontend para GitHub Pages.
- `.github/workflows/pages.yml`: workflow preparado para publicacao do frontend no GitHub Pages, sem publicar backend ou secrets.
- `README.md` e `docs/firebase-emulator-suite.md`: documentacao de uso, desenvolvimento local, emuladores, IA e Pages.

## 3. Fluxo Real De Uso

Professor:

- faz login com e-mail e senha;
- tem escola e turma definidas pelas claims do Firebase Auth;
- nao escolhe livremente escola e turma no uso comum;
- cadastra alunos no dashboard, sempre vinculados ao seu usuario, escola e turma;
- seleciona somente alunos da propria turma na avaliacao individual;
- aplica a avaliacao;
- salva o resultado;
- visualiza no dashboard apenas dados vinculados ao seu escopo;
- consulta historico e IA apenas dentro do seu escopo.

Administrador:

- faz login com perfil administrativo;
- visualiza todas as escolas, turmas, alunos, resultados e analises;
- pode cadastrar acessos locais no Firebase Emulator Suite;
- pode excluir resultados e relatorios conforme regras;
- deve ser usado com cuidado para nao misturar visao administrativa com fluxo comum do professor.

Atividade coletiva:

- fica em `trilha-turma.html`;
- nao salva dados;
- nao gera relatorio;
- nao altera alunos ou resultados;
- mostra palavras conhecidas e depois palavras possivelmente desconhecidas;
- usa 1 segundo por palavra;
- tem contagem visual de feitas/faltantes e tempo limite por categoria.

## 4. Dados E Colecoes Do Firestore

`usuarios`:

- perfis de professores e administradores;
- nome, e-mail, papel, escola, serie, turma e status;
- usado para apoio administrativo local.

`alunos`:

- cadastros de alunos;
- cada aluno possui nome, escola, serie, turma, professorUid, professorEmail, professoresPermitidos, ativo, criadoEm e atualizadoEm;
- alunos ficticios dos emuladores usam prefixo `aluno-massa-ptbr-`;
- alunos cadastrados manualmente nao devem ser apagados por scripts de massa, salvo pedido explicito.

`resultadosAlunos`:

- resultados das avaliacoes individuais;
- contem nome do aluno, escola, serie, turma, acertos, precisao, compreensao, tempos, perfil, criterio e vinculo com professor;
- resultados ficticios dos emuladores usam prefixo `massa-ptbr-`.

`analisesPedagogicas`:

- relatorios gerados pela IA ou fallback local;
- contem data/hora, escopo, aluno quando individual, professor, escola, turma, indicadores e analise;
- relatorios sao salvos automaticamente apos a geracao.

## 5. Autenticacao E Autorizacao

O sistema usa Firebase Authentication com e-mail e senha.

Paginas protegidas:

- `index.html`;
- `dashboard.html`;
- `analises.html`;
- `trilha-turma.html`.

Recuperacao de senha:

- `login.html` possui botao de redefinicao de senha;
- o frontend chama `firebase.auth().sendPasswordResetEmail(email)`;
- em producao, o Firebase envia o e-mail de redefinicao;
- no Emulator Suite, o fluxo e registrado localmente e nao envia e-mail real.

Regras de acesso:

- usuarios nao autenticados nao acessam dados protegidos;
- professor le e cria dados apenas da propria escola/turma e do proprio vinculo;
- `professoresPermitidos` e usado para consultas e validacoes;
- administrador tem visao geral;
- exclusoes sensiveis devem continuar restritas por regra ou backend.

## 6. Regras Pedagogicas Preservadas

As classificacoes pedagogicas nao devem ser alteradas sem autorizacao expressa.

Regras atuais:

- **Leitor Fluente**: mais de 65 palavras corretas no texto narrativo e precisao superior a 90%;
- **Leitor Iniciante**: pelo menos 11 palavras conhecidas e 6 palavras possivelmente desconhecidas;
- demais casos: niveis de **Pre-leitor** conforme observacao.

O dashboard tambem usa **Nao Analisado** como perfil visual para alunos cadastrados que ainda nao possuem avaliacao. Esse perfil nao e criterio pedagogico de leitura; ele representa ausencia de resultado.

As questoes de compreensao sao registradas no resultado, mas nao definem o perfil leitor. Os campos numericos, exceto as questoes de compreensao, sao informados manualmente pelo professor.

## 7. Avaliacao Individual

A avaliacao individual deve manter:

- selecao de aluno cadastrado;
- escola e turma vinculadas ao professor;
- sorteio de 60 palavras conhecidas;
- sorteio de 40 palavras possivelmente desconhecidas;
- sorteio de um texto;
- perguntas de compreensao;
- cronometros de 60 segundos;
- pausa e continuacao dos cronometros;
- alerta de encerramento;
- registro de palavras corretas;
- registro de palavras possivelmente desconhecidas corretas;
- registro de palavras corretas no texto narrativo;
- registro de precisao;
- classificacao do perfil leitor;
- salvamento local;
- sincronizacao com Firestore;
- funcionamento offline.

## 8. Dashboard

O dashboard deve manter:

- filtros por escola, turma, perfil e aluno;
- professor comum restrito ao proprio vinculo;
- administrador com visao geral;
- cadastro de alunos da turma;
- total de alunos cadastrados;
- distribuicao por perfil incluindo **Nao Analisado**;
- grafico de quantidade por turma contando alunos cadastrados, avaliados ou nao;
- tabela iniciando por aluno em ordem A-Z;
- alunos sem avaliacao visiveis na tabela como **Nao Analisado**;
- exportacao CSV;
- exclusao de cadastro de aluno sem avaliacao;
- exclusao de resultado conforme permissao;
- ausencia de Bootstrap.

## 9. Assistente Pedagogico Com IA

A IA esta implementada em Cloud Functions v2 com TypeScript.

Obrigatorio:

- usar a API oficial da OpenAI somente pelo backend;
- usar `OPENAI_API_KEY` como secret;
- nunca colocar chave no frontend, Git, GitHub Pages, `firebase-config.js`, HTML, CSS ou JS publico;
- exigir autenticacao;
- validar payload;
- limitar quantidade de registros;
- anonimizar alunos antes de enviar para IA;
- nao enviar nomes reais, textos completos, listas de palavras, escola ou turma quando nao necessario;
- retornar analise estruturada;
- mostrar aviso de revisao humana;
- salvar relatorios automaticamente em `analisesPedagogicas`;
- tratar carregamento, erro e indisponibilidade;
- usar fallback local no emulador quando a chamada real nao estiver disponivel.

A resposta deve conter:

- resumo do desempenho;
- evidencias observadas;
- pontos de atencao;
- recomendacoes pedagogicas;
- plano de intervencao sugerido;
- sugestao de acompanhamento;
- limitacoes da analise;
- aviso de responsabilidade.

Aviso obrigatorio:

> A analise produzida por Inteligencia Artificial e apenas um recurso de apoio e deve ser revisada pelo professor. Ela nao substitui avaliacao pedagogica profissional.

## 10. Privacidade E LGPD

Regras obrigatorias:

- nao enviar nomes reais dos alunos para a OpenAI;
- substituir alunos por identificadores anonimos;
- enviar somente indicadores necessarios;
- nao enviar textos completos ou listas de palavras;
- nao registrar nomes em logs;
- nao registrar prompts com informacoes pessoais;
- informar ao professor os tipos de dados usados;
- nao usar IA para decisoes automaticas;
- nao permitir que a IA altere notas, resultados ou perfis;
- preservar principios de necessidade, finalidade e minimizacao.

## 11. Stack Atual

Frontend:

- HTML5 semantico;
- CSS legado preservado em `assets/css/`;
- Tailwind CSS compilado em `public/assets/css/tailwind.css`;
- TypeScript em `src/ts/`;
- JavaScript compilado em `public/assets/js/`;
- JavaScript legado ainda existente em `assets/js/`;
- frontend estatico compativel com GitHub Pages.

Backend:

- Node.js;
- TypeScript;
- Firebase Cloud Functions v2;
- codigo em `functions/src/`.

Banco e autenticacao:

- Firebase Authentication;
- Firebase Firestore;
- Firebase Emulator Suite para testes locais.

IA:

- API oficial da OpenAI;
- acesso apenas pelo backend;
- `OPENAI_API_KEY` como secret em Cloud Functions ou arquivo local ignorado para emulador.

Hospedagem:

- GitHub Pages para frontend;
- Cloud Functions para backend quando houver autorizacao futura;
- Firestore para dados.

Restricoes:

- nao usar Bootstrap;
- nao instalar Bootstrap;
- nao misturar Bootstrap com Tailwind CSS;
- nao colocar backend em GitHub Pages;
- nao publicar secrets;
- nao usar PHP ou Python no GitHub Pages.

## 12. Firebase Emulator Suite

O Emulator Suite e o ambiente seguro de testes locais.

Ele simula:

- Authentication;
- Firestore;
- Cloud Functions.

Comandos principais:

```bash
npm run emuladores
npm run semear:emuladores
npm run verificar:emuladores
npm run testar:regras
```

Massa local atual:

- 18 professores principais;
- 1 administrador;
- 360 alunos ficticios em `alunos`;
- 360 resultados ficticios em `resultadosAlunos`;
- 20 alunos por turma;
- 18 turmas;
- sem logins alias;
- dados exportados para `.firebase/emuladores`.

Acessos locais:

```text
professor1@trilhaleitura.local / 123456
...
professor18@trilhaleitura.local / 123456
admin@trilhaleitura.local / 123456
```

Nao alterar recursos reais do Firebase sem autorizacao. Nao publicar regras sem autorizacao.

## 13. GitHub Pages

O frontend esta preparado para GitHub Pages.

Regras:

- publicar somente arquivos estaticos;
- publicar o frontend completo: login, avaliacao individual, dashboard, analises, IA no cliente e Trilha Turma;
- incluir `assets/js/firebase-config.js`, pois a configuracao Web do Firebase e publica e necessaria para Auth/Firestore/Functions no navegador;
- gerar `dist/` com `npm run build:pages`;
- validar com `npm run verify:pages`;
- manter caminhos compativeis com `/Trilha-da-Leitura/`;
- nao publicar `functions/`;
- nao publicar testes;
- nao publicar `.env`, `.secret.local`, secrets ou chaves;
- nao fazer deploy sem autorizacao expressa.

## 14. Comandos De Desenvolvimento

Instalar dependencias:

```bash
npm install
npm --prefix functions install
```

Servidor estatico:

```bash
npm run serve
```

Emuladores:

```bash
npm run emuladores
```

Semear dados locais:

```bash
npm run semear:emuladores
```

Verificar dados locais:

```bash
npm run verificar:emuladores
```

Compilar TypeScript:

```bash
npm run build:ts
```

Compilar Tailwind CSS:

```bash
npm run build:css
```

Rodar testes:

```bash
npm test
npm run testar:regras
npm --prefix functions test
```

Build para Pages:

```bash
npm run build:pages
npm run verify:pages
```

## 15. Testes

O projeto possui testes para:

- regras pedagogicas;
- calculo de precisao;
- ausencia de Bootstrap;
- ausencia de secrets;
- autenticacao;
- recuperacao de senha;
- dashboard;
- alunos vinculados ao professor;
- IA e anonimizacao;
- historico de analises;
- build do GitHub Pages;
- Firebase Emulator Suite;
- Trilha Turma;
- favicon;
- regras do Firestore no emulador.

Antes de finalizar mudancas, executar testes proporcionais ao escopo. Para mudancas amplas, executar:

```bash
npm test
npm run testar:regras
npm run build:pages
npm run verify:pages
```

Quando mexer em `functions/`, tambem executar:

```bash
npm --prefix functions test
npm run build:functions
```

## 16. Arquitetura Atual Recomendada

Estrutura atual aproximada:

```text
/
|-- AGENTS.md
|-- README.md
|-- index.html
|-- dashboard.html
|-- analises.html
|-- trilha-turma.html
|-- login.html
|-- package.json
|-- tsconfig.json
|-- tailwind.config.js
|-- postcss.config.js
|-- assets/
|   |-- css/
|   |-- js/
|   |-- favicon.png
|   `-- login-background.png
|-- src/
|   |-- styles/
|   |   `-- input.css
|   `-- ts/
|       |-- auth.ts
|       |-- ai-assistant.ts
|       |-- trilha-turma.ts
|       `-- global.d.ts
|-- public/
|   `-- assets/
|       |-- css/
|       `-- js/
|-- functions/
|   |-- src/
|   |   |-- index.ts
|   |   `-- ai/
|   |       |-- analyzeReadingResults.ts
|   |       |-- prompt.ts
|   |       `-- schema.ts
|   |-- package.json
|   `-- tsconfig.json
|-- scripts/
|-- tests/
|-- docs/
|-- firestore.rules
|-- firebase.json
`-- .github/
    `-- workflows/
        `-- pages.yml
```

O artefato `dist/` do GitHub Pages deve conter as paginas publicas do frontend e os JavaScripts compilados necessarios ao navegador. O backend da IA em `functions/`, testes, fontes TypeScript e secrets nao devem entrar no artefato.

## 17. Regras De Preservacao

O agente deve:

- nao recriar o projeto do zero;
- preservar a avaliacao original;
- preservar o conteudo pedagogico;
- preservar listas de palavras, textos e perguntas;
- preservar cronometros;
- preservar salvamento local e offline;
- preservar sincronizacao com Firestore;
- preservar dashboard, filtros, graficos, tabela e CSV;
- preservar identidade visual, responsividade e acessibilidade;
- preservar todas as alteracoes existentes no Git;
- nao apagar mudancas do usuario;
- nao modificar `LICENSE.md`;
- nao modificar `NOTICE.md`;
- nao remover autoria, creditos ou rodape;
- nao alterar criterios pedagogicos sem autorizacao expressa;
- nao incluir credenciais;
- nao solicitar chave OpenAI em chat;
- nao gerar custos sem autorizacao;
- nao fazer commit, push ou deploy sem pedido explicito.

## 18. Regras De Trabalho Para O Codex

Antes de implementar:

1. Ler o `AGENTS.md` completamente.
2. Inspecionar o repositorio quando necessario.
3. Verificar o estado do Git.
4. Preservar mudancas existentes.
5. Entender a arquitetura atual antes de editar.
6. Planejar mudancas proporcionais ao pedido.
7. Implementar em etapas pequenas.
8. Testar apos alteracoes relevantes.
9. Informar arquivos criados e modificados.
10. Informar comandos executados e resultados.
11. Informar limitacoes encontradas.
12. Nao fazer deploy sem autorizacao.
13. Nao alterar recursos reais do Firebase sem autorizacao.
14. Nao colocar credenciais no repositorio.
15. Nao remover conteudo pedagogico.
16. Nao alterar licenca, autoria ou creditos.
17. Nao alterar criterios pedagogicos sem autorizacao.

## 19. Pontos De Atencao Atuais

- `assets/js/app.js`, `assets/js/dashboard.js` e `assets/js/database.js` ainda possuem JavaScript legado; parte nova esta em TypeScript.
- O CSS legado continua ativo junto com Tailwind compilado.
- O fallback local da IA existe para emulador, mas a chamada real depende de `OPENAI_API_KEY` configurada como secret.
- Em plano Spark do Firebase, secrets do Google Secret Manager podem exigir upgrade; para testes locais usar `functions/.secret.local`.
- Dados do Emulator Suite persistem apenas se os emuladores forem iniciados com import/export e encerrados corretamente.
- O dashboard usa **Nao Analisado** somente para alunos cadastrados sem resultado.

## 20. Criterios De Aceite Atuais

O sistema deve ser considerado saudavel quando:

- login funciona;
- recuperacao de senha aparece na tela de login;
- professor ve somente propria escola/turma;
- aluno cadastrado fica vinculado ao professor, escola e turma;
- avaliacao individual salva resultado;
- dashboard conta alunos cadastrados e avaliados corretamente;
- distribuicao de perfil inclui **Nao Analisado**;
- Trilha Turma roda sem salvar dados e usa 1 segundo por palavra;
- historico de IA abre, salva e exclui relatorios;
- IA nao expoe nomes reais para OpenAI;
- secrets nao aparecem no frontend ou GitHub Pages;
- Bootstrap nao aparece no projeto;
- Tailwind compila;
- GitHub Pages gera `dist/` sem backend;
- testes passam;
- licenca, autoria e creditos continuam preservados.
