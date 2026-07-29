function criarContextoVazio() {
  return {
    carregado: false,
    invalidado: false,
    motivoInvalidacao: '',
    usuario: null,
    perfil: null,
    permissions: null,
    modulos: [],
    cards: [],
    config: null,
    meta: null
  };
}

let contextoAcesso = criarContextoVazio();
const aguardandoContexto = new Set();
const observadoresContexto = new Set();

function liberarConsumidoresPendentes() {
  if (!contextoAcesso.carregado) return;

  aguardandoContexto.forEach(resolver => resolver(contextoAcesso));
  aguardandoContexto.clear();
}

function notificarObservadores() {
  observadoresContexto.forEach(observador => observador(contextoAcesso));
}

export function atualizarContextoInicialHub(dados = {}) {
  const usuario = dados.usuario || null;
  const modulos = Array.isArray(dados.modulos)
    ? dados.modulos
    : (Array.isArray(dados.cards) ? dados.cards : []);

  contextoAcesso = {
    carregado: Boolean(usuario),
    invalidado: false,
    motivoInvalidacao: '',
    usuario,
    perfil: dados.perfil || usuario?.perfil || null,
    permissions: dados.permissions || null,
    modulos,
    cards: modulos,
    config: dados.config || null,
    meta: dados.meta || null
  };

  liberarConsumidoresPendentes();
  notificarObservadores();
  return contextoAcesso;
}

// Compatibilidade temporária com consumidores anteriores à centralização.
export function atualizarContextoAcessoHub(usuario, permissions) {
  return atualizarContextoInicialHub({
    ...contextoAcesso,
    usuario,
    permissions
  });
}

export function limparContextoAcessoHub() {
  contextoAcesso = criarContextoVazio();
  notificarObservadores();
}

export function invalidarContextoAcessoHub(motivo = '') {
  contextoAcesso = {
    ...contextoAcesso,
    invalidado: true,
    motivoInvalidacao: String(motivo || '')
  };
  notificarObservadores();
  return contextoAcesso;
}

export function obterContextoAcessoHub() {
  return contextoAcesso;
}

export function aguardarContextoAcessoHub({ timeoutMs = 0 } = {}) {
  if (contextoAcesso.carregado) {
    return Promise.resolve(contextoAcesso);
  }

  return new Promise(resolve => {
    let timer = null;
    const concluir = contexto => {
      if (timer) globalThis.clearTimeout(timer);
      aguardandoContexto.delete(concluir);
      resolve(contexto);
    };

    aguardandoContexto.add(concluir);

    if (timeoutMs > 0) {
      timer = globalThis.setTimeout(() => concluir(null), timeoutMs);
    }
  });
}

export function observarContextoAcessoHub(observador) {
  if (typeof observador !== 'function') {
    return () => {};
  }

  observadoresContexto.add(observador);
  return () => observadoresContexto.delete(observador);
}
