import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where
} from "firebase/firestore";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "trilha-leitura-regras-test";

function validResult(overrides = {}) {
  return {
    id: "avaliacao-teste",
    salvoEm: "2026-09-01T12:00:00.000Z",
    data: "01/09/2026, 12:00:00",
    nome: "Aluno Teste",
    escola: "ESCOLA TESTE",
    serie: "2º Ano",
    turma: "2 ANO A",
    palavrasCorretas: 11,
    dificeisCorretas: 6,
    palavrasTextoCorretas: 40,
    total: 17,
    precisao: 90,
    compreensao: 2,
    tempoConhecidasSegundos: 60,
    tempoDificeisSegundos: 60,
    tempoTotalSegundos: 120,
    tempoConhecidas: "1min 00s",
    tempoDificeis: "1min 00s",
    tempoTotal: "2min 00s",
    perfil: "Leitor Iniciante",
    criterio: "Teste",
    textoLido: "Texto preservado no formato atual.",
    professorUid: "professor-1",
    professorEmail: "professor1@trilhaleitura.local",
    professoresPermitidos: ["professor-1"],
    ...overrides
  };
}

function validAnalysis(overrides = {}) {
  return {
    id: "analise-teste",
    geradoEm: "2026-09-01T12:05:00.000Z",
    salvoEm: "2026-09-01T12:05:10.000Z",
    dataAvaliacao: "2026-09-01T09:00:00.000Z",
    dataReferencia: "01/09/2026",
    origem: "local",
    escopo: "turma",
    alunoAnonimo: "",
    professorUid: "professor-1",
    professorEmail: "professor1@trilhaleitura.local",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A",
    totalRegistrosAnalisados: 10,
    indicadores: {
      mediaPrecisao: 85,
      mediaTotalPalavras: 48,
      mediaCompreensao: 1,
      preLeitores: 3,
      leitoresIniciantes: 3,
      leitoresFluentes: 4
    },
    analise: {
      resumoDesempenho: "Resumo ficticio.",
      evidenciasObservadas: ["Evidencia ficticia."],
      pontosAtencao: ["Ponto ficticio."],
      recomendacoesPedagogicas: ["Recomendacao ficticia."],
      planoIntervencaoSugerido: ["Plano ficticio."],
      sugestaoAcompanhamento: "Reavaliar em quatro semanas.",
      limitacoesAnalise: ["Dados ficticios."],
      avisoResponsabilidade: "A analise deve ser revisada pelo professor."
    },
    ...overrides
  };
}

function validComparison(overrides = {}) {
  return {
    id: "comparacao-teste",
    tipo: "comparacao-sinteses",
    geradoEm: "2026-09-01T12:15:00.000Z",
    salvoEm: "2026-09-01T12:15:00.000Z",
    professorUid: "professor-1",
    professorEmail: "professor1@trilhaleitura.local",
    professorNome: "Professor 1",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A",
    analiseAnteriorId: "analise-a",
    analiseMaisRecenteId: "analise-b",
    dataAnaliseAnterior: "2026-08-01T12:00:00.000Z",
    dataAnaliseMaisRecente: "2026-09-01T12:00:00.000Z",
    escopoAnterior: "turma",
    escopoMaisRecente: "turma",
    indicadoresAnteriores: {
      mediaPrecisao: 80,
      mediaTotalPalavras: 42,
      mediaCompreensao: 1,
      preLeitores: 4,
      leitoresIniciantes: 4,
      leitoresFluentes: 2
    },
    indicadoresMaisRecentes: {
      mediaPrecisao: 86,
      mediaTotalPalavras: 50,
      mediaCompreensao: 2,
      preLeitores: 2,
      leitoresIniciantes: 5,
      leitoresFluentes: 3
    },
    diferencas: {
      precisaoMedia: 6,
      palavrasTextoMedia: 8,
      compreensaoMedia: 1
    },
    sinteseAnterior: "Sintese anterior ficticia.",
    sinteseMaisRecente: "Sintese mais recente ficticia.",
    interpretacaoComparacao: "Houve avancos nos principais indicadores.",
    avisoResponsabilidade: "A comparacao deve ser revisada pelo professor.",
    ...overrides
  };
}

function validStudent(overrides = {}) {
  return {
    id: "aluno-teste",
    nome: "Aluno Cadastrado",
    escola: "ESCOLA TESTE",
    serie: "2º Ano",
    turma: "2 ANO A",
    professorUid: "professor-1",
    professorEmail: "professor1@trilhaleitura.local",
    professoresPermitidos: ["professor-1"],
    ativo: true,
    ...overrides
  };
}

function validUserProfile(overrides = {}) {
  return {
    uid: "professor-novo",
    nome: "Professor Novo",
    email: "professornovo@trilhaleitura.local",
    papel: "professor",
    escola: "ESCOLA TESTE",
    serie: "2º Ano",
    turma: "2 ANO A",
    ativo: true,
    ambiente: "emulador",
    observacao: "Usuario ficticio para teste local.",
    ...overrides
  };
}

let testEnv;

