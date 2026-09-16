import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("todas as paginas principais usam o favicon do projeto", () => {
  assert.equal(existsSync("assets/favicon.png"), true);

  for (const pagina of ["index.html", "dashboard.html", "analises.html", "login.html", "trilha-turma.html", "imprimir-relatorio.html"]) {
    const html = readFileSync(pagina, "utf8");
    assert.match(html, /<link rel="icon" type="image\/png" href="assets\/favicon\.png">/);
    if (pagina !== "imprimir-relatorio.html") {
      assert.match(html, /Trilha da Leitura 2026\/09-12/);
    }
  }
});
