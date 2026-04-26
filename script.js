const palavrasConhecidas = [
  "casa","bola","mesa","pato","gato","vida","mala","faca","vaca","sapo",
  "dedo","boca","cama","rua","fogo","água","leite","peixe","porta","janela",
  "livro","lápis","escola","menino","menina","amigo","flor","terra","sol","lua",
  "chuva","vento","carro","barco","doce","fruta","banana","panela","roupa","sapato",
  "brinquedo","boneca","caderno","cadeira","árvore","praça","família","comida","cidade","caminho",
  "alegre","bonito","pequeno","grande","rápido","devagar","cantar","pular","brincar","sorrir"
];

const palavrasDificeis = [
  "abstrato","abundância","adversidade","ambiguidade","analfabeto","arquitetura","benevolente","circunstância","coerência","complexidade",
  "consequência","contemplar","contraditório","democracia","desenvolvimento","dignidade","disciplina","efervescente","emancipação","equilíbrio",
  "estratégia","extraordinário","fragilidade","generosidade","hipótese","identidade","imprevisível","inquietação","integridade","intermitente",
  "melancolia","necessidade","oportunidade","perseverança","perspectiva","precipício","responsabilidade","solidariedade","transparência","vulnerável"
];

const estado = {
  conhecidas:{tempo:60, intervalo:null, pausado:false, bar:"barConhecidas", label:"tempoConhecidas", botao:"pauseConhecidas"},
  dificeis:{tempo:60, intervalo:null, pausado:false, bar:"barDificeis", label:"tempoDificeis", botao:"pauseDificeis"}
};

let acertosCompreensao = 0;
let acaoConfirmada = null;
const circunferencia = 283;
const chaveBanco = "trilhaLeituraResultados";

function pagina(id){
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top:0, behavior:"smooth"});
}

function montarLista(lista, alvo, classeExtra){
  document.getElementById(alvo).innerHTML = lista.map(palavra => {
    return `<div class="word ${classeExtra || ""}">${palavra}</div>`;
  }).join("");
}

function iniciarTrilha(){
  const nome = document.getElementById("nomeAluno").value.trim();
  const turma = document.getElementById("turmaAluno").value.trim();
  if(!nome || !turma){
    const campo = !nome ? "nome do aluno" : "turma do aluno";
    mostrarModal("Atenção", `Preencha o ${campo} para iniciar.`);
    document.getElementById(!nome ? "nomeAluno" : "turmaAluno").focus();
    return;
  }
  montarLista(palavrasConhecidas, "listaConhecidas", "");
  pagina("conhecidas");
  iniciarTimer("conhecidas");
}

function iniciarTimer(tipo){
  const item = estado[tipo];
  clearInterval(item.intervalo);
  item.tempo = 60;
  item.pausado = false;
  atualizarBotaoPausa(tipo);
  atualizarTimerVisual(tipo);
  item.intervalo = setInterval(() => {
    if(item.pausado) return;
    item.tempo = Math.max(0, item.tempo - 1);
    atualizarTimerVisual(tipo);
    if(item.tempo === 0){
      clearInterval(item.intervalo);
      item.intervalo = null;
      mostrarModal("PARE", "");
    }
  }, 1000);
}

function atualizarTimerVisual(tipo){
  const item = estado[tipo];
  const tempo = Math.max(0, item.tempo);
  const barra = document.getElementById(item.bar);
  document.getElementById(item.label).textContent = tempo;
  barra.style.strokeDasharray = `${(tempo / 60) * circunferencia} ${circunferencia}`;
  barra.classList.remove("green","yellow","red");
  if(tempo <= 15){
    barra.classList.add("red");
  }else if(tempo <= 30){
    barra.classList.add("yellow");
  }else{
    barra.classList.add("green");
  }
}

function alternarPausa(tipo){
  const item = estado[tipo];
  if(item.tempo <= 0) return;
  item.pausado = !item.pausado;
  atualizarBotaoPausa(tipo);
}

function atualizarBotaoPausa(tipo){
  const item = estado[tipo];
  const botao = document.getElementById(item.botao);
  botao.textContent = item.pausado ? "Continuar" : "Pausar";
  botao.className = item.pausado ? "btn-continue" : "btn-pause";
}

