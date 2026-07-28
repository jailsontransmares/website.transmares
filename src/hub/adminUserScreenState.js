const ESTADO_PADRAO_USUARIO_TELA = Object.freeze({
  modo: '',
  id: '',
  etapa: 'dados'
});

const estadoUsuarioTela = {
  ...ESTADO_PADRAO_USUARIO_TELA
};

let renderizacaoSolicitada = false;

function normalizarEtapa(etapa = '') {
  return etapa === 'permissoes' ? 'permissoes' : 'dados';
}

function normalizarModo(modo = '') {
  return modo === 'novo' || modo === 'editar' ? modo : '';
}

function obterEstadoUsuarioTelaAdmin() {
  return { ...estadoUsuarioTela };
}

function solicitarRenderizacaoUsuarioTelaAdmin() {
  if (renderizacaoSolicitada) return;
  renderizacaoSolicitada = true;

  window.requestAnimationFrame(() => {
    renderizacaoSolicitada = false;
    window.dispatchEvent(new CustomEvent('hubAdminUsuarioTelaRenderSolicitado', {
      detail: obterEstadoUsuarioTelaAdmin()
    }));

    if (typeof window.renderAdministracao === 'function') {
      window.renderAdministracao();
    }
  });
}

function definirEstadoUsuarioTelaAdmin(proximoEstado = {}, options = {}) {
  const modo = normalizarModo(proximoEstado.modo || '');

  estadoUsuarioTela.modo = modo;
  estadoUsuarioTela.id = modo === 'editar' ? String(proximoEstado.id || '') : '';
  estadoUsuarioTela.etapa = modo ? normalizarEtapa(proximoEstado.etapa || 'dados') : 'dados';

  window.dispatchEvent(new CustomEvent('hubAdminUsuarioTelaAtualizada', {
    detail: obterEstadoUsuarioTelaAdmin()
  }));

  if (options.render !== false) {
    solicitarRenderizacaoUsuarioTelaAdmin();
  }

  return obterEstadoUsuarioTelaAdmin();
}

function abrirTelaNovoUsuarioAdmin() {
  return definirEstadoUsuarioTelaAdmin({
    modo: 'novo',
    id: '',
    etapa: 'dados'
  });
}

function abrirTelaEditarUsuarioAdmin(id = '') {
  return definirEstadoUsuarioTelaAdmin({
    modo: 'editar',
    id,
    etapa: 'dados'
  });
}

function abrirTelaPermissoesUsuarioAdmin(id = '') {
  return definirEstadoUsuarioTelaAdmin({
    modo: 'editar',
    id,
    etapa: 'permissoes'
  });
}

function voltarListaUsuariosAdmin() {
  return definirEstadoUsuarioTelaAdmin({
    ...ESTADO_PADRAO_USUARIO_TELA
  });
}

function usuarioTelaEstaAbertaAdmin() {
  return Boolean(estadoUsuarioTela.modo);
}

function usuarioTelaEstaEmPermissoesAdmin() {
  return estadoUsuarioTela.modo === 'editar' && estadoUsuarioTela.etapa === 'permissoes';
}

Object.assign(window, {
  hubObterEstadoUsuarioTelaAdmin: obterEstadoUsuarioTelaAdmin,
  hubDefinirEstadoUsuarioTelaAdmin: definirEstadoUsuarioTelaAdmin,
  hubSolicitarRenderizacaoUsuarioTelaAdmin: solicitarRenderizacaoUsuarioTelaAdmin,
  usuarioTelaEstaAbertaAdmin,
  usuarioTelaEstaEmPermissoesAdmin,
  abrirTelaNovoUsuarioAdmin,
  abrirTelaEditarUsuarioAdmin,
  abrirTelaPermissoesUsuarioAdmin,
  voltarListaUsuariosAdmin
});