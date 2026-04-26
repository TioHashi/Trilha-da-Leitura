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
  conhecidas:{tempo:60, gasto:0, intervalo:null, pausado:false, bar:"barConhecidas", spark:"sparkConhecidas", label:"tempoConhecidas", botao:"pauseConhecidas", lista:"listaConhecidas"},
  dificeis:{tempo:60, gasto:0, intervalo:null, pausado:false, bar:"barDificeis", spark:"sparkDificeis", label:"tempoDificeis", botao:"pauseDificeis", lista:"listaDificeis"}
};

let acertosCompreensao = 0;
let acaoConfirmada = null;
let registroAtualId = null;
let resultadoSalvo = false;
const circunferencia = 283;

function pagina(id){
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top:0, behavior:"smooth"});
  ajustarGrades();
}

function montarLista(lista, alvo, classeExtra){
  document.getElementById(alvo).innerHTML = lista.map(palavra => {
    return `<div class="word ${classeExtra || ""}">${palavra}</div>`;
  }).join("");
}

function iniciarTrilha(){
  const nome = document.getElementById("nomeAluno").value.trim();
  const escola = escolaMaiuscula(document.getElementById("escolaAluno").value.trim());
  const turma = document.getElementById("turmaAluno").value.trim();
  if(!escola || !turma || !nome){
    const campo = !escola ? "escola do aluno" : (!turma ? "turma do aluno" : "nome do aluno");
    mostrarModal("Atenção", `Preencha o ${campo} para iniciar.`);
    document.getElementById(!escola ? "escolaAluno" : (!turma ? "turmaAluno" : "nomeAluno")).focus();
    return;
  }
  registroAtualId = criarIdRegistro();
  resultadoSalvo = false;
  estado.conhecidas.gasto = 0;
  estado.dificeis.gasto = 0;
  montarLista(palavrasConhecidas, "listaConhecidas", "");
  pagina("conhecidas");
  iniciarTimer("conhecidas");
}

function iniciarTimer(tipo){
  const item = estado[tipo];
  clearInterval(item.intervalo);
  item.tempo = 60;
  item.gasto = 0;
  item.pausado = false;
  atualizarBotaoPausa(tipo);
  atualizarTimerVisual(tipo);
  item.intervalo = setInterval(() => {
    if(item.pausado) return;
    item.tempo = Math.max(0, item.tempo - 1);
    item.gasto = 60 - item.tempo;
    atualizarTimerVisual(tipo);
    if(item.tempo === 0){
      clearInterval(item.intervalo);
      item.intervalo = null;
      item.gasto = 60;
      mostrarModal("PARE", "");
    }
  }, 1000);
}

function atualizarTimerVisual(tipo){
  const item = estado[tipo];
  const tempo = Math.max(0, item.tempo);
  const barra = document.getElementById(item.bar);
  const faisca = document.getElementById(item.spark);
  document.getElementById(item.label).textContent = tempo;
  barra.style.strokeDasharray = `${(tempo / 60) * circunferencia} ${circunferencia}`;
  if(faisca){
    const angulo = -90 + ((60 - tempo) / 60) * 360;
    faisca.style.setProperty("--fuse-angle", `${angulo}deg`);
  }
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
  resultadoSalvo = false;
  finalizarTempo("conhecidas");
  montarLista(palavrasDificeis, "listaDificeis", "dificil");
  pagina("dificeis");
  iniciarTimer("dificeis");
}

function abrirTexto(){
  resultadoSalvo = false;
  finalizarTempo("dificeis");
  pagina("texto");
}

