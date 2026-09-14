import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ignoredDirectories = new Set([".git", "node_modules", "functions/node_modules"]);
const searchableExtensions = new Set([".html", ".css", ".js", ".ts", ".json", ".md", ".example"]);

function listFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...listFiles(fullPath));
      continue;
    }

    const dotIndex = entry.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? entry.name.slice(dotIndex) : "";
    if (searchableExtensions.has(extension)) files.push(fullPath);
  }
  return files;
}

test("nenhuma chave da OpenAI esta versionada nos arquivos de texto do projeto", () => {
  const forbiddenPatterns = [
    /OPENAI_API_KEY\s*=\s*sk-/i,
    /sk-proj-[A-Za-z0-9_-]{20,}/,
    /sk-[A-Za-z0-9_-]{20,}/
  ];

  const matches = [];
  for (const filePath of listFiles(".")) {
    const text = readFileSync(filePath, "utf8");
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) matches.push(filePath);
    }
  }

  assert.deepEqual(matches, []);
});
