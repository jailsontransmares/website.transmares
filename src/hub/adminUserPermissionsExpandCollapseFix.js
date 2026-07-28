const USER_PERMISSION_EXPAND_FIX_DELAYS = [0, 60, 140, 300, 700, 1200];
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

function getControlledUserPermissionElement(control) {
  const id = control?.getAttribute?.('aria-controls');
  if (!id) return null;

  try {
    return document.getElementById(id) || document.querySelector(`#${CSS.escape(id)}`);
  } catch (_error) {
    return document.getElementById(id);
  }
}

function setUserPermissionContentVisible(element, expanded) {
  if (!element) return;
  element.hidden = !expanded;
  element.style.display = expanded ? '' : 'none';
}

function applyUserPermissionDomFallback(expanded) {
  const scope = getUserPermissionScope();
  if (!scope) return;

  scope.querySelectorAll('.permission-module-card').forEach(card => {
    card.classList.toggle('is-open', expanded);
    card.classList.toggle('is-collapsed', !expanded);
    card.querySelector('.permission-module-toggle')?.setAttribute('aria-expanded', String(expanded));
    const control = card.querySelector('.permission-module-control');
    if (control) control.textContent = expanded ? '-' : '+';

    card.querySelectorAll('.permission-table-wrap, .permission-module-body, .permission-module-content, [data-permission-content], [data-collapsible-content]').forEach(content => {
      setUserPermissionContentVisible(content, expanded);
    });
  });

  scope.querySelectorAll('[aria-controls]').forEach(control => {
    if (isIgnoredUserPermissionControl(control)) return;
    if (getExpandCollapseUserAction(control)) return;

    const controlled = getControlledUserPermissionElement(control);
    if (!controlled || !scope.contains(controlled)) return;

    control.setAttribute('aria-expanded', String(expanded));
    setUserPermissionContentVisible(controlled, expanded);
  });
}

function executeUserPermissionExpandCollapse(action) {
  const expanded = action === 'expand';

  if (typeof window.alternarTodosModulosPermissoesUsuario === 'function') {
    window.alternarTodosModulosPermissoesUsuario(expanded);
  } else {
    applyUserPermissionDomFallback(expanded);
  }

  USER_PERMISSION_EXPAND_FIX_DELAYS.forEach(delay => {
    window.setTimeout(() => {
      forceUserPermissionDirectRefresh();
      applyUserPermissionDomFallback(expanded);
    }, delay);
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
