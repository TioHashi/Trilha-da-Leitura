# Firebase Emulator Suite

Este projeto usa o Firebase Emulator Suite somente para desenvolvimento local e testes. Ele permite validar autenticação, regras do Firestore e Cloud Functions sem publicar alterações e sem tocar no Firebase de produção.

## Projeto Local

O projeto usado pelo aplicativo nos emuladores é:

```text
trilha-leitura
```

Esse identificador acompanha o `projectId` do frontend para que as paginas publicas geradas a partir de `src/pages/`, Auth Emulator e Firestore Emulator usem o mesmo namespace local.

Os testes isolados das regras podem usar o projeto local `demo-trilha-da-leitura`, mas o uso manual do aplicativo deve usar `trilha-leitura`.

## Portas

| Serviço | Endereço local |
| --- | --- |
| Interface dos emuladores | `http://127.0.0.1:4000` |
| Emulador de autenticação | `http://127.0.0.1:9099` |
| Emulador do Firestore | `127.0.0.1:8085` |
| Emulador das Cloud Functions | `127.0.0.1:5001` |

## Comandos

Instalar dependências:

```bash
npm install
npm --prefix functions install
```

Iniciar todos os emuladores configurados:

```bash
npm run emuladores
```

Esse comando usa importação e exportação local:

```text
.firebase/emuladores
```

Ao encerrar com `Ctrl+C`, o Firebase CLI salva os dados do Auth Emulator e do Firestore Emulator nesse diretório. Ao iniciar novamente, ele tenta carregar os dados salvos.

Se os emuladores estiverem vazios, recrie todos os dados fictícios:

```bash
npm run semear:emuladores
```

Depois de recriar, confira a quantidade e a distribuicao:

```bash
npm run verificar:emuladores
```

Para atualizar perfis de resultados ja existentes conforme a regra pedagogica atual:

```bash
npm run recalcular:perfis
```

Esse comando recria:

- 1 administrador local;
- 18 professores principais;
- senha `123456` para todos;
- vínculos de escola e turma;
- 360 cadastros fictícios em `alunos`, com 20 alunos por turma;
- 360 resultados fictícios em `resultadosAlunos`, com 20 alunos por turma;
- vínculos dos alunos aos professores.

O script de semeadura não apaga o histórico de análises pedagógicas geradas pela IA. As análises salvas automaticamente ficam na coleção `analisesPedagogicas` e são preservadas pelo ciclo de importação/exportação dos emuladores.

Para preservar os dados ao reiniciar, use sempre `npm run emuladores` e encerre com `Ctrl+C`. Esse comando importa `.firebase/emuladores` na inicializacao e exporta novamente no encerramento.

Executar somente os testes das regras do Firestore em um emulador temporario isolado:

```bash
npm run testar:regras
```

Mesmo que o emulador principal do aplicativo esteja ativo em `127.0.0.1:8085`, esse comando nao limpa os dados de uso manual. Os testes sobem um Firestore temporario em `127.0.0.1:18085` com o projeto local `trilha-leitura-regras-test`.

Os scripts antigos `npm run emulators` e `npm run test:rules` continuam disponíveis por compatibilidade.

## Login Local

Para testar as páginas protegidas localmente:

1. Execute `npm run emuladores`.
2. Abra `http://127.0.0.1:4000`.
3. Acesse a área de autenticação.
4. Se necessário, execute `npm run semear:emuladores`.
5. Abra `login.html` pelo servidor local apontado para `dist/` depois de executar `npm run build:pages`.
6. Entre usando um professor fictício, por exemplo `professor1@trilhaleitura.local` com senha `123456`.

Para acessar todos os alunos, turmas, resultados e análises salvas automaticamente, entre como administrador:

```text
admin@trilhaleitura.local / 123456
```

## Regras de Segurança

As regras em `firebase/firestore.rules` são carregadas pelo emulador durante os testes. Elas exigem usuário autenticado para leitura e escrita em `resultadosAlunos`, restringem exclusão definitiva a usuários com perfil administrativo e protegem `analisesPedagogicas` por professor, escola e turma.

Essas regras não são publicadas automaticamente. Para este projeto escolar, qualquer publicação deve ser feita manualmente e somente depois de revisão.

## Dados e Privacidade

Use apenas dados fictícios no emulador:

- nomes de alunos fictícios;
- escolas fictícias;
- turmas fictícias;
- resultados inventados para teste;
- análises pedagógicas geradas somente com indicadores anonimizados;
- nenhuma chave real da OpenAI;
- nenhuma credencial real.

O Assistente Pedagógico com IA também deve ser testado sem chave real até que o secret `OPENAI_API_KEY` seja configurado de forma segura em momento autorizado.

## Observações

Algumas mensagens impressas pelo Firebase CLI aparecem em inglês porque pertencem à própria ferramenta. A configuração, os scripts do projeto, os testes e a documentação local estão descritos em português do Brasil.
