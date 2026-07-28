const CLEANUP_DELAYS = [0, 60, 140, 300, 600, 1000, 1600];

function getUserScreenState() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoUsuarioTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function isPermissionsScreenActive() {
  const state = getUserScreenState();
  return state.modo === 'editar' && state.etapa === 'permissoes';
}

function getDirectPermissionsScope() {
  return document.querySelector('.admin-user-direct-permissions');
}

function isDirectPermissionsReady() {
  const scope = getDirectPermissionsScope();
  if (!scope) return false;

  return Boolean(scope.querySelector('.permission-modal-layout'));
}

function isPermissionsBackdrop(backdrop) {
  if (!backdrop) return false;

  return Boolean(
    backdrop.querySelector('.admin-user-modal.is-permissions-stage')
    || backdrop.querySelector('.permission-modal-layout')
    || backdrop.querySelector('.admin-user-permissions-actions')
  );
}

function cleanupBodyModalState() {
  if (document.querySelector('.modal-backdrop')) return;

  document.body.classList.remove('modal-open', 'no-scroll', 'is-modal-open');

  if (document.body.style.overflow === 'hidden') {
    document.body.style.removeProperty('overflow');
  }
}

function removeLegacyPermissionModals() {
  if (!isPermissionsScreenActive() || !isDirectPermissionsReady()) return;

  document.querySelectorAll('.admin-user-modal.is-permissions-stage').forEach(modal => {
    const backdrop = modal.closest('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
      return;
    }

    modal.remove();
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    if (isPermissionsBackdrop(backdrop)) {
      backdrop.remove();
    }
  });

  cleanupBodyModalState();
}

function scheduleLegacyPermissionCleanup() {
  CLEANUP_DELAYS.forEach(delay => window.setTimeout(removeLegacyPermissionModals, delay));
}

window.hubAdminLimparModaisLegadosPermissoes = removeLegacyPermissionModals;

window.addEventListener('hubAdminUsuarioTelaAtualizada', scheduleLegacyPermissionCleanup);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', scheduleLegacyPermissionCleanup);
window.addEventListener('load', scheduleLegacyPermissionCleanup);
window.addEventListener('click', () => window.setTimeout(scheduleLegacyPermissionCleanup, 0));
window.addEventListener('change', () => window.setTimeout(scheduleLegacyPermissionCleanup, 0));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleLegacyPermissionCleanup);
} else {
  scheduleLegacyPermissionCleanup();
}
