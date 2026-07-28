const STYLE_ID = 'admin-user-permissions-footer-fix-style';
const APPLY_DELAYS = [0, 80, 180, 360, 700, 1200, 1800];

function normalizeFooterText(text = '') {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function getPermissionScope() {
  return document.querySelector('.admin-user-direct-permissions');
}

function getPermissionState() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') return null;
  const state = window.hubObterEstadoUsuarioTelaAdmin();
  if (!state || state.etapa !== 'permissoes' || !state.id) return null;
  return state;
}

function injectFooterFixStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-direct-permissions [data-admin-permissions-legacy-action-hidden="true"] {
      display: none !important;
    }

    .admin-user-direct-permissions .admin-user-permissions-actions,
    .admin-user-direct-permissions .permission-modal-actions,
    .admin-user-direct-permissions .permissions-modal-actions {
      display: none !important;
    }

    .admin-user-direct-permissions .admin-user-permissions-clean-footer {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: sticky !important;
      bottom: 0 !important;
      z-index: 30 !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
      width: 100% !important;
      margin-top: 14px !important;
      padding: 14px 0 0 !important;
      border-top: 1px solid rgba(148, 163, 184, 0.22) !important;
      background: inherit !important;
    }

    .admin-user-direct-permissions .admin-user-permissions-clean-footer .secondary-btn,
    .admin-user-direct-permissions .admin-user-permissions-clean-footer .save-btn {
      min-width: 132px !important;
      justify-content: center !important;
    }
  `;

  document.head.appendChild(style);
}

function hasPermissionChanges() {
  const scope = getPermissionScope();
  if (!scope) return false;

  return Array.from(scope.querySelectorAll('input[type="checkbox"]')).some(input => {
    if (input.dataset.originalChecked) {
      return String(input.checked) !== input.dataset.originalChecked;
    }
    return input.checked !== input.defaultChecked;
  });
}

function updateFooterSaveState() {
  const button = document.querySelector('[data-admin-permissions-save-clean]');
  if (!button) return;
  button.disabled = !hasPermissionChanges();
}

function goBackToUser(userId) {
  if (hasPermissionChanges()) {
    const confirmed = window.confirm('Existem alterações de permissões não salvas. Deseja sair sem salvar?');
    if (!confirmed) return;
  }

  if (typeof window.hubAdminPermissoesVoltarParaUsuario === 'function') {
    window.hubAdminPermissoesVoltarParaUsuario(userId);
    return;
  }

  if (typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
    window.abrirTelaEditarUsuarioAdmin(userId);
  }
}

async function savePermissionsAndReturn(userId) {
  const button = document.querySelector('[data-admin-permissions-save-clean]');
  if (button?.disabled) return;

  if (typeof window.hubAdminPermissoesSalvarAlteracoes === 'function') {
    await window.hubAdminPermissoesSalvarAlteracoes(userId);
    return;
  }

  if (typeof window.salvarPermissoesUsuarioAdmin === 'function') {
    await window.salvarPermissoesUsuarioAdmin(userId, false);
  }

  if (typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
    window.abrirTelaEditarUsuarioAdmin(userId);
  }
}

function ensureCleanFooter() {
  const state = getPermissionState();
  const scope = getPermissionScope();
  if (!state || !scope) return;

  let footer = scope.querySelector('.admin-user-permissions-clean-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'admin-user-permissions-clean-footer';
    scope.appendChild(footer);
  }

  footer.innerHTML = `
    <button class="secondary-btn" type="button" data-admin-permissions-back-clean>Voltar para usuário</button>
    <button class="save-btn" type="button" data-admin-permissions-save-clean disabled>Salvar alterações</button>
  `;

  footer.querySelector('[data-admin-permissions-back-clean]')?.addEventListener('click', () => goBackToUser(state.id));
  footer.querySelector('[data-admin-permissions-save-clean]')?.addEventListener('click', () => savePermissionsAndReturn(state.id));
  updateFooterSaveState();
}

function hideLegacyFooterButtons() {
  const scope = getPermissionScope();
  if (!scope) return;

  const hiddenLabels = new Set([
    'voltar',
    'voltar para usuario',
    'voltar para usuário',
    'voltar para lista',
    'salvar',
    'salvar e fechar'
  ].map(normalizeFooterText));

  Array.from(scope.querySelectorAll('button')).forEach(button => {
    if (button.closest('.admin-user-permissions-clean-footer')) return;
    if (button.closest('.admin-user-permission-actions-menu')) return;
    if (button.closest('#admin-user-permission-floating-menu')) return;

    const label = normalizeFooterText(button.textContent);
    if (!hiddenLabels.has(label)) return;

    button.dataset.adminPermissionsLegacyActionHidden = 'true';
    button.setAttribute('aria-hidden', 'true');
    button.tabIndex = -1;
  });
}

function applyFooterFix() {
  injectFooterFixStyles();
  ensureCleanFooter();
  hideLegacyFooterButtons();
  updateFooterSaveState();
}

function scheduleFooterFix() {
  APPLY_DELAYS.forEach(delay => window.setTimeout(applyFooterFix, delay));
}

window.addEventListener('hubAdminUsuarioTelaAtualizada', scheduleFooterFix);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', scheduleFooterFix);
window.addEventListener('load', scheduleFooterFix);
window.addEventListener('change', () => window.setTimeout(applyFooterFix, 0));
window.addEventListener('click', () => window.setTimeout(applyFooterFix, 0));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleFooterFix);
} else {
  scheduleFooterFix();
}
