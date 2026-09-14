import { createRequire } from "node:module";

const requireFromFunctions = createRequire(`${process.cwd()}/functions/package.json`);
const admin = requireFromFunctions("firebase-admin");

const PROJETO_LOCAL = process.env.GCLOUD_PROJECT || "trilha-leitura";
const host = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085";

process.env.FIRESTORE_EMULATOR_HOST = host;

if (!admin.apps.length) admin.initializeApp({ projectId: PROJETO_LOCAL });

const db = admin.firestore();
const snapshot = await db.collection("resultadosAlunos").get();
const documentos = snapshot.docs.filter((doc) => doc.id.startsWith("massa-ptbr-"));
const alunosSnapshot = await db.collection("alunos").get();
const alunosFicticios = alunosSnapshot.docs.filter((doc) => doc.id.startsWith("aluno-massa-ptbr-"));
const perfis = {
  "Pré-leitor": 0,
  "Leitor Iniciante": 0,
  "Leitor Fluente": 0
};
const turmas = new Map();
let vinculados = 0;

for (const doc of documentos) {
  const dados = doc.data();
  const perfil = String(dados.perfil || "");
  const chave = `${dados.escola}|||${dados.turma}`;
  if (!turmas.has(chave)) {
    turmas.set(chave, {
      total: 0,
      "Pré-leitor": 0,
      "Leitor Iniciante": 0,
      "Leitor Fluente": 0
    });
  }

  const linha = turmas.get(chave);
  linha.total++;
  if (
    dados.escola &&
    dados.serie &&
    dados.turma &&
    dados.professorUid &&
    dados.professorEmail &&
    Array.isArray(dados.professoresPermitidos) &&
    dados.professoresPermitidos.length
  ) {
    vinculados++;
  }

  if (perfil.includes("Fluente")) {
    perfis["Leitor Fluente"]++;
    linha["Leitor Fluente"]++;
  } else if (perfil.includes("Iniciante")) {
    perfis["Leitor Iniciante"]++;
    linha["Leitor Iniciante"]++;
  } else {
    perfis["Pré-leitor"]++;
    linha["Pré-leitor"]++;
  }
}

const turmasValidas = [...turmas.values()].every((linha) =>
  linha.total === 20 &&
  linha["Pré-leitor"] >= 1 &&
  linha["Leitor Iniciante"] >= 1 &&
  linha["Leitor Fluente"] >= 1
);

console.log(`Projeto: ${PROJETO_LOCAL}`);
console.log(`Firestore Emulator: ${host}`);
console.log(`Resultados ficticios: ${documentos.length}`);
console.log(`Alunos ficticios cadastrados: ${alunosFicticios.length}`);
console.log(`Pré-leitor: ${perfis["Pré-leitor"]}`);
console.log(`Leitor Iniciante: ${perfis["Leitor Iniciante"]}`);
console.log(`Leitor Fluente: ${perfis["Leitor Fluente"]}`);
console.log(`Turmas encontradas: ${turmas.size}`);
console.log(`Registros vinculados a escola, serie, turma e professor: ${vinculados}`);
console.log(`Turmas com 20 alunos e perfis variados: ${turmasValidas ? "sim" : "nao"}`);

if (
  documentos.length !== 360 ||
  alunosFicticios.length !== 360 ||
  turmas.size !== 18 ||
  vinculados !== documentos.length ||
  !turmasValidas
) {
  process.exit(1);
}
