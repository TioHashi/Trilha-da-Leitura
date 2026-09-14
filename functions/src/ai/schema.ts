import { HttpsError } from "firebase-functions/v2/https";

export type EscopoAnalise = "turma" | "aluno";

export interface RegistroLeituraEntrada {
  alunoAnonimo?: string;
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

export interface PayloadAnaliseEntrada {
  escopo: EscopoAnalise;
  alunoSelecionado?: string;
  registros: RegistroLeituraEntrada[];
  historicoAnalises?: HistoricoAnaliseEntrada[];
}

export interface RegistroLeituraAnonimizado extends RegistroLeituraEntrada {
  alunoAnonimo: string;
}

export interface PayloadAnaliseAnonimizado {
  escopo: EscopoAnalise;
  alunoSelecionado?: string;
  registros: RegistroLeituraAnonimizado[];
  historicoAnalises: HistoricoAnaliseEntrada[];
}

export interface HistoricoAnaliseEntrada {
  geradoEm: string;
  escopo: EscopoAnalise;
  totalRegistrosAnalisados: number;
  resumoDesempenho: string;
  mediaPrecisao: number;
  mediaTotalPalavras: number;
  mediaCompreensao: number;
  preLeitores: number;
  leitoresIniciantes: number;
  leitoresFluentes: number;
}

export interface AnaliseFluenciaLeitora {
  resumoDesempenho: string;
  evidenciasObservadas: string[];
  pontosAtencao: string[];
  recomendacoesPedagogicas: string[];
  planoIntervencaoSugerido: string[];
  sugestaoAcompanhamento: string;
  limitacoesAnalise: string[];
  avisoResponsabilidade: string;
}

export const LIMITE_REGISTROS_ANALISE = 80;

const CHAVES_PAYLOAD = new Set(["escopo", "alunoSelecionado", "registros", "historicoAnalises"]);
const CHAVES_REGISTRO = new Set([
  "alunoAnonimo",
  "dataAvaliacao",
  "perfilLeitor",
  "palavrasConhecidasCorretas",
  "palavrasDificeisCorretas",
  "palavrasTextoCorretas",
  "totalListas",
  "precisao",
  "compreensao",
  "tempoTotalSegundos"
]);
const CHAVES_HISTORICO = new Set([
  "geradoEm",
  "escopo",
  "totalRegistrosAnalisados",
  "resumoDesempenho",
  "mediaPrecisao",
  "mediaTotalPalavras",
  "mediaCompreensao",
  "preLeitores",
  "leitoresIniciantes",
  "leitoresFluentes"
]);

export const ESQUEMA_RESPOSTA_OPENAI = {
  type: "object",
  additionalProperties: false,
  required: [
    "resumoDesempenho",
    "evidenciasObservadas",
    "pontosAtencao",
    "recomendacoesPedagogicas",
    "planoIntervencaoSugerido",
    "sugestaoAcompanhamento",
    "limitacoesAnalise",
    "avisoResponsabilidade"
  ],
  properties: {
    resumoDesempenho: { type: "string" },
    evidenciasObservadas: { type: "array", items: { type: "string" } },
    pontosAtencao: { type: "array", items: { type: "string" } },
    recomendacoesPedagogicas: { type: "array", items: { type: "string" } },
    planoIntervencaoSugerido: { type: "array", items: { type: "string" } },
    sugestaoAcompanhamento: { type: "string" },
    limitacoesAnalise: { type: "array", items: { type: "string" } },
    avisoResponsabilidade: { type: "string" }
  }
} as const;

function numeroNoIntervalo(valor: unknown, minimo: number, maximo: number): number {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    throw new HttpsError("invalid-argument", "Payload invalido: campo numerico ausente ou invalido.");
  }
  return Math.min(maximo, Math.max(minimo, Math.round(numero)));
}

