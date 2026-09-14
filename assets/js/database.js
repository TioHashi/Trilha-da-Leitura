const TrilhaDB = (() => {
  const chave = "trilhaLeituraResultados";
  const chaveFila = "trilhaLeituraFilaFirebase";
  let inicializacaoFirebase = null;

  function listar(){
    try{
      return JSON.parse(localStorage.getItem(chave)) || [];
    }catch{
      return [];
    }
  }

  function gravar(registros){
    localStorage.setItem(chave, JSON.stringify(registros));
  }

  async function salvar(registro){
    salvarLocal(registro);
    const firebaseResultado = await salvarFirebase(registro);
    if(!firebaseResultado.ok) enfileirar(registro);
    return {
      ...registro,
      destino:firebaseResultado.ok ? "firebase" : "local",
      erro:firebaseResultado.erro || ""
    };
  }

  function salvarLocal(registro){
    const registros = listar();
    const indice = registros.findIndex(item => item.id === registro.id);
    if(indice >= 0){
      registros[indice] = registro;
    }else{
      registros.push(registro);
    }
    gravar(registros);
    return registro;
  }

  function configuracaoFirebaseValida(){
    const config = window.firebaseConfig || {};
    return Boolean(
      window.firebase &&
      config.apiKey &&
      config.projectId &&
      config.appId &&
      !String(config.apiKey).includes("COLE_AQUI") &&
      !String(config.appId).includes("COLE_AQUI")
    );
  }

  async function obterFirestore(){
    if(inicializacaoFirebase) return inicializacaoFirebase;

    inicializacaoFirebase = new Promise(resolve => {
      try{
        if(!configuracaoFirebaseValida()){
          resolve(null);
          return;
        }
        if(!firebase.apps.length){
          firebase.initializeApp(window.firebaseConfig);
        }
        resolve(firebase.firestore());
      }catch(error){
        console.error("Erro ao inicializar Firebase:", error);
        resolve(null);
      }
    });

    return inicializacaoFirebase;
  }

  async function salvarFirebase(registro){
    if(!window.TrilhaAuth){
      return {ok:false, erro:"Autenticação não carregada."};
    }

    const usuario = await window.TrilhaAuth.currentUser();
    if(!usuario){
      return {ok:false, erro:"Faça login para sincronizar com o Firestore."};
    }

    const db = await obterFirestore();
    if(!db){
      return {ok:false, erro:"Firebase não inicializado. Verifique firebase-config.js e a conexão com a internet."};
    }

    try{
      const colecao = window.trilhaFirestoreCollection || "resultadosAlunos";
      const token = typeof usuario.getIdTokenResult === "function" ? await usuario.getIdTokenResult() : {claims:{}};
      const claims = token.claims || {};
      const turmaFinal = claims.turma ? String(claims.turma) : registro.turma;
      await db.collection(colecao).doc(registro.id).set({
        ...registro,
        professorUid: usuario.uid || "",
        professorEmail: usuario.email || "",
        professoresPermitidos: [usuario.uid || ""],
        escola: claims.escola ? String(claims.escola) : registro.escola,
        serie: claims.serie ? String(claims.serie) : serieDaTurma(turmaFinal),
        turma: turmaFinal,
        atualizadoEmFirebase: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
      return {ok:true};
    }catch(error){
      console.error("Erro ao salvar no Firestore:", error);
      return {ok:false, erro:error && error.message ? error.message : "Erro desconhecido ao salvar no Firestore."};
    }
  }

  function listarFila(){
    try{
      return JSON.parse(localStorage.getItem(chaveFila)) || [];
    }catch{
      return [];
    }
  }

  function salvarFila(fila){
    localStorage.setItem(chaveFila, JSON.stringify(fila));
  }

  function enfileirar(registro){
    const fila = listarFila();
    const indice = fila.findIndex(item => item.id === registro.id);
    if(indice >= 0){
      fila[indice] = registro;
    }else{
      fila.push(registro);
    }
    salvarFila(fila);
  }

  async function sincronizarPendentes(){
    const fila = listarFila();
    if(!fila.length) return;

    const pendentes = [];
    for(const registro of fila){
      const salvo = await salvarFirebase(registro);
      if(!salvo.ok) pendentes.push(registro);
    }
    salvarFila(pendentes);
  }

  function removerTodos(){
    localStorage.removeItem(chave);
    localStorage.removeItem(chaveFila);
  }

  function serieDaTurma(turma){
    const partes = String(turma || "").match(/^(\d+)\s*ANO/i);
    return partes ? `${partes[1]}º Ano` : "Série não informada";
  }

  window.addEventListener("online", sincronizarPendentes);
  sincronizarPendentes();

  return {listar, salvar, removerTodos, sincronizarPendentes};
})();
