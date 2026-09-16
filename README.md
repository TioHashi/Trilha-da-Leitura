# Trilha da Leitura

Sistema de avaliacao e acompanhamento da fluencia leitora, criado por Antonio Fanoel Costa Cabral.

Este repositorio esta em evolucao para um **Sistema Inteligente de Gerenciamento e Acompanhamento da Fluencia Leitora**, preservando a aplicacao atual, seu conteudo pedagogico, identidade visual, autoria, licenca e criterios de classificacao.

## Objetivo

Ajudar professores e gestores escolares a aplicar avaliacoes de fluencia leitora, registrar resultados, acompanhar desempenho individual e coletivo, identificar dificuldades e planejar intervencoes pedagogicas.

A Inteligencia Artificial prevista para fases futuras sera apenas apoio pedagogico. Ela nao podera diagnosticar estudantes, substituir a decisao do professor, alterar notas, alterar resultados ou mudar automaticamente a classificacao leitora.

## Estado Atual

O projeto funciona hoje como frontend estatico:

- `src/pages/index.html`: aplicacao de avaliacao.
- `src/pages/dashboard.html`: painel de resultados.
- `src/pages/analises.html`: historico e Assistente Pedagogico com IA.
- `src/pages/login.html`: tela de entrada.
- `src/pages/trilha-turma.html`: atividade coletiva da turma.
- `src/pages/imprimir-relatorio.html`: pagina dedicada para impressao limpa dos relatorios.
- `assets/js/conteudo.js`: listas de palavras, textos e perguntas.
- `assets/js/app.js`: fluxo da avaliacao, cronometros, resultado e classificacao.
- `assets/js/database.js`: salvamento local, fila offline e sincronizacao com Firestore.
- `assets/js/dashboard.js`: filtros, indicadores, graficos, tabela, exclusao e CSV.
- `assets/css/app.css` e `assets/css/dashboard.css`: estilos atuais.
- `firebase/firestore.rules` e `firebase.json`: configuracao atual do Firebase.

## Funcionalidades Atuais

- Identificacao de escola, turma e aluno.
- Sorteio de 60 palavras conhecidas.
- Sorteio de 40 palavras possivelmente desconhecidas.
- Sorteio de texto e duas perguntas de compreensao.
- Cronometros de 60 segundos com pausa e continuacao.
- Registro de palavras corretas, palavras dificeis corretas e precisao.
- Classificacao do perfil leitor.
- Salvamento no navegador.
- Sincronizacao com Firestore e fila offline.
- Dashboard com filtros, indicadores, graficos, tabela, ordenacao, exclusao e exportacao CSV.

## Stack Planejada

Frontend:

- HTML5 semantico.
- TypeScript.
- Tailwind CSS.
- JavaScript compilado a partir do TypeScript.
- Hospedagem estatica compativel com GitHub Pages.

Backend futuro:

- Node.js.
- TypeScript.
- Firebase Cloud Functions v2.

Banco e autenticacao futuros:

- Firebase Firestore.
- Firebase Authentication.

IA futura:

- API oficial da OpenAI chamada exclusivamente pelo backend.
- `OPENAI_API_KEY` armazenada como secret no Firebase/Google Cloud Secret Manager.

Bootstrap nao deve ser usado, instalado ou misturado com Tailwind CSS.

## Fase 1: Preparacao Tecnica

Esta fase adiciona configuracao de TypeScript, Tailwind CSS, testes automatizados basicos e documentacao, sem substituir o funcionamento atual.

O CSS legado em `assets/css/` continua ativo. O Tailwind foi configurado para migracao gradual em `src/styles/input.css`, com saida planejada para `public/assets/css/tailwind.css`.

A primeira fonte TypeScript testavel esta em `src/ts/reading-rules.ts` e replica as regras pedagogicas atuais em funcoes puras. Ela tambem prepara uma funcao correta de precisao automatica para uso futuro, sem alterar ainda o fluxo existente em `assets/js/app.js`.

## Fase 2: Autenticacao e Seguranca Local

Esta fase adiciona Firebase Authentication com e-mail e senha e protege o acesso publico gerado como `index.html`, `dashboard.html` e `analises.html`.

Arquivos principais:

- `src/pages/login.html`: tela de entrada.
- `src/ts/auth.ts`: inicializacao do Firebase Auth, protecao de paginas, login, logout e conexao automatica com emuladores em `localhost`.
- `public/assets/js/auth.js`: JavaScript compilado a partir do TypeScript.
- `firebase/firestore.rules`: regras locais corrigidas para exigir `request.auth`.

