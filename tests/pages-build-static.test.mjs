import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Firebase Hosting esta configurado para publicar somente dist", () => {
  const firebaseJson = JSON.parse(readFileSync("firebase.json", "utf8"));
  assert.equal(firebaseJson.hosting.public, "dist");
});

test("workflow do GitHub Pages publica somente o artefato dist", () => {
  const workflow = readFileSync(".github/workflows/pages.yml", "utf8");
  assert.match(workflow, /npm run build:pages/);
  assert.match(workflow, /npm run verify:pages/);
  assert.match(workflow, /path: dist/);
  assert.doesNotMatch(workflow, /firebase deploy/);
});

test("scripts de Pages impedem publicacao de codigo interno e secrets", () => {
  const verificador = readFileSync("scripts/verify-pages-build.mjs", "utf8");
  assert.match(verificador, /trilha-turma\.html/);
  assert.match(verificador, /imprimir-relatorio\.html/);
  assert.match(verificador, /firebase-config\.js/);
  assert.match(verificador, /auth\.js/);
  assert.match(verificador, /ai-assistant\.js/);
  assert.match(verificador, /functions\//);
  assert.match(verificador, /tests\//);
  assert.match(verificador, /src\//);
  assert.match(verificador, /OPENAI_API_KEY/);
  assert.match(verificador, /bootstrap/i);
});

test("pagina de analises usa versao atual do assistente pedagogico", () => {
  const html = readFileSync("analises.html", "utf8");
  assert.match(html, /assets\/css\/dashboard\.css\?v=2026\/09-05/);
  assert.match(html, /public\/assets\/js\/ai-assistant\.js\?v=2026\/09-05/);
});
