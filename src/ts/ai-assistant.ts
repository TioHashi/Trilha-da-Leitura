declare const resultadosFiltrados: ResultadoDashboard[];

interface ResultadoDashboard {
  nome?: string;
  data?: string;
  salvoEm?: string;
  escola?: string;
  turma?: string;
  perfil?: string;
  palavrasCorretas?: number;
  dificeisCorretas?: number;
  palavrasTextoCorretas?: number;
  total?: number;
  precisao?: number;
  compreensao?: number;
  tempoTotalSegundos?: number;
  tempoTotal?: string;
}

interface RegistroAnalise {
  alunoAnonimo: string;
  dataAvaliacao?: string;
  perfilLeitor: string;
  palavrasConhecidasCorretas: number;
  palavrasDificeisCorretas: number;
  palavrasTextoCorretas: number;
  totalListas: number;
  precisao: number;
  compreensao: number;
  tempoTotalSegundos: number;
}

interface AnaliseIA {
  resumoDesempenho: string;
  evidenciasObservadas: string[];
  pontosAtencao: string[];
  recomendacoesPedagogicas: string[];
  planoIntervencaoSugerido: string[];
  sugestaoAcompanhamento: string;
  limitacoesAnalise: string[];
  avisoResponsabilidade: string;
}

interface RespostaFuncao {
  geradoEm: string;
  escopo: "turma" | "aluno";
  totalRegistrosAnalisados: number;
  analise: AnaliseIA;
  origem?: "openai" | "local";
}

interface IndicadoresAnalise {
  mediaPrecisao: number;
  mediaTotalPalavras: number;
  mediaCompreensao: number;
  preLeitores: number;
  leitoresIniciantes: number;
  leitoresFluentes: number;
}

interface HistoricoAnaliseIA extends IndicadoresAnalise {
  geradoEm: string;
  escopo: "turma" | "aluno";
  totalRegistrosAnalisados: number;
  resumoDesempenho: string;
}

interface AnaliseSalva extends HistoricoAnaliseIA {
  id: string;
  salvoEm?: string;
  dataAvaliacao?: string;
  dataReferencia?: string;
  origem?: "openai" | "local";
  alunoAnonimo?: string;
  alunoNome?: string;
  professorUid: string;
  professorEmail: string;
  professorNome?: string;
  escola?: string;
  turma?: string;
  indicadores: IndicadoresAnalise;
  analise: AnaliseIA;
}

interface ComparacaoSinteses {
  id: string;
  tipo: "comparacao-sinteses";
  geradoEm: string;
  salvoEm: string;
  professorUid: string;
  professorEmail: string;
  professorNome?: string;
  escola: string;
  turma: string;
  analiseAnteriorId: string;
  analiseMaisRecenteId: string;
  dataAnaliseAnterior: string;
  dataAnaliseMaisRecente: string;
  escopoAnterior: "turma" | "aluno";
  escopoMaisRecente: "turma" | "aluno";
  indicadoresAnteriores: IndicadoresAnalise;
  indicadoresMaisRecentes: IndicadoresAnalise;
  diferencas: {
    precisaoMedia: number;
    palavrasTextoMedia: number;
    compreensaoMedia: number;
  };
  sinteseAnterior: string;
  sinteseMaisRecente: string;
  interpretacaoComparacao: string;
  avisoResponsabilidade: string;
}

interface ContextoUsuarioIA {
  administrador: boolean;
  uid: string;
  email: string;
  nome: string;
  escola?: string;
  turma?: string;
}

const janelaIA = window;
const LIMITE_REGISTROS_IA = 80;
const AVISO_REVISAO_HUMANA =
  "A análise produzida por Inteligência Artificial é apenas um recurso de apoio e deve ser revisada pelo professor. Ela não substitui avaliação pedagógica profissional.";

const estadoIA = {
  ultimaAnaliseTexto: "",
  ultimaResposta: null as RespostaFuncao | null,
  ultimoPayload: null as ReturnType<typeof montarPayload> | null,
  ultimaDataAvaliacao: "",
  ultimoAlunoNome: "",
  historico: [] as AnaliseSalva[],
  relatorioAbertoId: "",
  contextoAtual: null as ContextoUsuarioIA | null
};

function elemento<T extends HTMLElement>(id: string): T {
  const alvo = document.getElementById(id);
  if (!alvo) throw new Error(`Elemento ausente: ${id}`);
  return alvo as T;
}

function numero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function segundosDoTempo(valor: unknown): number {
  const texto = String(valor || "");
  const minutos = Number((texto.match(/(\d+)\s*min/) || [0, 0])[1]);
  const segundos = Number((texto.match(/(\d+)\s*s/) || [0, 0])[1]);
  return minutos * 60 + segundos;
}

function dataRegistro(resultado: ResultadoDashboard): string | undefined {
  return resultado.salvoEm || resultado.data || undefined;
}

function timestampRegistro(resultado: ResultadoDashboard): number {
  const direto = Date.parse(dataRegistro(resultado) || "");
  if (Number.isFinite(direto)) return direto;
  const partes = String(resultado.data || "").match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/);
  if (!partes) return 0;
  return new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]), Number(partes[4]), Number(partes[5]), Number(partes[6])).getTime();
}

function chaveDataAvaliacao(resultado: ResultadoDashboard): string {
  const timestamp = timestampRegistro(resultado);
  if (timestamp > 0) return new Date(timestamp).toISOString();
  return dataRegistro(resultado) || "";
}

function dataCurta(valor: string): string {
  if (!valor) return "";
  const data = new Date(valor);
  if (!Number.isNaN(data.getTime())) return data.toLocaleDateString("pt-BR");
  return valor.split(",")[0] || valor;
}

function rotuloDataAvaliacao(valor: string): string {
  if (!valor) return "";
  const data = new Date(valor);
  if (!Number.isNaN(data.getTime())) return data.toLocaleString("pt-BR");
  return valor;
}

function mesmoDiaRegistro(resultado: ResultadoDashboard, dataSelecionada: string): boolean {
  if (!dataSelecionada) return true;
  return dataCurta(chaveDataAvaliacao(resultado)) === dataCurta(dataSelecionada);
}

function mapaAlunos(): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const resultado of resultadosFiltrados || []) {
    const nome = String(resultado.nome || "").trim() || "Sem identificação";
    if (!mapa.has(nome)) {
      mapa.set(nome, `Aluno ${mapa.size + 1}`);
    }
  }
  return mapa;
}

