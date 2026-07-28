const STYLE_ID = 'admin-user-modal-retirement-style';
let observerInstalled = false;
let syncing = false;

function obterEstadoTelaUsuario() {
  return typeof window.hubObterEstadoUsuarioTelaAdmin === 'function'
    ? window.hubObterEstadoUsuarioTelaAdmin()
    : { modo: '', id: '', etapa: 'dados' };
}

function definirEstadoTelaUsuario(estado) {
  if (typeof window.hubDefinirEstadoUsuarioTelaAdmin === 'function') {
    window.hubDefinirEstadoUsuarioTelaAdmin(estado);
  }
}

function obterModalUsuarioSolto() {
  return Array.from(document.querySelectorAll('.modal-backdrop')).find(backdrop => {
    if (backdrop.closest('.admin-user-fixed-shell')) return false;
    return Boolean(backdrop.querySelector('.admin-user-modal'));
  }) || null;
}

function obterIdUsuarioDoModal(modal) {
  const inputEmail = modal?.querySelector('input[id^="usuario_"][id$="_email"]');
  const id = inputEmail?.id?.replace(/^usuario_/, '').replace(/_email$/, '') || '';
  return id === 'novo' ? '' : id;
}

function inferirEstadoPeloModal(backdrop) {
  const modal = backdrop?.querySelector('.admin-user-modal');
  if (!modal) return null;

  const id = obterIdUsuarioDoModal(modal);
  const emPermissoes = Boolean(modal.querySelector('.permission-modal-layout'));
  const titulo = modal.querySelector('.small-modal-header h3')?.textContent?.trim().toLowerCase() || '';

  if (emPermissoes || titulo.includes('permiss')) {
    return id ? { modo: 'editar', id, etapa: 'permissoes' } : null;
  }

  if (id) {
    return { modo: 'editar', id, etapa: 'dados' };
  }

  return { modo: 'novo', id: '', etapa: 'dados' };
}

function injetarEstilos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-modal-retired {
      display: none !important;
      pointer-events: none !important;
      opacity: 0 !important;
    }

    .admin-user-fixed-shell .admin-user-modal-retired {
      display: contents !important;
      pointer-events: auto !important;
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);
}

function aposentarModalSolto() {
  if (syncing) return;

  const backdrop = obterModalUsuarioSolto();
  if (!backdrop) return;

  const estadoAtual = obterEstadoTelaUsuario();
  const estadoInferido = inferirEstadoPeloModal(backdrop);

  backdrop.classList.add('admin-user-modal-retired');

  if (!estadoInferido) return;

  const precisaSincronizar = !estadoAtual.modo
    || estadoAtual.modo !== estadoInferido.modo
    || estadoAtual.id !== estadoInferido.id
    || estadoAtual.etapa !== estadoInferido.etapa;

  if (!precisaSincronizar) {
    window.dispatchEvent(new CustomEvent('hubAdminUsuarioTelaRenderSolicitado', { detail: estadoAtual }));
    return;
  }

  syncing = true;
  try {
    definirEstadoTelaUsuario(estadoInferido);
  } finally {
    window.setTimeout(() => {
      syncing = false;
      window.dispatchEvent(new CustomEvent('hubAdminUsuarioTelaRenderSolicitado', { detail: obterEstadoTelaUsuario() }));
    }, 0);
  }
}

function limparAposentadoriaNaTelaFixa() {
  document.querySelectorAll('.admin-user-fixed-shell .admin-user-modal-retired').forEach(backdrop => {
    backdrop.classList.remove('admin-user-modal-retired');
  });
}

function aplicar() {
  injetarEstilos();
  limparAposentadoriaNaTelaFixa();
  aposentarModalSolto();
}

function instalarObserver() {
  if (observerInstalled) return;
  observerInstalled = true;

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(aplicar);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
}

function iniciar() {
  aplicar();
  instalarObserver();
  window.addEventListener('hubAdminUsuarioTelaAtualizada', aplicar);
  window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', aplicar);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
