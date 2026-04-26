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
    const salvoFirebase = await salvarFirebase(registro);
    if(!salvoFirebase) enfileirar(registro);
    return {...registro, destino:salvoFirebase ? "firebase" : "local"};
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
      }catch{
        resolve(null);
      }
    });

    return inicializacaoFirebase;
  }

  async function salvarFirebase(registro){
    const db = await obterFirestore();
    if(!db) return false;

    try{
      const colecao = window.trilhaFirestoreCollection || "resultadosAlunos";
      await db.collection(colecao).doc(registro.id).set({
        ...registro,
        atualizadoEmFirebase: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
      return true;
    }catch{
      return false;
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
      if(!salvo) pendentes.push(registro);
    }
    salvarFila(pendentes);
  }

  function removerTodos(){
    localStorage.removeItem(chave);
    localStorage.removeItem(chaveFila);
  }

  window.addEventListener("online", sincronizarPendentes);
  sincronizarPendentes();

  return {listar, salvar, removerTodos, sincronizarPendentes};
})();