function opcoesAlunos(): Array<{ nome: string; anonimo: string }> {
  return Array.from(mapaAlunos().entries())
    .map(([nome, anonimo]) => ({ nome, anonimo }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function registrosDoAluno(nome: string): ResultadoDashboard[] {
  return [...(resultadosFiltrados || [])]
    .filter((resultado) => String(resultado.nome || "").trim() === nome)
    .sort((a, b) => timestampRegistro(b) - timestampRegistro(a));
}

function registrosMaisRecentesPorAluno(registrosBase: ResultadoDashboard[] = resultadosFiltrados || []): ResultadoDashboard[] {
  const mapa = new Map<string, ResultadoDashboard>();
  for (const resultado of registrosBase) {
    const nome = String(resultado.nome || "").trim() || "Sem identificação";
    const chave = `${nome}|${resultado.escola || ""}|${resultado.turma || ""}`;
    const existente = mapa.get(chave);
    if (!existente || timestampRegistro(resultado) > timestampRegistro(existente)) {
      mapa.set(chave, resultado);
    }
  }
  return [...mapa.values()].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
}

function ultimaDataDaTurma(): string {
  const registrosOrdenados = [...(resultadosFiltrados || [])].sort((a, b) => timestampRegistro(b) - timestampRegistro(a));
  return registrosOrdenados[0] ? chaveDataAvaliacao(registrosOrdenados[0]) : "";
}

function registrosAnonimizados(registrosBase: ResultadoDashboard[] = resultadosFiltrados || []): RegistroAnalise[] {
  const mapa = mapaAlunos();
  const registrosOrdenados = [...registrosBase].sort((a, b) => timestampRegistro(b) - timestampRegistro(a));
  return registrosOrdenados.slice(0, LIMITE_REGISTROS_IA).map((resultado, indice) => {
    const nome = String(resultado.nome || "").trim() || "Sem identificação";
    return {
      alunoAnonimo: mapa.get(nome) || `Aluno ${indice + 1}`,
      dataAvaliacao: dataRegistro(resultado),
      perfilLeitor: String(resultado.perfil || "Sem perfil informado"),
      palavrasConhecidasCorretas: numero(resultado.palavrasCorretas),
      palavrasDificeisCorretas: numero(resultado.dificeisCorretas),
      palavrasTextoCorretas: numero(resultado.palavrasTextoCorretas ?? resultado.total),
      totalListas: numero(resultado.total),
      precisao: numero(resultado.precisao),
      compreensao: numero(resultado.compreensao),
      tempoTotalSegundos: numero(resultado.tempoTotalSegundos) || segundosDoTempo(resultado.tempoTotal)
    };
  });
}

function filtrosAtivosTexto(): string {
  const escola = (document.getElementById("filtroEscola") as HTMLSelectElement | null)?.value || "Todas";
  const turma = (document.getElementById("filtroTurma") as HTMLSelectElement | null)?.value || "Todas";
  const perfil = (document.getElementById("filtroPerfil") as HTMLSelectElement | null)?.value || "Todos";
  const busca = (document.getElementById("filtroBusca") as HTMLInputElement | null)?.value || "Sem busca";
  return `Escola: ${escola}. Turma: ${turma}. Perfil: ${perfil}. Busca: ${busca}.`;
}

function setEstado(mensagem: string, tipo: "info" | "erro" | "sucesso" = "info"): void {
  const status = elemento<HTMLElement>("iaStatus");
  status.textContent = mensagem;
  status.dataset.tipo = tipo;
}

function setCarregando(carregando: boolean): void {
  const botao = elemento<HTMLButtonElement>("iaGerar");
  botao.disabled = carregando;
  botao.textContent = carregando ? "Gerando análise..." : "Gerar análise com IA";
  elemento<HTMLButtonElement>("iaGerarNovamente").disabled = carregando;
}

function atualizarPainel(): void {
  const seletorEscopo = elemento<HTMLSelectElement>("iaEscopo");
  const seletorAluno = elemento<HTMLSelectElement>("iaAluno");
  const seletorData = elemento<HTMLSelectElement>("iaDataAvaliacao");
  const alunos = opcoesAlunos();
  const valorAlunoAtual = seletorAluno.value;
  const valorDataAtual = seletorData.value;
  seletorAluno.innerHTML = `<option value=""></option>` + alunos
    .map((aluno) => `<option value="${escapeHtml(aluno.nome)}">${escapeHtml(aluno.nome)}</option>`)
    .join("");
  if (valorAlunoAtual && alunos.some((aluno) => aluno.nome === valorAlunoAtual)) {
    seletorAluno.value = valorAlunoAtual;
  }
  seletorAluno.disabled = seletorEscopo.value !== "aluno" || alunos.length === 0;

  if (seletorEscopo.value === "aluno") {
    const registrosAluno = seletorAluno.value ? registrosDoAluno(seletorAluno.value) : [];
    const datas = Array.from(new Set(registrosAluno.map(chaveDataAvaliacao).filter(Boolean)));
    seletorData.innerHTML = `<option value=""></option>` + datas
      .map((data) => `<option value="${escapeHtml(data)}">${escapeHtml(rotuloDataAvaliacao(data))}</option>`)
      .join("");
    if (valorDataAtual && datas.includes(valorDataAtual)) {
      seletorData.value = valorDataAtual;
    } else if (datas.length === 1 && datas[0]) {
      seletorData.value = datas[0];
    }
    seletorData.disabled = !seletorAluno.value || datas.length === 0;
    return;
  }

  const ultimaData = ultimaDataDaTurma();
  seletorData.innerHTML = ultimaData
    ? `<option value="${escapeHtml(ultimaData)}">${escapeHtml(rotuloDataAvaliacao(ultimaData))}</option>`
    : `<option value=""></option>`;
  seletorData.value = ultimaData;
  seletorData.disabled = true;
}

function montarPayload(historicoAnalises: HistoricoAnaliseIA[] = []): {
  escopo: "turma" | "aluno";
  alunoSelecionado?: string;
  registros: RegistroAnalise[];
  historicoAnalises: HistoricoAnaliseIA[];
} {
  const escopo = elemento<HTMLSelectElement>("iaEscopo").value === "aluno" ? "aluno" : "turma";
  const seletorData = elemento<HTMLSelectElement>("iaDataAvaliacao");
  const dataSelecionada = seletorData.value;

  if (escopo === "aluno") {
    const alunoSelecionado = elemento<HTMLSelectElement>("iaAluno").value;
    if (!alunoSelecionado) {
      return {
        escopo,
        alunoSelecionado,
        registros: [],
        historicoAnalises: historicoAnalises.filter((item) => item.escopo === "aluno").slice(0, 6)
      };
    }
    if (!dataSelecionada) {
      estadoIA.ultimoAlunoNome = alunoSelecionado;
      estadoIA.ultimaDataAvaliacao = "";
      return {
        escopo,
        alunoSelecionado: mapaAlunos().get(alunoSelecionado) || "Aluno 1",
        registros: [],
        historicoAnalises: historicoAnalises.filter((item) => item.escopo === "aluno").slice(0, 6)
      };
    }
    estadoIA.ultimoAlunoNome = alunoSelecionado;
    const registrosSelecionados = registrosDoAluno(alunoSelecionado)
      .filter((resultado) => mesmoDiaRegistro(resultado, dataSelecionada));
    estadoIA.ultimaDataAvaliacao = dataSelecionada || (registrosSelecionados[0] ? chaveDataAvaliacao(registrosSelecionados[0]) : "");
    const alunoAnonimo = mapaAlunos().get(alunoSelecionado) || "Aluno 1";
    return {
      escopo,
      alunoSelecionado: alunoAnonimo,
      registros: registrosAnonimizados(registrosSelecionados),
      historicoAnalises: historicoAnalises
        .filter((item) => item.escopo === "aluno")
        .slice(0, 6)
    };
  }

  const dataTurma = dataSelecionada || ultimaDataDaTurma();
  estadoIA.ultimoAlunoNome = "";
  const registrosTurma = registrosMaisRecentesPorAluno(resultadosFiltrados || []);
  estadoIA.ultimaDataAvaliacao = dataTurma;
  return {
    escopo,
    registros: registrosAnonimizados(registrosTurma),
    historicoAnalises: historicoAnalises.filter((item) => item.escopo === "turma").slice(0, 6)
  };
}

function listaHtml(itens: string[]): string {
  if (!itens.length) return "<li>Não informado.</li>";
  return itens.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function alunoSelecionadoNome(): string {
  const seletorEscopo = document.getElementById("iaEscopo") as HTMLSelectElement | null;
  const seletorAluno = document.getElementById("iaAluno") as HTMLSelectElement | null;
  if (seletorEscopo?.value !== "aluno" || !seletorAluno?.value) return "";
  return seletorAluno.selectedOptions[0]?.textContent?.trim() || "";
}

function contextoAtualRelatorio(): { professorNome: string; professorEmail: string; escola: string; turma: string; alunoNome: string } {
  const escola = (document.getElementById("filtroEscola") as HTMLSelectElement | null)?.value || "Todas";
  const turma = (document.getElementById("filtroTurma") as HTMLSelectElement | null)?.value || "Todas";
  return {
    professorNome: estadoIA.contextoAtual?.nome || "Professor logado",
    professorEmail: estadoIA.contextoAtual?.email || "",
    escola: estadoIA.contextoAtual?.escola || escola,
    turma: estadoIA.contextoAtual?.turma || turma,
    alunoNome: alunoSelecionadoNome()
  };
}

function renderizarAnalise(resposta: RespostaFuncao): void {
  const contexto = contextoAtualRelatorio();
  renderizarConteudoAnalise(elemento<HTMLElement>("iaResultado"), resposta, {
    professorNome: contexto.professorNome,
    professorEmail: contexto.professorEmail,
    escola: contexto.escola,
    turma: contexto.turma,
    alunoNome: contexto.alunoNome,
    indicadores: estadoIA.ultimoPayload ? calcularIndicadores(estadoIA.ultimoPayload.registros) : undefined
  });
  estadoIA.ultimaResposta = resposta;
  elemento<HTMLButtonElement>("iaCopiar").disabled = false;
  elemento<HTMLButtonElement>("iaImprimir").disabled = false;
  elemento<HTMLButtonElement>("iaGerarNovamente").disabled = false;
}

function renderizarConteudoAnalise(
  alvo: HTMLElement,
  resposta: RespostaFuncao,
  contexto: { professorNome?: string; professorEmail?: string; escola?: string; turma?: string; alunoNome?: string; indicadores?: IndicadoresAnalise }
): void {
  const { analise } = resposta;
  const geradoEm = new Date(resposta.geradoEm).toLocaleString("pt-BR");
  const indicadores = contexto.indicadores || calcularIndicadores([]);
  const tituloEscopo = resposta.escopo === "aluno" ? "Relatório pedagógico individual" : "Relatório pedagógico da turma";
  const subtituloEscopo = resposta.escopo === "aluno"
    ? "Leitura, fluência e acompanhamento do estudante"
    : "Leitura, fluência e acompanhamento coletivo";
  const seloOrigem = resposta.origem === "local" ? "Relatório local" : "Assistente pedagógico";
  const blocoAluno = resposta.escopo === "aluno"
    ? `
      <div class="report-id-card">
        <span>Aluno avaliado</span>
        <strong>${escapeHtml(contexto.alunoNome || "Aluno não informado")}</strong>
      </div>
    `
    : "";
  const html = `
    <article class="pedagogical-report">
      <header class="report-cover">
        <div>
          <span class="report-kicker">${escapeHtml(seloOrigem)}</span>
          <h3>${escapeHtml(tituloEscopo)}</h3>
          <p>${escapeHtml(subtituloEscopo)}</p>
        </div>
        <time>${escapeHtml(geradoEm)}</time>
      </header>

      <div class="report-meta report-identity-grid">
        <div class="report-id-card">
          <span>Professor responsável</span>
          <strong>${escapeHtml(nomeProfessor(contexto.professorNome, contexto.professorEmail))}</strong>
        </div>
        <div class="report-id-card">
          <span>Unidade escolar</span>
          <strong>${escapeHtml(contexto.escola || "Todas")}</strong>
        </div>
        <div class="report-id-card">
          <span>Turma acompanhada</span>
          <strong>${escapeHtml(contexto.turma || "Todas")}</strong>
        </div>
        ${blocoAluno}
      </div>

      <section class="report-indicators" aria-label="Indicadores principais">
        <div>
          <span>Registros analisados</span>
          <strong>${resposta.totalRegistrosAnalisados}</strong>
        </div>
        <div>
          <span>Precisão média</span>
          <strong>${indicadores.mediaPrecisao}%</strong>
        </div>
        <div>
          <span>Palavras no texto</span>
          <strong>${indicadores.mediaTotalPalavras}</strong>
        </div>
        <div>
          <span>Compreensão média</span>
          <strong>${indicadores.mediaCompreensao}/2</strong>
        </div>
      </section>

      <section class="report-section report-summary">
        <span class="report-section-label">Síntese pedagógica</span>
        <h3>Resumo do desempenho</h3>
        <p>${escapeHtml(analise.resumoDesempenho)}</p>
      </section>

      <div class="report-section-grid">
        <section class="report-section">
          <span class="report-section-label">Dados observados</span>
          <h3>Evidências observadas</h3>
          <ul>${listaHtml(analise.evidenciasObservadas)}</ul>
        </section>
        <section class="report-section">
          <span class="report-section-label">Atenção pedagógica</span>
          <h3>Pontos de atenção</h3>
          <ul>${listaHtml(analise.pontosAtencao)}</ul>
        </section>
      </div>

      <section class="report-section report-recommendations">
        <span class="report-section-label">Encaminhamentos</span>
        <h3>Recomendações pedagógicas</h3>
        <ul>${listaHtml(analise.recomendacoesPedagogicas)}</ul>
      </section>

      <section class="report-section report-plan">
        <span class="report-section-label">Plano de ação</span>
        <h3>Plano de intervenção sugerido</h3>
        <ul>${listaHtml(analise.planoIntervencaoSugerido)}</ul>
      </section>

      <div class="report-section-grid">
        <section class="report-section">
          <span class="report-section-label">Monitoramento</span>
          <h3>Sugestão de acompanhamento</h3>
          <p>${escapeHtml(analise.sugestaoAcompanhamento)}</p>
        </section>
        <section class="report-section">
          <span class="report-section-label">Cuidados de leitura</span>
          <h3>Limitações da análise</h3>
          <ul>${listaHtml(analise.limitacoesAnalise)}</ul>
        </section>
      </div>

      <div class="report-footer-note">
        <p class="human-review">${escapeHtml(analise.avisoResponsabilidade || AVISO_REVISAO_HUMANA)}</p>
        <p>Relatório gerado em ${escapeHtml(geradoEm)}. Registros analisados: ${resposta.totalRegistrosAnalisados}.</p>
      </div>
    </article>
  `;

  alvo.innerHTML = html;
  estadoIA.ultimaAnaliseTexto = [
    `Professor: ${nomeProfessor(contexto.professorNome, contexto.professorEmail)}`,
    `Escola: ${contexto.escola || "Todas"}`,
    `Turma: ${contexto.turma || "Todas"}`,
    ...(resposta.escopo === "aluno" ? [`Aluno avaliado: ${contexto.alunoNome || "Aluno não informado"}`] : []),
    "",
    "Resumo do desempenho",
    analise.resumoDesempenho,
    "",
    "Evidências observadas",
    ...analise.evidenciasObservadas,
    "",
    "Pontos de atenção",
    ...analise.pontosAtencao,
    "",
    "Recomendações pedagógicas",
    ...analise.recomendacoesPedagogicas,
    "",
    "Plano de intervenção sugerido",
    ...analise.planoIntervencaoSugerido,
    "",
    "Sugestão de acompanhamento",
    analise.sugestaoAcompanhamento,
    "",
    "Limitações da análise",
    ...analise.limitacoesAnalise,
    "",
    analise.avisoResponsabilidade || AVISO_REVISAO_HUMANA
  ].join("\n");
}

async function gerarAnalise(): Promise<void> {
  atualizarPainel();
  const historico = await carregarHistoricoAnalises();
  const payload = montarPayload(historicoParaIA(historico));
  estadoIA.ultimoPayload = payload;

  if (!payload.registros.length) {
    const alunoAtual = elemento<HTMLSelectElement>("iaAluno").value;
    const dataAtual = elemento<HTMLSelectElement>("iaDataAvaliacao").value;
    setEstado(payload.escopo === "aluno"
      ? (!alunoAtual
        ? "Selecione o nome do aluno para gerar a análise individual."
        : (!dataAtual ? "Selecione a data da avaliação desse aluno." : "Não há registro para o aluno na data selecionada."))
      : "Não há dados suficientes para gerar a análise com os filtros atuais.", "erro");
    return;
  }

  if (!janelaIA.TrilhaAuth || !(await janelaIA.TrilhaAuth.currentUser())) {
    setEstado("Faça login para gerar a análise.", "erro");
    return;
  }
  estadoIA.contextoAtual = await obterContextoUsuario();

  setCarregando(true);
  setEstado("Gerando análise com IA...", "info");
  elemento<HTMLElement>("iaResultado").innerHTML = "";
  elemento<HTMLButtonElement>("iaCopiar").disabled = true;
  elemento<HTMLButtonElement>("iaImprimir").disabled = true;

  try {
    const resposta = await chamarAssistenteIA(payload);
    renderizarAnalise(resposta);
    await salvarAnaliseAutomatica();
    setEstado("Análise gerada e salva automaticamente no histórico. Revise antes de utilizar pedagogicamente.", "sucesso");
  } catch (error) {
    const erroFirebase = error as { code?: string; message?: string };
    const mensagem = mensagemErroIA(erroFirebase);
    setEstado(mensagem, "erro");
  } finally {
    setCarregando(false);
  }
}

async function chamarAssistenteIA(payload: {
  escopo: "turma" | "aluno";
  alunoSelecionado?: string;
  registros: RegistroAnalise[];
  historicoAnalises: HistoricoAnaliseIA[];
}): Promise<RespostaFuncao> {
  try {
    const callable = firebase.functions().httpsCallable("analisarFluenciaLeitora");
    const resposta = await callable(payload);
    return resposta.data as RespostaFuncao;
  } catch (error) {
    if (deveTentarEndpointLocal(error)) {
      try {
        return await chamarAssistenteLocal(payload);
      } catch {
        return gerarAnalisePedagogicaLocal(payload);
      }
    }
    if (deveUsarRelatorioLocalOnline(error)) return gerarAnalisePedagogicaLocal(payload);
    throw error;
  }
}

function deveTentarEndpointLocal(error: unknown): boolean {
  if (!isHostDesenvolvimentoLocal(window.location.hostname)) return false;

  const erro = error as { code?: string; message?: string };
  const codigo = String(erro.code || "").toLowerCase();
  const mensagem = String(erro.message || "").toLowerCase();
  return codigo.includes("internal") || codigo.includes("not-found") || mensagem.includes("internal") || mensagem.includes("not found");
}

function deveUsarRelatorioLocalOnline(error: unknown): boolean {
  const erro = error as { code?: string; message?: string };
  const codigo = String(erro.code || "").toLowerCase();
  const mensagem = String(erro.message || "").toLowerCase();
  return codigo.includes("functions/not-found")
    || codigo.includes("not-found")
    || codigo.includes("internal")
    || mensagem.includes("not-found")
    || mensagem.includes("failed to fetch")
    || mensagem.includes("internal");
}

function isHostDesenvolvimentoLocal(hostname: string): boolean {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === ""
    || hostname.startsWith("192.168.")
    || hostname.startsWith("10.")
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
}

function hostEmuladorLocal(hostname: string): string {
  return hostname === "localhost" || hostname === "" ? "127.0.0.1" : hostname;
}

function slugDocumento(valor: string): string {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "sem-identificacao";
}

function chaveDiaDocumento(valor: string): string {
  const data = new Date(valor);
  if (!Number.isNaN(data.getTime())) return data.toISOString().slice(0, 10).replace(/-/g, "");
  return slugDocumento(valor || new Date().toISOString());
}

async function chamarAssistenteLocal(payload: {
  escopo: "turma" | "aluno";
  alunoSelecionado?: string;
  registros: RegistroAnalise[];
  historicoAnalises: HistoricoAnaliseIA[];
}): Promise<RespostaFuncao> {
  if (!janelaIA.TrilhaAuth) {
    throw new Error("Faça login para gerar a análise.");
  }
  const usuario = await janelaIA.TrilhaAuth.currentUser();
  const token = await usuario.getIdToken();
  const projectIds = Array.from(new Set([
    "demo-trilha-da-leitura",
    String(janelaIA.firebaseConfig?.projectId || ""),
    "trilha-leitura"
  ].filter(Boolean)));
  const emulatorHost = hostEmuladorLocal(window.location.hostname);

  let ultimoErro = "Assistente indisponível no emulador local.";
  for (const projectId of projectIds) {
    try {
      const resposta = await fetch(`http://${emulatorHost}:5001/${projectId}/us-central1/analisarFluenciaLeitora`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: payload })
      });
      const json = await resposta.json().catch(() => null);

      if (resposta.ok && !json?.error) {
        return json.result as RespostaFuncao;
      }

      ultimoErro = json?.error?.message || ultimoErro;
    } catch {
      ultimoErro = `Não foi possível conectar ao emulador de funções no projeto ${projectId}.`;
    }
  }

  throw new Error(ultimoErro);
}

function perfilMaisFrequente(registros: RegistroAnalise[]): string {
  const contagem = registros.reduce((acc, item) => {
    const perfil = item.perfilLeitor || "Sem perfil informado";
    acc.set(perfil, (acc.get(perfil) || 0) + 1);
    return acc;
  }, new Map<string, number>());
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Sem perfil informado";
}

function gerarAnalisePedagogicaLocal(payload: {
  escopo: "turma" | "aluno";
  alunoSelecionado?: string;
  registros: RegistroAnalise[];
  historicoAnalises: HistoricoAnaliseIA[];
}): RespostaFuncao {
  const indicadores = calcularIndicadores(payload.registros);
  const perfilBase = perfilMaisFrequente(payload.registros);
  const historicoMaisRecente = payload.historicoAnalises[0];
  const contextoHistorico = historicoMaisRecente
    ? ` Comparando com o relatório anterior salvo em ${new Date(historicoMaisRecente.geradoEm).toLocaleDateString("pt-BR")}, a precisão média ${diferencaTexto(indicadores.mediaPrecisao, historicoMaisRecente.mediaPrecisao, "%")} e a média de palavras no texto ${diferencaTexto(indicadores.mediaTotalPalavras, historicoMaisRecente.mediaTotalPalavras)}.`
    : " Ainda não há relatório anterior suficiente para comparação automática.";

  const escopoTexto = payload.escopo === "aluno" ? "do aluno selecionado" : "da turma";
  const baseRegistrosTexto = payload.escopo === "turma" ? "registro(s) mais recente(s) dos alunos filtrados" : "registro(s) da data selecionada";
  const resumo = `Relatório local para análise ${escopoTexto}. Foram considerados ${payload.registros.length} ${baseRegistrosTexto}, com precisão média de ${indicadores.mediaPrecisao}%, média de ${indicadores.mediaTotalPalavras} palavras corretas no texto e compreensão média de ${indicadores.mediaCompreensao}/2.${contextoHistorico}`;

  return {
    geradoEm: new Date().toISOString(),
    escopo: payload.escopo,
    totalRegistrosAnalisados: payload.registros.length,
    origem: "local",
    analise: {
      resumoDesempenho: resumo,
      evidenciasObservadas: [
        `Perfil predominante observado: ${perfilBase}.`,
        `Pré-leitores: ${indicadores.preLeitores}. Leitores iniciantes: ${indicadores.leitoresIniciantes}. Leitores fluentes: ${indicadores.leitoresFluentes}.`,
        `Precisão média registrada: ${indicadores.mediaPrecisao}%.`
      ],
      pontosAtencao: [
        indicadores.mediaPrecisao < 90 ? "A precisão média ainda exige acompanhamento para reduzir trocas, omissões ou hesitações." : "A precisão média está adequada, mas deve ser acompanhada em novas leituras.",
        indicadores.mediaCompreensao < 2 ? "A compreensão registrada indica necessidade de retomar perguntas de localização e inferência simples." : "A compreensão registrada está favorável para a data analisada.",
        indicadores.mediaTotalPalavras <= 65 ? "A fluência no texto ainda pode ser fortalecida com leituras breves, repetidas e orientadas." : "A quantidade de palavras no texto indica avanço, mantendo atenção à expressividade e compreensão."
      ],
      recomendacoesPedagogicas: [
        "Planejar leitura diária curta com acompanhamento do professor.",
        "Retomar palavras e pseudopalavras com maior dificuldade em pequenos grupos.",
        "Registrar nova avaliação em outra data para comparar evolução com o histórico salvo."
      ],
      planoIntervencaoSugerido: [
        "Semana 1: leitura guiada de palavras conhecidas e revisão de correspondências letra-som.",
        "Semana 2: leitura de pseudopalavras e palavras novas com mediação.",
        "Semana 3: leitura de texto curto com foco em precisão e compreensão.",
        "Semana 4: nova verificação para comparar com este relatório."
      ],
      sugestaoAcompanhamento: "Comparar este relatório com a próxima avaliação salva para observar avanço de precisão, palavras no texto e compreensão.",
      limitacoesAnalise: [
        "Este relatório foi gerado localmente porque a chamada à IA online não foi concluída.",
        "A comparação usa apenas indicadores salvos e sínteses anteriores disponíveis no banco de dados.",
        "A análise não observa leitura oral, contexto da aula ou fatores pedagógicos externos."
      ],
      avisoResponsabilidade: AVISO_REVISAO_HUMANA
    }
  };
}

function calcularIndicadores(registros: RegistroAnalise[]): IndicadoresAnalise {
  const total = Math.max(registros.length, 1);
  const soma = (campo: keyof RegistroAnalise) => registros.reduce((acc, item) => acc + numero(item[campo]), 0);
  return {
    mediaPrecisao: Math.round(soma("precisao") / total),
    mediaTotalPalavras: Math.round(soma("palavrasTextoCorretas") / total),
    mediaCompreensao: Math.round(soma("compreensao") / total),
    preLeitores: registros.filter((item) => item.perfilLeitor.includes("Pré-leitor") || item.perfilLeitor.includes("Pre-leitor")).length,
    leitoresIniciantes: registros.filter((item) => item.perfilLeitor.includes("Iniciante")).length,
    leitoresFluentes: registros.filter((item) => item.perfilLeitor.includes("Fluente")).length
  };
}

function historicoParaIA(historico: AnaliseSalva[]): HistoricoAnaliseIA[] {
  return historico.slice(0, 6).map((item) => ({
    geradoEm: item.geradoEm,
    escopo: item.escopo,
    totalRegistrosAnalisados: item.totalRegistrosAnalisados,
    resumoDesempenho: item.analise.resumoDesempenho.slice(0, 500),
    mediaPrecisao: item.indicadores.mediaPrecisao,
    mediaTotalPalavras: item.indicadores.mediaTotalPalavras,
    mediaCompreensao: item.indicadores.mediaCompreensao,
    preLeitores: item.indicadores.preLeitores,
    leitoresIniciantes: item.indicadores.leitoresIniciantes,
    leitoresFluentes: item.indicadores.leitoresFluentes
  }));
}

async function obterContextoUsuario(): Promise<ContextoUsuarioIA> {
  if (!janelaIA.TrilhaAuth) throw new Error("Faça login para usar o histórico da IA.");
  const usuario = await janelaIA.TrilhaAuth.currentUser();
  if (!usuario) throw new Error("Faça login para usar o histórico da IA.");
  const token = await usuario.getIdTokenResult();
  const claims = token.claims || {};
  const role = String(claims.role || claims.papel || "");
  const administrador = role === "admin" || role === "administrador";
  const filtroEscola = (document.getElementById("filtroEscola") as HTMLSelectElement | null)?.value || "";
  const filtroTurma = (document.getElementById("filtroTurma") as HTMLSelectElement | null)?.value || "";
  return {
    administrador,
    uid: String(usuario.uid || ""),
    email: String(usuario.email || ""),
    nome: String(usuario.displayName || usuario.email || "Professor"),
    "escola": String(claims.escola || filtroEscola || ""),
    "turma": String(claims.turma || filtroTurma || "")
  };
}

async function obterFirestoreIA(): Promise<any> {
  if (!firebase.apps.length) firebase.initializeApp(janelaIA.firebaseConfig);
  return firebase.firestore();
}

async function carregarHistoricoAnalises(): Promise<AnaliseSalva[]> {
  try {
    const contexto = await obterContextoUsuario();
    const db = await obterFirestoreIA();
    let consulta = db.collection("analisesPedagogicas");
    if (!contexto.administrador) {
      consulta = consulta
        .where("professorUid", "==", contexto.uid)
        .where("escola", "==", contexto.escola)
        .where("turma", "==", contexto.turma);
    }
    const snapshot = await consulta.get();
    let historico = snapshot.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data() }) as AnaliseSalva)
      .sort((a: AnaliseSalva, b: AnaliseSalva) => Date.parse(b.geradoEm) - Date.parse(a.geradoEm));
    if (contexto.administrador) {
      const filtroEscola = (document.getElementById("filtroEscola") as HTMLSelectElement | null)?.value || "";
      const filtroTurma = (document.getElementById("filtroTurma") as HTMLSelectElement | null)?.value || "";
      historico = historico.filter((item: AnaliseSalva) => {
        const escolaOk = !filtroEscola || item.escola === filtroEscola || item.escola === "Todas";
        const turmaOk = !filtroTurma || item.turma === filtroTurma || item.turma === "Todas";
        return escolaOk && turmaOk;
      });
    }
    estadoIA.historico = historico;
    renderizarHistorico();
    return historico;
  } catch {
    estadoIA.historico = [];
    renderizarHistorico();
    return [];
  }
}

