const USER_PERMISSION_EXPAND_FIX_DELAYS = [0, 80, 180, 360, 700];
const CLICK_SUPPRESSION_MS = 500;

let lastHandledAction = '';
let lastHandledAt = 0;
let lastHandledPointerId = '';

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

function forceUserPermissionDirectRefresh() {
  if (typeof window.hubSolicitarRenderizacaoUsuarioTelaAdmin === 'function') {
    window.hubSolicitarRenderizacaoUsuarioTelaAdmin();
  }

  if (typeof window.hubAdminAgendarLimpezaModaisLegadosUsuario === 'function') {
    window.hubAdminAgendarLimpezaModaisLegadosUsuario();
  }
}

function executeUserPermissionExpandCollapse(action) {
  if (typeof window.alternarTodosModulosPermissoesUsuario !== 'function') return;

  window.alternarTodosModulosPermissoesUsuario(action === 'expand');

  USER_PERMISSION_EXPAND_FIX_DELAYS.forEach(delay => {
    window.setTimeout(forceUserPermissionDirectRefresh, delay);
  });
}

function markHandled(event, action) {
  lastHandledAction = action;
  lastHandledAt = Date.now();
  lastHandledPointerId = event.pointerId ? String(event.pointerId) : '';
}

function shouldSuppressDuplicateClick(event, action) {
  if (event.type !== 'click') return false;

  const now = Date.now();
  if (lastHandledAction !== action || now - lastHandledAt > CLICK_SUPPRESSION_MS) {
    return false;
  }

  return !lastHandledPointerId || !event.pointerId || String(event.pointerId) === lastHandledPointerId;
}

function stopUserPermissionEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function handleUserPermissionExpandCollapse(event) {
  if (!isUserPermissionScreenActive()) return;

  const scope = getUserPermissionScope();
  const control = event.target?.closest?.('button, a, [role="button"]');
  if (!scope || !control || !scope.contains(control)) return;
  if (isIgnoredUserPermissionControl(control)) return;

  const action = getExpandCollapseUserAction(control);
  if (!action) return;

  if (event.type === 'pointerdown' && event.button !== undefined && event.button !== 0) return;

  if (shouldSuppressDuplicateClick(event, action)) {
    stopUserPermissionEvent(event);
    return;
  }

  stopUserPermissionEvent(event);
  markHandled(event, action);
  executeUserPermissionExpandCollapse(action);
}

document.addEventListener('pointerdown', handleUserPermissionExpandCollapse, true);
document.addEventListener('click', handleUserPermissionExpandCollapse, true);
