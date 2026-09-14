import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import net from "node:net";
import { join } from "node:path";

const requireFromFunctions = createRequire(`${process.cwd()}/functions/package.json`);
const admin = requireFromFunctions("firebase-admin");

const HOST = "127.0.0.1";
const PORTA_AUTH = 9099;
const PORTA_FIRESTORE = 8085;
const PROJETO_LOCAL = "trilha-leitura";
const API_KEY_PUBLICA_LOCAL = "AIzaSyAhQY16QxpAzA8NXV-vnq5Pzfu8Cgdg3Q8";
const SENHA_PADRAO = "123456";
const ALUNOS_POR_TURMA = 20;
const DISTRIBUICOES_POR_TURMA = [
  { pre: 7, iniciante: 5, fluente: 8 },
  { pre: 5, iniciante: 7, fluente: 8 },
  { pre: 6, iniciante: 5, fluente: 9 },
  { pre: 4, iniciante: 8, fluente: 8 },
  { pre: 8, iniciante: 6, fluente: 6 },
  { pre: 5, iniciante: 6, fluente: 9 }
];
const ADMINISTRADOR = {
  email: "admin@trilhaleitura.local",
  nome: "Administrador Trilha da Leitura"
};
let administradorUid = "";

const escolas = [
  "E.M.E.F. CILIRA VIEIRA DE SOUZA",
  "E.M.E.F. XV DE NOVEMBRO",
  "E.M.E.F. BREJO GRANDE DO ARAGUAIA",
  "E.M.E.I.F. SILVANA MOURA",
  "E.M.E.I.F. PADRE CICERO",
  "E.M.E.I.F. SÃO JOSÉ",
  "E.M.E.I.F. INDÍGENA SAWARAPI SURUI",
  "E.M.E.I.F. NOSSA SENHORA DA PENHA",
  "E.M.E.I.F. JOVENTINA"
];
const turmas = ["2 ANO A", "2 ANO B"];
const nomes = [
  "Ana Clara",
  "Bruno Henrique",
  "Carla Vitória",
  "Diego Samuel",
  "Emanuelly Rocha",
  "Felipe Augusto",
  "Gabriela Lima",
  "Heitor Gabriel",
  "Isabela Nunes",
  "João Miguel",
  "Kauã Vinícius",
  "Larissa Beatriz",
  "Marcos Paulo",
  "Natália Sofia",
  "Otávio Henrique",
  "Pietra Maria",
  "Rafael Lucas",
  "Sofia Helena",
  "Thiago André",
  "Vitória Luiza"
];
const perfisPreLeitor = [
  ["Pré-leitor - Nível 1", "Não realizou a leitura de palavras ou leu letras, sílabas ou palavras fora do item."],
  ["Pré-leitor - Nível 2", "Nomeou letras isoladas ao tentar ler as palavras do item."],
  ["Pré-leitor - Nível 3", "Silabou ao realizar a leitura das palavras do item."],
  ["Pré-leitor - Nível 4", "Leu corretamente até 10 palavras conhecidas e até 5 palavras possivelmente desconhecidas."]
];

