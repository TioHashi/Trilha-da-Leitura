import { copyFileSync, cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const dist = join(raiz, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const paginas = [
  "index.html",
  "dashboard.html",
  "analises.html",
  "imprimir-relatorio.html",
  "trilha-turma.html",
  "login.html"
];

const arquivosRaiz = [
  "LICENSE.md",
  "NOTICE.md"
];

for (const pagina of paginas) {
  cpSync(join(raiz, "src", "pages", pagina), join(dist, pagina));
}

for (const arquivo of arquivosRaiz) {
  cpSync(join(raiz, arquivo), join(dist, arquivo));
}

cpSync(join(raiz, "assets"), join(dist, "assets"), { recursive: true });

const cssPublico = join(dist, "public", "assets", "css");
const jsPublico = join(dist, "public", "assets", "js");
mkdirSync(cssPublico, { recursive: true });
mkdirSync(jsPublico, { recursive: true });

copyFileSync(
  join(raiz, "public", "assets", "css", "tailwind.css"),
  join(cssPublico, "tailwind.css")
);

for (const arquivo of readdirSync(join(raiz, "public", "assets", "js"))) {
  if (arquivo.endsWith(".js")) {
    copyFileSync(join(raiz, "public", "assets", "js", arquivo), join(jsPublico, arquivo));
  }
}

writeFileSync(join(dist, ".nojekyll"), "");

console.log("Build do GitHub Pages preparado em dist/.");
