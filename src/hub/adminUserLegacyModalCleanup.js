const CLEANUP_DELAYS = [0, 40, 90, 180, 360, 700, 1200, 1800];
const WRAPPED_FLAG = '__hubAdminLegacyModalCleanupWrapped';

const FUNCTIONS_TO_WRAP = [
  'abrirTelaPermissoesUsuarioAdmin',
  'abrirTelaEditarUsuarioAdmin',
  'voltarListaUsuariosAdmin',
  'salvarPermissoesUsuarioAdmin',
  'hubAdminPermissoesSalvarAlteracoes',
  'hubAdminPermissoesVoltarParaUsuario',
  'editarUsuarioAdmin',
  'abrirPermissoesUsuarioAdmin',
  'abrirModalNovoRegistro',
  'fecharModalNovoRegistro'
];

function getUserScreenState() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoUsuarioTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function isUserScreenActive() {
  return Boolean(getUserScreenState().modo);
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

function isPermissionsModal(modal) {
  return Boolean(
    modal?.classList?.contains('is-permissions-stage')
    || modal?.querySelector?.('.permission-modal-layout')
    || modal?.querySelector?.('.admin-user-permissions-actions')
  );
}

function isUserAdminModal(modal) {
  return Boolean(
    modal?.classList?.contains('admin-user-modal')
    || modal?.querySelector?.('[id^="usuario_"]')
    || modal?.querySelector?.('.permission-modal-layout')
    || modal?.querySelector?.('.admin-user-permissions-actions')
  );
}

function shouldRemoveLegacyModal(modal) {
  if (!isUserScreenActive() || !isUserAdminModal(modal)) return false;

  if (isPermissionsModal(modal)) {
    return isPermissionsScreenActive() && isDirectPermissionsReady();
  }

  return true;
}

function shouldRemoveBackdrop(backdrop) {
  if (!isUserScreenActive()) return false;

  const modal = backdrop.querySelector('.admin-user-modal');
  if (modal) return shouldRemoveLegacyModal(modal);

  return Boolean(
    backdrop.querySelector('.permission-modal-layout') && isPermissionsScreenActive() && isDirectPermissionsReady()
  );
}

function cleanupBodyModalState() {
  if (document.querySelector('.modal-backdrop')) return;

  document.body.classList.remove('modal-open', 'no-scroll', 'is-modal-open');

  if (document.body.style.overflow === 'hidden') {
    document.body.style.removeProperty('overflow');
  }
}

function removeLegacyUserModals() {
  if (!isUserScreenActive()) return;

  document.querySelectorAll('.admin-user-modal').forEach(modal => {
    if (!shouldRemoveLegacyModal(modal)) return;

    const backdrop = modal.closest('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
      return;
    }

    modal.remove();
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    if (shouldRemoveBackdrop(backdrop)) {
      backdrop.remove();
    }
  });

  cleanupBodyModalState();
}

function scheduleLegacyUserModalCleanup() {
  CLEANUP_DELAYS.forEach(delay => window.setTimeout(removeLegacyUserModals, delay));
}

function wrapFunctionForCleanup(name) {
  const original = window[name];
  if (typeof original !== 'function' || original[WRAPPED_FLAG]) return;

  function wrappedLegacyCleanupFunction(...args) {
    try {
      const result = original.apply(this, args);
      if (result && typeof result.finally === 'function') {
        return result.finally(scheduleLegacyUserModalCleanup);
      }

      scheduleLegacyUserModalCleanup();
      return result;
    } catch (error) {
      scheduleLegacyUserModalCleanup();
      throw error;
    }
  }

  wrappedLegacyCleanupFunction[WRAPPED_FLAG] = true;
  wrappedLegacyCleanupFunction.__original = original;
  window[name] = wrappedLegacyCleanupFunction;
}

function installPostRenderCleanupHooks() {
  FUNCTIONS_TO_WRAP.forEach(wrapFunctionForCleanup);
}

function scheduleHookInstallation() {
  CLEANUP_DELAYS.forEach(delay => window.setTimeout(installPostRenderCleanupHooks, delay));
}

function runPostRenderCleanup() {
  installPostRenderCleanupHooks();
  scheduleLegacyUserModalCleanup();
}

window.hubAdminLimparModaisLegadosPermissoes = removeLegacyUserModals;
window.hubAdminAgendarLimpezaModaisLegadosUsuario = scheduleLegacyUserModalCleanup;

window.addEventListener('hubAdminUsuarioTelaAtualizada', runPostRenderCleanup);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', runPostRenderCleanup);
window.addEventListener('load', runPostRenderCleanup);
window.addEventListener('click', () => window.setTimeout(runPostRenderCleanup, 0));
window.addEventListener('change', () => window.setTimeout(runPostRenderCleanup, 0));
window.addEventListener('submit', () => window.setTimeout(runPostRenderCleanup, 0));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    scheduleHookInstallation();
    runPostRenderCleanup();
  });
} else {
  scheduleHookInstallation();
  runPostRenderCleanup();
}