function abrirDificeis(){
  clearInterval(estado.conhecidas.intervalo);
  montarLista(palavrasDificeis, "listaDificeis", "dificil");
  pagina("dificeis");
  iniciarTimer("dificeis");
}

function abrirTexto(){
  clearInterval(estado.dificeis.intervalo);
  pagina("texto");
}

function abrirResultado(){
  acertosCompreensao = calcularCompreensao();
  pagina("resultado");
  atualizarResultado();
}

function calcularCompreensao(){
  let total = 0;
  ["q1","q2"].forEach(nome => {
    const marcada = document.querySelector(`input[name="${nome}"]:checked`);
    if(marcada && marcada.value === "1") total += 1;
  });
  return total;
}

function atualizarResultado(){
  const corretas = limitarNumero(document.getElementById("palavrasCorretas").value, 0, 60);
  const dificeis = limitarNumero(document.getElementById("dificeisCorretas").value, 0, 40);
  const total = corretas + dificeis;
  const precisaoDigitada = document.getElementById("precisao").value.trim();
  const precisao = precisaoDigitada === "" ? limitarNumero(total, 0, 100) : limitarNumero(precisaoDigitada, 0, 100);
  const classificacao = classificarPerfil(corretas, dificeis, precisao);
  document.getElementById("resultadoFinal").innerHTML = `
    <div class="resultado-linha"><span>Perfil leitor</span><strong>${classificacao.perfil}</strong></div>
    <div class="resultado-linha"><span>Critério aplicado</span><strong>${classificacao.criterio}</strong></div>
    <div class="resultado-linha"><span>Palavras corretas</span><strong>${corretas}</strong></div>
    <div class="resultado-linha"><span>Palavras difíceis corretas</span><strong>${dificeis}</strong></div>
    <div class="resultado-linha"><span>Total de palavras</span><strong>${total}</strong></div>
    <div class="resultado-linha"><span>Precisão</span><strong>${precisao}%</strong></div>
    <div class="resultado-linha"><span>Compreensão</span><strong>${acertosCompreensao}/2</strong></div>
  `;
  return {corretas, dificeis, precisao, total, perfil:classificacao.perfil, criterio:classificacao.criterio};
}

function limitarNumero(valor, minimo, maximo){
  const numero = Number(valor);
  if(!Number.isFinite(numero)) return 0;
  return Math.min(maximo, Math.max(minimo, Math.round(numero)));
}

function classificarPerfil(conhecidasCorretas, dificeisCorretas, precisao){
  const total = conhecidasCorretas + dificeisCorretas;
  const observacao = document.getElementById("observacaoPreLeitor").value;

  if(total > 65 && precisao >= 90){
    return {
      perfil:"Leitor Fluente",
      criterio:"Mais de 65 palavras corretas no total e precisão igual ou superior a 90%."
    };
  }

  if(conhecidasCorretas >= 11 && dificeisCorretas >= 6){
    return {
      perfil:"Leitor Iniciante",
      criterio:"Leu 11 ou mais palavras conhecidas e 6 ou mais palavras possivelmente desconhecidas."
    };
  }

  const niveis = {
    nivel1:["Pré-leitor - Nível 1","Não realizou a leitura de palavras ou leu letras, sílabas ou palavras fora do item."],
    nivel2:["Pré-leitor - Nível 2","Nomeou letras isoladas ao tentar ler as palavras do item."],
    nivel3:["Pré-leitor - Nível 3","Silabou ao realizar a leitura das palavras do item."],
    nivel4:["Pré-leitor - Nível 4","Leu corretamente até 10 palavras conhecidas e até 5 palavras possivelmente desconhecidas."]
  };
  const chaveNivel = observacao === "auto" ? (conhecidasCorretas === 0 && dificeisCorretas === 0 ? "nivel1" : "nivel4") : observacao;
  return {perfil:niveis[chaveNivel][0], criterio:niveis[chaveNivel][1]};
}

function obterBanco(){
  try{
    return JSON.parse(localStorage.getItem(chaveBanco)) || [];
  }catch{
    return [];
  }
}

function salvarBanco(registros){
  localStorage.setItem(chaveBanco, JSON.stringify(registros));
}