function abrirResultado(){
  acertosCompreensao = calcularCompreensao();
  resultadoSalvo = false;
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
    <div class="resultado-linha"><span>Tempo nas palavras conhecidas</span><strong>${formatarTempo(estado.conhecidas.gasto)}</strong></div>
    <div class="resultado-linha"><span>Tempo nas palavras difíceis</span><strong>${formatarTempo(estado.dificeis.gasto)}</strong></div>
  `;
  return {corretas, dificeis, precisao, total, perfil:classificacao.perfil, criterio:classificacao.criterio};
}

function marcarResultadoAlterado(){
  resultadoSalvo = false;
  atualizarResultado();
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

async function salvarResultado(silencioso){
  try{
    const nome = document.getElementById("nomeAluno").value.trim();
    const escola = escolaMaiuscula(document.getElementById("escolaAluno").value.trim());
    const turma = document.getElementById("turmaAluno").value.trim();
    const palavrasValor = document.getElementById("palavrasCorretas").value.trim();
    const dificeisValor = document.getElementById("dificeisCorretas").value.trim();
    const precisaoValor = document.getElementById("precisao").value.trim();
    const q1Respondida = Boolean(document.querySelector('input[name="q1"]:checked'));
    const q2Respondida = Boolean(document.querySelector('input[name="q2"]:checked'));
    const estaNoResultado = document.getElementById("resultado").classList.contains("active");
    if(!escola || !turma || !nome){
      if(!silencioso) mostrarModal("Atenção", "Escola, turma e nome são obrigatórios para salvar o resultado.");
      return false;
    }
    if(!estaNoResultado){
      if(!silencioso) mostrarModal("Atenção", "Conclua a trilha até a página de resultado antes de salvar.");
      return false;
    }
    if(!q1Respondida || !q2Respondida){
      if(!silencioso) mostrarModal("Atenção", "Responda as duas perguntas de compreensão antes de salvar.");
      return false;
    }
    if(palavrasValor === "" || dificeisValor === "" || precisaoValor === ""){
      if(!silencioso) mostrarModal("Atenção", "Preencha Palavras corretas, Palavras difíceis corretas e Precisão (%) antes de salvar.");
      return false;
    }

    const resultado = atualizarResultado();
    if(resultado.total === 0 && resultado.precisao === 0 && acertosCompreensao === 0){
      if(!silencioso) mostrarModal("Atenção", "Preencha o resultado do aluno antes de salvar.");
      return false;
    }
    if(!registroAtualId) registroAtualId = criarIdRegistro();
    await TrilhaDB.salvar({
      id:registroAtualId,
      salvoEm:new Date().toISOString(),
      data:new Date().toLocaleString("pt-BR"),
      nome,
      escola,
      turma,
      palavrasCorretas:resultado.corretas,
      dificeisCorretas:resultado.dificeis,
      total:resultado.total,
      precisao:resultado.precisao,
      compreensao:acertosCompreensao,
      tempoConhecidasSegundos:estado.conhecidas.gasto,
      tempoDificeisSegundos:estado.dificeis.gasto,
      tempoTotalSegundos:estado.conhecidas.gasto + estado.dificeis.gasto,
      tempoConhecidas:formatarTempo(estado.conhecidas.gasto),
      tempoDificeis:formatarTempo(estado.dificeis.gasto),
      tempoTotal:formatarTempo(estado.conhecidas.gasto + estado.dificeis.gasto),
      perfil:resultado.perfil,
      criterio:resultado.criterio
    });
    resultadoSalvo = true;
    if(!silencioso) mostrarModal("Salvo", "Dados salvos.");
    return true;
  }catch(error){
    console.error("Erro ao salvar resultado:", error);
    if(!silencioso){
      mostrarModal("Erro", `Não foi possível salvar o resultado. ${error && error.message ? error.message : ""}`);
    }
    return false;
  }
}

async function novoAluno(){
  const estaNoResultado = document.getElementById("resultado").classList.contains("active");
  if(!estaNoResultado){
    mostrarConfirmacao(
      "Novo aluno",
      "A trilha atual não foi concluída. Deseja descartar esses dados e iniciar um novo aluno?",
      limparParaNovoAluno,
      "Descartar"
    );
    return;
  }

  if(resultadoSalvo){
    limparParaNovoAluno();
    return;
  }

  mostrarConfirmacao(
    "Novo aluno",
    "Os dados deste aluno ainda não foram salvos. Deseja salvar e iniciar um novo aluno?",
    async () => {
      const salvou = await salvarResultado(true);
      if(salvou) limparParaNovoAluno();
    },
    "Salvar e continuar"
  );
}

function limparParaNovoAluno(){
  registroAtualId = null;
  resultadoSalvo = false;
  document.getElementById("escolaAluno").value = "";
  document.getElementById("nomeAluno").value = "";
  document.getElementById("turmaAluno").value = "";
  document.getElementById("palavrasCorretas").value = "";
  document.getElementById("dificeisCorretas").value = "";
  document.getElementById("precisao").value = "";
  document.getElementById("observacaoPreLeitor").value = "auto";
  document.querySelectorAll('input[type="radio"]').forEach(input => input.checked = false);
  acertosCompreensao = 0;
  estado.conhecidas.gasto = 0;
  estado.dificeis.gasto = 0;
  clearInterval(estado.conhecidas.intervalo);
  clearInterval(estado.dificeis.intervalo);
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

function mostrarConfirmacao(titulo, mensagem, acao, textoConfirmar){
  acaoConfirmada = acao;
  document.getElementById("tituloModal").textContent = titulo;
  document.getElementById("mensagemModal").textContent = mensagem;
  document.getElementById("cancelarModal").style.display = "block";
  document.getElementById("confirmarModal").textContent = textoConfirmar || "Continuar";
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

function finalizarTempo(tipo){
  const item = estado[tipo];
  clearInterval(item.intervalo);
  item.intervalo = null;
  item.gasto = item.tempo <= 0 ? 60 : Math.min(60, Math.max(0, 60 - item.tempo));
}

function formatarTempo(segundos){
  const total = Math.min(120, Math.max(0, Math.round(segundos || 0)));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  if(minutos === 0) return `${resto}s`;
  return `${minutos}min ${String(resto).padStart(2,"0")}s`;
}

function criarIdRegistro(){
  return `avaliacao-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}

