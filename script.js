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
const circunferencia = 283;

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
  if(!nome){
    alert("Digite o nome do aluno para iniciar.");
    document.getElementById("nomeAluno").focus();
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
      mostrarPare();
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
  const precisao = limitarNumero(document.getElementById("precisao").value, 0, 100);
  const perfil = classificarPerfil(corretas, precisao);
  document.getElementById("resultadoFinal").innerHTML = `
    <div class="resultado-linha"><span>Perfil leitor</span><strong>${perfil}</strong></div>
    <div class="resultado-linha"><span>Palavras corretas</span><strong>${corretas}</strong></div>
    <div class="resultado-linha"><span>Palavras difíceis corretas</span><strong>${dificeis}</strong></div>
    <div class="resultado-linha"><span>Precisão</span><strong>${precisao}%</strong></div>
    <div class="resultado-linha"><span>Compreensão</span><strong>${acertosCompreensao}/2</strong></div>
  `;
}

function limitarNumero(valor, minimo, maximo){
  const numero = Number(valor);
  if(!Number.isFinite(numero)) return 0;
  return Math.min(maximo, Math.max(minimo, Math.round(numero)));
}

function classificarPerfil(palavras, precisao){
  if(palavras <= 10) return "Pré-leitor";
  if(palavras <= 65) return "Leitor Iniciante";
  if(palavras > 65 && precisao >= 90) return "Fluente";
  return "Leitor Iniciante";
}

function mostrarPare(){
  document.getElementById("alertaPare").classList.add("show");
}

function fecharPare(){
  document.getElementById("alertaPare").classList.remove("show");
}

montarLista(palavrasConhecidas, "listaConhecidas", "");
montarLista(palavrasDificeis, "listaDificeis", "dificil");
atualizarResultado();
