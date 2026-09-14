import OpenAI from "openai";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  ESQUEMA_RESPOSTA_OPENAI,
  type AnaliseFluenciaLeitora,
  type PayloadAnaliseAnonimizado,
  validarEAnonimizarPayload,
  validarRespostaIA
} from "./schema.js";
import { montarEntradaUsuario, montarInstrucoesSistema } from "./prompt.js";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const MODELO_PADRAO = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export const analisarFluenciaLeitora = onCall(
  {
    region: "us-central1",
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 30,
    memory: "256MiB",
    cors: [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://127.0.0.1:8080",
      "http://127.0.0.1:8081",
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:8080$/,
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:8081$/,
      "https://f4n03.github.io",
      "https://f4n03.github.io/Trilha-da-Leitura"
    ]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Faça login para gerar a analise.");
    }

    const payload = validarEAnonimizarPayload(request.data);
    const chave = OPENAI_API_KEY.value();
    if (!chave) {
      if (emEmuladorLocal()) return respostaLocalDoEmulador(payload);
      throw new HttpsError("failed-precondition", "Assistente indisponivel: secret da OpenAI nao configurado.");
    }

    try {
      const cliente = new OpenAI({ apiKey: chave });
      const resposta = await cliente.responses.create({
        model: MODELO_PADRAO,
        instructions: montarInstrucoesSistema(),
        input: montarEntradaUsuario(payload),
        max_output_tokens: 1600,
        text: {
          format: {
            type: "json_schema",
            name: "analise_fluencia_leitora",
            schema: ESQUEMA_RESPOSTA_OPENAI,
            strict: true
          }
        }
      });

      const texto = resposta.output_text;
      if (!texto) {
        throw new HttpsError("internal", "A IA nao retornou conteudo para analise.");
      }

      const analise = validarRespostaIA(JSON.parse(texto));
      return {
        geradoEm: new Date().toISOString(),
        escopo: payload.escopo,
        totalRegistrosAnalisados: payload.registros.length,
        analise
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (emEmuladorLocal()) return respostaLocalDoEmulador(payload);
      throw new HttpsError("unavailable", "Nao foi possivel gerar a analise agora. Tente novamente mais tarde.");
    }
  }
);

function emEmuladorLocal(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true" || Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

function respostaLocalDoEmulador(payload: PayloadAnaliseAnonimizado): {
  geradoEm: string;
  escopo: PayloadAnaliseAnonimizado["escopo"];
  totalRegistrosAnalisados: number;
  analise: AnaliseFluenciaLeitora;
} {
  return {
    geradoEm: new Date().toISOString(),
    escopo: payload.escopo,
    totalRegistrosAnalisados: payload.registros.length,
    analise: montarAnaliseLocal(payload)
  };
}

function montarAnaliseLocal(payload: PayloadAnaliseAnonimizado): AnaliseFluenciaLeitora {
  const total = Math.max(payload.registros.length, 1);
  const soma = (campo: keyof PayloadAnaliseAnonimizado["registros"][number]) =>
    payload.registros.reduce((acc, registro) => acc + Number(registro[campo] || 0), 0);
  const mediaPrecisao = Math.round(soma("precisao") / total);
  const mediaPalavras = Math.round(soma("palavrasTextoCorretas") / total);
  const mediaCompreensao = Math.round((soma("compreensao") / total) * 10) / 10;
  const preLeitores = payload.registros.filter((registro) => registro.perfilLeitor.includes("Pré-leitor") || registro.perfilLeitor.includes("Pre-leitor")).length;
  const leitoresIniciantes = payload.registros.filter((registro) => registro.perfilLeitor.includes("Iniciante")).length;
  const leitoresFluentes = payload.registros.filter((registro) => registro.perfilLeitor.includes("Fluente")).length;
  const escopoTexto = payload.escopo === "aluno" ? "do aluno selecionado" : "da turma filtrada";

  return {
    resumoDesempenho: `Relatório local do emulador para análise ${escopoTexto}. Foram analisados ${payload.registros.length} registro(s), com precisão média de ${mediaPrecisao}%, média de ${mediaPalavras} palavras corretas no texto e compreensão média de ${mediaCompreensao}/2.`,
    evidenciasObservadas: [
      `${preLeitores} registro(s) classificados como Pré-leitor.`,
      `${leitoresIniciantes} registro(s) classificados como Leitor Iniciante.`,
      `${leitoresFluentes} registro(s) classificados como Leitor Fluente.`,
      `A média de palavras corretas observada foi de ${mediaPalavras}.`
    ],
    pontosAtencao: [
      preLeitores > 0 ? "Há estudantes que precisam de acompanhamento em habilidades iniciais de leitura." : "Não houve registros de Pré-leitor no conjunto filtrado.",
      mediaPrecisao < 90 ? "A precisão média ainda merece atenção antes de considerar fluência consolidada." : "A precisão média está em faixa favorável para fluência.",
      mediaCompreensao < 1.5 ? "A compreensão média indica necessidade de retomada de estratégias de leitura." : "A compreensão média apresenta resultado positivo no conjunto analisado."
    ],
    recomendacoesPedagogicas: [
      "Organizar pequenos grupos por perfil leitor para intervenções mais direcionadas.",
      "Retomar leitura de palavras conhecidas e possivelmente desconhecidas com acompanhamento do professor.",
      "Usar leitura compartilhada, reconto oral e perguntas curtas para fortalecer compreensão.",
      "Registrar uma nova avaliação após o período de intervenção para comparar evolução."
    ],
    planoIntervencaoSugerido: [
      "Semana 1: revisar correspondência letra-som e leitura de sílabas/palavras com estudantes em maior dificuldade.",
      "Semana 2: propor leitura diária curta, com marcação de palavras lidas corretamente.",
      "Semana 3: trabalhar fluência com repetição orientada e leitura em dupla.",
      "Semana 4: reaplicar uma atividade breve e comparar com os indicadores anteriores."
    ],
    sugestaoAcompanhamento: "Realizar nova avaliação em cerca de 3 a 4 semanas, registrando os mesmos indicadores para observar avanço, estabilidade ou necessidade de nova intervenção.",
    limitacoesAnalise: [
      "A análise considera apenas os resultados registrados no sistema.",
      "A interpretação deve ser complementada pela observação do professor durante as atividades de leitura.",
      "Fatores como frequência, participação, apoio familiar e contexto da aula devem ser considerados antes de definir intervenções."
    ],
    avisoResponsabilidade: "A análise produzida por Inteligência Artificial ou por relatório local automatizado é apenas um recurso de apoio e deve ser revisada pelo professor. Ela não substitui avaliação pedagógica profissional."
  };
}