function portaEstaAberta(porta) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: HOST, port: porta });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function slug(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function classificarPerfil(conhecidas, dificeis, textoCorretas, precisao) {
  if (textoCorretas > 65 && precisao > 90) {
    return ["Leitor Fluente", "Leu mais de 65 palavras corretas no texto narrativo, com precisão superior a 90%."];
  }
  if (conhecidas >= 11 && dificeis >= 6) {
    return ["Leitor Iniciante", "Leu 11 ou mais palavras conhecidas e 6 ou mais palavras possivelmente desconhecidas."];
  }
  if (conhecidas === 0 && dificeis === 0) return perfisPreLeitor[0];
  return perfisPreLeitor[Math.min(3, Math.floor((conhecidas + dificeis) / 4))];
}

function formatarTempo(segundos) {
  const minutos = Math.floor(segundos / 60);
  const resto = String(segundos % 60).padStart(2, "0");
  return `${minutos}min ${resto}s`;
}

function serieDaTurma(turma) {
  const partes = String(turma || "").match(/^(\d+)\s*ANO/i);
  return partes ? `${partes[1]}º Ano` : "Série não informada";
}

function distribuicaoDaTurma(escolaIndex, turmaIndex) {
  return DISTRIBUICOES_POR_TURMA[(escolaIndex + turmaIndex) % DISTRIBUICOES_POR_TURMA.length];
}

function perfilEsperadoDaTurma(escolaIndex, turmaIndex, alunoIndex) {
  const distribuicao = distribuicaoDaTurma(escolaIndex, turmaIndex);
  if (alunoIndex < distribuicao.pre) return "pre";
  if (alunoIndex < distribuicao.pre + distribuicao.iniciante) return "iniciante";
  return "fluente";
}

function gerarValores(escolaIndex, turmaIndex, alunoIndex) {
  const variacao = (escolaIndex + turmaIndex + alunoIndex) % 4;
  const perfilEsperado = perfilEsperadoDaTurma(escolaIndex, turmaIndex, alunoIndex);

  if (perfilEsperado === "pre") {
    const preLeitores = [
      { conhecidas: 0, dificeis: 0, textoCorretas: 0, precisao: 55 + variacao },
      { conhecidas: 4 + variacao, dificeis: 1, textoCorretas: 12 + variacao, precisao: 62 + variacao },
      { conhecidas: 8 + variacao, dificeis: 3 + (variacao % 2), textoCorretas: 25 + variacao, precisao: 70 + variacao },
      { conhecidas: 2 + variacao, dificeis: 0, textoCorretas: 8 + variacao, precisao: 58 + variacao },
      { conhecidas: 6 + variacao, dificeis: 2, textoCorretas: 18 + variacao, precisao: 66 + variacao },
      { conhecidas: 9 + (variacao % 2), dificeis: 4, textoCorretas: 32 + variacao, precisao: 72 + variacao },
      { conhecidas: 7 + variacao, dificeis: 2 + (variacao % 2), textoCorretas: 22 + variacao, precisao: 68 + variacao },
      { conhecidas: 3 + variacao, dificeis: 1, textoCorretas: 10 + variacao, precisao: 60 + variacao }
    ];
    return preLeitores[alunoIndex % preLeitores.length];
  }

  if (perfilEsperado === "iniciante") {
    const deslocamento = alunoIndex % 8;
    return {
      conhecidas: Math.min(42, 12 + deslocamento * 4 + variacao),
      dificeis: Math.min(22, 6 + deslocamento * 2 + (variacao % 2)),
      textoCorretas: Math.min(65, 35 + deslocamento * 3 + variacao),
      precisao: Math.min(88, 76 + deslocamento * 2 + variacao)
    };
  }

  const deslocamento = alunoIndex % 9;
  return {
    conhecidas: Math.min(60, 49 + deslocamento * 2 + variacao),
    dificeis: Math.min(40, 18 + deslocamento + (variacao % 2)),
    textoCorretas: Math.min(90, 66 + deslocamento * 2 + variacao),
    precisao: Math.min(100, 91 + deslocamento + variacao)
  };
}

function montarAcessos() {
  const acessos = [];
  let numero = 1;
  for (const escola of escolas) {
    for (const turma of turmas) {
      acessos.push({
        numero,
        uid: `professor-${numero}`,
        email: `professor${numero}@trilhaleitura.local`,
        nome: `Professor ${numero}`,
        escola,
        turma
      });
      numero++;
    }
  }
  return acessos;
}

async function criarUsuariosAuth(acessos) {
  let criadosOuAtualizados = 0;

  const adminUser = await cadastrarOuEntrar(ADMINISTRADOR.email, ADMINISTRADOR.nome);
  await atualizarClaims(adminUser.localId, JSON.stringify({
    role: "admin",
    papel: "administrador"
  }), ADMINISTRADOR.nome);
  administradorUid = adminUser.localId;
  criadosOuAtualizados++;

  for (const acesso of acessos) {
    const claims = JSON.stringify({
      role: "professor",
      papel: "professor",
      escola: acesso.escola,
      serie: serieDaTurma(acesso.turma),
      turma: acesso.turma
    });

    const principal = await cadastrarOuEntrar(acesso.email, acesso.nome);
    await atualizarClaims(principal.localId, claims, acesso.nome);
    acesso.uid = principal.localId;
    criadosOuAtualizados++;
  }

  return criadosOuAtualizados;
}

async function removerAliasesAntigosAuth() {
  let removidos = 0;
  for (let numero = 1; numero <= escolas.length * turmas.length; numero++) {
    const emailAntigo = `professor${String(numero).padStart(2, "0")}@trilhaleitura.local`;
    if (emailAntigo === `professor${numero}@trilhaleitura.local`) continue;
    const login = await chamarAuth("accounts:signInWithPassword", {
      email: emailAntigo,
      password: SENHA_PADRAO,
      returnSecureToken: true
    });
    if (!login.ok || !login.json?.localId) continue;

    const resposta = await chamarAuthOwner("accounts:delete", {
      localId: login.json.localId
    });
    if (!resposta.ok || resposta.json.error) {
      throw new Error(`Nao foi possivel remover alias ${emailAntigo}: ${JSON.stringify(resposta.json)}`);
    }
    removidos++;
  }
  return removidos;
}

async function cadastrarOuEntrar(email, nome) {
  const cadastro = await chamarAuth("accounts:signUp", {
    email,
    password: SENHA_PADRAO,
    displayName: nome,
    returnSecureToken: true
  });

  if (cadastro.ok) return cadastro.json;

  const mensagem = cadastro.json?.error?.message || "";
  if (!mensagem.includes("EMAIL_EXISTS")) {
    throw new Error(`Nao foi possivel criar ${email}: ${JSON.stringify(cadastro.json)}`);
  }

  const login = await chamarAuth("accounts:signInWithPassword", {
    email,
    password: SENHA_PADRAO,
    returnSecureToken: true
  });

  if (!login.ok) {
    throw new Error(`Usuario ${email} ja existe, mas nao entrou com a senha ${SENHA_PADRAO}: ${JSON.stringify(login.json)}`);
  }

  return login.json;
}

async function atualizarClaims(localId, customAttributes, displayName) {
  const resposta = await fetch(
    `http://${HOST}:${PORTA_AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY_PUBLICA_LOCAL}`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer owner",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ localId, displayName, customAttributes })
    }
  );
  const json = await resposta.json();
  if (!resposta.ok || json.error) {
    throw new Error(`Nao foi possivel atualizar claims de ${localId}: ${JSON.stringify(json)}`);
  }
}

