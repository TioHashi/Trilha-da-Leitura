export {};

type TipoListaTurma = "conhecidas" | "dificeis";
type FaseTurma = "preparando" | "rodando" | "intervalo";

const DURACAO_PALAVRA_SEGUNDOS = 1;
const ESPERA_TELA_ZERO_MS = 950;
const TRANSICAO_BARRA_TIMER = "stroke-dasharray .9s linear, stroke .25s ease";
const TRANSICAO_FAISCA_TIMER = "transform .9s linear";
const QUANTIDADE_POR_LISTA: Record<TipoListaTurma, number> = {
  conhecidas: 60,
  dificeis: 40
};
const ORDEM_LISTAS: TipoListaTurma[] = ["conhecidas", "dificeis"];

const estadoTurma = {
  tipoAtual: "conhecidas" as TipoListaTurma,
  palavras: [] as string[],
  indice: 0,
  restante: DURACAO_PALAVRA_SEGUNDOS,
  timerId: 0,
  fase: "preparando" as FaseTurma
};

function el<T extends Element>(id: string): T {
  const elemento = document.getElementById(id);
  if (!elemento) throw new Error(`Elemento ausente: ${id}`);
  return elemento as unknown as T;
}

function palavrasPorTipo(tipo: TipoListaTurma): string[] {
  const conteudo = window.TrilhaConteudo || {};
  const lista = tipo === "conhecidas" ? conteudo.palavrasConhecidas : conteudo.palavrasDificeis;
  return Array.isArray(lista) ? [...lista] : [];
}

function embaralhar(lista: string[]): string[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j] ?? "", copia[i] ?? ""];
  }
  return copia.filter(Boolean);
}

function sortearSemRepetirPorCiclo(lista: string[], quantidade: number, chaveCiclo: string): string[] {
  const fonte = lista.filter(Boolean);
  const chave = `trilha-turma-ciclo-${chaveCiclo}`;
  let fila: string[] = [];
  try {
    fila = JSON.parse(window.localStorage.getItem(chave) || "[]");
  } catch {
    fila = [];
  }
  fila = fila.filter((item) => fonte.includes(item));
  const escolhidas: string[] = [];
  while (escolhidas.length < quantidade && fonte.length) {
    if (!fila.length) fila = embaralhar(fonte);
    const item = fila.shift();
    if (item && !escolhidas.includes(item)) escolhidas.push(item);
  }
  window.localStorage.setItem(chave, JSON.stringify(fila));
  return escolhidas;
}

function sortearPalavras(tipo: TipoListaTurma): string[] {
  return sortearSemRepetirPorCiclo(palavrasPorTipo(tipo), QUANTIDADE_POR_LISTA[tipo], tipo);
}

function chamadaInicial(tipo: TipoListaTurma): string {
  return tipo === "conhecidas" ? "PALAVRAS" : "PALAVRAS POSSIVELMENTE DESCONHECIDAS";
}

function proximoTipo(tipo: TipoListaTurma): TipoListaTurma {
  const indiceAtual = ORDEM_LISTAS.indexOf(tipo);
  return ORDEM_LISTAS[(indiceAtual + 1) % ORDEM_LISTAS.length] ?? "conhecidas";
}

function classeTipo(tipo: TipoListaTurma): string {
  return tipo === "conhecidas" ? "modo-conhecidas" : "modo-dificeis";
}

function atualizarTela(animarTimer = true): void {
  const texto = textoAtual();
  const progresso = Math.max(0, Math.min(100, (estadoTurma.restante / DURACAO_PALAVRA_SEGUNDOS) * 100));
  const barra = el<SVGCircleElement>("barTurma");
  const faisca = el<HTMLElement>("sparkTurma");

  if (!animarTimer) {
    barra.style.transition = "none";
    faisca.style.transition = "none";
  }

  el<HTMLElement>("turmaPalavra").textContent = texto;
  ajustarTamanhoPalavra(texto);
  el<HTMLElement>("turmaContador").textContent = String(estadoTurma.restante);
  el<HTMLElement>("turmaResumoCategoria").textContent = resumoCategoriaAtual();
  el<HTMLElement>("trilhaTurmaPalco").className = `turma-stage ${classeTipo(estadoTurma.tipoAtual)}`;
  barra.style.strokeDasharray = `${progresso / 100 * 283} 283`;
  faisca.style.setProperty("--fuse-angle", `${-90 + (100 - progresso) / 100 * 360}deg`);

  if (!animarTimer) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        barra.style.transition = TRANSICAO_BARRA_TIMER;
        faisca.style.transition = TRANSICAO_FAISCA_TIMER;
      });
    });
  }
}

