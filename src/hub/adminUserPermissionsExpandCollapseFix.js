const USER_PERMISSION_EXPAND_FIX_DELAYS = [0, 60, 140, 300, 700];
let lastExpandCollapseAction = '';
let lastExpandCollapseAt = 0;

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

function setUserPermissionModuleExpanded(container, expanded) {
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
    if (isIgnoredUserPermissionControl(control)) return;
    if (getExpandCollapseUserAction(control)) return;

    control.setAttribute('aria-expanded', String(expanded));

    const controlled = getControlledUserPermissionElement(control);
    if (controlled && container.contains(controlled)) {
      setUserPermissionContentVisible(controlled, expanded);
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
  ].join(', ')).forEach(content => setUserPermissionContentVisible(content, expanded));
}

function getUserPermissionModules(scope) {
  const selectors = [
    'details',
    '.permission-module',
    '.permission-group',
    '.permissions-group',
    '.permissions-module',
    '.permission-card',
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

function applyUserPermissionExpandCollapse(expanded) {
  const scope = getUserPermissionScope();
  if (!scope) return;

  getUserPermissionModules(scope).forEach(container => {
    setUserPermissionModuleExpanded(container, expanded);
  });

  scope.querySelectorAll('[aria-controls]').forEach(control => {
    if (isIgnoredUserPermissionControl(control)) return;
    if (getExpandCollapseUserAction(control)) return;

    const controlled = getControlledUserPermissionElement(control);
    if (!controlled || !scope.contains(controlled)) return;

    control.setAttribute('aria-expanded', String(expanded));
    setUserPermissionContentVisible(controlled, expanded);
  });

  if (typeof window.hubAdminAgendarLimpezaModaisLegadosUsuario === 'function') {
    window.hubAdminAgendarLimpezaModaisLegadosUsuario();
  }
}

function handleUserPermissionExpandCollapse(event) {
  if (!isUserPermissionScreenActive()) return;

  const scope = getUserPermissionScope();
  const control = event.target?.closest?.('button, a, [role="button"]');
  if (!scope || !control || !scope.contains(control)) return;
  if (isIgnoredUserPermissionControl(control)) return;

  const action = getExpandCollapseUserAction(control);
  if (!action) return;

  const now = Date.now();
  if (event.type === 'click' && lastExpandCollapseAction === action && now - lastExpandCollapseAt < 250) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }

  lastExpandCollapseAction = action;
  lastExpandCollapseAt = now;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const expanded = action === 'expand';
  USER_PERMISSION_EXPAND_FIX_DELAYS.forEach(delay => {
    window.setTimeout(() => applyUserPermissionExpandCollapse(expanded), delay);
  });
}

document.addEventListener('pointerdown', handleUserPermissionExpandCollapse, true);
document.addEventListener('click', handleUserPermissionExpandCollapse, true);