async function salvarAnaliseAutomatica(): Promise<void> {
  if (!estadoIA.ultimaResposta || !estadoIA.ultimoPayload) {
    setEstado("Gere uma análise antes de salvar.", "erro");
    return;
  }

  try {
    const contexto = await obterContextoUsuario();
    const db = await obterFirestoreIA();
    const indicadores = calcularIndicadores(estadoIA.ultimoPayload.registros);
    const dataAvaliacao = estadoIA.ultimaDataAvaliacao || estadoIA.ultimaResposta.geradoEm;
    const alunoNome = estadoIA.ultimaResposta.escopo === "aluno" ? alunoSelecionadoNome() || estadoIA.ultimoAlunoNome : "";
    const idEscopo = estadoIA.ultimaResposta.escopo === "aluno"
      ? `aluno-${slugDocumento(alunoNome)}`
      : "turma";
    const id = [
      contexto.uid,
      estadoIA.ultimaResposta.escopo,
      idEscopo,
      chaveDiaDocumento(dataAvaliacao)
    ].join("-");

    await db.collection("analisesPedagogicas").doc(id).set({
      id,
      geradoEm: estadoIA.ultimaResposta.geradoEm,
      salvoEm: new Date().toISOString(),
      dataAvaliacao,
      dataReferencia: dataCurta(dataAvaliacao),
      origem: estadoIA.ultimaResposta.origem || "openai",
      escopo: estadoIA.ultimaResposta.escopo,
      alunoAnonimo: estadoIA.ultimoPayload.alunoSelecionado || "",
      alunoNome,
      professorUid: contexto.uid,
      professorEmail: contexto.email,
      professorNome: contexto.nome,
      "escola": contexto.escola || "Todas",
      "turma": contexto.turma || "Todas",
      totalRegistrosAnalisados: estadoIA.ultimaResposta.totalRegistrosAnalisados,
      indicadores,
      resumoDesempenho: estadoIA.ultimaResposta.analise.resumoDesempenho,
      evidenciasObservadas: estadoIA.ultimaResposta.analise.evidenciasObservadas,
      pontosAtencao: estadoIA.ultimaResposta.analise.pontosAtencao,
      recomendacoesPedagogicas: estadoIA.ultimaResposta.analise.recomendacoesPedagogicas,
      planoIntervencaoSugerido: estadoIA.ultimaResposta.analise.planoIntervencaoSugerido,
      sugestaoAcompanhamento: estadoIA.ultimaResposta.analise.sugestaoAcompanhamento,
      limitacoesAnalise: estadoIA.ultimaResposta.analise.limitacoesAnalise,
      avisoResponsabilidade: estadoIA.ultimaResposta.analise.avisoResponsabilidade || AVISO_REVISAO_HUMANA,
      analise: estadoIA.ultimaResposta.analise
    }, { merge: true });

    setEstado("Análise salva no histórico local do Trilha da Leitura.", "sucesso");
    await carregarHistoricoAnalises();
  } catch (error) {
    const mensagem = error instanceof Error && error.message ? error.message : "Não foi possível salvar a análise.";
    setEstado(mensagem, "erro");
    throw error;
  }
}