function ajustarTamanhoPalavra(texto: string): void {
  const palavra = el<HTMLElement>("turmaPalavra");
  const cartao = palavra.closest(".turma-word-card") as HTMLElement | null;
  const larguraDisponivel = Math.max((cartao?.clientWidth || window.innerWidth) * 0.86, 260);
  const caracteres = Math.max(texto.length, 1);
  const larguraMediaLetra = 0.62;
  const fonteMaxima = Math.min(176, Math.max(76, window.innerWidth * 0.13));
  const fonteCalculada = larguraDisponivel / (caracteres * larguraMediaLetra);
  const fonteFinal = Math.max(24, Math.min(fonteMaxima, fonteCalculada));
  palavra.style.fontSize = `${fonteFinal.toFixed(2)}px`;
}

function textoAtual(): string {
  if (estadoTurma.fase === "intervalo") return "PRONTO?";
  if (estadoTurma.fase === "preparando") return chamadaInicial(estadoTurma.tipoAtual);
  return estadoTurma.palavras[estadoTurma.indice] ?? "SEM PALAVRAS";
}

function resumoCategoriaAtual(): string {
  const total = QUANTIDADE_POR_LISTA[estadoTurma.tipoAtual];
  const realizadas = estadoTurma.fase === "rodando" ? Math.min(estadoTurma.indice + 1, total) : 0;
  const faltam = Math.max(0, total - realizadas);
  const tempoLimite = formatarTempoLimite(total * DURACAO_PALAVRA_SEGUNDOS);
  return `${rotuloCategoria(estadoTurma.tipoAtual)}: ${realizadas} feita(s) • ${faltam} faltam • tempo limite ${tempoLimite}`;
}

function rotuloCategoria(tipo: TipoListaTurma): string {
  return tipo === "conhecidas" ? "Palavras conhecidas" : "Palavras possivelmente desconhecidas";
}

function formatarTempoLimite(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  if (resto === 0) return `${minutos}min`;
  return `${minutos}min ${String(resto).padStart(2, "0")}s`;
}

function pararTimer(): void {
  if (estadoTurma.timerId) {
    window.clearInterval(estadoTurma.timerId);
    estadoTurma.timerId = 0;
  }
}

function iniciarLista(tipo: TipoListaTurma): void {
  estadoTurma.tipoAtual = tipo;
  estadoTurma.palavras = sortearPalavras(tipo);
  estadoTurma.indice = 0;
  estadoTurma.restante = DURACAO_PALAVRA_SEGUNDOS;
  estadoTurma.fase = "preparando";
  atualizarTela(false);
}

function iniciarPalavrasDificeis(): void {
  estadoTurma.tipoAtual = "dificeis";
  estadoTurma.palavras = sortearPalavras("dificeis");
  estadoTurma.indice = 0;
  estadoTurma.restante = DURACAO_PALAVRA_SEGUNDOS;
  estadoTurma.fase = "rodando";
  atualizarTela(false);
}

function prepararSegundaCategoria(): void {
  estadoTurma.tipoAtual = "dificeis";
  estadoTurma.indice = 0;
  estadoTurma.restante = DURACAO_PALAVRA_SEGUNDOS;
  estadoTurma.fase = "intervalo";
  atualizarTela(false);
}

function avancarFluxo(): void {
  if (estadoTurma.fase === "preparando") {
    estadoTurma.fase = "rodando";
    estadoTurma.restante = DURACAO_PALAVRA_SEGUNDOS;
    atualizarTela(false);
    return;
  }

  if (estadoTurma.fase === "intervalo") {
    iniciarPalavrasDificeis();
    return;
  }

  if (estadoTurma.indice < estadoTurma.palavras.length - 1) {
    estadoTurma.indice += 1;
    estadoTurma.restante = DURACAO_PALAVRA_SEGUNDOS;
    atualizarTela(false);
    return;
  }

  if (proximoTipo(estadoTurma.tipoAtual) === "dificeis") {
    prepararSegundaCategoria();
    return;
  }

  iniciarLista("conhecidas");
}

function iniciarTimerAutomatico(): void {
  pararTimer();
  estadoTurma.timerId = window.setInterval(() => {
    estadoTurma.restante -= 1;
    if (estadoTurma.restante <= 0) {
      estadoTurma.restante = 0;
      atualizarTela();
      pararTimer();
      window.setTimeout(() => {
        avancarFluxo();
        iniciarTimerAutomatico();
      }, ESPERA_TELA_ZERO_MS);
      return;
    }
    atualizarTela();
  }, 1000);
}

function inicializar(): void {
  iniciarLista("conhecidas");
  iniciarTimerAutomatico();
  window.addEventListener("resize", () => ajustarTamanhoPalavra(textoAtual()));
  window.addEventListener("orientationchange", () => setTimeout(() => ajustarTamanhoPalavra(textoAtual()), 250));
}

window.TrilhaTurma = {
  iniciar: iniciarLista,
  pausarOuContinuar: () => undefined,
  proxima: avancarFluxo
};

inicializar();
