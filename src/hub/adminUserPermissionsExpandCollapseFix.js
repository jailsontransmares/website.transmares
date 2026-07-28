let refreshQueued = false;
let handling = false;

function normalizeUserPermissionText(text = '') {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function getUserPermissionScreenState() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoUsuarioTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function isUserPermissionScreenActive() {
  const state = getUserPermissionScreenState();
  return state.modo === 'editar' && state.etapa === 'permissoes' && Boolean(state.id);
}

function getUserPermissionScope() {
  return document.querySelector('.admin-user-direct-permissions');
}

function isIgnoredUserPermissionControl(control) {
  return Boolean(
    control?.closest?.('.admin-user-permission-actions-menu')
    || control?.closest?.('#admin-user-permission-floating-menu')
    || control?.closest?.('.admin-user-permissions-clean-footer')
  );
}

function getExpandCollapseUserAction(control) {
  const label = normalizeUserPermissionText(
    control?.textContent || control?.getAttribute?.('aria-label') || control?.title || ''
  );

  if (label === 'expandir todos' || label.includes('expandir todos')) return 'expand';
  if (label === 'recolher todos' || label.includes('recolher todos')) return 'collapse';
  return '';
}

function cleanupLegacyModalAfterDirectRender() {
  window.setTimeout(() => {
    if (typeof window.hubAdminLimparModaisLegadosPermissoes === 'function') {
      window.hubAdminLimparModaisLegadosPermissoes();
    }
  }, 160);
}

function queueDirectUserPermissionRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;

  window.requestAnimationFrame(() => {
    refreshQueued = false;

    window.dispatchEvent(new CustomEvent('hubAdminUsuarioTelaRenderSolicitado', {
      detail: getUserPermissionScreenState()
    }));

    cleanupLegacyModalAfterDirectRender();
  });
}

function executeUserPermissionExpandCollapse(action) {
  if (typeof window.alternarTodosModulosPermissoesUsuario !== 'function') return;

  handling = true;
  try {
    window.alternarTodosModulosPermissoesUsuario(action === 'expand');
  } finally {
    handling = false;
    queueDirectUserPermissionRefresh();
  }
}

function stopUserPermissionEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function handleUserPermissionExpandCollapse(event) {
  if (handling || !isUserPermissionScreenActive()) return;

  const scope = getUserPermissionScope();
  const control = event.target?.closest?.('button, a, [role="button"]');
  if (!scope || !control || !scope.contains(control)) return;
  if (isIgnoredUserPermissionControl(control)) return;

  const action = getExpandCollapseUserAction(control);
  if (!action) return;

  stopUserPermissionEvent(event);
  executeUserPermissionExpandCollapse(action);
}

document.addEventListener('click', handleUserPermissionExpandCollapse, true);
