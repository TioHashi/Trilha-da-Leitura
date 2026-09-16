declare const firebase: any;

interface TrilhaAuthApi {
  initProtectedPage: () => Promise<void>;
  initLoginPage: () => Promise<void>;
  signOut: () => Promise<void>;
  currentUser: () => Promise<any>;
}

interface TrilhaIAApi {
  inicializar: () => void;
  atualizarPainel: () => void;
  gerarAnalise: () => Promise<void>;
  copiarAnalise: () => Promise<void>;
  imprimirRelatorio: () => void;
  salvarAnalise: () => Promise<void>;
}

interface TrilhaTurmaApi {
  iniciar: (tipo: "conhecidas" | "dificeis") => void;
  pausarOuContinuar: () => void;
  proxima: () => void;
}

interface Window {
  firebaseConfig?: Record<string, unknown>;
  TrilhaConteudo?: {
    palavrasConhecidas?: string[];
    palavrasDificeis?: string[];
  };
  trilhaFirestoreCollection?: string;
  TrilhaAuth?: TrilhaAuthApi;
  TrilhaIA?: TrilhaIAApi;
  TrilhaTurma?: TrilhaTurmaApi;
  trilhaEmulatorsConnected?: boolean;
}
