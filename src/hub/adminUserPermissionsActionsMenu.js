import {
  abrirMenuAcaoGlobal,
  fecharMenuAcaoGlobal,
  limparMenusAcoesGlobaisOrfaos
} from './actionMenuPortal.js';
const STYLE_ID = 'admin-user-permissions-actions-menu-style';
const APPLY_DELAYS = [0, 80, 180, 360, 700];

function injectActionsMenuStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-permissions-v2,
    .admin-user-permissions-v2-toolbar,
    .admin-user-permissions-v2-toolbar-group,
    .admin-user-permissions-v2-body,
    .admin-user-permissions-v2-card,
    .admin-user-permissions-v2-module-head,
    .admin-user-permissions-v2-module-actions {
      overflow: visible !important;
    }

    .admin-user-permissions-v2-card {
      isolation: isolate;
    }

    .admin-user-permissions-v2-module-head {
      position: relative !important;
      z-index: 20;
    }

    .admin-user-permissions-v2-card:has(.admin-user-permissions-v2-actions-menu.is-open),
    .admin-user-permissions-v2-toolbar:has(.admin-user-permissions-v2-actions-menu.is-open) {
      z-index: 90;
    }

    .admin-user-permissions-v2-actions-menu {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      overflow: visible !important;
      z-index: 100;
    }

    .admin-user-permissions-v2-actions-trigger,
    .admin-user-permissions-v2 .admin-user-permissions-v2-actions-trigger.filter-btn {
      min-width: 32px;
      width: 32px;
      height: 32px;
      padding: 0 !important;
      border-radius: 4px;
      justify-content: center;
      background: var(--color-primary, #294895) !important;
      color: #ffffff !important;
      border-color: var(--color-primary, #294895) !important;
      box-shadow: 0 4px 10px color-mix(in srgb, var(--color-primary, #294895) 24%, transparent) !important;
      font-size: 0;
    }

    .admin-user-permissions-v2-actions-trigger:hover,
    .admin-user-permissions-v2 .admin-user-permissions-v2-actions-trigger.filter-btn:hover {
      background: color-mix(in srgb, var(--color-primary, #294895) 88%, #000000) !important;
      border-color: color-mix(in srgb, var(--color-primary, #294895) 88%, #000000) !important;
    }

    .admin-user-permissions-v2-actions-trigger::after {
      content: '⋮';
      font-size: 20px;
      line-height: 1;
      opacity: 1;
    }

    .admin-user-permissions-v2-actions-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 999;
      min-width: 184px;
      display: grid;
      gap: 4px;
      padding: 8px;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: #ffffff;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      overflow: visible !important;
    }

    body.dark .admin-user-permissions-v2-actions-trigger,
    body.dark .admin-user-permissions-v2 .admin-user-permissions-v2-actions-trigger.filter-btn {
      background: var(--color-primary, #294895) !important;
      color: #ffffff !important;
      border-color: var(--color-primary, #294895) !important;
    }

    body.dark .admin-user-permissions-v2-actions-panel {
      background: #ffffff;
      color: #0f172a;
      border-color: rgba(148, 163, 184, 0.22);
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.36);
    }

    .admin-user-permissions-v2-actions-panel[hidden] {
      display: none !important;
    }

    .admin-user-permissions-v2-actions-panel .filter-btn {
      width: 100%;
      justify-content: flex-start;
      border-radius: 12px;
      background: transparent;
      border-color: transparent;
      text-align: left;
      color: inherit;
    }

    .admin-user-permissions-v2-actions-panel .filter-btn:hover {
      background: rgba(41, 72, 149, 0.08);
      border-color: rgba(41, 72, 149, 0.10);
    }

    @media (max-width: 760px) {
      .admin-user-permissions-v2-actions-menu,
      .admin-user-permissions-v2-actions-trigger {
        width: 100%;
      }

      .admin-user-permissions-v2-actions-panel {
        left: 0;
        right: 0;
      }
    }
  `;

  document.head.appendChild(style);
}

function createActionButton(action, label, moduleKey, disabled) {
  const button = document.createElement('button');
  button.className = 'filter-btn';
  button.type = 'button';
  button.dataset.userV2Action = action;
  if (moduleKey) button.dataset.module = moduleKey;
  button.textContent = label;
  button.disabled = Boolean(disabled);
  return button;
}

function createActionsMenu(items, moduleKey, disabled) {
  const wrapper = document.createElement('div');
  wrapper.className = 'admin-user-permissions-v2-actions-menu';
  wrapper.dataset.userActionsMenu = 'true';

  const trigger = document.createElement('button');
  trigger.className = 'filter-btn admin-user-permissions-v2-actions-trigger hub-quick-actions-trigger';
  trigger.type = 'button';
  trigger.textContent = '⋮';
  trigger.setAttribute('aria-label', 'Ações rápidas');
  trigger.title = 'Ações rápidas';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.dataset.userActionsTrigger = 'true';
  trigger.disabled = Boolean(disabled);

  const panel = document.createElement('div');
  panel.className = 'admin-user-permissions-v2-actions-panel';
  panel.setAttribute('role', 'menu');
  panel.hidden = true;

  items.forEach(item => panel.appendChild(createActionButton(item.action, item.label, moduleKey, disabled)));

  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);
  return wrapper;
}

function groupGlobalActions(scope) {
  const group = Array.from(scope.querySelectorAll('.admin-user-permissions-v2-toolbar-group'))
    .find(item => item.querySelector('[data-user-v2-action="allow-all"]'));

  if (!group || group.dataset.userActionsGrouped === 'true') return;

  const disabled = Boolean(group.querySelector('[data-user-v2-action="allow-all"]')?.disabled);
  group.innerHTML = '';
  group.appendChild(createActionsMenu([
    { action: 'allow-all', label: 'Conceder tudo' },
    { action: 'deny-all', label: 'Bloquear tudo' },
    { action: 'reset-all', label: 'Restaurar padrão' }
  ], '', disabled));
  group.dataset.userActionsGrouped = 'true';
}

function groupModuleActions(scope) {
  scope.querySelectorAll('.admin-user-permissions-v2-module-actions').forEach(group => {
    if (group.dataset.userActionsGrouped === 'true') return;

    const moduleKey = group.closest('.admin-user-permissions-v2-card')?.dataset?.module
      || group.querySelector('[data-module]')?.dataset?.module
      || '';
    const disabled = Boolean(group.querySelector('[data-user-v2-action]')?.disabled);

    group.innerHTML = '';
    group.appendChild(createActionsMenu([
      { action: 'allow-module', label: 'Conceder tudo' },
      { action: 'deny-module', label: 'Bloquear tudo' },
      { action: 'reset-module', label: 'Restaurar padrão' }
    ], moduleKey, disabled));
    group.dataset.userActionsGrouped = 'true';
  });
}

function closeAllMenus(exceptMenu = null) {
  document.querySelectorAll('.admin-user-permissions-v2-actions-menu').forEach(menu => {
    if (exceptMenu && menu === exceptMenu) return;

    const trigger = menu.querySelector('[data-user-actions-trigger]');
    const panel = menu.querySelector('.admin-user-permissions-v2-actions-panel');
    menu.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (panel) {
      fecharMenuAcaoGlobal(panel);
      panel.hidden = true;
    }
  });
}

function applyActionsMenus() {
  injectActionsMenuStyle();
  limparMenusAcoesGlobaisOrfaos();

  const scope = document.querySelector('.admin-user-permissions-v2');
  if (!scope) return;

  groupGlobalActions(scope);
  groupModuleActions(scope);
}

let applyQueued = false;
function scheduleApplyActionsMenus() {
  if (applyQueued) return;
  applyQueued = true;

  window.requestAnimationFrame(() => {
    applyQueued = false;
    applyActionsMenus();
  });
}

function handleActionsMenuClick(event) {
  const trigger = event.target?.closest?.('[data-user-actions-trigger]');
  if (!trigger) {
    if (!event.target?.closest?.('.admin-user-permissions-v2-actions-menu')
      && !event.target?.closest?.('[data-hub-action-menu-portal]')) {
      closeAllMenus();
    }
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const menu = trigger.closest('.admin-user-permissions-v2-actions-menu');
  const panel = menu?.querySelector('.admin-user-permissions-v2-actions-panel');
  if (!menu || !panel) return;

  const willOpen = panel.hidden;
  closeAllMenus(menu);
  panel.hidden = !willOpen;
  menu.classList.toggle('is-open', willOpen);
  trigger.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) {
    abrirMenuAcaoGlobal(trigger, panel, {
      minWidth: 184,
      maxWidth: 260,
      gap: 8
    });
  } else {
    fecharMenuAcaoGlobal(panel);
  }
}

startActionsMenuObserver();
APPLY_DELAYS.forEach(delay => window.setTimeout(scheduleApplyActionsMenus, delay));
document.addEventListener('click', handleActionsMenuClick, true);
window.addEventListener('hubAdminUsuarioTelaAtualizada', scheduleApplyActionsMenus);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', scheduleApplyActionsMenus);
window.addEventListener('load', scheduleApplyActionsMenus);

function startActionsMenuObserver() {
  if (window.__hubAdminUserPermissionsActionsMenuObserver) return;

  const observer = new MutationObserver(scheduleApplyActionsMenus);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.__hubAdminUserPermissionsActionsMenuObserver = observer;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleApplyActionsMenus);
} else {
  scheduleApplyActionsMenus();
}
