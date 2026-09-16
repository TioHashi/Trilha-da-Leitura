import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("dashboard possui atalho para historico e IA", () => {
  const html = readFileSync("dashboard.html", "utf8");
  assert.match(html, /Voltar à Avaliação/);
  assert.match(html, /index\.html/);
  assert.match(html, /Histórico e IA/);
  assert.match(html, /analises\.html/);
  assert.doesNotMatch(html, /id="iaGerar"/);
});

test("pagina de analises possui Assistente Pedagogico com IA", () => {
  const html = readFileSync("analises.html", "utf8");
  assert.match(html, /Assistente Pedagógico com IA/);
  assert.match(html, /firebase-functions-compat\.js/);
  assert.match(html, /public\/assets\/js\/ai-assistant\.js/);
  assert.match(html, /A análise produzida por Inteligência Artificial/);
  assert.match(html, /Histórico de análises salvas/);
  assert.match(html, /id="iaImprimir"/);
  assert.match(html, /Imprimir relatório/);
});

test("cliente da IA chama somente Cloud Function autenticada e nao contem segredo", () => {
  const fonte = readFileSync("src/ts/ai-assistant.ts", "utf8");
  assert.match(fonte, /httpsCallable\("analisarFluenciaLeitora"\)/);
  assert.match(fonte, /currentUser/);
  assert.doesNotMatch(fonte, /OPENAI_API_KEY|sk-proj-|sk-[A-Za-z0-9_-]{20,}/);
});

test("payload do cliente usa campos em portugues e anonimizacao", () => {
  const fonte = readFileSync("src/ts/ai-assistant.ts", "utf8");
  assert.match(fonte, /alunoAnonimo/);
  assert.match(fonte, /perfilLeitor/);
  assert.match(fonte, /palavrasConhecidasCorretas/);
  assert.match(fonte, /palavrasDificeisCorretas/);
  assert.match(fonte, /palavrasTextoCorretas/);
  assert.match(fonte, /totalListas/);
  assert.match(fonte, /tempoTotalSegundos/);
  assert.match(fonte, /registrosAnonimizados/);
  assert.match(fonte, /historicoParaIA/);
});

test("historico da IA mostra vinculo pedagogico e permite abrir relatorio", () => {
  const html = readFileSync("analises.html", "utf8");
  const fonte = readFileSync("src/ts/ai-assistant.ts", "utf8");
  assert.match(html, /iaRelatorioSalvo/);
  assert.match(html, /Comparar sínteses salvas/);
  assert.match(html, /iaCompararBase/);
  assert.match(html, /iaCompararAtual/);
  assert.match(html, /iaDataAvaliacao/);
  assert.match(html, /saved-history-report/);
  assert.doesNotMatch(html, /Filtros ativos/);
  assert.doesNotMatch(html, /Dados usados pela IA/);
  assert.match(fonte, /professorNome/);
  assert.match(fonte, /alunoNome/);
  assert.match(fonte, /Aluno avaliado/);
  assert.match(fonte, /Selecione o nome do aluno/);
  assert.match(fonte, /Nome do aluno não registrado/);
  assert.match(fonte, /Análise individual -/);
  assert.doesNotMatch(fonte, /item\.alunoNome \|\| item\.alunoAnonimo/);
  assert.match(fonte, /Abrir relatório/);
  assert.match(fonte, /aria-label="Imprimir relatório"/);
  assert.match(fonte, />Imprimir</);
  assert.match(fonte, /Excluir relatório/);
  assert.match(fonte, /data-imprimir-relatorio-id/);
  assert.match(fonte, /imprimirRelatorioHistorico/);
  assert.match(fonte, /analisesPedagogicas"\)\.doc\(id\)\.delete\(\)/);
  assert.match(fonte, /Escola:/);
  assert.match(fonte, /Turma:/);
  assert.match(fonte, /compararSinteses/);
  assert.match(fonte, /Síntese anterior/);
  assert.match(fonte, /Síntese mais recente/);
  assert.match(fonte, /comparacoesPedagogicas/);
  assert.match(fonte, /salvarComparacaoSinteses/);
  assert.match(fonte, /resumoDesempenho:/);
  assert.match(fonte, /gerarAnalisePedagogicaLocal/);
  assert.match(fonte, /chaveDiaDocumento/);
  assert.match(fonte, /dataAvaliacao/);
  assert.match(fonte, /registrosMaisRecentesPorAluno/);
  assert.match(fonte, /registro\(s\) mais recente\(s\) dos alunos filtrados/);
  assert.match(fonte, /imprimirRelatorio/);
  assert.match(fonte, /window\.open/);
  assert.match(fonte, /sessionStorage\.setItem/);
  assert.match(fonte, /imprimir-relatorio\.html/);
  assert.match(fonte, /relatorio\.outerHTML/);
  assert.doesNotMatch(fonte, /alunoNome: item\.alunoNome/);
});

test("relatorio pedagogico possui estilos de impressao", () => {
  const css = readFileSync("assets/css/dashboard.css", "utf8");
  assert.match(css, /@media print/);
  assert.match(css, /print-report-target/);
  assert.match(css, /width:80% !important/);
  assert.match(css, /pedagogical-report/);
  assert.match(css, /@page/);
});

test("pagina dedicada de impressao carrega somente o relatorio salvo", () => {
  const html = readFileSync("imprimir-relatorio.html", "utf8");
  assert.match(html, /printReportRoot/);
  assert.match(html, /sessionStorage\.getItem/);
  assert.match(html, /window\.print/);
  assert.match(html, /window\.close/);
  assert.doesNotMatch(html, /firebase-app/);
});
