import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const HOST = "127.0.0.1";
const PORTA_FIRESTORE_TESTE = 18085;
const PROJETO_LOCAL = "trilha-leitura-regras-test";
const CONFIG_TESTE = join("firebase.regras-test.local.json");

function executar(comando, argumentos, env = {}) {
  return new Promise((resolve) => {
    const processo = spawn(comando, argumentos, {
      env: { ...process.env, ...env },
      stdio: "inherit"
    });

    processo.on("close", (codigo) => resolve(codigo ?? 1));
  });
}

writeFileSync(CONFIG_TESTE, JSON.stringify({
  firestore: {
    rules: "firestore.rules"
  },
  emulators: {
    firestore: {
      host: HOST,
      port: PORTA_FIRESTORE_TESTE
    },
    ui: {
      enabled: false
    },
    singleProjectMode: true
  }
}, null, 2));

console.log(`Iniciando Emulador do Firestore temporario para testes em ${HOST}:${PORTA_FIRESTORE_TESTE}.`);
const firebaseCli = join("node_modules", "firebase-tools", "lib", "bin", "firebase.js");
const codigo = await executar(process.execPath, [
  firebaseCli,
  "emulators:exec",
  "--config",
  CONFIG_TESTE,
  "--project",
  PROJETO_LOCAL,
  "--only",
  "firestore",
  "node --test tests/firestore-rules.test.mjs"
]);

process.exit(codigo);
