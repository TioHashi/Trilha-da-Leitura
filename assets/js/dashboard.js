let todosResultados = [];
let resultadosFiltrados = [];

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
  tabela.innerHTML = `<tr><td colspan="11">Carregando resultados...</td></tr>`;

  try{
    const db = await obterFirestoreDashboard();
    const colecao = window.trilhaFirestoreCollection || "resultadosAlunos";
    const snapshot = await db.collection(colecao).get();
    todosResultados = snapshot.docs.map(doc => ({id:doc.id, ...doc.data()}));
    todosResultados.sort((a,b) => new Date(b.salvoEm || b.data || 0) - new Date(a.salvoEm || a.data || 0));
    preencherEscolas();
    preencherTurmas();
    aplicarFiltros();
  }catch(error){
    tabela.innerHTML = `<tr><td colspan="11">Não foi possível carregar os dados. ${escapeHtml(error.message || "")}</td></tr>`;
  }
}

function preencherEscolas(){
  const select = document.getElementById("filtroEscola");
  const atual = select.value;
  const escolas = [...new Set(todosResultados.map(item => item.escola).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  select.innerHTML = `<option value="">Todas</option>` + escolas.map(escola => `<option value="${escapeHtml(escola)}">${escapeHtml(escola)}</option>`).join("");
  select.value = escolas.includes(atual) ? atual : "";
}

function preencherTurmas(){
  const select = document.getElementById("filtroTurma");
  const atual = select.value;
  const turmas = [...new Set(todosResultados.map(item => item.turma).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  select.innerHTML = `<option value="">Todas</option>` + turmas.map(turma => `<option value="${escapeHtml(turma)}">${escapeHtml(turma)}</option>`).join("");
  select.value = turmas.includes(atual) ? atual : "";
}

function aplicarFiltros(){
  const escola = document.getElementById("filtroEscola").value;
  const turma = document.getElementById("filtroTurma").value;
  const perfil = document.getElementById("filtroPerfil").value;
  const busca = normalizar(document.getElementById("filtroBusca").value);

  resultadosFiltrados = todosResultados.filter(item => {
    const escolaOk = !escola || item.escola === escola;
    const turmaOk = !turma || item.turma === turma;
    const perfilOk = !perfil || String(item.perfil || "").includes(perfil);
    const buscaOk = !busca || normalizar(item.nome || "").includes(busca);
    return escolaOk && turmaOk && perfilOk && buscaOk;
  });

  renderizarIndicadores();
  renderizarPerfil();
  renderizarTurmas();
  renderizarTabela();
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
  if(!resultadosFiltrados.length){
    corpo.innerHTML = `<tr><td colspan="11">Nenhum resultado encontrado.</td></tr>`;
    return;
  }

  corpo.innerHTML = resultadosFiltrados.map(item => `
    <tr>
      <td>${escapeHtml(item.data || "")}</td>
      <td>${escapeHtml(item.nome || "")}</td>
      <td>${escapeHtml(item.escola || "")}</td>
      <td>${escapeHtml(item.turma || "")}</td>
      <td>${numero(item.palavrasCorretas)}</td>
      <td>${numero(item.dificeisCorretas)}</td>
      <td>${numero(item.total)}</td>
      <td>${numero(item.precisao)}%</td>
      <td>${numero(item.compreensao)}/2</td>
      <td>${escapeHtml(item.tempoTotal || "")}</td>
      <td>${escapeHtml(item.perfil || "")}</td>
    </tr>
  `).join("");
}

function exportarTabela(){
  if(!resultadosFiltrados.length) return;
  const cabecalho = ["Data","Aluno","Escola","Turma","Conhecidas","Difíceis","Total","Precisão","Compreensão","Tempo","Perfil"];
  const linhas = resultadosFiltrados.map(item => [
    item.data || "",
    item.nome || "",
    item.escola || "",
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

function escapeHtml(valor){
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  })[caractere]);
}

carregarResultados();
