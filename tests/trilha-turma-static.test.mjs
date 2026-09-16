import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pagina Trilha Turma usa palavras existentes e nao salva resultados", () => {
  const html = readFileSync("trilha-turma.html", "utf8");
  const fonte = readFileSync("src/ts/trilha-turma.ts", "utf8");

  assert.match(html, /Trilha Turma/);
  assert.match(html, /public\/assets\/js\/trilha-turma\.js/);
  assert.match(html, /turmaResumoCategoria/);
  assert.match(fonte, /DURACAO_PALAVRA_SEGUNDOS = 1/);
  assert.match(fonte, /ESPERA_TELA_ZERO_MS/);
  assert.match(fonte, /conhecidas: 60/);
  assert.match(fonte, /dificeis: 40/);
  assert.match(fonte, /preparando/);
  assert.match(fonte, /iniciarLista\("conhecidas"\)/);
  assert.match(fonte, /iniciarTimerAutomatico\(\)/);
  assert.match(fonte, /proximoTipo/);
  assert.match(fonte, /PRONTO\?/);
  assert.match(fonte, /sparkTurma/);
  assert.match(fonte, /estadoTurma\.restante = 0/);
  assert.match(fonte, /window\.setTimeout/);
  assert.match(fonte, /requestAnimationFrame/);
  assert.match(fonte, /barra\.style\.transition = "none"/);
  assert.match(fonte, /atualizarTela\(false\)/);
  assert.match(fonte, /PALAVRAS/);
  assert.match(fonte, /PALAVRAS POSSIVELMENTE DESCONHECIDAS/);
  assert.match(fonte, /resumoCategoriaAtual/);
  assert.match(fonte, /tempo limite/);
  assert.match(fonte, /total \* DURACAO_PALAVRA_SEGUNDOS/);
  assert.match(fonte, /ajustarTamanhoPalavra/);
  assert.match(readFileSync("assets/css/app.css", "utf8"), /white-space:nowrap/);
  assert.match(fonte, /palavrasConhecidas/);
  assert.match(fonte, /palavrasDificeis/);
  assert.match(fonte, /sortearSemRepetirPorCiclo/);
  assert.match(fonte, /trilha-turma-ciclo-/);
  assert.doesNotMatch(html, /turmaIniciarConhecidas|turmaIniciarDificeis|turmaPausar|turmaProxima/);
  assert.doesNotMatch(html + fonte, /salvarResultado|resultadosAlunos|analisesPedagogicas|Gerar análise/);
});

test("avaliacao individual sorteia palavras e textos por ciclo sem repeticao", () => {
  const fonte = readFileSync("assets/js/app.js", "utf8");
  assert.match(fonte, /chaveItemCiclo/);
  assert.match(fonte, /trilha-ciclo-/);
  assert.match(fonte, /palavras-conhecidas/);
  assert.match(fonte, /palavras-possivelmente-desconhecidas/);
  assert.match(fonte, /textos-narrativos/);
  assert.match(fonte, /localStorage\.setItem\(chave/);
});

test("tela inicial mantem Trilha Turma no botao principal e dashboard no topo", () => {
  const html = readFileSync("index.html", "utf8");
  const ocorrenciasTrilhaTurma = html.match(/Iniciar Trilha Turma/g) || [];
  assert.match(html, /Iniciar Trilha Turma/);
  assert.match(html, /trilha-turma\.html/);
  assert.equal(ocorrenciasTrilhaTurma.length, 1);
  assert.match(html, /Dashboard/);
  assert.match(html, /dashboard\.html/);
});
