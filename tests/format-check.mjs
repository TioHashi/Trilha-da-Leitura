import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ignoredDirectories = new Set([".git", "node_modules", "functions/node_modules"]);
const checkedExtensions = new Set([".html", ".css", ".js", ".ts", ".json", ".md", ".example"]);

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
    if (checkedExtensions.has(extension)) files.push(fullPath);
  }
  return files;
}

const invalidFiles = [];
for (const filePath of listFiles(".")) {
  const text = readFileSync(filePath, "utf8");
  if (/[ \t]+$/m.test(text)) invalidFiles.push(filePath);
}

assert.deepEqual(invalidFiles, [], "Arquivos com espacos em branco no final");
