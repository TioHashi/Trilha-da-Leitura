const TrilhaDB = (() => {
  const chave = "trilhaLeituraResultados";

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

  function salvar(registro){
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

  function removerTodos(){
    localStorage.removeItem(chave);
  }

  return {listar, salvar, removerTodos};
})();
