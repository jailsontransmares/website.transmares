let contextoAcesso = {
  carregado: false,
  usuario: null,
  permissions: null
};

export function atualizarContextoAcessoHub(usuario, permissions) {
  contextoAcesso = {
    carregado: Boolean(usuario),
    usuario: usuario || null,
    permissions: permissions || null
  };
}

export function limparContextoAcessoHub() {
  contextoAcesso = {
    carregado: false,
    usuario: null,
    permissions: null
  };
}

export function obterContextoAcessoHub() {
  return contextoAcesso;
}