function salvarResultado(){
  const nome = document.getElementById("nomeAluno").value.trim();
  const turma = document.getElementById("turmaAluno").value.trim();
  if(!nome || !turma){
    mostrarModal("Atenção", "Nome e turma são obrigatórios para salvar o resultado.");
    return;
  }

  const resultado = atualizarResultado();
  const registros = obterBanco();
  registros.push({
    data:new Date().toLocaleString("pt-BR"),
    nome,
    turma,
    palavrasCorretas:resultado.corretas,
    dificeisCorretas:resultado.dificeis,
    total:resultado.total,
    precisao:resultado.precisao,
    compreensao:acertosCompreensao,
    perfil:resultado.perfil,
    criterio:resultado.criterio
  });
  salvarBanco(registros);
  renderizarBanco();
  mostrarModal("Salvo", "Resultado salvo no banco local deste navegador.");
}

function renderizarBanco(){
  const corpo = document.getElementById("tabelaResultados");
  const registros = obterBanco();
  if(!registros.length){
    corpo.innerHTML = `<tr><td colspan="9">Nenhum resultado salvo ainda.</td></tr>`;
    return;
  }
  corpo.innerHTML = registros.slice().reverse().map(registro => `
    <tr>
      <td>${registro.data}</td>
      <td>${registro.nome}</td>
      <td>${registro.turma}</td>
      <td>${registro.palavrasCorretas}</td>
      <td>${registro.dificeisCorretas}</td>
      <td>${registro.total}</td>
      <td>${registro.precisao}%</td>
      <td>${registro.compreensao}/2</td>
      <td>${registro.perfil}</td>
    </tr>
  `).join("");
}

function exportarCSV(){
  const registros = obterBanco();
  if(!registros.length){
    mostrarModal("Atenção", "Não há resultados salvos para exportar.");
    return;
  }
  const cabecalho = ["Data","Aluno","Turma","Conhecidas","Difíceis","Total","Precisão","Compreensão","Perfil","Critério"];
  const linhas = registros.map(registro => [
    registro.data,
    registro.nome,
    registro.turma,
    registro.palavrasCorretas,
    registro.dificeisCorretas,
    registro.total,
    `${registro.precisao}%`,
    `${registro.compreensao}/2`,
    registro.perfil,
    registro.criterio
  ]);
  const csv = [cabecalho, ...linhas].map(linha => linha.map(valor => `"${String(valor).replace(/"/g,'""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resultados-trilha-da-leitura.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function limparBanco(){
  mostrarConfirmacao("Atenção", "Apagar todos os resultados salvos neste navegador?", () => {
    localStorage.removeItem(chaveBanco);
    renderizarBanco();
  });
}

function novoAluno(){
  document.getElementById("nomeAluno").value = "";
  document.getElementById("turmaAluno").value = "";
  document.getElementById("palavrasCorretas").value = "";
  document.getElementById("dificeisCorretas").value = "";
  document.getElementById("precisao").value = "";
  document.getElementById("observacaoPreLeitor").value = "auto";
  document.querySelectorAll('input[type="radio"]').forEach(input => input.checked = false);
  acertosCompreensao = 0;
  atualizarResultado();
  pagina("inicio");
}

function mostrarModal(titulo, mensagem){
  acaoConfirmada = null;
  document.getElementById("tituloModal").textContent = titulo;
  document.getElementById("mensagemModal").textContent = mensagem;
  document.getElementById("cancelarModal").style.display = "none";
  document.getElementById("confirmarModal").textContent = "OK";
  document.getElementById("alertaModal").classList.add("show");
}

function mostrarConfirmacao(titulo, mensagem, acao){
  acaoConfirmada = acao;
  document.getElementById("tituloModal").textContent = titulo;
  document.getElementById("mensagemModal").textContent = mensagem;
  document.getElementById("cancelarModal").style.display = "block";
  document.getElementById("confirmarModal").textContent = "Apagar";
  document.getElementById("alertaModal").classList.add("show");
}

function confirmarModal(){
  const acao = acaoConfirmada;
  fecharModal();
  if(acao) acao();
}

function fecharModal(){
  acaoConfirmada = null;
  document.getElementById("alertaModal").classList.remove("show");
}

montarLista(palavrasConhecidas, "listaConhecidas", "");
montarLista(palavrasDificeis, "listaDificeis", "dificil");
atualizarResultado();
renderizarBanco();
