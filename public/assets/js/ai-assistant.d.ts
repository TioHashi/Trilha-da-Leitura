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
declare const janelaIA: Window & typeof globalThis;
declare const LIMITE_REGISTROS_IA = 80;
declare const AVISO_REVISAO_HUMANA = "A an\u00E1lise produzida por Intelig\u00EAncia Artificial \u00E9 apenas um recurso de apoio e deve ser revisada pelo professor. Ela n\u00E3o substitui avalia\u00E7\u00E3o pedag\u00F3gica profissional.";
declare const estadoIA: {
    ultimaAnaliseTexto: string;
    ultimaResposta: RespostaFuncao | null;
    ultimoPayload: ReturnType<typeof montarPayload> | null;
    ultimaDataAvaliacao: string;
    ultimoAlunoNome: string;
    historico: AnaliseSalva[];
    relatorioAbertoId: string;
    contextoAtual: ContextoUsuarioIA | null;
};
declare function elemento<T extends HTMLElement>(id: string): T;
declare function numero(valor: unknown): number;
declare function segundosDoTempo(valor: unknown): number;
declare function dataRegistro(resultado: ResultadoDashboard): string | undefined;
declare function timestampRegistro(resultado: ResultadoDashboard): number;
declare function chaveDataAvaliacao(resultado: ResultadoDashboard): string;
declare function dataCurta(valor: string): string;
declare function rotuloDataAvaliacao(valor: string): string;
declare function mesmoDiaRegistro(resultado: ResultadoDashboard, dataSelecionada: string): boolean;
declare function mapaAlunos(): Map<string, string>;
declare function opcoesAlunos(): Array<{
    nome: string;
    anonimo: string;
}>;
declare function registrosDoAluno(nome: string): ResultadoDashboard[];
declare function ultimaDataDaTurma(): string;
declare function registrosAnonimizados(registrosBase?: ResultadoDashboard[]): RegistroAnalise[];
declare function filtrosAtivosTexto(): string;
declare function setEstado(mensagem: string, tipo?: "info" | "erro" | "sucesso"): void;
declare function setCarregando(carregando: boolean): void;
declare function atualizarPainel(): void;
declare function montarPayload(historicoAnalises?: HistoricoAnaliseIA[]): {
    escopo: "turma" | "aluno";
    alunoSelecionado?: string;
    registros: RegistroAnalise[];
    historicoAnalises: HistoricoAnaliseIA[];
};
declare function listaHtml(itens: string[]): string;
declare function alunoSelecionadoNome(): string;
declare function contextoAtualRelatorio(): {
    professorNome: string;
    professorEmail: string;
    escola: string;
    turma: string;
    alunoNome: string;
};
declare function renderizarAnalise(resposta: RespostaFuncao): void;
declare function renderizarConteudoAnalise(alvo: HTMLElement, resposta: RespostaFuncao, contexto: {
    professorNome?: string;
    professorEmail?: string;
    escola?: string;
    turma?: string;
    alunoNome?: string;
    indicadores?: IndicadoresAnalise;
}): void;
declare function gerarAnalise(): Promise<void>;
declare function chamarAssistenteIA(payload: {
    escopo: "turma" | "aluno";
    alunoSelecionado?: string;
    registros: RegistroAnalise[];
    historicoAnalises: HistoricoAnaliseIA[];
}): Promise<RespostaFuncao>;
declare function deveTentarEndpointLocal(error: unknown): boolean;
declare function deveUsarRelatorioLocalOnline(error: unknown): boolean;
declare function isHostDesenvolvimentoLocal(hostname: string): boolean;
declare function hostEmuladorLocal(hostname: string): string;
declare function slugDocumento(valor: string): string;
declare function chaveDiaDocumento(valor: string): string;
declare function chamarAssistenteLocal(payload: {
    escopo: "turma" | "aluno";
    alunoSelecionado?: string;
    registros: RegistroAnalise[];
    historicoAnalises: HistoricoAnaliseIA[];
}): Promise<RespostaFuncao>;
declare function perfilMaisFrequente(registros: RegistroAnalise[]): string;
declare function gerarAnalisePedagogicaLocal(payload: {
    escopo: "turma" | "aluno";
    alunoSelecionado?: string;
    registros: RegistroAnalise[];
    historicoAnalises: HistoricoAnaliseIA[];
}): RespostaFuncao;
declare function calcularIndicadores(registros: RegistroAnalise[]): IndicadoresAnalise;
declare function historicoParaIA(historico: AnaliseSalva[]): HistoricoAnaliseIA[];
declare function obterContextoUsuario(): Promise<ContextoUsuarioIA>;
declare function obterFirestoreIA(): Promise<any>;
declare function carregarHistoricoAnalises(): Promise<AnaliseSalva[]>;
declare function salvarAnaliseAutomatica(): Promise<void>;
declare function salvarAnalise(): Promise<void>;
declare function renderizarHistorico(): void;
declare function descricaoAnaliseHistorico(item: AnaliseSalva): string;
declare function rotuloAnaliseSalva(item: AnaliseSalva): string;
declare function atualizarComparacaoSinteses(): void;
declare function diferencaTexto(atual: number, anterior: number, unidade?: string): string;
declare function textoSintese(item: AnaliseSalva): string;
declare function montarInterpretacaoComparacao(base: AnaliseSalva, atual: AnaliseSalva): string;
declare function salvarComparacaoSinteses(base: AnaliseSalva, atual: AnaliseSalva): Promise<void>;
declare function compararSinteses(): Promise<void>;
declare function abrirRelatorioHistorico(id: string, atualizarLista?: boolean): void;
declare function nomeProfessor(nome?: string, email?: string): string;
declare function nomeAlunoRelatorio(nome?: string): string;
declare function excluirRelatorioHistorico(id: string): Promise<void>;
declare function mensagemErroIA(error: {
    code?: string;
    message?: string;
}): string;
declare function copiarAnalise(): Promise<void>;
declare function escapeHtml(valor: unknown): string;
declare function inicializar(): void;