test.before(async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Execute com npm run testar:regras para usar o emulador do Firestore."
  );

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firebase/firestore.rules", "utf8")
    }
  });
});

test.after(async () => {
  await testEnv?.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

test("usuario nao autenticado nao le resultados", async () => {
  const adminDb = testEnv.unauthenticatedContext().firestore();
  const ref = doc(adminDb, "resultadosAlunos/avaliacao-teste");
  await assertFails(getDoc(ref));
});

test("usuario autenticado le e cria resultado valido", async () => {
  const db = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();
  const ref = doc(db, "resultadosAlunos/avaliacao-teste");
  await assertSucceeds(setDoc(ref, validResult()));
  await assertSucceeds(getDoc(ref));
});

test("professor nao le resultado de outra escola ou turma", async () => {
  const adminDb = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const professorDb = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();

  await assertSucceeds(setDoc(doc(adminDb, "resultadosAlunos/outra-turma"), validResult({
    id: "outra-turma",
    turma: "2 ANO B"
  })));
  await assertFails(getDoc(doc(professorDb, "resultadosAlunos/outra-turma")));
});

test("professor nao cria resultado fora do proprio vinculo", async () => {
  const db = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();
  const ref = doc(db, "resultadosAlunos/avaliacao-fora-do-vinculo");
  await assertFails(setDoc(ref, validResult({
    id: "avaliacao-fora-do-vinculo",
    escola: "OUTRA ESCOLA"
  })));
});

test("professor consulta somente resultados da propria escola e turma", async () => {
  const adminDb = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const professorDb = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();

  await assertSucceeds(setDoc(doc(adminDb, "resultadosAlunos/proprio-vinculo"), validResult({
    id: "proprio-vinculo"
  })));
  await assertSucceeds(setDoc(doc(adminDb, "resultadosAlunos/outro-vinculo"), validResult({
    id: "outro-vinculo",
    turma: "2 ANO B"
  })));

  const consultaVinculada = query(
    collection(professorDb, "resultadosAlunos"),
    where("professoresPermitidos", "array-contains", "professor-1"),
    where("escola", "==", "ESCOLA TESTE"),
    where("turma", "==", "2 ANO A")
  );
  const snapshot = await assertSucceeds(getDocs(consultaVinculada));
  assert.equal(snapshot.size, 1);

  await assertFails(getDocs(collection(professorDb, "resultadosAlunos")));
});

test("payload invalido e rejeitado", async () => {
  const db = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();
  const ref = doc(db, "resultadosAlunos/avaliacao-invalida");
  await assertFails(setDoc(ref, validResult({ precisao: 120 })));
});

test("professor nao exclui resultado definitivamente", async () => {
  const adminDb = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const professorDb = testEnv.authenticatedContext("professor-1", { role: "professor" }).firestore();

  await assertSucceeds(setDoc(doc(adminDb, "resultadosAlunos/avaliacao-teste"), validResult()));
  await assertFails(deleteDoc(doc(professorDb, "resultadosAlunos/avaliacao-teste")));
});

test("administrador exclui resultado definitivamente", async () => {
  const db = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const ref = doc(db, "resultadosAlunos/avaliacao-teste");
  await assertSucceeds(setDoc(ref, validResult()));
  await assertSucceeds(deleteDoc(ref));
});

test("administrador consulta todos os resultados", async () => {
  const db = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  await assertSucceeds(setDoc(doc(db, "resultadosAlunos/resultado-a"), validResult({
    id: "resultado-a",
    professorUid: "professor-1",
    professoresPermitidos: ["professor-1"],
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  })));
  await assertSucceeds(setDoc(doc(db, "resultadosAlunos/resultado-b"), validResult({
    id: "resultado-b",
    professorUid: "professor-2",
    professoresPermitidos: ["professor-2"],
    escola: "OUTRA ESCOLA",
    turma: "2 ANO B"
  })));

  const snapshot = await assertSucceeds(getDocs(collection(db, "resultadosAlunos")));
  assert.equal(snapshot.size, 2);
});

test("professor cria e le analise pedagogica da propria turma", async () => {
  const db = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();
  const ref = doc(db, "analisesPedagogicas/analise-teste");

  await assertSucceeds(setDoc(ref, validAnalysis()));
  await assertSucceeds(getDoc(ref));
});

test("professor nao cria analise pedagogica fora do proprio vinculo", async () => {
  const db = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();
  const ref = doc(db, "analisesPedagogicas/analise-fora-do-vinculo");

  await assertFails(setDoc(ref, validAnalysis({
    id: "analise-fora-do-vinculo",
    turma: "2 ANO B"
  })));
});

test("professor consulta somente analises pedagogicas da propria escola e turma", async () => {
  const adminDb = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const professorDb = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();

  await assertSucceeds(setDoc(doc(adminDb, "analisesPedagogicas/analise-propria"), validAnalysis({
    id: "analise-propria"
  })));
  await assertSucceeds(setDoc(doc(adminDb, "analisesPedagogicas/analise-outra"), validAnalysis({
    id: "analise-outra",
    professorUid: "professor-2",
    professorEmail: "professor2@trilhaleitura.local",
    turma: "2 ANO B"
  })));

  const consultaVinculada = query(
    collection(professorDb, "analisesPedagogicas"),
    where("professorUid", "==", "professor-1"),
    where("escola", "==", "ESCOLA TESTE"),
    where("turma", "==", "2 ANO A")
  );
  const snapshot = await assertSucceeds(getDocs(consultaVinculada));
  assert.equal(snapshot.size, 1);

  await assertFails(getDocs(collection(professorDb, "analisesPedagogicas")));
});

test("administrador consulta todas as analises pedagogicas", async () => {
  const db = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  await assertSucceeds(setDoc(doc(db, "analisesPedagogicas/analise-a"), validAnalysis({
    id: "analise-a",
    professorUid: "professor-1",
    professorEmail: "professor1@trilhaleitura.local",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  })));
  await assertSucceeds(setDoc(doc(db, "analisesPedagogicas/analise-b"), validAnalysis({
    id: "analise-b",
    professorUid: "professor-2",
    professorEmail: "professor2@trilhaleitura.local",
    escola: "OUTRA ESCOLA",
    turma: "2 ANO B"
  })));

  const snapshot = await assertSucceeds(getDocs(collection(db, "analisesPedagogicas")));
  assert.equal(snapshot.size, 2);
});

test("professor cria e le comparacao pedagogica da propria turma", async () => {
  const db = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();
  const ref = doc(db, "comparacoesPedagogicas/comparacao-teste");

  await assertSucceeds(setDoc(ref, validComparison()));
  await assertSucceeds(getDoc(ref));
});

test("professor nao cria comparacao pedagogica fora do proprio vinculo", async () => {
  const db = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();
  const ref = doc(db, "comparacoesPedagogicas/comparacao-fora-do-vinculo");

  await assertFails(setDoc(ref, validComparison({
    id: "comparacao-fora-do-vinculo",
    turma: "2 ANO B"
  })));
});

test("administrador consulta todas as comparacoes pedagogicas", async () => {
  const db = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  await assertSucceeds(setDoc(doc(db, "comparacoesPedagogicas/comparacao-a"), validComparison({
    id: "comparacao-a",
    professorUid: "professor-1",
    professorEmail: "professor1@trilhaleitura.local",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  })));
  await assertSucceeds(setDoc(doc(db, "comparacoesPedagogicas/comparacao-b"), validComparison({
    id: "comparacao-b",
    professorUid: "professor-2",
    professorEmail: "professor2@trilhaleitura.local",
    escola: "OUTRA ESCOLA",
    turma: "2 ANO B"
  })));

  const snapshot = await assertSucceeds(getDocs(collection(db, "comparacoesPedagogicas")));
  assert.equal(snapshot.size, 2);
});

test("professor cadastra e le aluno da propria escola e turma", async () => {
  const db = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();
  const ref = doc(db, "alunos/aluno-teste");

  await assertSucceeds(setDoc(ref, validStudent()));
  await assertSucceeds(getDoc(ref));
});

test("professor nao cadastra aluno fora do proprio vinculo", async () => {
  const db = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();
  const ref = doc(db, "alunos/aluno-fora-do-vinculo");

  await assertFails(setDoc(ref, validStudent({
    id: "aluno-fora-do-vinculo",
    escola: "OUTRA ESCOLA"
  })));
});

test("professor consulta somente alunos vinculados ao proprio usuario", async () => {
  const adminDb = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const professorDb = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();

  await assertSucceeds(setDoc(doc(adminDb, "alunos/aluno-proprio"), validStudent({
    id: "aluno-proprio"
  })));
  await assertSucceeds(setDoc(doc(adminDb, "alunos/aluno-outra-turma"), validStudent({
    id: "aluno-outra-turma",
    turma: "2 ANO B",
    professorUid: "professor-2",
    professorEmail: "professor2@trilhaleitura.local",
    professoresPermitidos: ["professor-2"]
  })));

  const consultaVinculada = query(
    collection(professorDb, "alunos"),
    where("professorUid", "==", "professor-1"),
    where("escola", "==", "ESCOLA TESTE"),
    where("turma", "==", "2 ANO A")
  );
  const snapshot = await assertSucceeds(getDocs(consultaVinculada));
  assert.equal(snapshot.size, 1);

  await assertFails(getDocs(collection(professorDb, "alunos")));
});

test("administrador cria perfil de usuario local", async () => {
  const db = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const ref = doc(db, "usuarios/professor-novo");

  await assertSucceeds(setDoc(ref, validUserProfile()));
  await assertSucceeds(getDoc(ref));
});

test("professor nao consulta perfis de usuarios", async () => {
  const adminDb = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const professorDb = testEnv.authenticatedContext("professor-1", {
    role: "professor",
    escola: "ESCOLA TESTE",
    turma: "2 ANO A"
  }).firestore();

  await assertSucceeds(setDoc(doc(adminDb, "usuarios/professor-novo"), validUserProfile()));
  await assertFails(getDoc(doc(professorDb, "usuarios/professor-novo")));
  await assertFails(getDocs(collection(professorDb, "usuarios")));
});
