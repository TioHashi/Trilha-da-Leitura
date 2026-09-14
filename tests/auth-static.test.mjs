import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("paginas protegidas carregam Firebase Auth e o guard de autenticacao", () => {
  for (const filePath of ["index.html", "dashboard.html", "analises.html", "trilha-turma.html"]) {
    const html = readFileSync(filePath, "utf8");
    assert.match(html, /firebase-auth-compat\.js/);
    assert.match(html, /public\/assets\/js\/auth\.js/);
    assert.match(html, /initProtectedPage/);
    assert.match(html, /TrilhaAuth\.signOut/);
  }
});

test("pagina de login usa Firebase Authentication e nao contem segredo", () => {
  const html = readFileSync("login.html", "utf8");
  const css = readFileSync("assets/css/auth.css", "utf8");
  assert.match(html, /firebase-auth-compat\.js/);
  assert.match(html, /initLoginPage/);
  assert.match(html, /data-reset-password/);
  assert.match(css, /login-background\.png/);
  assert.match(css, /backdrop-filter/);
  assert.match(css, /auth-reset/);
  assert.doesNotMatch(html, /OPENAI_API_KEY|sk-proj-|sk-[A-Za-z0-9_-]{20,}/);
});

test("login permite solicitar redefinicao de senha pelo Firebase Auth", () => {
  const fonte = readFileSync("src/ts/auth.ts", "utf8");

  assert.match(fonte, /sendPasswordResetEmail/);
  assert.match(fonte, /Informe o e-mail cadastrado para redefinir a senha/);
  assert.match(fonte, /Se o e-mail estiver cadastrado/);
});

test("regras do Firestore exigem autenticacao e nao usam allow aberto", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  assert.match(rules, /request\.auth != null/);
  assert.doesNotMatch(rules, /allow\s+read,\s*write:\s*if\s+true/);
  assert.doesNotMatch(rules, /allow\s+read:\s*if\s+true/);
  assert.doesNotMatch(rules, /allow\s+delete:\s*if\s+true/);
});

test("dashboard tem cadastro de alunos vinculado ao professor", () => {
  const html = readFileSync("dashboard.html", "utf8");
  const fonte = readFileSync("assets/js/dashboard.js", "utf8");
  const rules = readFileSync("firestore.rules", "utf8");

  assert.match(html, /formCadastroAluno/);
  assert.match(html, /cadastroAlunoNome/);
  assert.match(fonte, /db\.collection\("alunos"\)/);
  assert.match(fonte, /professorUid:vinculoUsuario\.uid/);
  assert.match(fonte, /where\("professoresPermitidos", "array-contains", vinculoUsuario\.uid\)/);
  assert.match(rules, /match \/alunos\/\{id\}/);
  assert.match(rules, /ownsStudent/);
});

test("avaliacao individual lista alunos vinculados ao professor", () => {
  const html = readFileSync("index.html", "utf8");
  const fonte = readFileSync("assets/js/app.js", "utf8");
  const rules = readFileSync("firestore.rules", "utf8");

  assert.match(html, /<select id="nomeAluno" required>/);
  assert.match(fonte, /carregarAlunosAvaliacao/);
  assert.match(fonte, /firebase\.firestore\(\)\.collection\("alunos"\)/);
  assert.match(fonte, /where\("professoresPermitidos", "array-contains", usuario\.uid\)/);
  assert.match(rules, /request\.auth\.uid in data\.professoresPermitidos/);
});

test("dashboard junta alunos cadastrados e avaliados na turma", () => {
  const html = readFileSync("dashboard.html", "utf8");
  const fonte = readFileSync("assets/js/dashboard.js", "utf8");
  const css = readFileSync("assets/css/dashboard.css", "utf8");

  assert.match(html, /Alunos cadastrados/);
  assert.match(html, /Não Analisado/);
  assert.doesNotMatch(html, /listaAlunosCadastrados/);
  assert.match(fonte, /alunosDaTurmaFiltrada/);
  assert.match(fonte, /linhasTabelaComAlunosCadastrados/);
  assert.match(fonte, /alunosDaTurmaFiltrada\(\)\.forEach/);
  assert.match(fonte, /alunosSemAvaliacaoFiltrados/);
  assert.match(fonte, /ordenacaoTabela = \{campo:"nome", direcao:"asc"\}/);
  assert.match(fonte, /ordenarLinhasTabela/);
  assert.match(fonte, /Não Analisado/);
  assert.match(fonte, /Sem avaliação/);
  assert.match(fonte, /alunoChave/);
  assert.match(fonte, /excluirAlunoCadastro/);
  assert.match(css, /student-without-result/);
  assert.doesNotMatch(css, /no-delete-badge/);
  assert.doesNotMatch(css, /student-list-item/);
});

test("dashboard tem cadastro administrativo de acessos apenas para emulador", () => {
  const html = readFileSync("dashboard.html", "utf8");
  const fonte = readFileSync("assets/js/dashboard.js", "utf8");
  const rules = readFileSync("firestore.rules", "utf8");

  assert.match(html, /adminCadastroAcessos/);
  assert.match(html, /adminAcessoEmail/);
  assert.match(html, /adminAcessoSenha/);
  assert.match(html, /adminAcessoPapel/);
  assert.match(fonte, /cadastrarAcessoAdministrativo/);
  assert.match(fonte, /accounts:signUp/);
  assert.match(fonte, /accounts:update/);
  assert.match(fonte, /Authorization:"Bearer owner"/);
  assert.match(fonte, /emEmuladorLocalAtivo/);
  assert.match(fonte, /Cadastro de acessos disponível somente no ambiente local do Trilha da Leitura/);
  assert.match(rules, /match \/usuarios\/\{id\}/);
  assert.match(rules, /validUserData/);
});