function escolaMaiuscula(valor){
  return String(valor || "").toLocaleUpperCase("pt-BR");
}

function ajustarGrades(){
  ajustarGrade("listaConhecidas");
  ajustarGrade("listaDificeis");
}

function ajustarGrade(id){
  const grade = document.getElementById(id);
  if(!grade || !grade.children.length || !grade.closest(".page.active")) return;

  const quantidade = grade.children.length;
  const largura = Math.max(grade.clientWidth, 1);
  const altura = Math.max(grade.clientHeight, 1);
  const palavras = Array.from(grade.children).map(item => item.textContent.trim());
  const maiorPalavra = Math.max(...palavras.map(palavra => palavra.length));
  const larguraMediaLetra = 0.58;
  let melhor = {colunas:1, fonte:7, gap:4};
  const maxColunas = Math.min(12, quantidade);

  for(let colunas = 2; colunas <= maxColunas; colunas += 1){
    const linhas = Math.ceil(quantidade / colunas);
    const gap = largura < 480 ? 4 : 6;
    const celulaLargura = (largura - gap * (colunas - 1)) / colunas;
    const celulaAltura = (altura - gap * (linhas - 1)) / linhas;
    const fontePorAltura = celulaAltura * 0.42;
    const fontePorLargura = (celulaLargura - 8) / (maiorPalavra * larguraMediaLetra);
    const fonte = Math.min(18, fontePorAltura, fontePorLargura);
    if(fonte > melhor.fonte){
      melhor = {colunas, fonte, gap};
    }
  }

  grade.style.setProperty("--word-cols", melhor.colunas);
  grade.style.setProperty("--word-font", `${Math.max(6.5, melhor.fonte).toFixed(2)}px`);
  grade.style.setProperty("--word-gap", `${melhor.gap}px`);
}

montarLista(palavrasConhecidas, "listaConhecidas", "");
montarLista(palavrasDificeis, "listaDificeis", "dificil");
atualizarResultado();
window.addEventListener("resize", ajustarGrades);
window.addEventListener("orientationchange", () => setTimeout(ajustarGrades, 250));
