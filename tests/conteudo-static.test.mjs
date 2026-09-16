import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

function carregarConteudo() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync("assets/js/conteudo.js", "utf8"), sandbox);
  return sandbox.window.TrilhaConteudo;
}

function totalPalavras(texto) {
  return String(texto || "").trim().split(/\s+/).filter(Boolean).length;
}

test("conteudo pedagogico possui banco ampliado sem duplicidades", () => {
  const conteudo = carregarConteudo();
  assert.equal(conteudo.palavrasConhecidas.length, 500);
  assert.equal(new Set(conteudo.palavrasConhecidas).size, 500);
  assert.equal(conteudo.palavrasDificeis.length, 500);
  assert.equal(new Set(conteudo.palavrasDificeis).size, 500);
});

test("listas de palavras usam vocabulario real em portugues do Brasil", () => {
  const conteudo = carregarConteudo();
  const todas = [...conteudo.palavrasConhecidas, ...conteudo.palavrasDificeis];
  const texto = todas.join(" ");

  assert.match(texto, /família/);
  assert.match(texto, /calçada/);
  assert.match(texto, /abóbora/);
  assert.match(texto, /açúcar/);
  assert.match(texto, /bússola/);
  assert.match(texto, /xícara/);
  assert.doesNotMatch(texto, /babr|brale|brami|babru/i);
  assert.doesNotMatch(texto, /feijao|macarrao|mamao|\\bpao\\b|leao|algodao|cordao|fogao|hortela|\\bima\\b|trovao/i);
});

test("conteudo possui 200 narrativas simples com personagem animal", () => {
  const conteudo = carregarConteudo();
  assert.equal(conteudo.textos.length, 200);
  assert.equal(new Set(conteudo.textos.map((item) => item.texto)).size, 200);
  for (const item of conteudo.textos) {
    const total = totalPalavras(item.texto);
    assert.equal(item.tipo, "narrativo");
    assert.ok(total >= 150 && total <= 180, `texto com ${total} palavras`);
    assert.match(item.texto, /coelho|tatu|macaco|pato|gato|cachorro|coruja|raposa|tartaruga|sapo|capivara|beija-flor|cavalo|ovelha|pinguim|lontra|tamandua|esquilo|jacare|golfinho/i);
    assert.equal(item.perguntas.length, 2);
  }
});