As regras do Firestore foram preparadas para:

- permitir que professores leiam, criem e atualizem apenas resultados da escola e turma vinculadas ao proprio cadastro;
- permitir que administradores consultem todos os resultados;
- permitir criacao e atualizacao apenas com payload valido;
- restringir exclusao definitiva a usuarios com claim `role` igual a `admin` ou `administrador`;
- rejeitar campos inesperados nos resultados;
- manter bloqueio para qualquer outra colecao.

Importante: as regras nao foram publicadas. A validacao deve ser feita com o Firebase Emulator Suite local.

## Fase 3: Backend do Assistente Pedagogico com IA

O backend da IA foi criado em Firebase Cloud Functions v2 com TypeScript.

Arquivos principais:

- `functions/src/index.ts`: exporta as funcoes do backend.
- `functions/src/ai/analyzeReadingResults.ts`: Cloud Function `analisarFluenciaLeitora`.
- `functions/src/ai/schema.ts`: validacao, limites, anonimimizacao e formato da resposta.
- `functions/src/ai/prompt.ts`: instrucoes internas em portugues do Brasil.
- `functions/tests/schema.test.mjs`: testes com dados ficticios.

A funcao `analisarFluenciaLeitora`:

- exige usuario autenticado;
- recebe somente dados anonimizados;
- rejeita campos inesperados;
- limita a quantidade de registros analisados;
- usa `OPENAI_API_KEY` como secret;
- chama a API oficial da OpenAI somente no backend;
- solicita resposta estruturada em JSON;
- trata indisponibilidade sem revelar informacoes internas.

### Configurar o secret futuramente

Somente quando for autorizado configurar ambiente real, use:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Depois informe a chave no prompt seguro do Firebase CLI. Nao coloque a chave em HTML, CSS, JavaScript, TypeScript do frontend, `firebase-config.js`, `.env` versionado, GitHub Pages ou Git.

Para testar localmente sem chave real, a funcao retornara mensagem de indisponibilidade caso o secret nao exista.

## Fase 4: Interface do Assistente Pedagogico com IA

A pagina `analises.html` recebeu a secao **Assistente Pedagógico com IA**. O dashboard principal manteve os resultados, filtros, graficos e tabela, com um botao **Histórico e IA** para acessar a pagina de analises.

Ela permite:

- escolher analise de turma ou analise individual;
- selecionar um aluno quando o escopo individual estiver ativo;
- visualizar filtros ativos;
- ver quais dados anonimizados serao enviados;
- gerar analise com IA;
- acompanhar carregamento;
- visualizar erro amigavel;
- copiar a analise;
- gerar novamente;
- salvar automaticamente cada analise gerada no Firestore local;
- usar o historico salvo para comparar novas analises da mesma escola, turma e professor;
- ver aviso obrigatorio de revisao humana.

O cliente da IA esta em `src/ts/ai-assistant.ts` e compila para `public/assets/js/ai-assistant.js`. Ele nao envia nomes reais, escola, turma, textos completos ou listas de palavras para o backend.

Por solicitacao posterior do responsavel pelo projeto, as respostas geradas pela IA passaram a ser salvas automaticamente na colecao `analisesPedagogicas` do Firestore. No desenvolvimento local, esses dados permanecem entre reinicios quando os emuladores sao iniciados com `npm run emuladores`, pois o comando importa e exporta `.firebase/emuladores`.

## Instalacao Local

Quando for permitido instalar dependencias:

```bash
npm install
```

Esse comando instala TypeScript, Tailwind CSS, Firebase Tools e servidor estatico local. Nao use chaves reais em arquivos versionados.

## Comandos

Executar testes que nao dependem de pacotes externos:

```bash
npm test
```

Executar testes das regras do Firestore no emulador:

```bash
npm run testar:regras
```

Esse comando usa o projeto local `demo-trilha-da-leitura` e nao publica regras no Firebase.

Validar formatacao simples:

```bash
npm run format:check
```

Compilar TypeScript apos instalar dependencias:

```bash
npm run build:ts
```

Acompanhar TypeScript:

```bash
npm run watch:ts
```

Compilar Tailwind CSS apos instalar dependencias:

```bash
npm run build:css
```

Acompanhar Tailwind CSS:

```bash
npm run watch:css
```

Build completo apos instalar dependencias:

```bash
npm run build
```

Build das Cloud Functions:

