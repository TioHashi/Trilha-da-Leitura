import { createRequire } from "node:module";

const requireFromFunctions = createRequire(`${process.cwd()}/functions/package.json`);
const admin = requireFromFunctions("firebase-admin");

const PROJETO_LOCAL = process.env.GCLOUD_PROJECT || "trilha-leitura";
const HOST_EMULADOR = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085";

if (!/^((127\.0\.0\.1|localhost):\d+)$/.test(HOST_EMULADOR)) {
  throw new Error("Este script so pode ser executado contra o Firestore Emulator local.");
}

process.env.FIRESTORE_EMULATOR_HOST = HOST_EMULADOR;

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJETO_LOCAL });
}

const db = admin.firestore();

function numero(valor, minimo, maximo) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return minimo;
  return Math.min(maximo, Math.max(minimo, Math.round(n)));
}

function textoCorretasDoRegistro(dados) {
  if (Number.isFinite(Number(dados.palavrasTextoCorretas))) {
    return numero(dados.palavrasTextoCorretas, 0, 100);
  }
  if (Number.isFinite(Number(dados.palavrasTexto))) {
    return numero(dados.palavrasTexto, 0, 100);
  }
  return numero(dados.total, 0, 100);
}

function classificarPerfil(dados) {
  const conhecidas = numero(dados.palavrasCorretas, 0, 60);
  const dificeis = numero(dados.dificeisCorretas, 0, 40);
  const textoCorretas = textoCorretasDoRegistro(dados);
  const precisao = numero(dados.precisao, 0, 100);

  if (textoCorretas > 65 && precisao > 90) {
    return {
      palavrasTextoCorretas: textoCorretas,
      perfil: "Leitor Fluente",
      criterio: "Leu mais de 65 palavras corretas no texto narrativo, com precisão superior a 90%."
    };
  }

  if (conhecidas >= 11 && dificeis >= 6) {
    return {
      palavrasTextoCorretas: textoCorretas,
      perfil: "Leitor Iniciante",
      criterio: "Leu 11 ou mais palavras conhecidas e 6 ou mais palavras possivelmente desconhecidas."
    };
  }

  if (conhecidas === 0 && dificeis === 0) {
    return {
      palavrasTextoCorretas: textoCorretas,
      perfil: "Pré-leitor - Nível 1",
      criterio: "Não realizou a leitura de palavras ou leu letras, sílabas ou palavras fora do item."
    };
  }

  return {
    palavrasTextoCorretas: textoCorretas,
    perfil: "Pré-leitor - Nível 4",
    criterio: "Leu corretamente até 10 palavras conhecidas e até 5 palavras possivelmente desconhecidas."
  };
}

const snapshot = await db.collection("resultadosAlunos").get();
let batch = db.batch();
let operacoes = 0;
let atualizados = 0;
const contagem = {
  "Pré-leitor": 0,
  "Leitor Iniciante": 0,
  "Leitor Fluente": 0
};

for (const doc of snapshot.docs) {
  const dados = doc.data();
  const classificacao = classificarPerfil(dados);
  const totalListas = numero(dados.palavrasCorretas, 0, 60) + numero(dados.dificeisCorretas, 0, 40);

  if (classificacao.perfil.includes("Fluente")) contagem["Leitor Fluente"]++;
  else if (classificacao.perfil.includes("Iniciante")) contagem["Leitor Iniciante"]++;
  else contagem["Pré-leitor"]++;

  batch.set(doc.ref, {
    palavrasTextoCorretas: classificacao.palavrasTextoCorretas,
    total: totalListas,
    perfil: classificacao.perfil,
    criterio: classificacao.criterio,
    atualizadoEmFirebase: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  atualizados++;
  operacoes++;
  if (operacoes >= 450) {
    await batch.commit();
    batch = db.batch();
    operacoes = 0;
  }
}

if (operacoes) await batch.commit();

console.log(`Projeto local: ${PROJETO_LOCAL}`);
console.log(`Firestore Emulator: ${HOST_EMULADOR}`);
console.log(`Resultados recalculados: ${atualizados}`);
console.log(`Pré-leitor: ${contagem["Pré-leitor"]}`);
console.log(`Leitor Iniciante: ${contagem["Leitor Iniciante"]}`);
console.log(`Leitor Fluente: ${contagem["Leitor Fluente"]}`);
