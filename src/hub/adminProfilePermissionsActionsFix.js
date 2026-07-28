const ACTION_FIX_DELAYS = [0, 80, 180, 360];

function normalizeActionText(text = '') {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function getProfilePermissionsScope() {
  return document.querySelector('.admin-profile-permissions-direct');
}

function getProfilePermissionsState() {
  if (typeof window.hubObterEstadoPerfilTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoPerfilTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function isProfilePermissionsActive() {
  const state = getProfilePermissionsState();
  return state.modo === 'editar' && state.etapa === 'permissoes' && Boolean(state.id);
}

function extractModuleKey(card) {
  if (!card) return '';

  const explicitKey = card.dataset?.moduleKey || card.getAttribute('data-module-key') || '';
  if (explicitKey) return explicitKey;

  const toggle = card.querySelector('.admin-profile-permissions-direct-toggle');
  const inlineHandler = toggle?.getAttribute('onclick') || '';
  const match = inlineHandler.match(/AlternarModulo\('([^']+)'\)/);

  return match?.[1] || '';
}

function callProfilePermissionAction(fnName, ...args) {
  const fn = window[fnName];
  if (typeof fn !== 'function') return false;

  fn(...args);
  ACTION_FIX_DELAYS.forEach(delay => {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('hubAdminPerfilPermissoesAcaoExecutada'));
    }, delay);
  });

  return true;
}

function handleProfilePermissionButtonClick(event) {
  if (!isProfilePermissionsActive()) return;

  const scope = getProfilePermissionsScope();
  if (!scope) return;

  const button = event.target?.closest?.('button');
  if (!button || !scope.contains(button) || button.disabled) return;

  const label = normalizeActionText(button.textContent);
  const state = getProfilePermissionsState();
  let handled = false;

  if (button.closest('.admin-profile-permissions-direct-toggle')) {
    const card = button.closest('.admin-profile-permissions-direct-card');
    const moduleKey = extractModuleKey(card);
    handled = Boolean(moduleKey) && callProfilePermissionAction('hubAdminProfilePermissoesAlternarModulo', moduleKey);
  } else if (button.closest('.admin-profile-permissions-direct-module-actions')) {
    const card = button.closest('.admin-profile-permissions-direct-card');
    const moduleKey = extractModuleKey(card);

    if (moduleKey && label === 'conceder tudo') {
      handled = callProfilePermissionAction('hubAdminProfilePermissoesAplicarModulo', moduleKey, true);
    } else if (moduleKey && label === 'remover tudo') {
      handled = callProfilePermissionAction('hubAdminProfilePermissoesAplicarModulo', moduleKey, false);
    }
  } else if (button.closest('.admin-profile-permissions-direct-toolbar')) {
    if (label === 'expandir todos') {
      handled = callProfilePermissionAction('hubAdminProfilePermissoesAlternarTodos', true);
    } else if (label === 'recolher todos') {
      handled = callProfilePermissionAction('hubAdminProfilePermissoesAlternarTodos', false);
    } else if (label === 'conceder tudo') {
      handled = callProfilePermissionAction('hubAdminProfilePermissoesAplicarGlobal', true);
    } else if (label === 'remover tudo') {
      handled = callProfilePermissionAction('hubAdminProfilePermissoesAplicarGlobal', false);
    }
  } else if (button.closest('.admin-profile-permissions-direct-footer')) {
    if (label === 'voltar para perfil') {
      handled = callProfilePermissionAction('hubAdminProfilePermissoesVoltar', state.id);
    } else if (label === 'salvar alteracoes') {
      handled = callProfilePermissionAction('hubAdminProfilePermissoesSalvar', state.id);
    }
  }

  if (!handled) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function handleProfilePermissionCheckboxChange(event) {
  if (!isProfilePermissionsActive()) return;

  const scope = getProfilePermissionsScope();
  const input = event.target;
  if (!scope || !input || input.type !== 'checkbox' || !scope.contains(input)) return;

  const inlineHandler = input.getAttribute('onchange') || '';
  const match = inlineHandler.match(/AlternarCheckbox\('([^']+)',\s*'([^']+)'/);
  if (!match) return;

  const [, resourceKey, action] = match;
  const handled = callProfilePermissionAction('hubAdminProfilePermissoesAlternarCheckbox', resourceKey, action, input.checked);
  if (!handled) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function applyProfilePermissionActionFixAttributes() {
  if (!isProfilePermissionsActive()) return;

  const scope = getProfilePermissionsScope();
  if (!scope) return;

  scope.querySelectorAll('.admin-profile-permissions-direct-card').forEach(card => {
    const moduleKey = extractModuleKey(card);
    if (moduleKey) {
      card.dataset.moduleKey = moduleKey;
    }
  });
}

function scheduleProfilePermissionActionFixAttributes() {
  ACTION_FIX_DELAYS.forEach(delay => window.setTimeout(applyProfilePermissionActionFixAttributes, delay));
}

document.addEventListener('click', handleProfilePermissionButtonClick, true);
document.addEventListener('change', handleProfilePermissionCheckboxChange, true);
window.addEventListener('hubAdminPerfilTelaAtualizada', scheduleProfilePermissionActionFixAttributes);
window.addEventListener('hubAdminPerfilTelaRenderSolicitado', scheduleProfilePermissionActionFixAttributes);
window.addEventListener('hubAdminPerfilPermissoesAcaoExecutada', scheduleProfilePermissionActionFixAttributes);
window.addEventListener('load', scheduleProfilePermissionActionFixAttributes);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleProfilePermissionActionFixAttributes);
} else {
  scheduleProfilePermissionActionFixAttributes();
}
