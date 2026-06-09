let todosResultados = [];
let resultadosFiltrados = [];
let unsubscribeResultados = null;
let ordenacaoTabela = {campo:"salvoEm", direcao:"desc"};
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
    throw new Error("Firebase não carregado.");
  }
  if(!firebase.apps.length){
    firebase.initializeApp(window.firebaseConfig);
  }
  return firebase.firestore();
}

async function carregarResultados(){
  const tabela = document.getElementById("tabelaResultados");
  tabela.innerHTML = `<tr><td colspan="12">Carregando resultados...</td></tr>`;
  preencherEscolas();
  preencherTurmas();
  atualizarStatus("Conectando ao Firebase...");

  try{
    const db = await obterFirestoreDashboard();
    const colecao = window.trilhaFirestoreCollection || "resultadosAlunos";
    if(unsubscribeResultados) unsubscribeResultados();
    unsubscribeResultados = db.collection(colecao).onSnapshot(snapshot => {
      todosResultados = snapshot.docs.map(doc => ({id:doc.id, ...doc.data()}));
      todosResultados.sort((a,b) => new Date(b.salvoEm || b.data || 0) - new Date(a.salvoEm || a.data || 0));
      preencherEscolas();
      preencherTurmas();
      aplicarFiltros();
      atualizarStatus(`${todosResultados.length} resultado(s) carregado(s) do Firebase.`);
    }, error => {
      atualizarStatus(`Erro ao ler Firebase: ${error.message || "verifique regras do Firestore."}`);
      tabela.innerHTML = `<tr><td colspan="12">Não foi possível carregar os dados. ${escapeHtml(error.message || "")}</td></tr>`;
    });
  }catch(error){
    preencherEscolas();
    preencherTurmas();
    atualizarStatus(`Erro ao conectar: ${error.message || "Firebase não carregado."}`);
    tabela.innerHTML = `<tr><td colspan="12">Não foi possível carregar os dados. ${escapeHtml(error.message || "")}</td></tr>`;
  }
}

function preencherEscolas(){
  const select = document.getElementById("filtroEscola");
  const atual = select.value;
  const escolas = [...new Set([...escolasPadrao, ...todosResultados.map(item => escolaMaiuscula(item.escola)).filter(Boolean)])].sort((a,b) => a.localeCompare(b));
  select.innerHTML = `<option value="">Todas</option>` + escolas.map(escola => `<option value="${escapeHtml(escola)}">${escapeHtml(escola)}</option>`).join("");
  select.value = escolas.includes(atual) ? atual : "";
}

function preencherTurmas(){
  const select = document.getElementById("filtroTurma");
  const atual = select.value;
  const turmas = [...new Set([...turmasPadrao, ...todosResultados.map(item => item.turma).filter(Boolean)])].sort((a,b) => a.localeCompare(b));
  select.innerHTML = `<option value="">Todas</option>` + turmas.map(turma => `<option value="${escapeHtml(turma)}">${escapeHtml(turma)}</option>`).join("");
  select.value = turmas.includes(atual) ? atual : "";
}