function validarChaves(objeto: Record<string, unknown>, permitidas: Set<string>, contexto: string): void {
  const inesperadas = Object.keys(objeto).filter((chave) => !permitidas.has(chave));
  if (inesperadas.length) {
    throw new HttpsError("invalid-argument", `${contexto} contem campos inesperados.`);
  }
}

function textoSeguro(valor: unknown, campo: string, tamanhoMaximo = 120): string {
  if (typeof valor !== "string") {
    throw new HttpsError("invalid-argument", `Payload invalido: ${campo} deve ser texto.`);
  }
  const texto = valor.trim();
  if (!texto || texto.length > tamanhoMaximo) {
    throw new HttpsError("invalid-argument", `Payload invalido: ${campo} ausente ou muito longo.`);
  }
  return texto;
}

function criarMapaAnonimo(registros: RegistroLeituraEntrada[]): Map<string, string> {
  const mapa = new Map<string, string>();
  let contador = 1;

  for (const registro of registros) {
    const chave = registro.alunoAnonimo && /^Aluno \d+$/.test(registro.alunoAnonimo)
      ? registro.alunoAnonimo
      : `Registro ${contador}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, `Aluno ${mapa.size + 1}`);
    }
    contador += 1;
  }

  return mapa;
}

export function validarEAnonimizarPayload(dados: unknown): PayloadAnaliseAnonimizado {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    throw new HttpsError("invalid-argument", "Payload invalido.");
  }

  const payload = dados as Record<string, unknown>;
  validarChaves(payload, CHAVES_PAYLOAD, "Payload");

  const escopo = payload.escopo;
  if (escopo !== "turma" && escopo !== "aluno") {
    throw new HttpsError("invalid-argument", "Escopo de analise invalido.");
  }

  if (!Array.isArray(payload.registros)) {
    throw new HttpsError("invalid-argument", "Registros ausentes.");
  }

  if (!payload.registros.length) {
    throw new HttpsError("invalid-argument", "Nao ha dados suficientes para analise.");
  }

  if (payload.registros.length > LIMITE_REGISTROS_ANALISE) {
    throw new HttpsError("invalid-argument", "Quantidade de registros acima do limite permitido.");
  }

  const registrosEntrada = payload.registros.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpsError("invalid-argument", "Registro invalido.");
    }

    const registro = item as Record<string, unknown>;
    validarChaves(registro, CHAVES_REGISTRO, "Registro");

    return {
      alunoAnonimo: typeof registro.alunoAnonimo === "string" ? registro.alunoAnonimo : undefined,
      dataAvaliacao: typeof registro.dataAvaliacao === "string" ? registro.dataAvaliacao.slice(0, 40) : undefined,
      perfilLeitor: textoSeguro(registro.perfilLeitor, "perfilLeitor"),
      palavrasConhecidasCorretas: numeroNoIntervalo(registro.palavrasConhecidasCorretas, 0, 60),
      palavrasDificeisCorretas: numeroNoIntervalo(registro.palavrasDificeisCorretas, 0, 40),
      palavrasTextoCorretas: numeroNoIntervalo(registro.palavrasTextoCorretas, 0, 100),
      totalListas: numeroNoIntervalo(registro.totalListas, 0, 100),
      precisao: numeroNoIntervalo(registro.precisao, 0, 100),
      compreensao: numeroNoIntervalo(registro.compreensao, 0, 2),
      tempoTotalSegundos: numeroNoIntervalo(registro.tempoTotalSegundos, 0, 120)
    } satisfies RegistroLeituraEntrada;
  });

  const mapaAnonimo = criarMapaAnonimo(registrosEntrada);
  const registros = registrosEntrada.map((registro, indice) => {
    const chave = registro.alunoAnonimo && /^Aluno \d+$/.test(registro.alunoAnonimo)
      ? registro.alunoAnonimo
      : `Registro ${indice + 1}`;

    return {
      ...registro,
      alunoAnonimo: mapaAnonimo.get(chave) ?? `Aluno ${indice + 1}`
    };
  });

  const alunoSelecionado = typeof payload.alunoSelecionado === "string" && /^Aluno \d+$/.test(payload.alunoSelecionado)
    ? (mapaAnonimo.get(payload.alunoSelecionado) ?? payload.alunoSelecionado)
    : undefined;

  if (escopo === "aluno" && !alunoSelecionado) {
    throw new HttpsError("invalid-argument", "Selecione um aluno anonimo para analise individual.");
  }

  const historicoAnalises = validarHistoricoAnalises(payload.historicoAnalises);

  return { escopo, alunoSelecionado, registros, historicoAnalises };
}

function validarHistoricoAnalises(valor: unknown): HistoricoAnaliseEntrada[] {
  if (valor === undefined) return [];
  if (!Array.isArray(valor)) {
    throw new HttpsError("invalid-argument", "Historico de analises invalido.");
  }
  if (valor.length > 6) {
    throw new HttpsError("invalid-argument", "Historico de analises acima do limite permitido.");
  }

  return valor.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpsError("invalid-argument", "Historico de analises invalido.");
    }

    const historico = item as Record<string, unknown>;
    validarChaves(historico, CHAVES_HISTORICO, "Historico");

    const escopoHistorico = historico.escopo;
    if (escopoHistorico !== "turma" && escopoHistorico !== "aluno") {
      throw new HttpsError("invalid-argument", "Escopo do historico invalido.");
    }

    return {
      geradoEm: textoSeguro(historico.geradoEm, "geradoEm", 40),
      escopo: escopoHistorico,
      totalRegistrosAnalisados: numeroNoIntervalo(historico.totalRegistrosAnalisados, 1, LIMITE_REGISTROS_ANALISE),
      resumoDesempenho: textoSeguro(historico.resumoDesempenho, "resumoDesempenho", 500),
      mediaPrecisao: numeroNoIntervalo(historico.mediaPrecisao, 0, 100),
      mediaTotalPalavras: numeroNoIntervalo(historico.mediaTotalPalavras, 0, 100),
      mediaCompreensao: numeroNoIntervalo(historico.mediaCompreensao, 0, 2),
      preLeitores: numeroNoIntervalo(historico.preLeitores, 0, LIMITE_REGISTROS_ANALISE),
      leitoresIniciantes: numeroNoIntervalo(historico.leitoresIniciantes, 0, LIMITE_REGISTROS_ANALISE),
      leitoresFluentes: numeroNoIntervalo(historico.leitoresFluentes, 0, LIMITE_REGISTROS_ANALISE)
    };
  });
}

export function validarRespostaIA(valor: unknown): AnaliseFluenciaLeitora {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new HttpsError("internal", "Resposta invalida da IA.");
  }

  const resposta = valor as Record<string, unknown>;
  for (const chave of ESQUEMA_RESPOSTA_OPENAI.required) {
    if (!(chave in resposta)) {
      throw new HttpsError("internal", "Resposta incompleta da IA.");
    }
  }

  const lista = (campo: string): string[] => {
    const valorCampo = resposta[campo];
    if (!Array.isArray(valorCampo) || valorCampo.some((item) => typeof item !== "string")) {
      throw new HttpsError("internal", "Resposta invalida da IA.");
    }
    return valorCampo;
  };

  return {
    resumoDesempenho: textoSeguro(resposta.resumoDesempenho, "resumoDesempenho", 1500),
    evidenciasObservadas: lista("evidenciasObservadas"),
    pontosAtencao: lista("pontosAtencao"),
    recomendacoesPedagogicas: lista("recomendacoesPedagogicas"),
    planoIntervencaoSugerido: lista("planoIntervencaoSugerido"),
    sugestaoAcompanhamento: textoSeguro(resposta.sugestaoAcompanhamento, "sugestaoAcompanhamento", 1000),
    limitacoesAnalise: lista("limitacoesAnalise"),
    avisoResponsabilidade: textoSeguro(resposta.avisoResponsabilidade, "avisoResponsabilidade", 800)
  };
}
