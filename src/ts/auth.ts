const janelaAuth = window;
const AUTH_READY_CLASS = "auth-ready";
const AUTH_REQUIRED_PAGES = ["index.html", "dashboard.html", "analises.html", "trilha-turma.html", ""];

function isFirebaseAvailable(): boolean {
  return Boolean(janelaAuth.firebaseConfig && typeof firebase !== "undefined");
}

function initializeFirebase(): any {
  if (!isFirebaseAvailable()) {
    throw new Error("Sistema de acesso nao carregado.");
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(janelaAuth.firebaseConfig);
  }

  connectEmulatorsWhenLocal();
  return firebase;
}

function connectEmulatorsWhenLocal(): void {
  if (janelaAuth.trilhaEmulatorsConnected) return;

  if (!isLocalDevelopmentHost(window.location.hostname)) return;
  const emulatorHost = getLocalEmulatorHost(window.location.hostname);

  try {
    firebase.auth().useEmulator(`http://${emulatorHost}:9099`, { disableWarnings: true });
  } catch {
    // O SDK pode lancar se o emulador ja tiver sido conectado.
  }

  try {
    firebase.firestore().useEmulator(emulatorHost, 8085);
  } catch {
    // O SDK pode lancar se alguma instancia do Firestore ja tiver sido usada.
  }

  if (typeof firebase.functions === "function") {
    try {
      firebase.functions().useEmulator(emulatorHost, 5001);
    } catch {
      // O SDK pode lancar se alguma instancia de Functions ja tiver sido usada.
    }
  }

  janelaAuth.trilhaEmulatorsConnected = true;
}

function isLocalDevelopmentHost(hostname: string): boolean {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === ""
    || hostname.startsWith("192.168.")
    || hostname.startsWith("10.")
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
}

function getLocalEmulatorHost(hostname: string): string {
  return hostname === "localhost" || hostname === "" ? "127.0.0.1" : hostname;
}

function getPageName(): string {
  const pathname = window.location.pathname;
  return pathname.slice(pathname.lastIndexOf("/") + 1);
}

function getLoginUrl(): string {
  const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const params = new URLSearchParams({ redirect: target });
  return `login.html?${params.toString()}`;
}

function getRedirectAfterLogin(): string {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect || redirect.startsWith("http://") || redirect.startsWith("https://") || redirect.startsWith("//")) {
    return "index.html";
  }
  return redirect;
}

function setAuthStatus(message: string): void {
  const status = document.querySelector<HTMLElement>("[data-auth-status]");
  if (status) status.textContent = message;
}

function showDocument(): void {
  document.documentElement.classList.add(AUTH_READY_CLASS);
}

function currentUser(): Promise<any> {
  initializeFirebase();
  return new Promise((resolve) => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user: any) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function initProtectedPage(): Promise<void> {
  try {
    initializeFirebase();
    firebase.auth().onAuthStateChanged((user: any) => {
      if (!user && AUTH_REQUIRED_PAGES.includes(getPageName())) {
        window.location.replace(getLoginUrl());
        return;
      }

      if (user) {
        const email = user.email ? String(user.email) : "usuario autenticado";
        setAuthStatus(`Sessao ativa: ${email}`);
      }
      showDocument();
    });
  } catch (error) {
    setAuthStatus(error instanceof Error ? error.message : "Erro ao inicializar autenticacao.");
    showDocument();
  }
}

async function initLoginPage(): Promise<void> {
  showDocument();

  try {
    initializeFirebase();
  } catch (error) {
    setAuthStatus(error instanceof Error ? error.message : "Erro ao inicializar autenticacao.");
    return;
  }

  firebase.auth().onAuthStateChanged((user: any) => {
    if (user) window.location.replace(getRedirectAfterLogin());
  });

  const form = document.querySelector<HTMLFormElement>("[data-login-form]");
  const email = document.querySelector<HTMLInputElement>("#email");
  const password = document.querySelector<HTMLInputElement>("#password");
  const resetPassword = document.querySelector<HTMLButtonElement>("[data-reset-password]");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
    const emailValue = email?.value.trim() ?? "";
    const passwordValue = password?.value ?? "";

    if (!emailValue || !passwordValue) {
      setAuthStatus("Informe e-mail e senha.");
      return;
    }

    submitButton?.setAttribute("disabled", "true");
    setAuthStatus("Entrando...");

    try {
      await firebase.auth().signInWithEmailAndPassword(emailValue, passwordValue);
      window.location.replace(getRedirectAfterLogin());
    } catch {
      setAuthStatus("Nao foi possivel entrar. Verifique e-mail, senha e se o servidor local esta ativo.");
      submitButton?.removeAttribute("disabled");
    }
  });

  resetPassword?.addEventListener("click", async () => {
    const emailValue = email?.value.trim() ?? "";
    if (!emailValue) {
      setAuthStatus("Informe o e-mail cadastrado para redefinir a senha.");
      email?.focus();
      return;
    }

    resetPassword.setAttribute("disabled", "true");
    setAuthStatus("Enviando e-mail de redefinicao...");

    try {
      await firebase.auth().sendPasswordResetEmail(emailValue);
      setAuthStatus("Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.");
    } catch {
      setAuthStatus("Nao foi possivel enviar o e-mail de redefinicao. Verifique o e-mail informado.");
    } finally {
      resetPassword.removeAttribute("disabled");
    }
  });
}

async function signOut(): Promise<void> {
  initializeFirebase();
  await firebase.auth().signOut();
  window.location.replace("login.html");
}

janelaAuth.TrilhaAuth = {
  initProtectedPage,
  initLoginPage,
  signOut,
  currentUser
};
