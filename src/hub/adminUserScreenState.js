const ESTADO_PADRAO_USUARIO_TELA = Object.freeze({
  modo: '',
  id: '',
  etapa: 'dados'
});

const estadoUsuarioTela = {
  ...ESTADO_PADRAO_USUARIO_TELA
};

function normalizarEtapa(etapa = '') {
  return etapa === 'permissoes' ? 'permissoes' : 'dados';
}

function normalizarModo(modo = '') {
  return modo === 'novo' || modo === 'editar' ? modo : '';
}

function obterEstadoUsuarioTelaAdmin() {
  return { ...estadoUsuarioTela };
}

function definirEstadoUsuarioTelaAdmin(proximoEstado = {}) {
  const modo = normalizarModo(proximoEstado.modo || '');

  estadoUsuarioTela.modo = modo;
  estadoUsuarioTela.id = modo === 'editar' ? String(proximoEstado.id || '') : '';
  estadoUsuarioTela.etapa = modo ? normalizarEtapa(proximoEstado.etapa || 'dados') : 'dados';

  window.dispatchEvent(new CustomEvent('hubAdminUsuarioTelaAtualizada', {
    detail: obterEstadoUsuarioTelaAdmin()
  }));

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

Object.assign(window, {
  hubObterEstadoUsuarioTelaAdmin: obterEstadoUsuarioTelaAdmin,
  hubDefinirEstadoUsuarioTelaAdmin: definirEstadoUsuarioTelaAdmin,
  abrirTelaNovoUsuarioAdmin,
  abrirTelaEditarUsuarioAdmin,
  abrirTelaPermissoesUsuarioAdmin,
  voltarListaUsuariosAdmin
});
