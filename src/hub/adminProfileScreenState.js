const ESTADO_PADRAO_PERFIL_TELA = Object.freeze({
  modo: '',
  id: '',
  etapa: 'dados'
});

const estadoPerfilTela = {
  ...ESTADO_PADRAO_PERFIL_TELA
};

let renderizacaoPerfilSolicitada = false;

function normalizarEtapaPerfil(etapa = '') {
  return etapa === 'permissoes' ? 'permissoes' : 'dados';
}

function normalizarModoPerfil(modo = '') {
  return modo === 'novo' || modo === 'editar' ? modo : '';
}

function obterEstadoPerfilTelaAdmin() {
  return { ...estadoPerfilTela };
}

function fecharTelaUsuarioAoAbrirPerfil() {
  if (typeof window.hubDefinirEstadoUsuarioTelaAdmin !== 'function') return;

  const estadoUsuario = typeof window.hubObterEstadoUsuarioTelaAdmin === 'function'
    ? window.hubObterEstadoUsuarioTelaAdmin()
    : null;

  if (!estadoUsuario?.modo) return;

  window.hubDefinirEstadoUsuarioTelaAdmin({
    modo: '',
    id: '',
    etapa: 'dados'
  }, { render: false });
}

function solicitarRenderizacaoPerfilTelaAdmin() {
  if (renderizacaoPerfilSolicitada) return;
  renderizacaoPerfilSolicitada = true;

  window.requestAnimationFrame(() => {
    renderizacaoPerfilSolicitada = false;

    window.dispatchEvent(new CustomEvent('hubAdminPerfilTelaRenderSolicitado', {
      detail: obterEstadoPerfilTelaAdmin()
    }));

    if (typeof window.renderAdministracao === 'function') {
      window.renderAdministracao();
    }
  });
}

function definirEstadoPerfilTelaAdmin(proximoEstado = {}, options = {}) {
  const modo = normalizarModoPerfil(proximoEstado.modo || '');

  if (modo && options.fecharUsuario !== false) {
    fecharTelaUsuarioAoAbrirPerfil();
  }

  estadoPerfilTela.modo = modo;
  estadoPerfilTela.id = modo === 'editar' ? String(proximoEstado.id || '') : '';
  estadoPerfilTela.etapa = modo ? normalizarEtapaPerfil(proximoEstado.etapa || 'dados') : 'dados';

  window.dispatchEvent(new CustomEvent('hubAdminPerfilTelaAtualizada', {
    detail: obterEstadoPerfilTelaAdmin()
  }));

  if (options.render !== false) {
    solicitarRenderizacaoPerfilTelaAdmin();
  }

  return obterEstadoPerfilTelaAdmin();
}

function abrirTelaNovoPerfilAdmin() {
  return definirEstadoPerfilTelaAdmin({
    modo: 'novo',
    id: '',
    etapa: 'dados'
  });
}

function abrirTelaEditarPerfilAdmin(id = '') {
  return definirEstadoPerfilTelaAdmin({
    modo: 'editar',
    id,
    etapa: 'dados'
  });
}

function abrirTelaPermissoesPerfilAdmin(id = '') {
  return definirEstadoPerfilTelaAdmin({
    modo: 'editar',
    id,
    etapa: 'permissoes'
  });
}

function voltarListaPerfisAdmin() {
  return definirEstadoPerfilTelaAdmin({
    ...ESTADO_PADRAO_PERFIL_TELA
  });
}

function perfilTelaEstaAbertaAdmin() {
  return Boolean(estadoPerfilTela.modo);
}

function perfilTelaEstaEmPermissoesAdmin() {
  return estadoPerfilTela.modo === 'editar' && estadoPerfilTela.etapa === 'permissoes';
}

Object.assign(window, {
  hubObterEstadoPerfilTelaAdmin: obterEstadoPerfilTelaAdmin,
  hubDefinirEstadoPerfilTelaAdmin: definirEstadoPerfilTelaAdmin,
  hubSolicitarRenderizacaoPerfilTelaAdmin: solicitarRenderizacaoPerfilTelaAdmin,
  perfilTelaEstaAbertaAdmin,
  perfilTelaEstaEmPermissoesAdmin,
  abrirTelaNovoPerfilAdmin,
  abrirTelaEditarPerfilAdmin,
  abrirTelaPermissoesPerfilAdmin,
  voltarListaPerfisAdmin
});
