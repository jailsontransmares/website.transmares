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

function normalizeText(text = '') {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

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

function getExpandCollapseAction(control) {
  const label = normalizeText(control?.textContent || control?.getAttribute?.('aria-label') || control?.title || '');

  if (label === 'expandir todos' || label.includes('expandir todos')) return 'expand';
  if (label === 'recolher todos' || label.includes('recolher todos')) return 'collapse';

  return '';
}

function isInsideActionsOrFooter(control) {
  return Boolean(
    control.closest('.admin-user-permission-actions-menu')
    || control.closest('#admin-user-permission-floating-menu')
    || control.closest('.admin-user-permissions-clean-footer')
  );
}

function getControlledElement(control) {
  const id = control?.getAttribute?.('aria-controls');
  if (!id) return null;

  try {
    return document.getElementById(id) || document.querySelector(`#${CSS.escape(id)}`);
  } catch (_error) {
    return document.getElementById(id);
  }
}

function setContentVisibility(element, expanded) {
  if (!element) return;

  element.hidden = !expanded;
  element.style.display = expanded ? '' : 'none';
}

function setPermissionContainerExpanded(container, expanded) {
  if (!container) return;

  if (container.tagName === 'DETAILS') {
    container.open = expanded;
  }

  container.classList.toggle('is-open', expanded);
  container.classList.toggle('open', expanded);
  container.classList.toggle('expanded', expanded);
  container.classList.toggle('is-expanded', expanded);
  container.classList.toggle('is-collapsed', !expanded);
  container.classList.toggle('collapsed', !expanded);
  container.classList.toggle('closed', !expanded);

  if (container.hasAttribute('aria-expanded')) {
    container.setAttribute('aria-expanded', String(expanded));
  }

  container.querySelectorAll('[aria-expanded]').forEach(control => {
    if (isInsideActionsOrFooter(control)) return;
    if (getExpandCollapseAction(control)) return;

    control.setAttribute('aria-expanded', String(expanded));

    const controlled = getControlledElement(control);
    if (controlled && container.contains(controlled)) {
      setContentVisibility(controlled, expanded);
    }
  });

  container.querySelectorAll([
    '.permission-module-body',
    '.permission-module-content',
    '.permission-group-body',
    '.permission-group-content',
    '.permissions-group-body',
    '.permissions-group-content',
    '.permission-items',
    '.permission-fields',
    '.permission-content',
    '.module-permissions',
    '.permission-module-permissions',
    '[data-permission-content]',
    '[data-collapsible-content]'
  ].join(', ')).forEach(content => setContentVisibility(content, expanded));
}

function getPermissionContainers(scope) {
  const selectors = [
    'details',
    '.permission-module',
    '.permission-group',
    '.permissions-group',
    '.permissions-module',
    '.permission-card',
    '.permission-section',
    '[data-permission-module]',
    '[data-permission-group]',
    '[data-collapsible]'
  ].join(', ');

  return Array.from(scope.querySelectorAll(selectors)).filter(container => {
    if (container.closest('.admin-user-permission-actions-menu')) return false;
    if (container.closest('#admin-user-permission-floating-menu')) return false;
    if (container.closest('.admin-user-permissions-clean-footer')) return false;
    return true;
  });
}

function applyExpandCollapseAll(expanded) {
  const scope = getDirectPermissionsScope();
  if (!scope) return;

  const containers = getPermissionContainers(scope);
  containers.forEach(container => setPermissionContainerExpanded(container, expanded));

  scope.querySelectorAll('[aria-controls]').forEach(control => {
    if (isInsideActionsOrFooter(control)) return;
    if (getExpandCollapseAction(control)) return;

    const controlled = getControlledElement(control);
    if (!controlled || !scope.contains(controlled)) return;

    control.setAttribute('aria-expanded', String(expanded));
    setContentVisibility(controlled, expanded);
  });
}

function handleExpandCollapseAll(event) {
  if (!isPermissionsScreenActive()) return;

  const control = event.target?.closest?.('button, a, [role="button"]');
  const scope = getDirectPermissionsScope();
  if (!control || !scope?.contains(control)) return;
  if (isInsideActionsOrFooter(control)) return;

  const action = getExpandCollapseAction(control);
  if (!action) return;

  window.setTimeout(() => applyExpandCollapseAll(action === 'expand'), 0);
  window.setTimeout(scheduleLegacyUserModalCleanup, 0);
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

document.addEventListener('click', handleExpandCollapseAll, false);
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
