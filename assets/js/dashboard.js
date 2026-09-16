let todosResultados = [];
let resultadosFiltrados = [];
let alunosCadastrados = [];
let unsubscribeResultados = null;
let unsubscribeAlunos = null;
let ordenacaoTabela = {campo:"nome", direcao:"asc"};
let vinculoUsuario = {administrador:false, uid:"", email:"", escola:"", turma:""};
const escolasPadrao = [
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
const turmasPadrao = ["2 ANO A", "2 ANO B"];

async function obterFirestoreDashboard(){
  if(!window.firebase || !window.firebaseConfig){
    throw new Error("Sistema de dados não carregado.");
  }
  if(!firebase.apps.length){
    firebase.initializeApp(window.firebaseConfig);
  }
  return firebase.firestore();
}

async function carregarResultados(){
  const tabela = document.getElementById("tabelaResultados");
  if(tabela) tabela.innerHTML = `<tr><td colspan="13">Carregando resultados...</td></tr>`;
  preencherEscolas();
  preencherTurmas();
  atualizarStatus("Conectando aos dados do Trilha da Leitura...");

  try{
    if(!window.TrilhaAuth){
      throw new Error("Autenticação não carregada.");
    }
    const usuario = await window.TrilhaAuth.currentUser();
      if(!usuario){
        atualizarStatus("Faça login para consultar os resultados.");
      if(tabela) tabela.innerHTML = `<tr><td colspan="13">Faça login para consultar os resultados.</td></tr>`;
      return;
    }

    vinculoUsuario = await obterVinculoUsuario(usuario);
    aplicarVinculoNosFiltros();
    configurarCadastroAlunos();
    configurarTransferenciaAlunos();
    configurarCadastroAdministrativo();

    if(!vinculoUsuario.administrador && (!vinculoUsuario.escola || !vinculoUsuario.turma)){
      atualizarStatus("Usuário sem vínculo de escola e turma. Verifique o cadastro de acessos do Trilha da Leitura.");
      if(tabela) tabela.innerHTML = `<tr><td colspan="13">Usuário sem vínculo de escola e turma.</td></tr>`;
      return;
    }

    const db = await obterFirestoreDashboard();
    const colecao = window.trilhaFirestoreCollection || "resultadosAlunos";
    if(unsubscribeResultados) unsubscribeResultados();
    let consulta = db.collection(colecao);
    if(!vinculoUsuario.administrador){
      consulta = consulta
        .where("professoresPermitidos", "array-contains", vinculoUsuario.uid)
        .where("escola", "==", vinculoUsuario.escola)
        .where("turma", "==", vinculoUsuario.turma);
    }
    unsubscribeResultados = consulta.onSnapshot(snapshot => {
      todosResultados = snapshot.docs.map(doc => ({id:doc.id, ...doc.data()}));
      todosResultados.sort((a,b) => new Date(b.salvoEm || b.data || 0) - new Date(a.salvoEm || a.data || 0));
      preencherEscolas();
      preencherTurmas();
      aplicarVinculoNosFiltros();
      configurarCadastroAlunos();
      configurarTransferenciaAlunos();
      configurarCadastroAdministrativo();
      carregarAlunosCadastrados();
      aplicarFiltros();
      atualizarStatus(mensagemResultadosCarregados(todosResultados.length));
    }, error => {
      atualizarStatus(`Erro ao ler dados do Trilha da Leitura: ${error.message || "verifique as permissões do acesso."}`);
      if(tabela) tabela.innerHTML = `<tr><td colspan="13">Não foi possível carregar os dados. ${escapeHtml(error.message || "")}</td></tr>`;
    });
  }catch(error){
    preencherEscolas();
    preencherTurmas();
    atualizarStatus(`Erro ao conectar: ${error.message || "Sistema de dados não carregado."}`);
    if(tabela) tabela.innerHTML = `<tr><td colspan="13">Não foi possível carregar os dados. ${escapeHtml(error.message || "")}</td></tr>`;
  }
}

async function obterVinculoUsuario(usuario){
  const token = typeof usuario.getIdTokenResult === "function" ? await usuario.getIdTokenResult() : {claims:{}};
  const claims = token.claims || {};
  const role = String(claims.role || claims.papel || "");
  const administrador = role === "admin" || role === "administrador";
  return {
    administrador,
    uid: String(usuario.uid || ""),
    email: String(usuario.email || ""),
    escola: escolaMaiuscula(claims.escola || ""),
    turma: String(claims.turma || "")
  };
}

function aplicarVinculoNosFiltros(){
  const filtroEscola = document.getElementById("filtroEscola");
  const filtroTurma = document.getElementById("filtroTurma");
  if(!filtroEscola || !filtroTurma) return;

  if(vinculoUsuario.administrador){
    filtroEscola.disabled = false;
    filtroTurma.disabled = false;
    return;
  }

  if(vinculoUsuario.escola){
    filtroEscola.innerHTML = `<option value="${escapeHtml(vinculoUsuario.escola)}">${escapeHtml(vinculoUsuario.escola)}</option>`;
    filtroEscola.value = vinculoUsuario.escola;
  }
  if(vinculoUsuario.turma){
    filtroTurma.innerHTML = `<option value="${escapeHtml(vinculoUsuario.turma)}">${escapeHtml(vinculoUsuario.turma)}</option>`;
    filtroTurma.value = vinculoUsuario.turma;
  }
  filtroEscola.disabled = true;
  filtroTurma.disabled = true;
}

function mensagemResultadosCarregados(total){
  if(vinculoUsuario.administrador) return `${total} resultado(s) carregado(s) do Trilha da Leitura.`;
  return `${total} resultado(s) carregado(s) para ${vinculoUsuario.escola} - ${vinculoUsuario.turma}.`;
}

function preencherEscolas(){
  const select = document.getElementById("filtroEscola");
  if(!select) return;
  if(!vinculoUsuario.administrador && vinculoUsuario.escola){
    select.innerHTML = `<option value="${escapeHtml(vinculoUsuario.escola)}">${escapeHtml(vinculoUsuario.escola)}</option>`;
    select.value = vinculoUsuario.escola;
    select.disabled = true;
    return;
  }
  const atual = select.value;
  const escolas = [...new Set([...escolasPadrao, ...todosResultados.map(item => escolaMaiuscula(item.escola)).filter(Boolean)])].sort((a,b) => a.localeCompare(b));
  select.innerHTML = `<option value="">Todas</option>` + escolas.map(escola => `<option value="${escapeHtml(escola)}">${escapeHtml(escola)}</option>`).join("");
  select.value = escolas.includes(atual) ? atual : "";
}

function preencherTurmas(){
  const select = document.getElementById("filtroTurma");
  if(!select) return;
  if(!vinculoUsuario.administrador && vinculoUsuario.turma){
    select.innerHTML = `<option value="${escapeHtml(vinculoUsuario.turma)}">${escapeHtml(vinculoUsuario.turma)}</option>`;
    select.value = vinculoUsuario.turma;
    select.disabled = true;
    return;
  }
  const atual = select.value;
  const turmas = [...new Set([...turmasPadrao, ...todosResultados.map(item => item.turma).filter(Boolean)])].sort((a,b) => a.localeCompare(b));
  select.innerHTML = `<option value="">Todas</option>` + turmas.map(turma => `<option value="${escapeHtml(turma)}">${escapeHtml(turma)}</option>`).join("");
  select.value = turmas.includes(atual) ? atual : "";
}

function aplicarFiltros(){
  const {escola, turma, perfil, busca} = filtrosAtivosDashboard();

  resultadosFiltrados = todosResultados.filter(item => {
    const escolaOk = !escola || escolaMaiuscula(item.escola) === escola;
    const turmaOk = !turma || item.turma === turma;
    const perfilOk = !perfil || (perfil !== "Não Analisado" && String(item.perfil || "").includes(perfil));
    const buscaOk = !busca || normalizar(item.nome || "").includes(busca);
    return escolaOk && turmaOk && perfilOk && buscaOk;
  });

  ordenarResultadosFiltrados();
  renderizarIndicadores();
  renderizarPerfil();
  renderizarTurmas();
  renderizarTabela();
  atualizarTotalAlunosCadastrados();
  configurarTransferenciaAlunos();
  if(window.TrilhaIA) window.TrilhaIA.atualizarPainel();
}

function configurarCadastroAlunos(){
  const form = document.getElementById("formCadastroAluno");
  const contexto = document.getElementById("cadastroAlunoContexto");
  const botao = form ? form.querySelector("button[type='submit']") : null;
  if(!form || !contexto || !botao) return;
  if(!form.dataset.configurado){
    form.addEventListener("submit", cadastrarAlunoDashboard);
    form.dataset.configurado = "true";
  }

  if(vinculoUsuario.administrador){
    const escola = document.getElementById("filtroEscola")?.value || "";
    const turma = document.getElementById("filtroTurma")?.value || "";
    contexto.textContent = escola && turma
      ? `Cadastro no filtro selecionado: ${escola} - ${turma}.`
      : "Administrador: selecione uma escola e uma turma nos filtros antes de cadastrar.";
    botao.disabled = !(escola && turma);
    return;
  }

  contexto.textContent = vinculoUsuario.escola && vinculoUsuario.turma
    ? `Os alunos cadastrados aqui ficam vinculados a ${vinculoUsuario.escola} - ${vinculoUsuario.turma}.`
    : "Este usuário ainda não possui vínculo de escola e turma.";
  botao.disabled = !(vinculoUsuario.escola && vinculoUsuario.turma);
}

function configurarCadastroAdministrativo(){
  const painel = document.getElementById("adminCadastroAcessos");
  const form = document.getElementById("formAdminCadastroAcesso");
  const escolaSelect = document.getElementById("adminAcessoEscola");
  const turmaSelect = document.getElementById("adminAcessoTurma");
  const papelSelect = document.getElementById("adminAcessoPapel");
  if(!painel || !form || !escolaSelect || !turmaSelect || !papelSelect) return;

  painel.hidden = !vinculoUsuario.administrador;
  if(!vinculoUsuario.administrador) return;

  preencherSelectBasico(escolaSelect, escolasPadrao, "Selecione a escola");
  preencherSelectBasico(turmaSelect, turmasPadrao, "Selecione a turma");

  if(!form.dataset.configurado){
    form.addEventListener("submit", cadastrarAcessoAdministrativo);
    papelSelect.addEventListener("change", atualizarCamposCadastroAcesso);
    form.dataset.configurado = "true";
  }
  atualizarCamposCadastroAcesso();
}

function configurarTransferenciaAlunos(){
  const form = document.getElementById("formTransferenciaAluno");
  const contexto = document.getElementById("transferenciaAlunoContexto");
  const alunoSelect = document.getElementById("transferenciaAlunoId");
  const escolaSelect = document.getElementById("transferenciaEscolaDestino");
  const turmaSelect = document.getElementById("transferenciaTurmaDestino");
  const botao = form ? form.querySelector("button[type='submit']") : null;
  if(!form || !contexto || !alunoSelect || !escolaSelect || !turmaSelect || !botao) return;

  if(!form.dataset.configurado){
    form.addEventListener("submit", transferirAlunoDashboard);
    form.dataset.configurado = "true";
  }

  preencherDestinoTransferencia(escolaSelect, turmaSelect);
  preencherAlunosTransferencia(alunoSelect);

  const {escola, turma} = filtrosAtivosDashboard();
  const temOrigem = Boolean(escola && turma);
  const podeTransferir = vinculoUsuario.administrador && temOrigem;
  contexto.textContent = vinculoUsuario.administrador
    ? (temOrigem
      ? `Alunos listados a partir do filtro atual: ${escola} - ${turma}.`
      : "Administrador: selecione uma escola e uma turma nos filtros para listar os alunos.")
    : "Transferência entre escolas ou turmas é uma ação administrativa. O professor deve solicitar ao administrador.";

  const temAlunos = Boolean(alunoSelect.options.length && alunoSelect.options[0]?.value !== "");
  alunoSelect.disabled = !podeTransferir || !temAlunos;
  escolaSelect.disabled = !podeTransferir;
  turmaSelect.disabled = !podeTransferir;
  botao.disabled = !podeTransferir || !temAlunos;
}

function preencherDestinoTransferencia(escolaSelect, turmaSelect){
  const escolaAtual = escolaSelect.value;
  const turmaAtual = turmaSelect.value;
  const escolas = [...new Set([
    ...escolasPadrao,
    ...todosResultados.map(item => escolaMaiuscula(item.escola)).filter(Boolean),
    ...alunosCadastrados.map(item => escolaMaiuscula(item.escola)).filter(Boolean)
  ])].sort((a,b) => a.localeCompare(b, "pt-BR"));
  const turmas = [...new Set([
    ...turmasPadrao,
    ...todosResultados.map(item => item.turma).filter(Boolean),
    ...alunosCadastrados.map(item => item.turma).filter(Boolean)
  ])].sort((a,b) => a.localeCompare(b, "pt-BR", {numeric:true, sensitivity:"base"}));

  escolaSelect.innerHTML = `<option value="">Selecione a escola</option>` +
    escolas.map(escola => `<option value="${escapeHtml(escola)}">${escapeHtml(escola)}</option>`).join("");
  turmaSelect.innerHTML = `<option value="">Selecione a turma</option>` +
    turmas.map(turma => `<option value="${escapeHtml(turma)}">${escapeHtml(turma)}</option>`).join("");

  if(escolas.includes(escolaAtual)) escolaSelect.value = escolaAtual;
  if(turmas.includes(turmaAtual)) turmaSelect.value = turmaAtual;
}

function preencherAlunosTransferencia(select){
  const atual = select.value;
  const {escola, turma, busca} = filtrosAtivosDashboard();
  const alunos = alunosCadastrados
    .filter(aluno => aluno.ativo !== false)
    .filter(aluno => !escola || escolaMaiuscula(aluno.escola) === escola)
    .filter(aluno => !turma || aluno.turma === turma)
    .filter(aluno => !busca || normalizar(aluno.nome || "").includes(busca))
    .sort((a,b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {sensitivity:"base"}));

  if(!alunos.length){
    select.innerHTML = `<option value="">Nenhum aluno cadastrado na turma filtrada</option>`;
    return;
  }

  select.innerHTML = alunos.map(aluno => {
    const detalhe = `${escolaMaiuscula(aluno.escola)} • ${aluno.turma || "Sem turma"}`;
    return `<option value="${escapeHtml(aluno.id)}">${escapeHtml(aluno.nome || "Aluno sem nome")} — ${escapeHtml(detalhe)}</option>`;
  }).join("");
  if(alunos.some(aluno => aluno.id === atual)) select.value = atual;
}

async function transferirAlunoDashboard(event){
  event.preventDefault();
  if(!vinculoUsuario.administrador){
    atualizarStatusTransferenciaAluno("Somente administrador pode transferir alunos entre escolas ou turmas.");
    return;
  }

  const alunoId = document.getElementById("transferenciaAlunoId")?.value || "";
  const escolaDestino = escolaMaiuscula(document.getElementById("transferenciaEscolaDestino")?.value || "");
  const turmaDestino = document.getElementById("transferenciaTurmaDestino")?.value || "";
  const aluno = alunosCadastrados.find(item => item.id === alunoId);

  if(!aluno){
    atualizarStatusTransferenciaAluno("Selecione um aluno da turma.");
    return;
  }
  if(!escolaDestino || !turmaDestino){
    atualizarStatusTransferenciaAluno("Selecione a escola e a turma de destino.");
    return;
  }
  if(escolaMaiuscula(aluno.escola) === escolaDestino && aluno.turma === turmaDestino){
    atualizarStatusTransferenciaAluno("O aluno já está vinculado a essa escola e turma.");
    return;
  }

  const confirmar = window.confirm(`Transferir ${aluno.nome} para ${escolaDestino} - ${turmaDestino}?`);
  if(!confirmar) return;

  try{
    const db = await obterFirestoreDashboard();
    await db.collection("alunos").doc(aluno.id).set({
      escola:escolaDestino,
      serie:serieDaTurma(turmaDestino),
      turma:turmaDestino,
      atualizadoEm:firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true});
    atualizarStatusTransferenciaAluno(`${aluno.nome} foi transferido(a) para ${escolaDestino} - ${turmaDestino}.`);
    document.getElementById("transferenciaAlunoId").value = "";
  }catch(error){
    atualizarStatusTransferenciaAluno(`Não foi possível transferir o aluno. ${error.message || "Verifique as permissões."}`);
  }
}

function atualizarStatusTransferenciaAluno(mensagem){
  const status = document.getElementById("transferenciaAlunoStatus");
  if(status) status.textContent = mensagem;
}

function preencherSelectBasico(select, opcoes, rotuloInicial){
  const atual = select.value;
  select.innerHTML = `<option value="">${escapeHtml(rotuloInicial)}</option>` +
    opcoes.map(opcao => `<option value="${escapeHtml(opcao)}">${escapeHtml(opcao)}</option>`).join("");
  if(opcoes.includes(atual)) select.value = atual;
}

function atualizarCamposCadastroAcesso(){
  const papel = document.getElementById("adminAcessoPapel")?.value || "professor";
  const escola = document.getElementById("adminAcessoEscola");
  const turma = document.getElementById("adminAcessoTurma");
  if(!escola || !turma) return;
  const exigeVinculo = papel === "professor";
  escola.required = exigeVinculo;
  turma.required = exigeVinculo;
  escola.disabled = !exigeVinculo;
  turma.disabled = !exigeVinculo;
  if(!exigeVinculo){
    escola.value = "";
    turma.value = "";
  }
}

async function cadastrarAcessoAdministrativo(event){
  event.preventDefault();
  if(!vinculoUsuario.administrador){
    atualizarStatusCadastroAcesso("Somente administrador pode criar acessos.");
    return;
  }
  if(!emEmuladorLocalAtivo()){
    atualizarStatusCadastroAcesso("Cadastro de acessos disponível somente no ambiente local do Trilha da Leitura.");
    return;
  }

  const nome = limparTextoCampo("adminAcessoNome");
  const email = limparTextoCampo("adminAcessoEmail").toLowerCase();
  const senha = limparTextoCampo("adminAcessoSenha");
  const papel = document.getElementById("adminAcessoPapel")?.value || "professor";
  const escola = escolaMaiuscula(document.getElementById("adminAcessoEscola")?.value || "");
  const turma = document.getElementById("adminAcessoTurma")?.value || "";

  if(!nome || !email || !senha){
    atualizarStatusCadastroAcesso("Preencha nome, e-mail e senha.");
    return;
  }
  if(senha.length < 6){
    atualizarStatusCadastroAcesso("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }
  if(papel === "professor" && (!escola || !turma)){
    atualizarStatusCadastroAcesso("Professor precisa estar vinculado a uma escola e turma.");
    return;
  }

  try{
    atualizarStatusCadastroAcesso("Criando acesso no Trilha da Leitura...");
    const usuario = await criarUsuarioNoAuthEmulator({nome, email, senha});
    await atualizarClaimsNoAuthEmulator(usuario.localId, claimsDoAcesso({papel, escola, turma}));
    await salvarPerfilUsuarioFirestore({uid:usuario.localId, nome, email, papel, escola, turma});
    document.getElementById("formAdminCadastroAcesso").reset();
    atualizarCamposCadastroAcesso();
    atualizarStatusCadastroAcesso(`Acesso criado: ${email}.`);
  }catch(error){
    atualizarStatusCadastroAcesso(`Não foi possível criar o acesso. ${mensagemErroAuth(error)}`);
  }
}

function limparTextoCampo(id){
  return String(document.getElementById(id)?.value || "").trim().replace(/\s+/g, " ");
}

function emEmuladorLocalAtivo(){
  return Boolean(window.trilhaEmulatorsConnected) || isHostDesenvolvimentoLocal(window.location.hostname);
}

function isHostDesenvolvimentoLocal(hostname){
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === ""
    || hostname.startsWith("192.168.")
    || hostname.startsWith("10.")
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
}

function hostEmuladorLocal(hostname){
  return hostname === "localhost" || hostname === "" ? "127.0.0.1" : hostname;
}

async function criarUsuarioNoAuthEmulator({nome, email, senha}){
  const resposta = await chamarAuthEmulator("accounts:signUp", {
    email,
    password: senha,
    displayName: nome,
    returnSecureToken: true
  });
  if(!resposta.ok || resposta.json.error){
    throw new Error(resposta.json.error?.message || "Erro no cadastro do Auth.");
  }
  return resposta.json;
}

async function atualizarClaimsNoAuthEmulator(localId, claims){
  const resposta = await chamarAuthEmulator("accounts:update", {
    localId,
    customAttributes: JSON.stringify(claims)
  }, true);
  if(!resposta.ok || resposta.json.error){
    throw new Error(resposta.json.error?.message || "Erro ao aplicar claims.");
  }
}

async function chamarAuthEmulator(acao, body, owner){
  const apiKey = firebase.app().options.apiKey || "fake-local-key";
  const emulatorHost = hostEmuladorLocal(window.location.hostname);
  const resposta = await fetch(`http://${emulatorHost}:9099/identitytoolkit.googleapis.com/v1/${acao}?key=${encodeURIComponent(apiKey)}`, {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      ...(owner ? {Authorization:"Bearer owner"} : {})
    },
    body:JSON.stringify(body)
  });
  const json = await resposta.json();
  return {ok:resposta.ok, json};
}

function claimsDoAcesso({papel, escola, turma}){
  if(papel === "administrador"){
    return {role:"admin", papel:"administrador"};
  }
  return {role:"professor", papel:"professor", escola, turma, serie:serieDaTurma(turma)};
}

async function salvarPerfilUsuarioFirestore({uid, nome, email, papel, escola, turma}){
  const db = await obterFirestoreDashboard();
  const dados = {
    uid,
    nome,
    email,
    papel,
    ativo:true,
    ambiente:"emulador",
    observacao:"Usuário criado pelo cadastro administrativo local do Trilha da Leitura.",
    atualizadoEmFirebase:firebase.firestore.FieldValue.serverTimestamp()
  };
  if(papel === "professor"){
    dados.escola = escola;
    dados.turma = turma;
    dados.serie = serieDaTurma(turma);
  }
  await db.collection("usuarios").doc(uid).set(dados, {merge:true});
}

function atualizarStatusCadastroAcesso(mensagem){
  const status = document.getElementById("adminCadastroAcessoStatus");
  if(status) status.textContent = mensagem;
}

function mensagemErroAuth(error){
  const mensagem = String(error && error.message ? error.message : error || "");
  if(mensagem.includes("EMAIL_EXISTS")) return "Este e-mail já existe nos acessos do Trilha da Leitura.";
  if(mensagem.includes("INVALID_EMAIL")) return "O e-mail informado não é válido.";
  if(mensagem.includes("WEAK_PASSWORD")) return "A senha precisa ter pelo menos 6 caracteres.";
  return mensagem;
}

async function carregarAlunosCadastrados(){
  try{
    const db = await obterFirestoreDashboard();
    if(unsubscribeAlunos) unsubscribeAlunos();
    let consulta = db.collection("alunos");
    if(!vinculoUsuario.administrador){
      consulta = consulta
        .where("professoresPermitidos", "array-contains", vinculoUsuario.uid)
        .where("escola", "==", vinculoUsuario.escola)
        .where("turma", "==", vinculoUsuario.turma);
    }
    unsubscribeAlunos = consulta.onSnapshot(snapshot => {
      alunosCadastrados = snapshot.docs.map(doc => ({id:doc.id, ...doc.data()}));
      alunosCadastrados.sort((a,b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {sensitivity:"base"}));
      aplicarFiltros();
    }, error => {
      atualizarStatusCadastroAluno(`Não foi possível carregar alunos cadastrados. ${error.message || ""}`);
    });
  }catch(error){
    atualizarStatusCadastroAluno(`Não foi possível conectar ao cadastro de alunos. ${error.message || ""}`);
  }
}

async function cadastrarAlunoDashboard(event){
  event.preventDefault();
  const campoNome = document.getElementById("cadastroAlunoNome");
  const nome = String(campoNome?.value || "").trim().replace(/\s+/g, " ");
  if(!nome){
    atualizarStatusCadastroAluno("Informe o nome do aluno.");
    if(campoNome) campoNome.focus();
    return;
  }

  const contexto = contextoCadastroAluno();
  if(!contexto.escola || !contexto.turma){
    atualizarStatusCadastroAluno("Selecione ou verifique a escola e a turma antes de cadastrar.");
    return;
  }

  try{
    const db = await obterFirestoreDashboard();
    const id = `aluno-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    await db.collection("alunos").doc(id).set({
      id,
      nome,
      escola:contexto.escola,
      serie:serieDaTurma(contexto.turma),
      turma:contexto.turma,
      professorUid:vinculoUsuario.uid,
      professorEmail:vinculoUsuario.email,
      professoresPermitidos:vinculoUsuario.uid ? [vinculoUsuario.uid] : [],
      ativo:true,
      criadoEm:firebase.firestore.FieldValue.serverTimestamp(),
      atualizadoEm:firebase.firestore.FieldValue.serverTimestamp()
    });
    campoNome.value = "";
    atualizarStatusCadastroAluno(`${nome} foi cadastrado(a) em ${contexto.escola} - ${contexto.turma}.`);
  }catch(error){
    atualizarStatusCadastroAluno(`Não foi possível cadastrar o aluno. ${error.message || ""}`);
  }
}

function contextoCadastroAluno(){
  if(vinculoUsuario.administrador){
    return {
      escola: document.getElementById("filtroEscola")?.value || "",
      turma: document.getElementById("filtroTurma")?.value || ""
    };
  }
  return {escola:vinculoUsuario.escola, turma:vinculoUsuario.turma};
}

function atualizarTotalAlunosCadastrados(){
  const total = document.getElementById("totalAlunosCadastrados");
  if(!total) return;
  const alunosVisiveis = alunosDaTurmaFiltrada();
  total.textContent = `${alunosVisiveis.length} aluno(s) cadastrado(s)`;
  configurarCadastroAlunos();
}

function atualizarStatusCadastroAluno(mensagem){
  const status = document.getElementById("cadastroAlunoStatus");
  if(status) status.textContent = mensagem;
}

function filtrosAtivosDashboard(){
  return {
    escola: document.getElementById("filtroEscola")?.value || "",
    turma: document.getElementById("filtroTurma")?.value || "",
    perfil: document.getElementById("filtroPerfil")?.value || "",
    busca: normalizar(document.getElementById("filtroBusca")?.value || "")
  };
}

function alunosDaTurmaFiltrada(){
  const {escola, turma, busca} = filtrosAtivosDashboard();
  const mapa = new Map();

  [...todosResultados, ...alunosCadastrados].forEach(item => {
    const escolaItem = escolaMaiuscula(item.escola);
    const turmaItem = item.turma || "";
    const nomeItem = item.nome || "";
    const escolaOk = !escola || escolaItem === escola;
    const turmaOk = !turma || turmaItem === turma;
    const buscaOk = !busca || normalizar(nomeItem).includes(busca);
    if(!escolaOk || !turmaOk || !buscaOk || !nomeItem) return;

    const chave = alunoChave(item);
    const existente = mapa.get(chave) || {};
    mapa.set(chave, {
      ...existente,
      id:item.id || existente.id || chave,
      nome:nomeItem,
      escola:escolaItem,
      turma:turmaItem,
      professorUid:item.professorUid || existente.professorUid || "",
      professorEmail:item.professorEmail || existente.professorEmail || "",
      temAvaliacao: Boolean(existente.temAvaliacao || item.perfil || item.salvoEm || item.data)
    });
  });

  return [...mapa.values()].sort((a,b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {sensitivity:"base"}));
}

function alunoChave(item){
  return [
    escolaMaiuscula(item.escola),
    String(item.turma || "").trim(),
    normalizar(item.nome || "")
  ].join("|");
}

function ordenarTabela(campo){
  if(ordenacaoTabela.campo === campo){
    ordenacaoTabela.direcao = ordenacaoTabela.direcao === "asc" ? "desc" : "asc";
  }else{
    ordenacaoTabela.campo = campo;
    ordenacaoTabela.direcao = campo === "data" || campo === "salvoEm" ? "desc" : "asc";
  }
  ordenarResultadosFiltrados();
  renderizarTabela();
}

function ordenarResultadosFiltrados(){
  const {campo, direcao} = ordenacaoTabela;
  const fator = direcao === "asc" ? 1 : -1;
  resultadosFiltrados.sort((a,b) => compararCampo(a, b, campo) * fator);
}

function compararCampo(a, b, campo){
  if(["palavrasCorretas","dificeisCorretas","total","palavrasTextoCorretas","precisao","compreensao","tempoTotalSegundos"].includes(campo)){
    return numero(valorCampo(a, campo)) - numero(valorCampo(b, campo));
  }
  if(campo === "data" || campo === "salvoEm"){
    return dataOrdenacao(a) - dataOrdenacao(b);
  }
  return String(valorCampo(a, campo) || "").localeCompare(String(valorCampo(b, campo) || ""), "pt-BR", {numeric:true, sensitivity:"base"});
}

function valorCampo(item, campo){
  if(campo === "escola") return escolaMaiuscula(item.escola);
  if(campo === "tempoTotalSegundos") return item.tempoTotalSegundos || segundosDoTempo(item.tempoTotal);
  if(campo === "palavrasTextoCorretas") return palavrasTextoTabela(item);
  return item[campo];
}

function dataOrdenacao(item){
  const iso = Date.parse(item.salvoEm || "");
  if(Number.isFinite(iso)) return iso;
  const partes = String(item.data || "").match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/);
  if(!partes) return 0;
  return new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]), Number(partes[4]), Number(partes[5]), Number(partes[6])).getTime();
}

function segundosDoTempo(valor){
  const texto = String(valor || "");
  const minutos = Number((texto.match(/(\d+)\s*min/) || [0,0])[1]);
  const segundos = Number((texto.match(/(\d+)\s*s/) || [0,0])[1]);
  return minutos * 60 + segundos;
}

function renderizarIndicadores(){
  if(!document.getElementById("totalAvaliacoes")) return;
  const total = alunosDaTurmaFiltrada().length;
  const mediaPrecisao = media(resultadosFiltrados.map(item => numero(item.precisao)));
  const mediaPalavras = media(resultadosFiltrados.map(item => numero(palavrasTextoTabela(item))));
  const mediaComp = media(resultadosFiltrados.map(item => numero(item.compreensao)));

  document.getElementById("totalAvaliacoes").textContent = total;
  document.getElementById("mediaPrecisao").textContent = `${Math.round(mediaPrecisao)}%`;
  document.getElementById("mediaPalavras").textContent = Math.round(mediaPalavras);
  document.getElementById("mediaCompreensao").textContent = `${mediaComp.toFixed(1)}/2`;
}

function renderizarPerfil(){
  if(!document.getElementById("perfilDonut")) return;
  const resultadosNoEscopo = resultadosFiltradosSemPerfil();
  const naoAnalisados = alunosSemAvaliacaoFiltrados().length;
  const totalReal = resultadosNoEscopo.length + naoAnalisados;
  const total = Math.max(totalReal, 1);
  const contagem = {
    "Pré-leitor": resultadosNoEscopo.filter(item => String(item.perfil || "").includes("Pré-leitor")).length,
    "Leitor Iniciante": resultadosNoEscopo.filter(item => String(item.perfil || "").includes("Iniciante")).length,
    "Leitor Fluente": resultadosNoEscopo.filter(item => String(item.perfil || "").includes("Fluente")).length,
    "Não Analisado": naoAnalisados
  };
  const pre = contagem["Pré-leitor"] / total * 100;
  const iniciante = contagem["Leitor Iniciante"] / total * 100;
  const fluente = contagem["Leitor Fluente"] / total * 100;
  const analisadoFim = pre + iniciante + fluente;
  const donut = document.getElementById("perfilDonut");
  donut.style.background = totalReal
    ? `conic-gradient(#ef4444 0 ${pre}%, #facc15 ${pre}% ${pre + iniciante}%, #22c55e ${pre + iniciante}% ${analisadoFim}%, #94a3b8 ${analisadoFim}% 100%)`
    : "conic-gradient(#e2e8f0 0 100%)";

  document.getElementById("perfilResumo").textContent = `${totalReal} aluno(s)`;
  document.getElementById("perfilLegenda").innerHTML = [
    ["Pré-leitor", contagem["Pré-leitor"], "#ef4444"],
    ["Leitor Iniciante", contagem["Leitor Iniciante"], "#facc15"],
    ["Leitor Fluente", contagem["Leitor Fluente"], "#22c55e"],
    ["Não Analisado", contagem["Não Analisado"], "#94a3b8"]
  ].map(([nome, valor, cor]) => `
    <div class="legend-item">
      <span><i class="dot" style="background:${cor}"></i>${nome}</span>
      <span>${valor}</span>
    </div>
  `).join("");
}

function renderizarTurmas(){
  const alvo = document.getElementById("graficoTurmas");
  if(!alvo) return;
  const contagem = {};
  alunosDaTurmaFiltrada().forEach(item => {
    const turma = item.turma || "Sem turma";
    contagem[turma] = (contagem[turma] || 0) + 1;
  });
  const linhas = Object.entries(contagem).sort((a,b) => b[1] - a[1]);
  const max = Math.max(...linhas.map(([,valor]) => valor), 1);

  if(!linhas.length){
    alvo.innerHTML = `<div class="empty">Sem dados para os filtros atuais.</div>`;
    return;
  }

  alvo.innerHTML = linhas.map(([turma, valor]) => `
    <div class="bar-row">
      <span>${escapeHtml(turma)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${valor / max * 100}%"></div></div>
      <span>${valor}</span>
    </div>
  `).join("");
}

function renderizarTabela(){
  const corpo = document.getElementById("tabelaResultados");
  if(!corpo) return;
  atualizarCabecalhosOrdenacao();
  const linhas = linhasTabelaComAlunosCadastrados();
  if(!linhas.length){
    corpo.innerHTML = `<tr><td colspan="13">Nenhum resultado encontrado.</td></tr>`;
    return;
  }

  corpo.innerHTML = linhas.map(item => `
    <tr class="${item.semAvaliacao ? "student-without-result" : ""}">
      <td>${escapeHtml(item.data || "")}</td>
      <td>${escapeHtml(item.nome || "")}</td>
      <td>${escapeHtml(escolaMaiuscula(item.escola))}</td>
      <td>${escapeHtml(item.turma || "")}</td>
      <td>${valorTabelaResultado(item, "palavrasCorretas")}</td>
      <td>${valorTabelaResultado(item, "dificeisCorretas")}</td>
      <td>${valorTabelaResultado(item, "total")}</td>
      <td>${item.semAvaliacao ? "-" : numero(palavrasTextoTabela(item))}</td>
      <td>${item.semAvaliacao ? "-" : `${numero(item.precisao)}%`}</td>
      <td>${item.semAvaliacao ? "-" : `${numero(item.compreensao)}/2`}</td>
      <td>${escapeHtml(item.tempoTotal || "")}</td>
      <td>${escapeHtml(item.perfil || "")}</td>
      <td>${item.semAvaliacao ? `<button type="button" class="delete-btn" onclick="excluirAlunoCadastro('${escapeJs(item.id)}')">Excluir</button>` : `<button type="button" class="delete-btn" onclick="excluirResultado('${escapeJs(item.id)}')">Excluir</button>`}</td>
    </tr>
  `).join("");
}

function linhasTabelaComAlunosCadastrados(){
  const {perfil} = filtrosAtivosDashboard();
  const semAvaliacao = alunosSemAvaliacaoFiltrados().map(linhaAlunoSemAvaliacao);
  if(perfil === "Não Analisado") return ordenarLinhasTabela(semAvaliacao);
  if(perfil) return ordenarLinhasTabela(resultadosFiltrados);
  return ordenarLinhasTabela([...resultadosFiltrados, ...semAvaliacao]);
}

function ordenarLinhasTabela(linhas){
  const {campo, direcao} = ordenacaoTabela;
  const fator = direcao === "asc" ? 1 : -1;
  return [...linhas].sort((a,b) => compararCampo(a, b, campo) * fator);
}

function alunosSemAvaliacaoFiltrados(){
  const avaliados = new Set(resultadosFiltradosSemPerfil().map(alunoChave));
  return alunosDaTurmaFiltrada().filter(aluno => !avaliados.has(alunoChave(aluno)));
}

function resultadosFiltradosSemPerfil(){
  const {escola, turma, busca} = filtrosAtivosDashboard();
  return todosResultados.filter(item => {
    const escolaOk = !escola || escolaMaiuscula(item.escola) === escola;
    const turmaOk = !turma || item.turma === turma;
    const buscaOk = !busca || normalizar(item.nome || "").includes(busca);
    return escolaOk && turmaOk && buscaOk;
  });
}

function linhaAlunoSemAvaliacao(aluno){
  return {
    id: aluno.id,
    data: "Sem avaliação",
    nome: aluno.nome,
    escola: aluno.escola,
    turma: aluno.turma,
    palavrasCorretas: "",
    dificeisCorretas: "",
    palavrasTextoCorretas: "",
    total: "",
    precisao: "",
    compreensao: "",
    tempoTotal: "-",
    perfil: "Não Analisado",
    semAvaliacao: true
  };
}

function valorTabelaResultado(item, campo){
  return item.semAvaliacao ? "-" : numero(item[campo]);
}

async function excluirAlunoCadastro(id){
  if(!window.TrilhaAuth || !await window.TrilhaAuth.currentUser()){
    atualizarStatus("Faça login para excluir alunos cadastrados.");
    alert("Faça login para excluir alunos cadastrados.");
    return;
  }

  const aluno = alunosCadastrados.find(item => item.id === id);
  const nome = aluno && aluno.nome ? ` de ${aluno.nome}` : "";
  const confirmar = window.confirm(`Deseja excluir definitivamente o cadastro${nome}?`);
  if(!confirmar) return;

  try{
    const db = await obterFirestoreDashboard();
    await db.collection("alunos").doc(id).delete();
    atualizarStatusCadastroAluno("Aluno excluído do cadastro.");
  }catch(error){
    atualizarStatusCadastroAluno(`Erro ao excluir aluno: ${error.message || "verifique as permissões do acesso."}`);
    alert(`Não foi possível excluir o aluno. ${error.message || ""}`);
  }
}

async function excluirResultado(id){
  if(!window.TrilhaAuth || !await window.TrilhaAuth.currentUser()){
    atualizarStatus("Faça login para excluir resultados.");
    alert("Faça login para excluir resultados.");
    return;
  }

  const item = todosResultados.find(resultado => resultado.id === id);
  const nome = item && item.nome ? ` de ${item.nome}` : "";
  const confirmar = window.confirm(`Deseja excluir definitivamente este resultado${nome}?`);
  if(!confirmar) return;

  try{
    const db = await obterFirestoreDashboard();
    const colecao = window.trilhaFirestoreCollection || "resultadosAlunos";
    await db.collection(colecao).doc(id).delete();
    atualizarStatus("Resultado excluído.");
  }catch(error){
    atualizarStatus(`Erro ao excluir: ${error.message || "verifique as regras do Firestore."}`);
    alert(`Não foi possível excluir o resultado. ${error.message || ""}`);
  }
}

function atualizarCabecalhosOrdenacao(){
  if(!document.querySelector(".sort-btn")) return;
  document.querySelectorAll(".sort-btn").forEach(botao => {
    const ativo = botao.dataset.sort === ordenacaoTabela.campo || (botao.dataset.sort === "data" && ordenacaoTabela.campo === "salvoEm");
    botao.classList.toggle("active", ativo);
    botao.setAttribute("aria-sort", ativo ? (ordenacaoTabela.direcao === "asc" ? "ascending" : "descending") : "none");
    const icone = botao.querySelector("span");
    if(icone) icone.textContent = ativo ? (ordenacaoTabela.direcao === "asc" ? "A-Z" : "Z-A") : "↕";
    if(ativo && ["palavrasCorretas","dificeisCorretas","total","palavrasTextoCorretas","precisao","compreensao","tempoTotalSegundos","data","salvoEm"].includes(ordenacaoTabela.campo)){
      if(icone) icone.textContent = ordenacaoTabela.direcao === "asc" ? "1-9" : "9-1";
    }
  });
}

function exportarTabela(){
  if(!resultadosFiltrados.length) return;
  const cabecalho = ["Data","Aluno","Escola","Turma","Conhecidas","Difíceis","Listas","Texto","Precisão","Compreensão","Tempo","Perfil"];
  const linhas = resultadosFiltrados.map(item => [
    item.data || "",
    item.nome || "",
    escolaMaiuscula(item.escola),
    item.turma || "",
    numero(item.palavrasCorretas),
    numero(item.dificeisCorretas),
    numero(item.total),
    numero(palavrasTextoTabela(item)),
    `${numero(item.precisao)}%`,
    `${numero(item.compreensao)}/2`,
    item.tempoTotal || "",
    item.perfil || ""
  ]);
  const csv = [cabecalho, ...linhas].map(linha => linha.map(valor => `"${String(valor).replace(/"/g,'""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dashboard-trilha-da-leitura.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function media(valores){
  if(!valores.length) return 0;
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

function numero(valor){
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function palavrasTextoTabela(item){
  return item.palavrasTextoCorretas ?? item.palavrasTexto ?? item.total ?? 0;
}

function normalizar(valor){
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function escolaMaiuscula(valor){
  return String(valor || "").toLocaleUpperCase("pt-BR");
}

function serieDaTurma(turma){
  const texto = String(turma || "").trim();
  const numeroAno = texto.match(/^(\d+)/);
  return numeroAno ? `${numeroAno[1]}º Ano` : "";
}

function escapeHtml(valor){
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  })[caractere]);
}

function escapeJs(valor){
  return String(valor ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function atualizarStatus(mensagem){
  const status = document.getElementById("statusDashboard");
  if(status) status.textContent = mensagem;
}

preencherEscolas();
preencherTurmas();
carregarResultados();