```bash
npm run build:functions
```

Testes das Cloud Functions:

```bash
npm run test:functions
```

Preparar o artefato de producao do GitHub Pages:

```bash
npm run build:pages
```

Validar o artefato de producao:

```bash
npm run verify:pages
```

Iniciar servidor estatico:

```bash
npm run serve
```

Servir o build de producao do Pages:

```bash
npm run serve:pages
```

Iniciar o Firebase Emulator Suite local:

```bash
npm run emuladores
```

Esse comando agora carrega dados persistidos de `.firebase/emuladores` e exporta novamente ao encerrar com `Ctrl+C`.

Se os emuladores forem iniciados vazios, recrie os acessos de professores, os cadastros de alunos e os resultados ficticios:

```bash
npm run semear:emuladores
```

Conferir se os cadastros e resultados ficticios estao carregados no Firestore Emulator:

```bash
npm run verificar:emuladores
```

Recalcular os perfis dos resultados existentes no Firestore Emulator com a regra pedagogica atual:

```bash
npm run recalcular:perfis
```

Com os emuladores ativos em `localhost`, o frontend conecta automaticamente ao emulador de autenticação em `127.0.0.1:9099`, ao emulador do Firestore em `127.0.0.1:8085` e ao emulador das Cloud Functions em `127.0.0.1:5001`.

O Firebase Emulator Suite exige Java instalado e disponivel no `PATH`. Para testar login localmente, use os acessos criados por `npm run semear:emuladores`. Professores veem somente sua escola e turma. O administrador local `admin@trilhaleitura.local` com senha `123456` ve todas as turmas, alunos, resultados e analises salvas automaticamente. O ambiente local usa 18 professores principais, sem logins alias.

Os comandos e orientacoes completas dos emuladores estao em `docs/firebase-emulator-suite.md`. Algumas mensagens internas do Firebase CLI continuam em ingles porque pertencem a ferramenta, mas a configuracao, os scripts auxiliares e a documentacao do projeto estao em portugues do Brasil.

## Execucao Sem Instalar Dependencias

Como o app atual e estatico, tambem e possivel gerar `dist/` com `npm run build:pages` e abrir `dist/index.html` ou servir `dist/` com um servidor estatico para verificar a avaliacao.

Exemplo com Node.js, sem instalar pacotes:

```bash
npx http-server . -c-1
```

## Regras Pedagogicas Preservadas

- Leitor Fluente: mais de 65 palavras corretas no texto narrativo e precisao superior a 90%.
- Leitor Iniciante: pelo menos 11 palavras conhecidas e 6 palavras dificeis.
- Demais casos: niveis de Pre-leitor conforme observacao.

As questoes de compreensao sao registradas, mas nao entram como criterio de corte do perfil leitor. Os dados numericos da avaliacao sao informados manualmente pelo professor, exceto as questoes de compreensao, que sao calculadas automaticamente pelas respostas marcadas.

Esses criterios nao devem ser alterados sem autorizacao expressa.

## Precisao

No fluxo atual, a precisao do texto e informada manualmente pelo professor e validada entre 0% e 100%. A formula de referencia para calculo automatico futuro continua documentada como:

```text
Precisao = (palavras corretas / palavras tentadas) x 100
```

A classificacao usa a precisao apenas para o perfil **Leitor Fluente**, que exige mais de 65 palavras corretas no texto narrativo e precisao superior a 90%.

## Privacidade e Seguranca

Riscos conhecidos e pontos de acompanhamento:

- As regras locais do Firestore foram corrigidas, mas nao foram publicadas.
- Paginas exigem login no frontend, mas a autorizacao definitiva depende das regras publicadas em fase autorizada.
- Dashboard restringe professores aos alunos da escola e turma vinculadas ao cadastro. Administradores continuam com visao geral.
- Dashboard ainda exibe o botao de exclusao; a regra local restringe exclusao definitiva a administrador.
- Dados pessoais podem existir no Firestore e no `localStorage`.
- A IA salva automaticamente as analises geradas em `analisesPedagogicas`, vinculando o registro ao professor, escola e turma autenticados para permitir comparacao posterior.

Regras obrigatorias:

- Nao inserir `OPENAI_API_KEY` no frontend, GitHub Pages, repositorio, `.env` versionado ou `firebase-config.js`.
- Nao enviar nomes reais de alunos para a OpenAI.
- Nao alterar recursos reais do Firebase sem autorizacao.
- Nao fazer deploy, push ou commit sem autorizacao.

