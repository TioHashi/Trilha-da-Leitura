import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ignoredDirectories = new Set([".git", "node_modules", "functions/node_modules"]);
const searchableExtensions = new Set([".html", ".css", ".js", ".ts"]);

function listFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...listFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    const dotIndex = entry.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? entry.name.slice(dotIndex) : "";
    if (searchableExtensions.has(extension)) files.push(fullPath);
  }

  return files;
}

test("Bootstrap nao esta instalado nem referenciado nos arquivos executaveis do projeto", () => {
  const matches = [];

  for (const filePath of listFiles(".")) {
    if (!statSync(filePath).isFile()) continue;
    const text = readFileSync(filePath, "utf8");
    if (/bootstrap/i.test(text)) {
      matches.push(filePath);
    }
  }
  const allowedMentions = new Set(["tests/no-bootstrap.test.mjs"]);
  const unexpected = matches.filter((filePath) => {
    const normalized = filePath.replace(/^\.\\?/, "").replaceAll("\\", "/");
    return !allowedMentions.has(normalized);
  });
  assert.deepEqual(unexpected, []);
});

test("Bootstrap nao esta nas dependencias do package.json", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const installed = Object.keys(dependencies).filter((name) => /bootstrap/i.test(name));
  assert.deepEqual(installed, []);
});
