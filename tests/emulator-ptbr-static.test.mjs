import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("scripts em portugues cobrem o uso local dos emuladores", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

  assert.equal(packageJson.scripts["emuladores"], "npm run emulators");
  assert.equal(packageJson.scripts["test:rules"], "npm run testar:regras");
  assert.equal(packageJson.scripts["testar:regras"], "node scripts/testar-regras-firestore.mjs");
  assert.equal(packageJson.scripts["semear:emuladores"], "node scripts/semear-emuladores.mjs");
  assert.equal(packageJson.scripts["recalcular:perfis"], "node scripts/recalcular-perfis-emuladores.mjs");
  assert.match(packageJson.scripts["emulators"], /--import \.firebase\/emuladores/);
  assert.match(packageJson.scripts["emulators"], /--export-on-exit \.firebase\/emuladores/);
});

test("documentacao dos emuladores esta em portugues do Brasil", () => {
  const readme = readFileSync("README.md", "utf8");
  const guia = readFileSync("docs/firebase-emulator-suite.md", "utf8");

  assert.match(readme, /npm run emuladores/);
  assert.match(readme, /npm run testar:regras/);
  assert.match(readme, /emulador de autenticacao|emulador de autenticação/);
  assert.match(readme, /emulador do Firestore/);
  assert.match(readme, /emulador das Cloud Functions/);
  assert.match(guia, /Use apenas dados fict/);
  assert.match(guia, /sem tocar no Firebase de produ/);
  assert.match(guia, /npm run semear:emuladores/);
  assert.match(guia, /npm run recalcular:perfis/);
});

test("script de recalculo de perfis usa somente o Firestore Emulator", () => {
  const script = readFileSync("scripts/recalcular-perfis-emuladores.mjs", "utf8");

  assert.match(script, /FIRESTORE_EMULATOR_HOST/);
  assert.match(script, /Leitor Fluente/);
  assert.match(script, /palavrasTextoCorretas/);
  assert.match(script, /precisao > 90/);
  assert.doesNotMatch(script, /firebase deploy/);
});

test("script das regras usa mensagens em portugues e projeto local isolado", () => {
  const script = readFileSync("scripts/testar-regras-firestore.mjs", "utf8");

  assert.match(script, /Emulador do Firestore/);
  assert.match(script, /trilha-leitura-regras-test/);
  assert.match(script, /18085/);
  assert.doesNotMatch(script, /firebase deploy/);
});

test("script de semear emuladores recria logins, alunos e resultados ficticios", () => {
  const script = readFileSync("scripts/semear-emuladores.mjs", "utf8");

  assert.match(script, /professor1@trilhaleitura\.local/);
  assert.match(script, /admin@trilhaleitura\.local/);
  assert.match(script, /removerAliasesAntigosAuth/);
  assert.match(script, /db\.collection\("alunos"\)/);
  assert.match(script, /aluno-massa-ptbr-/);
  assert.match(script, /resultadosAlunos/);
  assert.match(script, /professoresPermitidos/);
  assert.doesNotMatch(script, /emailAlias/);
  assert.doesNotMatch(script, /uidAlias/);
  assert.match(script, /Senha de teste/);
  assert.doesNotMatch(script, /firebase deploy/);
});