async function salvarAnalise(): Promise<void> {
  await salvarAnaliseAutomatica();
}

function renderizarHistorico(): void {
  const alvo = elemento<HTMLElement>("iaHistorico");
  if (!estadoIA.historico.length) {
    alvo.innerHTML = `<p class="text-sm font-bold text-slate-600">Nenhuma análise salva ainda.</p>`;
    elemento<HTMLElement>("iaRelatorioSalvo").innerHTML = `<p class="empty">Nenhum relatório do histórico aberto.</p>`;
    atualizarComparacaoSinteses();
    return;
  }

  alvo.innerHTML = estadoIA.historico.slice(0, 12).map((item) => {
    const data = new Date(item.geradoEm).toLocaleString("pt-BR");
    const ativo = estadoIA.relatorioAbertoId === item.id;
    const descricao = descricaoAnaliseHistorico(item);
    return `
      <article class="history-card compact-history-card">
        <div>
          <h3>${escapeHtml(data)}</h3>
          <p>${escapeHtml(descricao)}</p>
        </div>
        <div class="history-actions">
          <button type="button" class="history-open-btn" data-relatorio-id="${escapeHtml(item.id)}">${ativo ? "Relatório aberto" : "Abrir relatório"}</button>
          <button type="button" class="history-print-btn" data-imprimir-relatorio-id="${escapeHtml(item.id)}" aria-label="Imprimir relatório">Imprimir</button>
          <button type="button" class="history-delete-btn" data-excluir-relatorio-id="${escapeHtml(item.id)}">Excluir relatório</button>
        </div>
      </article>
    `;
  }).join("");

  if (estadoIA.relatorioAbertoId) abrirRelatorioHistorico(estadoIA.relatorioAbertoId, false);
  atualizarComparacaoSinteses();
}