## GitHub Pages

O frontend continua estatico e usa caminhos relativos compativeis com `/Trilha-da-Leitura/`.

O build de producao do frontend e gerado em `dist/` pelo comando:

```bash
npm run build:pages
```

O diretorio `dist/` deve conter apenas os arquivos publicos do frontend:

- `index.html`;
- `dashboard.html`;
- `analises.html`;
- `imprimir-relatorio.html`;
- `trilha-turma.html`;
- `login.html`;
- `assets/`;
- `public/assets/`;
- `LICENSE.md`;
- `NOTICE.md`;
- `.nojekyll`.

O GitHub Pages publica o frontend completo do Trilha da Leitura, incluindo login, dashboard, historico, tela de IA e configuracao publica do Firebase em `assets/js/firebase-config.js`. Essa configuracao do Firebase Web identifica o projeto no navegador, mas nao e a chave secreta da OpenAI.

Para o sistema completo funcionar online, tambem sera necessario configurar no Firebase real:

- Firebase Authentication com os usuarios de professores e administrador;
- Firestore com as colecoes `usuarios`, `alunos`, `resultadosAlunos` e `analisesPedagogicas`;
- regras do Firestore publicadas somente quando forem revisadas e autorizadas;
- Cloud Functions publicadas separadamente para a IA;
- `OPENAI_API_KEY` configurada somente como secret das Cloud Functions.

Os arquivos de `public/assets/js` publicados em `dist/` devem ser apenas `.js`. Arquivos `.map` e `.d.ts` sao artefatos de desenvolvimento e nao precisam ser publicados no frontend.

As paginas fonte ficam organizadas em `src/pages/`. O script `scripts/build-pages.mjs` copia essas paginas para a raiz de `dist/` para preservar as URLs publicas esperadas pelo GitHub Pages.

Nao devem ser publicados no GitHub Pages:

- `functions/`;
- `tests/`;
- `src/`;
- `node_modules/`;
- arquivos `.env`;
- secrets;
- codigo das Cloud Functions;
- arquivos de configuracao internos que nao sejam necessarios ao frontend.

O workflow esta em `.github/workflows/pages.yml`. Ele executa:

- instalacao com `npm ci`;
- instalacao das dependencias de `functions/`;
- validacao de TypeScript do frontend;
- validacao de TypeScript das Cloud Functions;
- testes do frontend;
- testes das Cloud Functions;
- testes das regras no Firebase Emulator Suite local;
- build do frontend;
- validacao do artefato `dist/`;
- upload e publicacao do artefato no GitHub Pages.

Para ativar o Pages no GitHub:

1. Abra o repositorio no GitHub.
2. Acesse `Settings > Pages`.
3. Em `Build and deployment`, escolha `GitHub Actions`.
4. Salve a configuracao.
5. Quando quiser publicar, faca push da branch `main` ou execute o workflow manualmente em `Actions`.

Nao faca deploy sem autorizacao do responsavel pelo projeto.

## Checklist de Qualidade

Antes de publicar, execute:

```bash
npm test
npm run test:functions
npm run testar:regras
npm run typecheck
npm --prefix functions run typecheck
npm run build:pages
npm run verify:pages
```

Confirme tambem:

- Tailwind CSS compilado em `public/assets/css/tailwind.css`;
- Bootstrap ausente das dependencias e arquivos executaveis;
- nenhum secret presente no repositorio ou em `dist/`;
- `OPENAI_API_KEY` configurado apenas como secret das Cloud Functions quando houver autorizacao;
- `LICENSE.md`, `NOTICE.md`, autoria, creditos e rodapes preservados;
- regras do Firestore testadas no emulador antes de qualquer publicacao;
- Cloud Functions publicadas separadamente do GitHub Pages quando houver autorizacao futura.

## Proximas Fases

1. Seguranca: Firebase Authentication, protecao de paginas e regras do Firestore com `request.auth`.
2. Backend da IA: Cloud Functions v2, validacao, anonimimizacao, secret da OpenAI e limites de uso.
3. Interface da IA: painel no dashboard com analise estruturada e aviso de revisao humana.
4. Testes e qualidade: ampliar cobertura, emuladores, responsividade, ausencia de Bootstrap e ausencia de secrets.
5. GitHub Pages e documentacao final.

## Licenca e Autoria

Consulte `LICENSE.md` e `NOTICE.md`. A autoria, os creditos, o rodape e as restricoes de uso devem ser preservados.