function aplicarFiltros(){
  const escola = document.getElementById("filtroEscola").value;
  const turma = document.getElementById("filtroTurma").value;
  const perfil = document.getElementById("filtroPerfil").value;
  const busca = normalizar(document.getElementById("filtroBusca").value);

  resultadosFiltrados = todosResultados.filter(item => {
    const escolaOk = !escola || escolaMaiuscula(item.escola) === escola;
    const turmaOk = !turma || item.turma === turma;
    const perfilOk = !perfil || String(item.perfil || "").includes(perfil);
    const buscaOk = !busca || normalizar(item.nome || "").includes(busca);
    return escolaOk && turmaOk && perfilOk && buscaOk;
  });

  ordenarResultadosFiltrados();
  renderizarIndicadores();
  renderizarPerfil();
  renderizarTurmas();
  renderizarTabela();
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
  if(["palavrasCorretas","dificeisCorretas","total","precisao","compreensao","tempoTotalSegundos"].includes(campo)){
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
  const total = resultadosFiltrados.length;
  const mediaPrecisao = media(resultadosFiltrados.map(item => numero(item.precisao)));
  const mediaPalavras = media(resultadosFiltrados.map(item => numero(item.total)));
  const mediaComp = media(resultadosFiltrados.map(item => numero(item.compreensao)));

  document.getElementById("totalAvaliacoes").textContent = total;
  document.getElementById("mediaPrecisao").textContent = `${Math.round(mediaPrecisao)}%`;
  document.getElementById("mediaPalavras").textContent = Math.round(mediaPalavras);
  document.getElementById("mediaCompreensao").textContent = `${mediaComp.toFixed(1)}/2`;
}

function renderizarPerfil(){
  const total = Math.max(resultadosFiltrados.length, 1);
  const contagem = {
    "Pré-leitor": resultadosFiltrados.filter(item => String(item.perfil || "").includes("Pré-leitor")).length,
    "Leitor Iniciante": resultadosFiltrados.filter(item => String(item.perfil || "").includes("Iniciante")).length,
    "Leitor Fluente": resultadosFiltrados.filter(item => String(item.perfil || "").includes("Fluente")).length
  };
  const pre = contagem["Pré-leitor"] / total * 100;
  const iniciante = contagem["Leitor Iniciante"] / total * 100;
  const fluente = contagem["Leitor Fluente"] / total * 100;
  const donut = document.getElementById("perfilDonut");
  donut.style.background = `conic-gradient(#ef4444 0 ${pre}%, #facc15 ${pre}% ${pre + iniciante}%, #22c55e ${pre + iniciante}% ${pre + iniciante + fluente}%)`;

  document.getElementById("perfilResumo").textContent = `${resultadosFiltrados.length} registros`;
  document.getElementById("perfilLegenda").innerHTML = [
    ["Pré-leitor", contagem["Pré-leitor"], "#ef4444"],
    ["Leitor Iniciante", contagem["Leitor Iniciante"], "#facc15"],
    ["Leitor Fluente", contagem["Leitor Fluente"], "#22c55e"]
  ].map(([nome, valor, cor]) => `
    <div class="legend-item">
      <span><i class="dot" style="background:${cor}"></i>${nome}</span>
      <span>${valor}</span>
    </div>
  `).join("");
}

function renderizarTurmas(){
  const alvo = document.getElementById("graficoTurmas");
  const contagem = {};
  resultadosFiltrados.forEach(item => {
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
  atualizarCabecalhosOrdenacao();
  if(!resultadosFiltrados.length){
    corpo.innerHTML = `<tr><td colspan="12">Nenhum resultado encontrado.</td></tr>`;
    return;
  }

  corpo.innerHTML = resultadosFiltrados.map(item => `
    <tr>
      <td>${escapeHtml(item.data || "")}</td>
      <td>${escapeHtml(item.nome || "")}</td>
      <td>${escapeHtml(escolaMaiuscula(item.escola))}</td>
      <td>${escapeHtml(item.turma || "")}</td>
      <td>${numero(item.palavrasCorretas)}</td>
      <td>${numero(item.dificeisCorretas)}</td>
      <td>${numero(item.total)}</td>
      <td>${numero(item.precisao)}%</td>
      <td>${numero(item.compreensao)}/2</td>
      <td>${escapeHtml(item.tempoTotal || "")}</td>
      <td>${escapeHtml(item.perfil || "")}</td>
      <td><button type="button" class="delete-btn" onclick="excluirResultado('${escapeJs(item.id)}')">Excluir</button></td>
    </tr>
  `).join("");
}

async function excluirResultado(id){
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
  document.querySelectorAll(".sort-btn").forEach(botao => {
    const ativo = botao.dataset.sort === ordenacaoTabela.campo || (botao.dataset.sort === "data" && ordenacaoTabela.campo === "salvoEm");
    botao.classList.toggle("active", ativo);
    botao.setAttribute("aria-sort", ativo ? (ordenacaoTabela.direcao === "asc" ? "ascending" : "descending") : "none");
    const icone = botao.querySelector("span");
    if(icone) icone.textContent = ativo ? (ordenacaoTabela.direcao === "asc" ? "A-Z" : "Z-A") : "↕";
    if(ativo && ["palavrasCorretas","dificeisCorretas","total","precisao","compreensao","tempoTotalSegundos","data","salvoEm"].includes(ordenacaoTabela.campo)){
      if(icone) icone.textContent = ordenacaoTabela.direcao === "asc" ? "1-9" : "9-1";
    }
  });
}

function exportarTabela(){
  if(!resultadosFiltrados.length) return;
  const cabecalho = ["Data","Aluno","Escola","Turma","Conhecidas","Difíceis","Total","Precisão","Compreensão","Tempo","Perfil"];
  const linhas = resultadosFiltrados.map(item => [
    item.data || "",
    item.nome || "",
    escolaMaiuscula(item.escola),
    item.turma || "",
    numero(item.palavrasCorretas),
    numero(item.dificeisCorretas),
    numero(item.total),
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

function normalizar(valor){
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function escolaMaiuscula(valor){
  return String(valor || "").toLocaleUpperCase("pt-BR");
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