function descricaoAnaliseHistorico(item: AnaliseSalva): string {
  if (item.escopo === "turma") return "Análise da turma";
  const aluno = nomeAlunoRelatorio(item.alunoNome);
  return `Análise individual - ${aluno}`;
}

function rotuloAnaliseSalva(item: AnaliseSalva): string {
  const data = new Date(item.geradoEm).toLocaleString("pt-BR");
  const tipo = item.escopo === "turma" ? "Turma" : `Individual - ${nomeAlunoRelatorio(item.alunoNome)}`;
  return `${data} - ${tipo}`;
}

function atualizarComparacaoSinteses(): void {
  const seletorBase = document.getElementById("iaCompararBase") as HTMLSelectElement | null;
  const seletorAtual = document.getElementById("iaCompararAtual") as HTMLSelectElement | null;
  const resultado = document.getElementById("iaComparacaoResultado") as HTMLElement | null;
  if (!seletorBase || !seletorAtual || !resultado) return;

  const opcoes = estadoIA.historico.slice(0, 12);
  const valorBase = seletorBase.value;
  const valorAtual = seletorAtual.value;
  const htmlOpcoes = `<option value="">Selecione um relatório</option>` + opcoes
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(rotuloAnaliseSalva(item))}</option>`)
    .join("");

  seletorBase.innerHTML = htmlOpcoes;
  seletorAtual.innerHTML = htmlOpcoes;

  if (valorBase && opcoes.some((item) => item.id === valorBase)) seletorBase.value = valorBase;
  if (valorAtual && opcoes.some((item) => item.id === valorAtual)) seletorAtual.value = valorAtual;

  const analiseMaisRecente = opcoes[0];
  const analiseAnterior = opcoes[1];
  if (!seletorBase.value && analiseAnterior) seletorBase.value = analiseAnterior.id;
  if (!seletorAtual.value && analiseMaisRecente) seletorAtual.value = analiseMaisRecente.id;

  if (opcoes.length < 2) {
    resultado.innerHTML = `<p class="empty">Salve pelo menos dois relatórios para comparar sínteses.</p>`;
  }
}

function diferencaTexto(atual: number, anterior: number, unidade = ""): string {
  const diferenca = atual - anterior;
  if (diferenca > 0) return `subiu ${diferenca}${unidade}`;
  if (diferenca < 0) return `caiu ${Math.abs(diferenca)}${unidade}`;
  return `permaneceu em ${atual}${unidade}`;
}

function textoSintese(item: AnaliseSalva): string {
  return item.analise?.resumoDesempenho || item.resumoDesempenho || "Resumo indisponível.";
}

function montarInterpretacaoComparacao(base: AnaliseSalva, atual: AnaliseSalva): string {
  const indBase = base.indicadores || calcularIndicadores([]);
  const indAtual = atual.indicadores || calcularIndicadores([]);
  return [
    `Precisão média: ${diferencaTexto(indAtual.mediaPrecisao, indBase.mediaPrecisao, "%")}.`,
    `Palavras corretas no texto: ${diferencaTexto(indAtual.mediaTotalPalavras, indBase.mediaTotalPalavras)}.`,
    `Compreensão média: ${diferencaTexto(indAtual.mediaCompreensao, indBase.mediaCompreensao)}.`
  ].join(" ");
}

async function salvarComparacaoSinteses(base: AnaliseSalva, atual: AnaliseSalva): Promise<void> {
  const contexto = await obterContextoUsuario();
  const db = await obterFirestoreIA();
  const indBase = base.indicadores || calcularIndicadores([]);
  const indAtual = atual.indicadores || calcularIndicadores([]);
  const geradoEm = new Date().toISOString();
  const id = [
    contexto.uid,
    "comparacao",
    base.id,
    atual.id,
    geradoEm.replace(/[^0-9]/g, "")
  ].join("-").slice(0, 520);
  const comparacao: ComparacaoSinteses = {
    id,
    tipo: "comparacao-sinteses",
    geradoEm,
    salvoEm: geradoEm,
    professorUid: contexto.uid,
    professorEmail: contexto.email,
    professorNome: contexto.nome,
    escola: contexto.escola || atual.escola || base.escola || "Todas",
    turma: contexto.turma || atual.turma || base.turma || "Todas",
    analiseAnteriorId: base.id,
    analiseMaisRecenteId: atual.id,
    dataAnaliseAnterior: base.geradoEm,
    dataAnaliseMaisRecente: atual.geradoEm,
    escopoAnterior: base.escopo,
    escopoMaisRecente: atual.escopo,
    indicadoresAnteriores: indBase,
    indicadoresMaisRecentes: indAtual,
    diferencas: {
      precisaoMedia: indAtual.mediaPrecisao - indBase.mediaPrecisao,
      palavrasTextoMedia: indAtual.mediaTotalPalavras - indBase.mediaTotalPalavras,
      compreensaoMedia: indAtual.mediaCompreensao - indBase.mediaCompreensao
    },
    sinteseAnterior: textoSintese(base),
    sinteseMaisRecente: textoSintese(atual),
    interpretacaoComparacao: montarInterpretacaoComparacao(base, atual),
    avisoResponsabilidade: "Esta comparação é um apoio visual entre relatórios salvos. A interpretação final deve ser feita pelo professor."
  };

  await db.collection("comparacoesPedagogicas").doc(id).set(comparacao, { merge: true });
}

async function compararSinteses(): Promise<void> {
  const seletorBase = elemento<HTMLSelectElement>("iaCompararBase");
  const seletorAtual = elemento<HTMLSelectElement>("iaCompararAtual");
  const resultado = elemento<HTMLElement>("iaComparacaoResultado");
  const base = estadoIA.historico.find((item) => item.id === seletorBase.value);
  const atual = estadoIA.historico.find((item) => item.id === seletorAtual.value);

  if (!base || !atual) {
    resultado.innerHTML = `<p class="empty">Selecione dois relatórios para comparar.</p>`;
    return;
  }

  if (base.id === atual.id) {
    resultado.innerHTML = `<p class="empty">Escolha relatórios diferentes para comparar as sínteses.</p>`;
    return;
  }

  const indBase = base.indicadores || calcularIndicadores([]);
  const indAtual = atual.indicadores || calcularIndicadores([]);
  const dataBase = new Date(base.geradoEm).toLocaleString("pt-BR");
  const dataAtual = new Date(atual.geradoEm).toLocaleString("pt-BR");
  const sinteseAnterior = textoSintese(base);
  const sinteseMaisRecente = textoSintese(atual);

  resultado.innerHTML = `
    <div class="comparison-summary">
      <h3>Comparação entre relatórios</h3>
      <p><strong>Anterior:</strong> ${escapeHtml(dataBase)}</p>
      <p><strong>Mais recente:</strong> ${escapeHtml(dataAtual)}</p>
    </div>
    <div class="comparison-grid">
      <article>
        <span>Precisão média</span>
        <strong>${indBase.mediaPrecisao}% → ${indAtual.mediaPrecisao}%</strong>
        <p>${escapeHtml(diferencaTexto(indAtual.mediaPrecisao, indBase.mediaPrecisao, "%"))}</p>
      </article>
      <article>
        <span>Palavras no texto</span>
        <strong>${indBase.mediaTotalPalavras} → ${indAtual.mediaTotalPalavras}</strong>
        <p>${escapeHtml(diferencaTexto(indAtual.mediaTotalPalavras, indBase.mediaTotalPalavras))}</p>
      </article>
      <article>
        <span>Compreensão média</span>
        <strong>${indBase.mediaCompreensao}/2 → ${indAtual.mediaCompreensao}/2</strong>
        <p>${escapeHtml(diferencaTexto(indAtual.mediaCompreensao, indBase.mediaCompreensao))}</p>
      </article>
    </div>
    <section class="report-section">
      <h3>Síntese anterior</h3>
      <p>${escapeHtml(sinteseAnterior)}</p>
    </section>
    <section class="report-section">
      <h3>Síntese mais recente</h3>
      <p>${escapeHtml(sinteseMaisRecente)}</p>
    </section>
    <p class="human-review">Esta comparação é um apoio visual entre relatórios salvos. A interpretação final deve ser feita pelo professor.</p>
  `;

  try {
    await salvarComparacaoSinteses(base, atual);
    setEstado("Comparação salva automaticamente no banco de dados.", "sucesso");
  } catch (error) {
    const mensagem = error instanceof Error && error.message ? error.message : "Não foi possível salvar a comparação no banco de dados.";
    setEstado(mensagem, "erro");
  }
}

function abrirRelatorioHistorico(id: string, atualizarLista = true): void {
  const item = estadoIA.historico.find((analise) => analise.id === id);
  const alvo = elemento<HTMLElement>("iaRelatorioSalvo");
  if (!item) {
    alvo.innerHTML = `<p class="empty">Relatório não encontrado no histórico carregado.</p>`;
    return;
  }

  estadoIA.relatorioAbertoId = id;
  renderizarConteudoAnalise(alvo, {
    geradoEm: item.geradoEm,
    escopo: item.escopo,
    totalRegistrosAnalisados: item.totalRegistrosAnalisados,
    analise: item.analise,
    origem: item.origem
  }, {
    professorNome: item.professorNome,
    professorEmail: item.professorEmail,
    escola: item.escola,
    turma: item.turma,
    alunoNome: nomeAlunoRelatorio(item.alunoNome),
    indicadores: item.indicadores
  });
  elemento<HTMLButtonElement>("iaImprimir").disabled = false;
  alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  if (atualizarLista) renderizarHistorico();
}

function imprimirRelatorio(): void {
  const relatorioHistorico = elemento<HTMLElement>("iaRelatorioSalvo");
  const relatorioAtual = elemento<HTMLElement>("iaResultado");
  const relatorio = relatorioHistorico.querySelector<HTMLElement>(".pedagogical-report")
    || relatorioAtual.querySelector<HTMLElement>(".pedagogical-report");

  if (!relatorio) {
    setEstado("Gere ou abra um relatório antes de imprimir.", "erro");
    return;
  }

  const chave = `trilha-relatorio-impressao-${Date.now()}`;
  const dadosImpressao = {
    titulo: tituloRelatorioParaImpressao(relatorio),
    relatorioHtml: relatorio.outerHTML,
    cssHref: document.querySelector<HTMLLinkElement>('link[href*="dashboard.css"]')?.href || "assets/css/dashboard.css?v=2026/09-14"
  };

  try {
    localStorage.setItem(chave, JSON.stringify(dadosImpressao));
  } catch (error) {
    setEstado("Não foi possível preparar o relatório para impressão. Tente novamente.", "erro");
    return;
  }

  const janelaImpressao = window.open(`imprimir-relatorio.html?relatorio=${encodeURIComponent(chave)}`, "_blank");
  if (!janelaImpressao) {
    localStorage.removeItem(chave);
    setEstado("O navegador bloqueou a página de impressão. Permita pop-ups para imprimir o relatório.", "erro");
    return;
  }
  try {
    janelaImpressao.name = JSON.stringify(dadosImpressao);
  } catch (error) {
    // A pagina dedicada ainda tenta carregar pelo localStorage quando o nome da janela nao puder ser definido.
  }
  janelaImpressao.focus();
}

function tituloRelatorioParaImpressao(relatorio: HTMLElement): string {
  const titulo = relatorio.querySelector<HTMLElement>(".report-cover h3")?.textContent
    || relatorio.querySelector<HTMLElement>("h3")?.textContent
    || "Relatório Pedagógico";
  return titulo.replace(/\s+/g, " ").trim();
}

function imprimirRelatorioHistorico(id: string): void {
  abrirRelatorioHistorico(id);
  imprimirRelatorio();
}

function nomeProfessor(nome?: string, email?: string): string {
  const nomeLimpo = String(nome || "").trim();
  const emailLimpo = String(email || "").trim();
  if (nomeLimpo && emailLimpo && nomeLimpo !== emailLimpo) return `${nomeLimpo} (${emailLimpo})`;
  return nomeLimpo || emailLimpo || "Professor não informado";
}

function nomeAlunoRelatorio(nome?: string): string {
  const nomeLimpo = String(nome || "").trim();
  return nomeLimpo || "Nome do aluno não registrado";
}

async function excluirRelatorioHistorico(id: string): Promise<void> {
  const item = estadoIA.historico.find((analise) => analise.id === id);
  const descricao = item?.escopo === "aluno" ? "relatório individual" : "relatório da turma";
  const confirmar = window.confirm(`Deseja excluir definitivamente este ${descricao} do histórico?`);
  if (!confirmar) return;

  try {
    const db = await obterFirestoreIA();
    await db.collection("analisesPedagogicas").doc(id).delete();
    if (estadoIA.relatorioAbertoId === id) {
      estadoIA.relatorioAbertoId = "";
      elemento<HTMLElement>("iaRelatorioSalvo").innerHTML = `<p class="empty">Nenhum relatório do histórico aberto.</p>`;
    }
    setEstado("Relatório excluído do histórico e do banco de dados.", "sucesso");
    await carregarHistoricoAnalises();
  } catch (error) {
    const mensagem = error instanceof Error && error.message ? error.message : "Não foi possível excluir o relatório.";
    setEstado(mensagem, "erro");
  }
}

function mensagemErroIA(error: { code?: string; message?: string }): string {
  const codigo = String(error.code || "").toLowerCase();
  const mensagem = String(error.message || "").trim();

  if (codigo.includes("functions/not-found") || mensagem === "not-found") {
    return "Assistente indisponível: reinicie o ambiente local do Trilha da Leitura para carregar o assistente.";
  }

  if (codigo.includes("failed-precondition") || mensagem.includes("secret")) {
    return "Assistente indisponível: configure a chave local da IA em functions/.secret.local e reinicie os emuladores.";
  }

  if (codigo.includes("unauthenticated")) {
    return "Faça login novamente para gerar a análise.";
  }

  if (codigo.includes("invalid-argument")) {
    return mensagem || "Os dados filtrados não estão no formato esperado para análise.";
  }

  if (mensagem === "internal" || codigo.includes("internal")) {
    return "Erro interno ao chamar a IA. Reinicie o ambiente local do Trilha da Leitura e confira a configuração local do assistente.";
  }

  return mensagem || "Assistente indisponível no momento. Tente novamente mais tarde.";
}

async function copiarAnalise(): Promise<void> {
  if (!estadoIA.ultimaAnaliseTexto) return;
  await navigator.clipboard.writeText(estadoIA.ultimaAnaliseTexto);
  setEstado("Análise copiada para a área de transferência.", "sucesso");
}

function escapeHtml(valor: unknown): string {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[caractere] || caractere);
}

function inicializar(): void {
  const escopo = elemento<HTMLSelectElement>("iaEscopo");
  escopo.addEventListener("change", () => {
    elemento<HTMLSelectElement>("iaAluno").value = "";
    elemento<HTMLSelectElement>("iaDataAvaliacao").value = "";
    atualizarPainel();
  });
  elemento<HTMLSelectElement>("iaAluno").addEventListener("change", () => {
    elemento<HTMLSelectElement>("iaDataAvaliacao").value = "";
    atualizarPainel();
  });
  elemento<HTMLButtonElement>("iaGerar").addEventListener("click", gerarAnalise);
  elemento<HTMLButtonElement>("iaGerarNovamente").addEventListener("click", gerarAnalise);
  elemento<HTMLButtonElement>("iaCopiar").addEventListener("click", copiarAnalise);
  elemento<HTMLButtonElement>("iaImprimir").addEventListener("click", imprimirRelatorio);
  elemento<HTMLButtonElement>("iaCompararSinteses").addEventListener("click", () => {
    compararSinteses();
  });
  elemento<HTMLElement>("iaHistorico").addEventListener("click", (event) => {
    const alvo = event.target as HTMLElement;
    const botaoAbrir = alvo.closest("[data-relatorio-id]") as HTMLButtonElement | null;
    if (botaoAbrir?.dataset.relatorioId) {
      abrirRelatorioHistorico(botaoAbrir.dataset.relatorioId);
      return;
    }

    const botaoImprimir = alvo.closest("[data-imprimir-relatorio-id]") as HTMLButtonElement | null;
    if (botaoImprimir?.dataset.imprimirRelatorioId) {
      imprimirRelatorioHistorico(botaoImprimir.dataset.imprimirRelatorioId);
      return;
    }

    const botaoExcluir = alvo.closest("[data-excluir-relatorio-id]") as HTMLButtonElement | null;
    if (botaoExcluir?.dataset.excluirRelatorioId) {
      excluirRelatorioHistorico(botaoExcluir.dataset.excluirRelatorioId);
    }
  });
  atualizarPainel();
  carregarHistoricoAnalises();
}

janelaIA.TrilhaIA = {
  inicializar,
  atualizarPainel,
  gerarAnalise,
  copiarAnalise,
  imprimirRelatorio,
  salvarAnalise
};
