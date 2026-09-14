import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateAutomaticPrecision,
  classifyReadingProfile,
  validateManualPrecision
} from "../src/ts/reading-rules.ts";

test("classifica 0 conhecidas e 0 dificeis como Pre-leitor Nivel 1 no modo automatico", () => {
  const result = classifyReadingProfile(0, 0, 0, 0);
  assert.equal(result.perfil, "Pre-leitor - Nivel 1");
});

test("classifica 10 conhecidas e 5 dificeis como Pre-leitor Nivel 4 no modo automatico", () => {
  const result = classifyReadingProfile(10, 5, 20, 100);
  assert.equal(result.perfil, "Pre-leitor - Nivel 4");
});

test("classifica 11 conhecidas e 6 dificeis como Leitor Iniciante", () => {
  const result = classifyReadingProfile(11, 6, 40, 50);
  assert.equal(result.perfil, "Leitor Iniciante");
});

test("texto 65 com precisao 91 nao e Leitor Fluente", () => {
  const result = classifyReadingProfile(60, 5, 65, 91);
  assert.notEqual(result.perfil, "Leitor Fluente");
});

test("texto 66 com precisao 90 nao e Leitor Fluente", () => {
  const result = classifyReadingProfile(60, 6, 66, 90);
  assert.equal(result.perfil, "Leitor Iniciante");
});

test("texto 66 com precisao 91 e Leitor Fluente", () => {
  const result = classifyReadingProfile(60, 6, 66, 91);
  assert.equal(result.perfil, "Leitor Fluente");
});

test("soma de conhecidas e dificeis nao define Leitor Fluente sem texto suficiente", () => {
  const result = classifyReadingProfile(60, 40, 20, 100);
  assert.equal(result.perfil, "Leitor Iniciante");
});

test("preserva observacao manual de Pre-leitor quando criterios superiores nao se aplicam", () => {
  const result = classifyReadingProfile(3, 1, 8, 20, "nivel3");
  assert.equal(result.perfil, "Pre-leitor - Nivel 3");
});

test("calcula precisao automatica pela formula corretas / tentadas x 100", () => {
  assert.equal(calculateAutomaticPrecision(45, 50), 90);
});

test("impede divisao por zero na precisao automatica", () => {
  assert.equal(calculateAutomaticPrecision(10, 0), 0);
});

test("limita precisao automatica entre 0 e 100", () => {
  assert.equal(calculateAutomaticPrecision(120, 60), 100);
  assert.equal(calculateAutomaticPrecision(-10, 60), 0);
});

test("valida precisao manual entre 0 e 100", () => {
  assert.equal(validateManualPrecision(101), 100);
  assert.equal(validateManualPrecision(-1), 0);
  assert.equal(validateManualPrecision("89.4"), 89);
});
