const SYNC_EVENT = 'hubAdminUsuarioTelaAtualizada';

let sincronizando = false;
let voltarOriginal = null;

function obterEstadoTelaUsuario() {
  return typeof window.hubObterEstadoUsuarioTelaAdmin === 'function'
    ? window.hubObterEstadoUsuarioTelaAdmin()
    : { modo: '', id: '', etapa: 'dados' };
}

function obterModalUsuario() {
  return document.querySelector('.admin-user-modal');
}

function modalEstaEmPermissoes() {
  return Boolean(obterModalUsuario()?.querySelector('.permission-modal-layout'));
}

function solicitarAplicacaoTelaFixa() {
  window.requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('hubAdminUsuarioTelaRenderSolicitado', {
      detail: obterEstadoTelaUsuario()
    }));
  });
}

function sincronizarFluxoLegadoComTelaFixa() {
  if (sincronizando) return;

  const estado = obterEstadoTelaUsuario();
  if (!estado.modo) return;

  const modal = obterModalUsuario();
  const emPermissoes = modalEstaEmPermissoes();

  if (estado.etapa === 'permissoes') {
    if (!estado.id || emPermissoes) return;

    sincronizando = true;
    Promise.resolve(window.abrirPermissoesUsuarioAdmin?.(estado.id, { manterMensagem: true }))
      .finally(() => {
        sincronizando = false;
        solicitarAplicacaoTelaFixa();
      });
    return;
  }

  if (estado.etapa === 'dados' && modal && emPermissoes && typeof window.abrirModalUsuarioAdmin === 'function') {
    sincronizando = true;
    try {
      window.abrirModalUsuarioAdmin(estado.modo === 'editar' ? estado.id : '');
    } finally {
      sincronizando = false;
      solicitarAplicacaoTelaFixa();
    }
  }
}

function instalarVoltarIntegrado() {
  if (voltarOriginal || typeof window.voltarListaUsuariosAdmin !== 'function') return;

  voltarOriginal = window.voltarListaUsuariosAdmin;
  window.voltarListaUsuariosAdmin = function voltarListaUsuariosAdminIntegrado() {
    if (sincronizando) {
      return voltarOriginal.apply(this, arguments);
    }

    const temFluxoUsuarioAberto = Boolean(obterModalUsuario()) || Boolean(obterEstadoTelaUsuario().modo);

    if (temFluxoUsuarioAberto && typeof window.fecharModalNovoRegistro === 'function') {
      sincronizando = true;
      try {
        return window.fecharModalNovoRegistro();
      } finally {
        window.setTimeout(() => {
          sincronizando = false;
          voltarOriginal();
          solicitarAplicacaoTelaFixa();
        }, 0);
      }
    }

    return voltarOriginal.apply(this, arguments);
  };
}

function ajustarBotoesAcoes() {
  const estado = obterEstadoTelaUsuario();
  if (!estado.modo) return;

  document.querySelectorAll('.admin-user-fixed-shell .small-modal-actions .secondary-btn').forEach(botao => {
    if ((botao.textContent || '').trim().toLowerCase() === 'cancelar') {
      botao.textContent = 'Voltar';
      botao.setAttribute('onclick', 'voltarListaUsuariosAdmin()');
    }
  });
}

function aplicarIntegracao() {
  instalarVoltarIntegrado();
  sincronizarFluxoLegadoComTelaFixa();
  ajustarBotoesAcoes();
}

function iniciar() {
  aplicarIntegracao();
  window.addEventListener(SYNC_EVENT, aplicarIntegracao);
  window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', aplicarIntegracao);

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(aplicarIntegracao);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
