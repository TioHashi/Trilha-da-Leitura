import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const dist = join(process.cwd(), "dist");

function listarArquivos(diretorio) {
  const arquivos = [];
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      arquivos.push(...listarArquivos(caminho));
    } else if (entrada.isFile()) {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

assert.ok(existsSync(dist), "dist/ nao foi gerado.");
assert.ok(existsSync(join(dist, "index.html")), "index.html ausente do build.");
assert.ok(existsSync(join(dist, "dashboard.html")), "dashboard.html ausente do build.");
assert.ok(existsSync(join(dist, "analises.html")), "analises.html ausente do build.");
assert.ok(existsSync(join(dist, "imprimir-relatorio.html")), "imprimir-relatorio.html ausente do build.");
assert.ok(existsSync(join(dist, "trilha-turma.html")), "trilha-turma.html ausente do build.");
assert.ok(existsSync(join(dist, "login.html")), "login.html ausente do build.");
assert.ok(existsSync(join(dist, "assets", "js", "firebase-config.js")), "Configuracao publica do Firebase ausente do build.");
assert.ok(existsSync(join(dist, "public", "assets", "js", "auth.js")), "Auth do frontend ausente do build.");
assert.ok(existsSync(join(dist, "public", "assets", "js", "ai-assistant.js")), "Interface da IA ausente do build.");
assert.ok(existsSync(join(dist, "public", "assets", "css", "tailwind.css")), "Tailwind compilado ausente.");
assert.ok(existsSync(join(dist, ".nojekyll")), ".nojekyll ausente.");

const caminhosRelativos = listarArquivos(dist).map((arquivo) => relative(dist, arquivo).replaceAll("\\", "/"));

for (const proibido of ["functions/", "tests/", "src/", "node_modules/", ".env", ".secret.local"]) {
  assert.equal(
    caminhosRelativos.some((arquivo) => arquivo === proibido || arquivo.startsWith(proibido)),
    false,
    `${proibido} nao deve ser publicado no frontend.`
  );
}

assert.equal(
  caminhosRelativos.some((arquivo) => arquivo.endsWith(".map") || arquivo.endsWith(".d.ts") || arquivo.endsWith(".ts")),
  false,
  "Arquivos .map e .d.ts nao devem ser publicados no frontend."
);

const extensoesTexto = new Set([".html", ".css", ".js", ".json", ".md", ".map"]);
const padroesSecret = [
  /OPENAI_API_KEY\s*=\s*sk-/i,
  /sk-proj-[A-Za-z0-9_-]{20,}/,
  /sk-[A-Za-z0-9_-]{20,}/
];

for (const arquivo of listarArquivos(dist)) {
  if (!statSync(arquivo).isFile()) continue;
  const nome = arquivo.slice(arquivo.lastIndexOf("."));
  if (!extensoesTexto.has(nome)) continue;
  const texto = readFileSync(arquivo, "utf8");
  assert.doesNotMatch(texto, /bootstrap/i, `${relative(dist, arquivo)} contem Bootstrap.`);
  for (const padrao of padroesSecret) {
    assert.doesNotMatch(texto, padrao, `${relative(dist, arquivo)} contem possivel secret.`);
  }
}

for (const html of ["index.html", "dashboard.html", "analises.html", "imprimir-relatorio.html", "trilha-turma.html", "login.html"]) {
  const texto = readFileSync(join(dist, html), "utf8");
  assert.doesNotMatch(texto, /(?:src|href)="\//, `${html} contem caminho absoluto iniciado por /.`);
}

console.log("Build do GitHub Pages validado.");