async function chamarAuth(acao, body) {
  const resposta = await fetch(
    `http://${HOST}:${PORTA_AUTH}/identitytoolkit.googleapis.com/v1/${acao}?key=${API_KEY_PUBLICA_LOCAL}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  const json = await resposta.json();
  return { ok: resposta.ok, json };
}

async function chamarAuthOwner(acao, body) {
  const resposta = await fetch(
    `http://${HOST}:${PORTA_AUTH}/identitytoolkit.googleapis.com/v1/${acao}?key=${API_KEY_PUBLICA_LOCAL}`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer owner",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  const json = await resposta.json();
  return { ok: resposta.ok, json };
}

async function gravarUsuariosFirestore(db, acessos) {
  const batch = db.batch();
  if (administradorUid) {
    batch.set(
      db.collection("usuarios").doc(administradorUid),
      {
        uid: administradorUid,
        email: ADMINISTRADOR.email,
        nome: ADMINISTRADOR.nome,
        papel: "administrador",
        ativo: true,
        ambiente: "emulador",
        observacao: "Usuário administrador fictício criado para teste local no Firebase Emulator Suite.",
        atualizadoEmFirebase: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  for (const acesso of acessos) {
    batch.set(
      db.collection("usuarios").doc(acesso.uid),
      {
        uid: acesso.uid,
        email: acesso.email,
        nome: acesso.nome,
        papel: "professor",
        escola: acesso.escola,
        serie: serieDaTurma(acesso.turma),
        turma: acesso.turma,
        ativo: true,
        ambiente: "emulador",
        observacao: "Usuário fictício criado para teste local no Firebase Emulator Suite.",
        atualizadoEmFirebase: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }
  await batch.commit();
  return acessos.length + (administradorUid ? 1 : 0);
}

async function removerUsuariosAliasAntigos(db) {
  const snapshot = await db.collection("usuarios").get();
  let batch = db.batch();
  let operacoes = 0;
  let removidos = 0;

  for (const doc of snapshot.docs) {
    const dados = doc.data();
    if (dados.alias !== true && !String(dados.email || "").match(/^professor0\d@trilhaleitura\.local$/)) continue;
    batch.delete(doc.ref);
    operacoes++;
    removidos++;
    if (operacoes >= 450) {
      await batch.commit();
      batch = db.batch();
      operacoes = 0;
    }
  }

  if (operacoes) await batch.commit();
  return removidos;
}

async function removerMassaFicticiaAnterior(db) {
  const colecoes = [
    { nome: "resultadosAlunos", prefixo: "massa-ptbr-" },
    { nome: "alunos", prefixo: "aluno-massa-ptbr-" }
  ];
  let batch = db.batch();
  let operacoes = 0;
  let removidos = 0;

  for (const colecao of colecoes) {
    const snapshot = await db.collection(colecao.nome).get();
    for (const doc of snapshot.docs) {
      if (!doc.id.startsWith(colecao.prefixo)) continue;
      batch.delete(doc.ref);
      operacoes++;
      removidos++;
      if (operacoes >= 450) {
        await batch.commit();
        batch = db.batch();
        operacoes = 0;
      }
    }
  }

  if (operacoes) await batch.commit();
  return removidos;
}

async function gravarResultados(db, acessos) {
  const porTurma = new Map(acessos.map((acesso) => [`${acesso.escola}|||${acesso.turma}`, acesso]));
  let batch = db.batch();
  let operacoes = 0;
  let resultados = 0;
  let alunos = 0;
  const agora = new Date("2026-09-01T12:00:00.000Z");

  for (let escolaIndex = 0; escolaIndex < escolas.length; escolaIndex++) {
    for (let turmaIndex = 0; turmaIndex < turmas.length; turmaIndex++) {
      for (let alunoIndex = 0; alunoIndex < ALUNOS_POR_TURMA; alunoIndex++) {
        const escola = escolas[escolaIndex];
        const turma = turmas[turmaIndex];
        const serie = serieDaTurma(turma);
        const acesso = porTurma.get(`${escola}|||${turma}`);
        const { conhecidas, dificeis, textoCorretas, precisao } = gerarValores(escolaIndex, turmaIndex, alunoIndex);
        const totalListas = conhecidas + dificeis;
        const compreensao = (escolaIndex + turmaIndex + alunoIndex) % 3;
        const tempoConhecidasSegundos = 45 + ((escolaIndex + alunoIndex * 3) % 16);
        const tempoDificeisSegundos = 47 + ((turmaIndex + alunoIndex * 4 + escolaIndex) % 14);
        const tempoTotalSegundos = tempoConhecidasSegundos + tempoDificeisSegundos;
        const [perfil, criterio] = classificarPerfil(conhecidas, dificeis, textoCorretas, precisao);
        const data = new Date(agora.getTime() - resultados * 86400000);
        const sufixoId = `${slug(escola)}-${slug(turma)}-${String(alunoIndex + 1).padStart(2, "0")}`;
        const id = `massa-ptbr-${sufixoId}`;
        const alunoId = `aluno-massa-ptbr-${sufixoId}`;
        const nome = `${nomes[alunoIndex]} ${turma.endsWith("A") ? "A" : "B"}${escolaIndex + 1}`;

        batch.set(
          db.collection("alunos").doc(alunoId),
          {
            id: alunoId,
            nome,
            escola,
            serie,
            turma,
            professorUid: acesso.uid,
            professorEmail: acesso.email,
            professoresPermitidos: [acesso.uid],
            ativo: true,
            criadoEm: admin.firestore.FieldValue.serverTimestamp(),
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );
        alunos++;
        operacoes++;

        batch.set(
          db.collection("resultadosAlunos").doc(id),
          {
            id,
            salvoEm: data.toISOString(),
            data: data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            nome,
            escola,
            serie,
            turma,
            palavrasCorretas: conhecidas,
            dificeisCorretas: dificeis,
            palavrasTextoCorretas: textoCorretas,
            total: totalListas,
            precisao,
            compreensao,
            tempoConhecidasSegundos,
            tempoDificeisSegundos,
            tempoTotalSegundos,
            tempoConhecidas: formatarTempo(tempoConhecidasSegundos),
            tempoDificeis: formatarTempo(tempoDificeisSegundos),
            tempoTotal: formatarTempo(tempoTotalSegundos),
            perfil,
            criterio,
            textoLido: "Registro fictício criado para teste local no emulador.",
            professorUid: acesso.uid,
            professorEmail: acesso.email,
            professoresPermitidos: [acesso.uid],
            atualizadoEmFirebase: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        resultados++;
        operacoes++;
        if (operacoes >= 440) {
          await batch.commit();
          batch = db.batch();
          operacoes = 0;
        }
      }
    }
  }
  if (operacoes) await batch.commit();
  return { resultados, alunos };
}

async function verificarResultados(db) {
  const snapshot = await db.collection("resultadosAlunos").get();
  const documentos = snapshot.docs.filter((doc) => doc.id.startsWith("massa-ptbr-"));
  const alunosSnapshot = await db.collection("alunos").get();
  const alunosFicticios = alunosSnapshot.docs.filter((doc) => doc.id.startsWith("aluno-massa-ptbr-"));
  const contagem = {
    "Pré-leitor": 0,
    "Leitor Iniciante": 0,
    "Leitor Fluente": 0
  };
  const porTurma = new Map();

  for (const doc of documentos) {
    const dados = doc.data();
    const perfil = String(dados.perfil || "");
    const chaveTurma = `${dados.escola}|||${dados.turma}`;
    if (!porTurma.has(chaveTurma)) {
      porTurma.set(chaveTurma, {
        total: 0,
        "Pré-leitor": 0,
        "Leitor Iniciante": 0,
        "Leitor Fluente": 0
      });
    }
    const linhaTurma = porTurma.get(chaveTurma);
    linhaTurma.total++;

    if (perfil.includes("Fluente")) {
      contagem["Leitor Fluente"]++;
      linhaTurma["Leitor Fluente"]++;
    } else if (perfil.includes("Iniciante")) {
      contagem["Leitor Iniciante"]++;
      linhaTurma["Leitor Iniciante"]++;
    } else {
      contagem["Pré-leitor"]++;
      linhaTurma["Pré-leitor"]++;
    }
  }

  const turmasInvalidas = [...porTurma.values()].filter((linha) =>
    linha.total !== ALUNOS_POR_TURMA ||
    linha["Pré-leitor"] < 1 ||
    linha["Leitor Iniciante"] < 1 ||
    linha["Leitor Fluente"] < 1
  );

  const totalEsperado = escolas.length * turmas.length * ALUNOS_POR_TURMA;
  if (documentos.length !== totalEsperado || alunosFicticios.length !== totalEsperado || turmasInvalidas.length) {
    throw new Error(`Verificacao falhou: ${documentos.length} resultados e ${alunosFicticios.length} alunos ficticios encontrados. Confira a distribuicao por turma.`);
  }

  return { ...contagem, alunosFicticios: alunosFicticios.length };
}

function exportarDadosPersistentes() {
  const firebaseCli = join("node_modules", "firebase-tools", "lib", "bin", "firebase.js");
  const projetos = [PROJETO_LOCAL, "demo-trilha-da-leitura"];
  for (const projeto of projetos) {
    const resultado = spawnSync(process.execPath, [
      firebaseCli,
      "emulators:export",
      ".firebase/emuladores",
      "--force",
      "--project",
      projeto
    ], {
      encoding: "utf8",
      stdio: "pipe"
    });

    if (resultado.status === 0) {
      return projeto;
    }
  }

  return "";
}

if (!(await portaEstaAberta(PORTA_AUTH)) || !(await portaEstaAberta(PORTA_FIRESTORE))) {
  console.error("Inicie os emuladores antes de semear os dados: npm run emuladores");
  process.exit(1);
}

process.env.FIRESTORE_EMULATOR_HOST = `${HOST}:${PORTA_FIRESTORE}`;
process.env.GCLOUD_PROJECT = PROJETO_LOCAL;

if (!admin.apps.length) admin.initializeApp({ projectId: PROJETO_LOCAL });

const db = admin.firestore();
const acessos = montarAcessos();
const aliasesAuthRemovidos = await removerAliasesAntigosAuth();
const usuariosAuth = await criarUsuariosAuth(acessos);
const aliasesFirestoreRemovidos = await removerUsuariosAliasAntigos(db);
const usuariosFirestore = await gravarUsuariosFirestore(db, acessos);
const removidos = await removerMassaFicticiaAnterior(db);
const massa = await gravarResultados(db, acessos);
const contagem = await verificarResultados(db);
const projetoExportado = exportarDadosPersistentes();

console.log("Dados locais recriados no Firebase Emulator Suite.");
console.log(`Usuarios no Auth Emulator: ${usuariosAuth}`);
console.log(`Aliases antigos removidos do Auth Emulator: ${aliasesAuthRemovidos}`);
console.log(`Aliases antigos removidos da colecao usuarios: ${aliasesFirestoreRemovidos}`);
console.log(`Perfis na colecao usuarios: ${usuariosFirestore}`);
console.log(`Documentos ficticios anteriores removidos: ${removidos}`);
console.log(`Alunos ficticios criados em alunos: ${massa.alunos}`);
console.log(`Resultados ficticios criados em resultadosAlunos: ${massa.resultados}`);
console.log(`Resultados ficticios conferidos no Firestore: ${escolas.length * turmas.length * ALUNOS_POR_TURMA}`);
console.log(`Alunos ficticios conferidos no Firestore: ${contagem.alunosFicticios}`);
console.log(`Perfis conferidos: Pre-leitor ${contagem["Pré-leitor"]}, Leitor Iniciante ${contagem["Leitor Iniciante"]}, Leitor Fluente ${contagem["Leitor Fluente"]}.`);
console.log("Distribuicao por turma: variada, sempre com 20 alunos e pelo menos um registro de cada perfil.");
console.log(projetoExportado
  ? `Dados exportados para .firebase/emuladores pelo projeto ${projetoExportado}.`
  : "Aviso: nao foi possivel exportar automaticamente. Ao encerrar os emuladores com Ctrl+C, o Firebase CLI deve exportar os dados.");
console.log(`Senha de teste: ${SENHA_PADRAO}`);
console.log(`Exemplo: professor1@trilhaleitura.local / ${SENHA_PADRAO}`);
console.log(`Administrador: ${ADMINISTRADOR.email} / ${SENHA_PADRAO}`);
