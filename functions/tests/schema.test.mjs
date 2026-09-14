import assert from "node:assert/strict";
import test from "node:test";

import {
  LIMITE_REGISTROS_ANALISE,
  validarEAnonimizarPayload,
  validarRespostaIA
} from "../lib/ai/schema.js";
import { montarEntradaUsuario } from "../lib/ai/prompt.js";

function registroFicticio(indice = 1) {
  return {
    alunoAnonimo: `Aluno ${indice}`,
    dataAvaliacao: "01/09/2026",
    perfilLeitor: "Leitor Iniciante",
    palavrasConhecidasCorretas: 20,
    palavrasDificeisCorretas: 8,
    palavrasTextoCorretas: 42,
    totalListas: 28,
    precisao: 88,
    compreensao: 2,
    tempoTotalSegundos: 100
  };
}

test("valida e preserva somente identificadores anonimos", () => {
  const payload = validarEAnonimizarPayload({
    escopo: "turma",
    registros: [registroFicticio(1), registroFicticio(2)]
  });

  assert.equal(payload.registros[0].alunoAnonimo, "Aluno 1");
  assert.equal(payload.registros[1].alunoAnonimo, "Aluno 2");
  assert.deepEqual(payload.historicoAnalises, []);
});

test("rejeita campos inesperados para evitar dados pessoais", () => {
  assert.throws(() => validarEAnonimizarPayload({
    escopo: "turma",
    registros: [{ ...registroFicticio(1), nome: "Maria" }]
  }), /campos inesperados/);
});

test("rejeita payload sem registros suficientes", () => {
  assert.throws(() => validarEAnonimizarPayload({
    escopo: "turma",
    registros: []
  }), /Nao ha dados suficientes/);
});

test("rejeita quantidade de registros acima do limite", () => {
  const registros = Array.from({ length: LIMITE_REGISTROS_ANALISE + 1 }, (_, indice) => registroFicticio(indice + 1));
  assert.throws(() => validarEAnonimizarPayload({
    escopo: "turma",
    registros
  }), /acima do limite/);
});

test("rejeita analise individual sem aluno anonimo selecionado", () => {
  assert.throws(() => validarEAnonimizarPayload({
    escopo: "aluno",
    registros: [registroFicticio(1)]
  }), /Selecione um aluno/);
});

test("entrada enviada ao modelo nao contem nome real, escola ou turma", () => {
  const payload = validarEAnonimizarPayload({
    escopo: "aluno",
    alunoSelecionado: "Aluno 1",
    registros: [registroFicticio(1)]
  });
  const entrada = montarEntradaUsuario(payload);
  const objeto = JSON.parse(entrada);

  assert.equal(objeto.registros[0].alunoAnonimo, "Aluno 1");
  assert.equal(objeto.registros[0].escola, undefined);
  assert.equal(objeto.registros[0].turma, undefined);
  assert.doesNotMatch(JSON.stringify(objeto.registros), /Maria|ESCOLA|2 ANO/i);
});

test("aceita historico anonimizado para comparacao pedagogica", () => {
  const payload = validarEAnonimizarPayload({
    escopo: "turma",
    registros: [registroFicticio(1), registroFicticio(2)],
    historicoAnalises: [{
      geradoEm: "2026-08-01T12:00:00.000Z",
      escopo: "turma",
      totalRegistrosAnalisados: 10,
      resumoDesempenho: "Historico ficticio sem nomes reais.",
      mediaPrecisao: 82,
      mediaTotalPalavras: 35,
      mediaCompreensao: 1,
      preLeitores: 3,
      leitoresIniciantes: 3,
      leitoresFluentes: 4
    }]
  });
  const entrada = JSON.parse(montarEntradaUsuario(payload));

  assert.equal(entrada.historicoAnalises.length, 1);
  assert.match(entrada.orientacaoComparativa, /Compare/);
  assert.doesNotMatch(JSON.stringify(entrada.historicoAnalises), /Maria|ESCOLA|2 ANO/i);
});

test("valida resposta estruturada da IA", () => {
  const resposta = validarRespostaIA({
    resumoDesempenho: "Resumo ficticio.",
    evidenciasObservadas: ["Evidencia ficticia."],
    pontosAtencao: ["Ponto de atencao ficticio."],
    recomendacoesPedagogicas: ["Recomendacao ficticia."],
    planoIntervencaoSugerido: ["Plano ficticio."],
    sugestaoAcompanhamento: "Reavaliar em quatro semanas.",
    limitacoesAnalise: ["Dados ficticios."],
    avisoResponsabilidade: "A analise deve ser revisada pelo professor."
  });

  assert.equal(resposta.recomendacoesPedagogicas.length, 1);
});
